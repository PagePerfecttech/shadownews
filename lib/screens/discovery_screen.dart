import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../widgets/share_card.dart';
import '../widgets/native_ad_widget.dart';
import '../services/ad_manager.dart';
import '../widgets/news_card.dart';

import '../widgets/location_picker_sheet.dart';
import '../config.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  List<dynamic> _categories = [];
  bool _isLoadingCategories = true;
  String? _errorMessage;

  // Selected Category State
  Map<dynamic, dynamic>? _selectedCategory;
  List<dynamic> _newsItems = [];
  bool _isLoadingFeed = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 1;
  int _currentRetryLevel = 0;
  late PageController _pageController;

  final GlobalKey _shareRepaintKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadSelectedLocation();
    _fetchCategories();
  }

  String? _selectedLocation;

  Future<void> _loadSelectedLocation() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedLocation =
          prefs.getString('selected_district_name') ?? 'All Districts';
    });
  }

  Future<void> _showLocationPicker() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const LocationPickerSheet(),
    );
    _loadSelectedLocation();
    _fetchCategoryNews(refresh: true);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await apiClient.get('/categories');
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['categories'] ?? []);
      setState(() {
        _categories = data;
        _isLoadingCategories = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load categories.';
        _isLoadingCategories = false;
      });
    }
  }

  void _selectCategory(Map<dynamic, dynamic> category) {
    setState(() {
      _selectedCategory = category;
    });
    _fetchCategoryNews(refresh: true);
  }

  void _clearCategory() {
    setState(() {
      _selectedCategory = null;
      _newsItems = [];
    });
  }

  String _formatImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('/')) {
      return '${AppConfig.baseUrl}$url';
    }
    return url.replaceAll(
      RegExp(r'placehold\.co/(\d+x\d+)/'),
      r'placehold.co/$1/png/',
    );
  }

  Future<void> _fetchCategoryNews({bool refresh = false, int retryLevel = 0}) async {
    if (_selectedCategory == null) return;

    if (refresh) {
      setState(() {
        _currentPage = 1;
        _hasMore = true;
        _newsItems = [];
        _isLoadingFeed = true;
        _currentRetryLevel = 0;
      });
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final mandalId = prefs.getString('selected_mandal_id');
      final districtId = prefs.getString('selected_district_id');
      final stateId = prefs.getString('selected_state_id');

      final catId = _selectedCategory!['id'];
      String url = '/feed?page=$_currentPage&limit=10&category=$catId';

      // Apply location filters with fallback
      if (retryLevel <= 0 && mandalId != null && mandalId.isNotEmpty) {
        url += '&mandal_id=$mandalId';
      }
      if (retryLevel <= 1 && districtId != null && districtId.isNotEmpty) {
        url += '&district_id=$districtId';
      }
      if (retryLevel <= 2 && stateId != null && stateId.isNotEmpty) {
        url += '&state_id=$stateId';
      }

      final response = await apiClient.get(url);
      final feedData = response.data['feed'] as List;
      final total = response.data['total'] as int? ?? 0;

      // Handle Fallback if no news found on first page
      if (feedData.isEmpty && _currentPage == 1 && retryLevel < 3) {
        if (retryLevel == 0 && mandalId != null && mandalId.isNotEmpty) {
          return _fetchCategoryNews(refresh: false, retryLevel: 1);
        } else if (retryLevel <= 1 && districtId != null && districtId.isNotEmpty) {
          return _fetchCategoryNews(refresh: false, retryLevel: 2);
        } else if (retryLevel <= 2 && stateId != null && stateId.isNotEmpty) {
          return _fetchCategoryNews(refresh: false, retryLevel: 3);
        }
      }

      _currentRetryLevel = retryLevel;

      final newItems = feedData.map((item) {
        if (item['type'] == 'ad' || item['type'] == 'admob_native') {
          return item is Map ? Map<String, dynamic>.from(item) : {'type': 'admob_native'};
        }
        final news = item['news'];
        if (news == null) return null;
        return {
          'type': 'news',
          'id': news['id'],
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
          'reporter_image': news['reporter']?['avatar'],
          'location_name': news['mandal']?['name'] ?? news['district']?['name'] ?? news['location'] ?? '',
          'shares_count': news['sharesCount'] ?? 0,
          'reposts_count': news['_count']?['reactions'] ?? 0,
          'comments_count': news['_count']?['comments'] ?? 0,
        };
      }).whereType<Map<String, dynamic>>().toList();

      if (AdManager.admobFeedEnabled && !newItems.any((i) => i['type'] == 'ad' || i['type'] == 'admob_native')) {
        int adCounter = 0;
        final withAds = <Map<String, dynamic>>[];
        for (var it in newItems) {
          withAds.add(it);
          if (it['type'] == 'news') {
            adCounter++;
            if (adCounter % AdManager.adFeedFrequency == 0) {
              withAds.add({'type': 'admob_native'});
            }
          }
        }
        newItems.clear();
        newItems.addAll(withAds);
      }

      List<dynamic> updatedItems = refresh ? [] : List.from(_newsItems);
      for (var i = 0; i < newItems.length; i++) {
        updatedItems.add(newItems[i]);
      }

      setState(() {
        _newsItems = updatedItems;
        _hasMore = updatedItems.length < total;
        _isLoadingFeed = false;
        _isLoadingMore = false;
      });
    } catch (e) {
      debugPrint('Error fetching category feed: $e');
      if (_currentPage == 1 && retryLevel < 3) {
        return _fetchCategoryNews(refresh: false, retryLevel: retryLevel + 1);
      }
      if (!refresh) _currentPage--;
      setState(() {
        _isLoadingFeed = false;
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    _currentPage++;
    await _fetchCategoryNews(retryLevel: _currentRetryLevel);
  }

  String _timeAgo(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 365) {
        return '${(difference.inDays / 365).floor()}y ago';
      }
      if (difference.inDays > 30) {
        return '${(difference.inDays / 30).floor()}mo ago';
      }
      if (difference.inDays > 0) return '${difference.inDays}d ago';
      if (difference.inHours > 0) return '${difference.inHours}h ago';
      if (difference.inMinutes > 0) return '${difference.inMinutes}m ago';
      return 'Just now';
    } catch (_) {
      return '';
    }
  }

  Future<void> _handleReaction(String id, String type) async {
    try {
      await apiClient.post(
        '/reactions',
        data: {'newsId': id, 'action': 'add', 'type': type},
      );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Reaction saved!')));
      }
    } catch (e) {
      debugPrint('Error saving reaction: $e');
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

  Future<void> _handleWhatsAppShare(Map<dynamic, dynamic> news) async {
    try {
      await apiClient.post('/news/${news['id']}', data: {'action': 'share'});
    } catch (_) {}

    if (!mounted) return;

    final String resolvedImg = _resolveNewsImageUrl(news);
    Uint8List? preloadedBytes;
    if (resolvedImg.isNotEmpty && mounted) {
      preloadedBytes = await preloadImageBytes(resolvedImg);
    }

    final String reporterName = news['reporter_name']?.toString() ?? news['reporter']?['name']?.toString() ?? 'Shadow News';
    final String reporterImage = news['reporter_image']?.toString() ?? news['reporter']?['avatar']?.toString() ?? '';
    final String location = news['location_name']?.toString() ?? news['district_name']?.toString() ?? news['location']?.toString() ?? '';
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
                    stripColor: const Color(0xFFD32F2F),
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
    } catch (_) {}

    if (!mounted) return;

    final String resolvedImg = _resolveNewsImageUrl(news);
    Uint8List? preloadedBytes;
    if (resolvedImg.isNotEmpty && mounted) {
      preloadedBytes = await preloadImageBytes(resolvedImg);
    }

    final String reporterName = news['reporter_name']?.toString() ?? news['reporter']?['name']?.toString() ?? 'Shadow News';
    final String reporterImage = news['reporter_image']?.toString() ?? news['reporter']?['avatar']?.toString() ?? '';
    final String location = news['location_name']?.toString() ?? news['district_name']?.toString() ?? news['location']?.toString() ?? '';
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
                    stripColor: const Color(0xFFD32F2F),
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
                        color: Color(0xFFD32F2F),
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
    if (existingShort.isNotEmpty && existingShort.length <= 5) {
      return existingShort;
    }
    final rawId = news['id']?.toString().trim() ?? '';
    if (rawId.isNotEmpty && rawId.length <= 5) {
      return rawId;
    }
    if (rawId.isNotEmpty) {
      try {
        final res = await apiClient.get('/news/$rawId');
        if (res.data != null && res.data['news'] != null) {
          final fetched = res.data['news'];
          final fetchedCode = (fetched['short_code'] ?? fetched['shortCode'])?.toString().trim() ?? '';
          if (fetchedCode.isNotEmpty && fetchedCode.length <= 5) {
            news['short_code'] = fetchedCode;
            news['shortCode'] = fetchedCode;
            return fetchedCode;
          }
        }
      } catch (_) {}
    }
    if (existingShort.isNotEmpty) return existingShort;
    return rawId;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final scaffoldBgColor = isDark
        ? const Color(0xFF121212)
        : const Color(0xFFF5F5F7);

    if (_selectedCategory == null) {
      return Scaffold(
        backgroundColor: scaffoldBgColor,
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Discover Categories',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  color: theme.textTheme.bodyLarge?.color,
                  fontSize: 20,
                ),
              ),
              const SizedBox(height: 2),
              GestureDetector(
                onTap: _showLocationPicker,
                child: Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 14,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _selectedLocation ?? 'Select Location',
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 2),
                    Icon(
                      Icons.keyboard_arrow_down,
                      size: 16,
                      color: Colors.grey.shade600,
                    ),
                  ],
                ),
              ),
            ],
          ),
          backgroundColor: theme.scaffoldBackgroundColor,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        body: _isLoadingCategories
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
              )
            : _errorMessage != null
            ? Center(child: Text(_errorMessage!))
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.2,
                ),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  String hexColor = cat['color'] ?? '#D32F2F';
                  hexColor = hexColor.replaceAll('#', '');
                  if (hexColor.length == 6) hexColor = 'FF$hexColor';
                  final color = Color(
                    int.tryParse(hexColor, radix: 16) ?? 0xFFD32F2F,
                  );

                  return GestureDetector(
                    onTap: () => _selectCategory(cat),
                    child: Container(
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: color.withValues(alpha: 0.3),
                          width: 2,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            cat['name'] ?? '',
                            style: GoogleFonts.poppins(
                              color: isDark ? Colors.white : Colors.black87,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      );
    }

    // FEED VIEW
    return Scaffold(
      backgroundColor: scaffoldBgColor,
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: theme.iconTheme.color),
          onPressed: _clearCategory,
        ),
        title: Text(
          _selectedCategory!['name'] ?? '',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: theme.textTheme.bodyLarge?.color,
            fontSize: 18,
          ),
        ),
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
      ),
      body: _isLoadingFeed
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
            )
          : _newsItems.isEmpty
          ? Center(child: Text('No news found in this category'))
          : PageView.builder(
              scrollDirection: Axis.vertical,
              controller: _pageController,
              itemCount: _newsItems.length + (_hasMore ? 1 : 1),
              itemBuilder: (context, index) {
                if (index == _newsItems.length) {
                  if (_hasMore) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      _loadMore();
                    });
                    return const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFFD32F2F),
                      ),
                    );
                  } else {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.check_circle_outline,
                            size: 64,
                            color: Color(0xFFD32F2F),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            "You're all caught up!",
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                }
                final item = _newsItems[index];
                if (item['type'] == 'ad' || item['type'] == 'admob_native') return const NativeAdWidget();
                return NewsCard(
                  news: item,
                  onReaction: () => _handleReaction(item['id'], 'repost'),
                  onShare: () => _handleShare(item),
                  onWhatsAppShare: () => _handleWhatsAppShare(item),
                  timeAgo: _timeAgo((item['publishedAt'] ?? item['created_at'] ?? item['createdAt'])?.toString()),
                  pageIndex: index + 1,
                  totalPages: _newsItems.length,
                );
              },
            ),
    );
  }

  
}
