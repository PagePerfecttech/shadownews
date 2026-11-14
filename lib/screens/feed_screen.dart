import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:go_router/go_router.dart';
import '../config.dart';
import '../api/api_client.dart';
import '../api/cache_service.dart';
import '../widgets/share_card.dart';
import '../widgets/custom_ad_widget.dart';
import '../widgets/admob_native_widget.dart';
import '../widgets/news_card.dart';
import '../widgets/ad_slider_widget.dart';
import '../widgets/location_picker_sheet.dart';
import '../services/ad_manager.dart';
import 'dart:async';
import '../utils/events.dart';
import '../services/app_update_service.dart';
import '../services/in_app_review_service.dart';
import '../utils/short_code_util.dart';

enum NewsFilterType { local, state }

class FeedScreen extends StatefulWidget {
  final String? newsId;

  const FeedScreen({super.key, this.newsId});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  List<dynamic> _breakingNews = [];
  List<dynamic> _newsItems = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasError = false;
  bool _hasMore = true;
  int _currentPage = 1;
  int _currentRetryLevel = 0;
  static const int _pageSize = 10;
  late PageController _pageController;
  final GlobalKey _shareRepaintKey = GlobalKey();
  StreamSubscription? _homeTabSub;
  StreamSubscription? _tabChangedSub;
  bool _isTabActive = (AppEvents.currentTab == 2);
  DateTime? _pageEnterTime;
  int _lastPageIndex = 0;
  String _selectedLocationName = 'Location';
  int _selectedTab = 0; // 0: All News, 1: Location News
  bool _isListView = false; // Toggle between Shorts (1 full page) and List (3-4 posts per screen)

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _pageEnterTime = DateTime.now();
    _loadPreferencesAndFetch();
  }

  @override
  void didUpdateWidget(FeedScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.newsId != null && widget.newsId != oldWidget.newsId && widget.newsId!.isNotEmpty) {
      _fetchTargetNewsItem(widget.newsId!);
    }
  }

  @override
  void dispose() {
    _homeTabSub?.cancel();
    _tabChangedSub?.cancel();
    _pageController.dispose();
    
    // Log watch time for the final page upon leaving
    if (_pageEnterTime != null && _lastPageIndex < _newsItems.length) {
      final item = _newsItems[_lastPageIndex];
      if (item['type'] != 'ad' && item['id'] != null) {
        final duration = DateTime.now().difference(_pageEnterTime!).inSeconds;
        _logInteraction(item['id'].toString(), 'watch_time', value: duration);
      }
    }
    super.dispose();
  }

  Future<void> _loadPreferencesAndFetch() async {
    await _updateSelectedLocationName();

    _homeTabSub = AppEvents.homeTabTapped.stream.listen((_) {
      if (_pageController.hasClients) {
        _pageController.animateToPage(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
      _fetchNews(refresh: true);
    });

    _isTabActive = (AppEvents.currentTab == 2);
    _tabChangedSub = AppEvents.tabChanged.stream.listen((activeTabIndex) {
      if (mounted) {
        final isHome = (activeTabIndex == 2);
        if (_isTabActive != isHome) {
          setState(() {
            _isTabActive = isHome;
          });
        }
      }
    });

    _fetchBreakingNews();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppUpdateService.instance.checkForUpdate(context);
      }
    });

    if (widget.newsId != null && widget.newsId!.isNotEmpty) {
      // Prioritize loading the deep-linked news article first!
      await _fetchTargetNewsItem(widget.newsId!);
      // Then load general feed in background to populate remaining feed
      _fetchNews(refresh: false);
    } else {
      await _loadCachedOrFetch();
    }
  }

  Future<void> _updateSelectedLocationName() async {
    final prefs = await SharedPreferences.getInstance();
    final mandalName = prefs.getString('selected_mandal_name');
    final assemblyName = prefs.getString('selected_assembly_name');
    final districtName = prefs.getString('selected_district_name');
    final stateName = prefs.getString('selected_state_name');
    if (mounted) {
      setState(() {
        _selectedLocationName = (mandalName != null && mandalName.isNotEmpty)
            ? mandalName
            : (assemblyName != null && assemblyName.isNotEmpty)
                ? assemblyName
                : (districtName != null && districtName.isNotEmpty)
                    ? districtName
                    : (stateName != null && stateName.isNotEmpty)
                        ? stateName
                        : 'ప్రాంతం ఎంచుకోండి';
      });
    }
  }

  Future<void> _openLocationPicker() async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E1E1E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const LocationPickerSheet(),
    );
    if (result == true || mounted) {
      await _updateSelectedLocationName();
      if (_selectedTab == 1) {
        _fetchNews(refresh: true);
      }
    }
  }

  Future<void> _fetchTargetNewsItem(String id) async {
    try {
      final response = await apiClient.get('/news/$id');
      if (response.data != null && response.data['news'] != null && mounted) {
        final target = response.data['news'];
        final formattedTarget = {
          'type': 'news',
          'id': target['id'],
          'short_code': target['short_code'] ?? target['shortCode'],
          'shortCode': target['shortCode'] ?? target['short_code'],
          'title': target['title'],
          'short_desc': target['shortDesc'] ?? target['short_desc'] ?? '',
          'content': target['content'] ?? target['aiContent'] ?? target['shortDesc'] ?? target['short_desc'] ?? '',
          'thumbnail_url': _formatImageUrl(target['thumbnailUrl'] as String? ?? target['thumbnail_url'] as String?),
          'video_url': target['video_url'] ?? target['videoUrl'] ?? target['video'],
          'videoUrl': target['videoUrl'] ?? target['video_url'] ?? target['video'],
          'imagesUrls': target['imagesUrls'] ?? target['images_urls'] ?? [],
          'category': target['category']?['name'] ?? '',
          'category_color': target['category']?['color'],
          'tags': target['tags'] != null ? (target['tags'] as List).map((t) => t['tag']?['name']?.toString() ?? '').where((name) => name.isNotEmpty).toList() : [],
          'created_at': target['publishedAt'] ?? target['createdAt'],
          'source_url': target['sourceUrl'] ?? target['source_url'] ?? '',
          'reporter_name': target['reporter']?['name'] ?? target['reporter_name'] ?? 'Shadow News',
          'reporter_image': _formatImageUrl(target['reporter']?['avatar'] as String? ?? target['reporter']?['avatarUrl'] as String? ?? target['reporter_image'] as String?),
          'location_name': () {
            final m = target['mandal']?['name']?.toString();
            final d = target['district']?['name']?.toString();
            if (m != null && m.isNotEmpty && d != null && d.isNotEmpty && m != d) {
              return '$m, $d';
            }
            return (m != null && m.isNotEmpty) ? m : (d != null && d.isNotEmpty) ? d : (target['location']?.toString() ?? '');
          }(),
          'reposts_count': target['_count']?['reactions'] ?? 0,
          'comments_count': target['_count']?['comments'] ?? 0,
          'views_count': target['viewsCount'] ?? target['views_count'] ?? 0,
          'shares_count': target['sharesCount'] ?? target['shares_count'] ?? 0,
        };
        setState(() {
          _newsItems.removeWhere((item) => item['id']?.toString() == id);
          _newsItems.insert(0, formattedTarget);
          _isLoading = false;
          _hasError = false;
        });
        if (_pageController.hasClients) {
          _pageController.jumpToPage(0);
        }
      } else if (mounted && _newsItems.isEmpty) {
        await _fetchNews();
      }
    } catch (e) {
      debugPrint('Error fetching target deep link news ($id): $e');
      if (mounted) {
        setState(() => _isLoading = false);
        if (_newsItems.isEmpty) {
          await _fetchNews();
        }
      }
    }
  }

  Future<void> _loadCachedOrFetch() async {
    final cached = CacheService.getCachedFeed();
    if (cached != null && cached.isNotEmpty) {
      setState(() {
        _newsItems = cached;
        _isLoading = false;
      });
      // Background refresh for fresh news
      await _fetchNews(refresh: false);
    } else {
      await _fetchNews();
    }
  }

  String _formatImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('/')) {
      return '${AppConfig.baseUrl}$url';
    }
    return url.replaceAll(RegExp(r'placehold\.co/(\d+x\d+)/'), r'placehold.co/$1/png/');
  }

  Future<void> _fetchBreakingNews() async {
    try {
      final response = await apiClient.get('/breaking');
      if (mounted && response.data is List) {
        final now = DateTime.now();
        final List<dynamic> rawList = response.data;
        final filtered = rawList.where((item) {
          if (item is Map && item['publishedAt'] != null) {
            try {
              final pubDate = DateTime.parse(item['publishedAt'].toString());
              return now.difference(pubDate).inHours < 24;
            } catch (_) {}
          }
          return true;
        }).toList();
        setState(() {
          _breakingNews = filtered;
        });
      }
    } catch (e) {
      debugPrint('Breaking news error: $e');
    }
  }

  String _buildFeedUrl(int page, int retryLevel, SharedPreferences prefs) {
    final mandalId = prefs.getString('selected_mandal_id');
    final districtId = prefs.getString('selected_district_id');
    final stateId = prefs.getString('selected_state_id');

    String url = '/feed?page=$page&limit=$_pageSize';

    // Tab 1 is Location Tab -> Filter dynamically by mandal/district/state
    if (_selectedTab == 1) {
      if (retryLevel == 0 && mandalId != null && mandalId.isNotEmpty) {
        url += '&mandal_id=$mandalId';
      } else if (retryLevel <= 1 && districtId != null && districtId.isNotEmpty) {
        url += '&district_id=$districtId';
      } else if (retryLevel <= 2 && stateId != null && stateId.isNotEmpty) {
        url += '&state_id=$stateId';
      }
    }
    return url;
  }



  Future<void> _fetchNews({bool refresh = false, int retryLevel = 0}) async {
    if (refresh) {
      CacheService.clearAll();
      setState(() {
        _currentPage = 1;
        _hasMore = true;
        _newsItems = [];
        _isLoading = true;
        _hasError = false;
        _currentRetryLevel = 0;
      });
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final url = _buildFeedUrl(_currentPage, retryLevel, prefs);
      debugPrint('Fetching news from: $url (Retry: $retryLevel)');
      
      final response = await apiClient.get(url);
      debugPrint('Feed response: ${response.statusCode}');
      
      if (response.data == null) {
        debugPrint('Feed error: Response data is null');
        throw Exception('Empty response');
      }

      final dynamic rawData = response.data;
      final List? feedData = rawData is Map ? rawData['feed'] as List? : null;
      
      if (feedData == null) {
        debugPrint('Feed error: "feed" key is missing or not a list in response: $rawData');
        throw Exception('Invalid response format');
      }
      
      final total = response.data['total'] as int? ?? 0;
      debugPrint('Found ${feedData.length} items, total: $total');

      // Handle Fallback if no news found on first page
      if (feedData.isEmpty && _currentPage == 1 && retryLevel < 3) {
        if (_selectedTab == 1) {
          final mandalId = prefs.getString('selected_mandal_id');
          final districtId = prefs.getString('selected_district_id');
          final stateId = prefs.getString('selected_state_id');

          if (retryLevel == 0 && mandalId != null && mandalId.isNotEmpty) {
            return _fetchNews(refresh: false, retryLevel: 1);
          } else if (retryLevel <= 1 && districtId != null && districtId.isNotEmpty) {
            return _fetchNews(refresh: false, retryLevel: 2);
          } else if (retryLevel <= 2 && stateId != null && stateId.isNotEmpty) {
            return _fetchNews(refresh: false, retryLevel: 3);
          }
        }
      }

      _currentRetryLevel = retryLevel;

      final newItems = feedData.map((item) {
        if (item['type'] == 'news') {
          final news = item['news'];
          return {
            'type': 'news',
            'id': news['id'],
            'short_code': news['short_code'] ?? news['shortCode'],
            'shortCode': news['shortCode'] ?? news['short_code'],
            'title': news['title'],
            'short_desc': news['shortDesc'] ?? news['short_desc'] ?? '',
            'content': news['content'] ?? news['aiContent'] ?? news['shortDesc'] ?? news['short_desc'] ?? '',
            'thumbnail_url': _formatImageUrl(news['thumbnailUrl'] as String?),
            'video_url': news['video_url'] ?? news['videoUrl'] ?? news['video'],
            'videoUrl': news['videoUrl'] ?? news['video_url'] ?? news['video'],
            'imagesUrls': news['imagesUrls'] ?? news['images_urls'] ?? [],
            'category': news['category']?['name'] ?? '',
            'category_color': news['category']?['color'],
            'tags': news['tags'] != null ? (news['tags'] as List).map((t) => t['tag']?['name']?.toString() ?? '').where((name) => name.isNotEmpty).toList() : [],
            'created_at': news['publishedAt'],
            'source_url': news['sourceUrl'] ?? '',
            'reporter_name': news['reporter']?['name'] ?? 'Shadow News',
            'reporter_image': _formatImageUrl(news['reporter']?['avatar'] as String? ?? news['reporter']?['avatarUrl'] as String? ?? news['reporter_image'] as String?),
            'location_name': () {
              final m = news['mandal']?['name']?.toString();
              final d = news['district']?['name']?.toString();
              if (m != null && m.isNotEmpty && d != null && d.isNotEmpty && m != d) {
                return '$m, $d';
              }
              return (m != null && m.isNotEmpty) ? m : (d != null && d.isNotEmpty) ? d : (news['location']?.toString() ?? '');
            }(),
            'reposts_count': news['_count']?['reactions'] ?? 0,
            'comments_count': news['_count']?['comments'] ?? 0,
            'views_count': news['viewsCount'] ?? news['views_count'] ?? 0,
            'shares_count': news['sharesCount'] ?? news['shares_count'] ?? 0,
          };
        } else if (item['type'] == 'admob_native') {
          return {
            'type': 'admob_native',
          };
        } else if (item['type'] == 'ad_slider') {
          return {
            'type': 'ad_slider',
            'ads': item['ads'] is List ? item['ads'] : [],
          };
        } else if (item['type'] == 'ad' || item['type'] == 'ads') {
          if (item['ads'] != null && item['ads'] is List && (item['ads'] as List).isNotEmpty) {
            return {
              'type': 'ad_slider',
              'ads': item['ads'],
            };
          }
          final adObj = item['ad'] ?? item['ad_data'] ?? item;
          if (adObj is Map) {
            final imgs = adObj['imagesUrls'] ?? adObj['images_urls'] ?? adObj['imageUrl'] ?? adObj['image_url'];
            if (imgs != null) {
              return {
                'type': 'ad',
                'ad_data': adObj,
              };
            }
          }
          return null;
        }
        return null;
      }).whereType<Map<String, dynamic>>().toList();

      if (AdManager.admobFeedEnabled) {
        // Only inject client-side AdMob slots if backend didn't already include them
        final hasBackendAdMob = newItems.any((item) => item['type'] == 'admob_native');
        if (!hasBackendAdMob) {
          int count = 0;
          List<Map<String, dynamic>> itemsWithAdMob = [];
          for (var item in newItems) {
            itemsWithAdMob.add(item);
            if (item['type'] == 'news') {
              count++;
              if (count % AdManager.adFeedFrequency == 0) {
                itemsWithAdMob.add({'type': 'admob_native'});
              }
            }
          }
          newItems.clear();
          newItems.addAll(itemsWithAdMob);
        }
      }

      setState(() {
        if (widget.newsId != null && widget.newsId!.isNotEmpty && _newsItems.isNotEmpty && _newsItems.first['id']?.toString() == widget.newsId) {
          final targetItem = _newsItems.first;
          newItems.removeWhere((item) => item['id']?.toString() == widget.newsId);
          _newsItems = [targetItem, ...newItems];
        } else {
          _newsItems = refresh ? newItems : [..._newsItems, ...newItems];
        }
        _hasMore = _newsItems.length < total;
        _isLoading = false;
      });

      // Cache the first page for offline use
      if (_currentPage == 1) {
        CacheService.cacheFeed(_newsItems);
      }
    } catch (e, stack) {
      if (e is DioException) {
        debugPrint('Feed error (Dio): ${e.type} - ${e.message}');
        debugPrint('Feed error response: ${e.response?.statusCode} - ${e.response?.data}');
      } else {
        debugPrint('Feed error detailed: $e');
      }
      debugPrint('Stack trace: $stack');
      if (_currentPage == 1 && retryLevel < 3) {
        return _fetchNews(refresh: false, retryLevel: retryLevel + 1);
      }
      setState(() {
        _isLoading = false;
        _hasError = _newsItems.isEmpty;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    _currentPage++;
    try {
      final prefs = await SharedPreferences.getInstance();
      final url = _buildFeedUrl(_currentPage, _currentRetryLevel, prefs);
      final response = await apiClient.get(url);
      final feedData = response.data['feed'] as List;
      final total = response.data['total'] as int? ?? 0;

      final newItems = feedData.map((item) {
        if (item['type'] == 'news') {
          final news = item['news'];
          return {
            'type': 'news',
            'id': news['id'],
            'short_code': news['short_code'] ?? news['shortCode'],
            'shortCode': news['shortCode'] ?? news['short_code'],
            'title': news['title'],
            'short_desc': news['shortDesc'] ?? news['short_desc'] ?? '',
            'content': news['content'] ?? news['aiContent'] ?? news['shortDesc'] ?? news['short_desc'] ?? '',
            'thumbnail_url': _formatImageUrl(news['thumbnailUrl'] as String?),
            'video_url': news['video_url'] ?? news['videoUrl'] ?? news['video'],
            'videoUrl': news['videoUrl'] ?? news['video_url'] ?? news['video'],
            'imagesUrls': news['imagesUrls'] ?? news['images_urls'] ?? [],
            'category': news['category']?['name'] ?? '',
            'category_color': news['category']?['color'],
            'tags': news['tags'] != null ? (news['tags'] as List).map((t) => t['tag']?['name']?.toString() ?? '').where((name) => name.isNotEmpty).toList() : [],
            'created_at': news['publishedAt'],
            'source_url': news['sourceUrl'] ?? '',
            'reporter_name': news['reporter']?['name'] ?? news['reporter_name'] ?? 'Shadow News',
            'reporter_image': _formatImageUrl(news['reporter']?['avatar'] as String? ?? news['reporter']?['avatarUrl'] as String? ?? news['reporter_image'] as String?),
            'location_name': news['mandal']?['name'] ?? news['district']?['name'] ?? news['location'] ?? '',
            'shares_count': news['sharesCount'] ?? 0,
            'reposts_count': news['_count']?['reactions'] ?? 0,
            'comments_count': news['_count']?['comments'] ?? 0,
            'views_count': news['viewsCount'] ?? 0,
          };
        } else if (item['type'] == 'admob_native') {
          return {
            'type': 'admob_native',
          };
        } else if (item['type'] == 'ad_slider') {
          return {
            'type': 'ad_slider',
            'ads': item['ads'] is List ? item['ads'] : [],
          };
        } else if (item['type'] == 'ad' || item['type'] == 'ads') {
          if (item['ads'] != null && item['ads'] is List && (item['ads'] as List).isNotEmpty) {
            return {
              'type': 'ad_slider',
              'ads': item['ads'],
            };
          }
          return {
            'type': 'ad',
            'ad_data': item['ad'] ?? item,
          };
        }
        return null;
      }).whereType<Map<String, dynamic>>().toList();

      if (AdManager.admobFeedEnabled) {
        // Only inject client-side AdMob slots if backend didn't already include them
        final hasBackendAdMob = newItems.any((item) => item['type'] == 'admob_native');
        if (!hasBackendAdMob) {
          int count = 0;
          List<Map<String, dynamic>> itemsWithAdMob = [];
          for (var item in newItems) {
            itemsWithAdMob.add(item);
            if (item['type'] == 'news') {
              count++;
              if (count % AdManager.adFeedFrequency == 0) {
                itemsWithAdMob.add({'type': 'admob_native'});
              }
            }
          }
          newItems.clear();
          newItems.addAll(itemsWithAdMob);
        }
      }

      setState(() {
        _newsItems = [..._newsItems, ...newItems];
        _hasMore = _newsItems.length < total;
        _isLoadingMore = false;
      });
    } catch (e) {
      debugPrint('Load more error: $e');
      _currentPage--;
      setState(() => _isLoadingMore = false);
    }
  }

  String _timeAgo(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 365) {
        return '${(difference.inDays / 365).floor()}y ago';
      } else if (difference.inDays > 30) {
        return '${(difference.inDays / 30).floor()}mo ago';
      } else if (difference.inDays > 0) {
        return '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h ago';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes}m ago';
      } else {
        return 'Just now';
      }
    } catch (_) {
      return '';
    }
  }

  Future<void> _logInteraction(String newsId, String type, {int value = 0}) async {
    if (FirebaseAuth.instance.currentUser == null) return;
    try {
      await apiClient.post(
        '/user/interactions',
        data: {
          'newsId': newsId,
          'type': type,
          'value': value,
        },
      );
    } catch (e) {
      debugPrint('Failed to log interaction: $e');
    }
  }

  String _resolveNewsImageUrl(Map<dynamic, dynamic>? n) {
    if (n == null) return '';
    String? raw = n['thumbnail_url']?.toString() ??
        n['thumbnailUrl']?.toString() ??
        n['imageUrl']?.toString() ??
        (n['imagesUrls'] is List && (n['imagesUrls'] as List).isNotEmpty
            ? n['imagesUrls'][0]?.toString()
            : (n['images_urls'] is List && (n['images_urls'] as List).isNotEmpty
                ? n['images_urls'][0]?.toString()
                : null));

    if ((raw == null || raw.isEmpty) && (n['video_url'] != null || n['videoUrl'] != null || n['video'] != null)) {
      final video = (n['video_url'] ?? n['videoUrl'] ?? n['video']).toString();
      final ytMatch = RegExp(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})').firstMatch(video);
      if (ytMatch != null && ytMatch.group(1) != null) {
        raw = 'https://img.youtube.com/vi/${ytMatch.group(1)}/hqdefault.jpg';
      }
    }

    if (raw == null || raw.isEmpty) return '';

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }

    final base = AppConfig.baseUrl.endsWith('/')
        ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1)
        : AppConfig.baseUrl;
    final path = raw.startsWith('/') ? raw : '/$raw';
    return '$base$path';
  }

  Widget _buildCompactNewsTile(dynamic item, int index, bool isDark) {
    if (item is! Map) return const SizedBox.shrink();
    final title = (item['title'] ?? '').toString();
    final description = (item['short_desc'] ?? item['shortDesc'] ?? item['description'] ?? item['content'] ?? '').toString();
    final fullContent = (item['full_content'] ?? item['fullContent'] ?? item['content'] ?? description).toString();
    final imageUrl = _resolveNewsImageUrl(item);
    final categoryName = (item['category'] is Map ? item['category']['name'] : item['category_name'])?.toString() ?? '';
    final locationName = (item['location'] is Map ? item['location']['name'] : null)?.toString() ??
        (item['district'] is Map ? item['district']['name'] : null)?.toString() ??
        item['location_name']?.toString() ??
        '';
    final timeAgo = _timeAgo((item['publishedAt'] ?? item['created_at'] ?? item['createdAt'])?.toString());
    final reporterName = (item['reporter'] is Map ? item['reporter']['name'] : null)?.toString() ??
        item['reporter_name']?.toString() ??
        item['author']?.toString() ??
        '';
    final shortCode = resolveNewsShortCode(item);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE5E7EB),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            NewsCard.showFullNewsModal(
              context: context,
              title: title,
              shortDesc: description,
              fullContent: fullContent,
              imageUrl: imageUrl,
              locationName: locationName,
              timeAgo: timeAgo,
              reporterName: reporterName,
              categoryName: categoryName,
              shortCode: shortCode,
              isDark: isDark,
              onWhatsAppShare: () => _handleWhatsAppShare(item),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category & Time Header Row
                      Row(
                        children: [
                          if (categoryName.isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD32F2F).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                categoryName,
                                style: GoogleFonts.notoSansTelugu(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFFD32F2F),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          if (locationName.isNotEmpty) ...[
                            Flexible(
                              child: Text(
                                locationName,
                                style: GoogleFonts.notoSansTelugu(
                                  fontSize: 11,
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            timeAgo,
                            style: GoogleFonts.poppins(
                              fontSize: 10.5,
                              color: isDark ? Colors.grey[400] : Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Title
                      Text(
                        title,
                        style: GoogleFonts.notoSansTelugu(
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF111827),
                          height: 1.35,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 10),

                      // Action row: "పూర్తి వివరాలు" button & WhatsApp share & Shorts jump
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2A1C1C) : const Color(0xFFFFF1F1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFD32F2F).withValues(alpha: 0.35),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.menu_book_rounded,
                                  size: 11,
                                  color: Color(0xFFD32F2F),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'పూర్తి వివరాలు',
                                  style: GoogleFonts.notoSansTelugu(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFFD32F2F),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),

                          // WhatsApp Share
                          InkWell(
                            onTap: () => _handleWhatsAppShare(item),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF25D366).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.share,
                                    size: 12,
                                    color: Color(0xFF25D366),
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    'వాట్సాప్',
                                    style: GoogleFonts.notoSansTelugu(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF25D366),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),

                          // Open in full shorts mode
                          IconButton(
                            icon: const Icon(
                              Icons.fullscreen_rounded,
                              size: 21,
                              color: Color(0xFFD32F2F),
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            tooltip: 'View in Full Shorts',
                            onPressed: () {
                              setState(() {
                                _isListView = false;
                              });
                              if (_pageController.hasClients) {
                                _pageController.jumpToPage(index);
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                if (imageUrl.isNotEmpty) ...[
                  const SizedBox(width: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: CachedNetworkImage(
                      imageUrl: imageUrl,
                      width: 95,
                      height: 95,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        width: 95,
                        height: 95,
                        color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFEEEEEE),
                      ),
                      errorWidget: (context, url, error) => Container(
                        width: 95,
                        height: 95,
                        color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFEEEEEE),
                        child: const Icon(Icons.image_not_supported_outlined, color: Colors.grey, size: 28),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleWhatsAppShare(Map<dynamic, dynamic> news) async {
    try {
      await apiClient.post('/news/${news['id']}', data: {'action': 'share'});
      _logInteraction(news['id'].toString(), 'share');
    } catch (e) {
      debugPrint('Error sharing WhatsApp: $e');
    }

    if (!mounted) return;

    final String resolvedImg = _resolveNewsImageUrl(news);
    Uint8List? preloadedBytes;
    if (resolvedImg.isNotEmpty && mounted) {
      preloadedBytes = await preloadImageBytes(resolvedImg);
    }

    final String reporterName = news['reporter_name']?.toString() ?? news['reporter']?['name']?.toString() ?? 'Shadow News';
    final String reporterImage = news['reporter_image']?.toString() ?? news['reporter']?['avatar']?.toString() ?? '';
    final String location = news['location_name']?.toString() ?? news['mandal']?['name']?.toString() ?? news['district']?['name']?.toString() ?? '';
    final String title = (news['title'] ?? '').toString();
    final String shortDesc = (news['short_desc'] ?? news['shortDesc'] ?? '').toString();
    final String timeAgo = _timeAgo(news['publishedAt'] ?? news['created_at'] ?? news['createdAt']);
    final String shareCode = await _resolveShortCode(news);

    if (!mounted) return;

    bool dialogClosed = false;
    void closeDialog() {
      if (!dialogClosed && mounted) {
        dialogClosed = true;
        Navigator.of(context, rootNavigator: true).pop();
      }
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      useRootNavigator: true,
      builder: (dialogCtx) => PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: 440,
                  child: ShareCardWidget(
                    repaintKey: _shareRepaintKey,
                    title: title,
                    shortDesc: shortDesc,
                    imageUrl: resolvedImg,
                    timeAgo: timeAgo,
                    sourceUrl: news['source_url']?.toString() ?? '',
                    location: location,
                    reporter: reporterName,
                    reporterImage: reporterImage.isNotEmpty ? reporterImage : null,
                    stripColor: const Color(0xFFE53935),
                    preloadedImageBytes: preloadedBytes,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Color(0xFF25D366),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'వాట్సాప్ షేర్ సిద్ధం అవుతోంది...',
                      style: GoogleFonts.notoSansTelugu(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      await shareNewsAsImage(
        repaintKey: _shareRepaintKey,
        title: title,
        shortDesc: shortDesc,
        newsId: shareCode,
        sourceUrl: news['source_url'] ?? '',
        location: location,
        reporterName: reporterName,
        directWhatsApp: true,
        onBeforeShare: closeDialog,
      );
    } finally {
      closeDialog();
    }
  }

  Future<void> _handleShare(Map<dynamic, dynamic> news) async {
    try {
      await apiClient.post('/news/${news['id']}', data: {'action': 'share'});
      _logInteraction(news['id'].toString(), 'share');
    } catch (e) {
      debugPrint('Error sharing: $e');
    }

    if (!mounted) return;

    final String resolvedImg = _resolveNewsImageUrl(news);
    Uint8List? preloadedBytes;
    if (resolvedImg.isNotEmpty && mounted) {
      preloadedBytes = await preloadImageBytes(resolvedImg);
    }

    final String reporterName = news['reporter_name']?.toString() ?? news['reporter']?['name']?.toString() ?? 'Shadow News';
    final String reporterImage = news['reporter_image']?.toString() ?? news['reporter']?['avatar']?.toString() ?? '';
    final String location = news['location_name']?.toString() ?? news['mandal']?['name']?.toString() ?? news['district']?['name']?.toString() ?? '';
    final String title = (news['title'] ?? '').toString();
    final String shortDesc = (news['short_desc'] ?? news['shortDesc'] ?? '').toString();
    final String timeAgo = _timeAgo(news['publishedAt'] ?? news['created_at'] ?? news['createdAt']);
    final String shareCode = await _resolveShortCode(news);

    if (!mounted) return;

    bool dialogClosed = false;
    void closeDialog() {
      if (!dialogClosed && mounted) {
        dialogClosed = true;
        Navigator.of(context, rootNavigator: true).pop();
      }
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      useRootNavigator: true,
      builder: (dialogCtx) => PopScope(
        canPop: false,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: 440,
                  child: ShareCardWidget(
                    repaintKey: _shareRepaintKey,
                    title: title,
                    shortDesc: shortDesc,
                    imageUrl: resolvedImg,
                    timeAgo: timeAgo,
                    sourceUrl: news['source_url']?.toString() ?? '',
                    location: location,
                    reporter: reporterName,
                    reporterImage: reporterImage.isNotEmpty ? reporterImage : null,
                    stripColor: const Color(0xFFE53935),
                    preloadedImageBytes: preloadedBytes,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Color(0xFFE53935),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'షేర్ సిద్ధం అవుతోంది...',
                      style: GoogleFonts.notoSansTelugu(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      await shareNewsAsImage(
        repaintKey: _shareRepaintKey,
        title: title,
        shortDesc: shortDesc,
        newsId: shareCode,
        sourceUrl: news['source_url'] ?? '',
        location: location,
        reporterName: reporterName,
        directWhatsApp: false,
        onBeforeShare: closeDialog,
      );
    } finally {
      closeDialog();
    }
  }

  Future<String> _resolveShortCode(Map<dynamic, dynamic> news) async {
    final existingShort = (news['short_code'] ?? news['shortCode'])?.toString().trim() ?? '';
    if (existingShort.length == 5) {
      return existingShort;
    }
    final rawId = news['id']?.toString().trim() ?? '';
    if (rawId.length == 5) {
      return rawId;
    }
    if (rawId.isNotEmpty) {
      try {
        final res = await apiClient.get('/news/$rawId');
        if (res.data != null && res.data['news'] != null) {
          final fetched = res.data['news'];
          final fetchedCode = (fetched['short_code'] ?? fetched['shortCode'])?.toString().trim() ?? '';
          if (fetchedCode.length == 5) {
            news['short_code'] = fetchedCode;
            news['shortCode'] = fetchedCode;
            return fetchedCode;
          }
        }
      } catch (_) {}
    }
    final fallback5 = getDeterministicShortCode(rawId.isNotEmpty ? rawId : existingShort);
    news['short_code'] = fallback5;
    news['shortCode'] = fallback5;
    return fallback5;
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E), // Dark background matching reference UI
      body: SafeArea(
        bottom: false,
        child: Column(
                children: [
                  // Top Header Bar matching Reference UI: News (Left) & Location (Right)
                  Container(
                    height: 50,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E1E1E),
                      border: Border(
                        bottom: BorderSide(color: Color(0xFF2C2C2C), width: 1),
                      ),
                    ),
                    child: Row(
                      children: [
                        // Left Tab: News (వార్తలు)
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              if (_selectedTab != 0) {
                                setState(() => _selectedTab = 0);
                                _fetchNews(refresh: true);
                              }
                            },
                            child: Container(
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: _selectedTab == 0 ? const Color(0xFFE53935) : Colors.transparent,
                                    width: 2.5,
                                  ),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.article_outlined,
                                    color: _selectedTab == 0 ? const Color(0xFFE53935) : Colors.white,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'వార్తలు',
                                    style: GoogleFonts.notoSansTelugu(
                                      color: _selectedTab == 0 ? const Color(0xFFE53935) : Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        // Right Tab: Location Tab
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              if (_selectedTab != 1) {
                                setState(() => _selectedTab = 1);
                                final prefs = await SharedPreferences.getInstance();
                                final hasLocation = prefs.getString('selected_mandal_id') != null ||
                                    prefs.getString('selected_district_id') != null ||
                                    prefs.getString('selected_state_id') != null;
                                if (!hasLocation) {
                                  await _openLocationPicker();
                                } else {
                                  _fetchNews(refresh: true);
                                }
                              } else {
                                await _openLocationPicker();
                              }
                            },
                            child: Container(
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: _selectedTab == 1 ? const Color(0xFFE53935) : Colors.transparent,
                                    width: 2.5,
                                  ),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.location_on_outlined,
                                    color: _selectedTab == 1 ? const Color(0xFFE53935) : Colors.white70,
                                    size: 19,
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      _selectedLocationName,
                                      style: GoogleFonts.notoSansTelugu(
                                        color: _selectedTab == 1 ? const Color(0xFFE53935) : Colors.white70,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14.5,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 2),
                                  Icon(
                                    Icons.arrow_drop_down_rounded,
                                    color: _selectedTab == 1 ? const Color(0xFFE53935) : Colors.white70,
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        // Search News Button
                        IconButton(
                          icon: const Icon(
                            Icons.search_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                          tooltip: 'Search News (శోధించండి)',
                          onPressed: () => context.push('/search'),
                        ),

                        // View Mode Toggle Button (Shorts vs List View showing 3-4 posts/screen)
                        IconButton(
                          icon: Icon(
                            _isListView ? Icons.view_agenda_rounded : Icons.view_stream_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          tooltip: _isListView ? 'Shorts View' : 'Multi-post List View',
                          onPressed: () {
                            setState(() => _isListView = !_isListView);
                          },
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
                      )
                    : _hasError
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                                const SizedBox(height: 16),
                                Text(
                                  'Unable to load news',
                                  style: GoogleFonts.poppins(fontSize: 16, color: Colors.grey[600]),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: () => _fetchNews(refresh: true),
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)),
                                  child: const Text('Retry', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          )
                        : _newsItems.isEmpty
                            ? Center(
                                child: Text(
                                  'No news available',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    color: const Color(0xFF999999),
                                  ),
                                ),
                              )
                            : Column(
                            children: [
                              if (_breakingNews.isNotEmpty)
                                Container(
                                  color: const Color(0xFFD32F2F),
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.campaign, color: Colors.white, size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _breakingNews.first['title'] ?? '',
                                          style: GoogleFonts.poppins(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              Expanded(
                                child: RefreshIndicator(
                                  color: const Color(0xFFD32F2F),
                                  onRefresh: () => _fetchNews(refresh: true),
                                  child: _isListView
                                      ? ListView.builder(
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          itemCount: _newsItems.length + (_hasMore ? 1 : 0),
                                          itemBuilder: (context, index) {
                                            if (index == _newsItems.length) {
                                              return const Center(
                                                child: Padding(
                                                  padding: EdgeInsets.all(16.0),
                                                  child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
                                                ),
                                              );
                                            }
                                            final item = _newsItems[index];
                                            if (item['type'] == 'ad' || item['type'] == 'ad_slider' || item['type'] == 'admob_native') {
                                              return const SizedBox.shrink();
                                            }
                                            return _buildCompactNewsTile(item, index, isDark);
                                          },
                                        )
                                      : PageView.builder(
                                          controller: _pageController,
                                          scrollDirection: Axis.vertical,
                                          padEnds: false,
                                          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                                          onPageChanged: (index) {
                                            if (_pageEnterTime != null && _lastPageIndex < _newsItems.length) {
                                              final item = _newsItems[_lastPageIndex];
                                              if (item['type'] != 'ad' && item['id'] != null) {
                                                final duration = DateTime.now().difference(_pageEnterTime!).inSeconds;
                                                _logInteraction(item['id'].toString(), 'watch_time', value: duration);
                                              }
                                            }
                                            _pageEnterTime = DateTime.now();
                                            if (mounted) {
                                              setState(() {
                                                _lastPageIndex = index;
                                              });
                                            }

                                            AdManager.instance.notifyStorySwiped();
                                            if (index >= _newsItems.length - 2 && !_isLoadingMore && _hasMore) {
                                              _loadMore();
                                            }
                                          },
                                          itemCount: _newsItems.length + (_hasMore ? 1 : 0),
                                          itemBuilder: (context, index) {
                                            if (index == _newsItems.length) {
                                              return const Center(
                                                child: Padding(
                                                  padding: EdgeInsets.all(16.0),
                                                  child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
                                                ),
                                              );
                                            }
                                            final item = _newsItems[index];
                                            
                                            if (item['type'] != 'ad' && item['type'] != 'ad_slider' && item['type'] != 'admob_native' && item['id'] != null) {
                                              if (item['_view_logged'] != true) {
                                                item['_view_logged'] = true;
                                                WidgetsBinding.instance.addPostFrameCallback((_) {
                                                  _logInteraction(item['id'].toString(), 'view');
                                                  InAppReviewService.instance.recordArticleRead(context);
                                                });
                                              }
                                            }
                                            
                                            Widget cardWidget;
                                            if (item['type'] == 'ad') {
                                              cardWidget = CustomAdWidget(
                                                ad: item['ad'] ?? item['ad_data'] ?? {},
                                                onSkip: () {
                                                  if (_pageController.hasClients) {
                                                    _pageController.nextPage(
                                                      duration: const Duration(milliseconds: 350),
                                                      curve: Curves.easeInOut,
                                                    );
                                                  }
                                                },
                                              );
                                            } else if (item['type'] == 'ad_slider') {
                                              cardWidget = AdSliderWidget(ads: item['ads'] ?? []);
                                            } else if (item['type'] == 'admob_native') {
                                              cardWidget = const AdmobNativeWidget();
                                            } else {
                                              cardWidget = NewsCard(
                                                news: item,
                                                onTap: AppEvents.toggleBottomNav,
                                                onShare: () => _handleShare(item),
                                                onWhatsAppShare: () => _handleWhatsAppShare(item),
                                                timeAgo: _timeAgo((item['publishedAt'] ?? item['created_at'] ?? item['createdAt'])?.toString()),
                                                isVisible: _isTabActive && (index == _lastPageIndex),
                                                pageIndex: index + 1,
                                                totalPages: _newsItems.length,
                                              );
                                            }
                                            
                                            return RepaintBoundary(
                                              child: Container(
                                                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                                                child: cardWidget,
                                              ),
                                            );
                                          },
                                        ),
                                ),
                              ),
                            ],
                          ),
              ),
            ],
          ),
        ),
    );
  }
}

