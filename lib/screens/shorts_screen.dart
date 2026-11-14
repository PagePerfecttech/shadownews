import 'dart:async';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../api/api_client.dart';
import '../widgets/video_player_item.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../utils/events.dart';

class ShortsScreen extends StatefulWidget {
  const ShortsScreen({super.key});

  @override
  State<ShortsScreen> createState() => _ShortsScreenState();
}

class _ShortsScreenState extends State<ShortsScreen> {
  final List<dynamic> _videos = [];
  bool _isLoading = true;
  int _currentPage = 1;
  int _currentIndex = 0;
  bool _hasMore = true;
  bool _isWidgetVisible = true;
  bool _isTabActive = (AppEvents.currentTab == 1);
  StreamSubscription<int>? _tabSub;

  @override
  void initState() {
    super.initState();
    _isTabActive = (AppEvents.currentTab == 1);
    _tabSub = AppEvents.tabChanged.stream.listen((activeTabIndex) {
      if (mounted) {
        final isShortsActive = (activeTabIndex == 1);
        if (_isTabActive != isShortsActive) {
          setState(() {
            _isTabActive = isShortsActive;
          });
        }
      }
    });
    _fetchVideos();
  }

  @override
  void dispose() {
    _tabSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchVideos() async {
    if (!_hasMore) return;

    try {
      final response = await apiClient.get(
        '/videos?page=$_currentPage&limit=10',
      );
      final newVideos = response.data['videos'] as List;

      if (mounted) {
        setState(() {
          _videos.addAll(newVideos);
          _isLoading = false;
          if (newVideos.length < 10) {
            _hasMore = false;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      debugPrint('Failed to fetch videos: $e');
    }
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
    });

    if (index >= _videos.length - 2 && _hasMore) {
      _currentPage++;
      _fetchVideos();
    }
  }

  Future<void> _onLike(String videoId, String action) async {
    try {
      await apiClient.post(
        '/reactions',
        data: {'videoId': videoId, 'action': action, 'type': 'like'},
      );
    } catch (e) {
      debugPrint('Like error: $e');
    }
  }

  Future<void> _onShare(String videoId) async {
    try {
      final video = _videos.firstWhere(
        (v) => v['id'].toString() == videoId,
        orElse: () => null,
      );

      if (video != null) {
        final title = video['title'] as String? ?? 'Check out this video';
        final url = video['url'] as String? ?? '';

        await SharePlus.instance.share(
          ShareParams(
            text: '$title\n\nCheck it out on Shadow News: $url',
            subject: 'Shadow News Shorts - $title',
          ),
        );
      }
    } catch (e) {
      debugPrint('Share error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _videos.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: VisibilityDetector(
        key: const Key('shorts_screen_visibility'),
        onVisibilityChanged: (info) {
          if (mounted) {
            final isVisible = info.visibleFraction > 0.05;
            if (_isWidgetVisible != isVisible) {
              setState(() {
                _isWidgetVisible = isVisible;
              });
            }
          }
        },
        child: PageView.builder(
          scrollDirection: Axis.vertical,
          onPageChanged: _onPageChanged,
          itemCount: _videos.length,
          itemBuilder: (context, index) {
            final video = _videos[index];
            return VideoPlayerItem(
              key: ValueKey(video['id'].toString()),
              videoData: video,
              isVisible: _isTabActive && _isWidgetVisible && (index == _currentIndex),
              onLike: (action) => _onLike(video['id'].toString(), action),
              onShare: () => _onShare(video['id'].toString()),
            );
          },
        ),
      ),
    );
  }
}
