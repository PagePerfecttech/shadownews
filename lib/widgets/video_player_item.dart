import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

class VideoPlayerItem extends StatefulWidget {
  final Map<dynamic, dynamic> videoData;
  final bool isVisible;
  final Function(String action) onLike;
  final VoidCallback onShare;

  const VideoPlayerItem({
    super.key,
    required this.videoData,
    required this.isVisible,
    required this.onLike,
    required this.onShare,
  });

  @override
  State<VideoPlayerItem> createState() => _VideoPlayerItemState();
}

class _VideoPlayerItemState extends State<VideoPlayerItem> with WidgetsBindingObserver {
  VideoPlayerController? _controller;
  YoutubePlayerController? _ytController;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _isYoutube = false;
  int _likesCount = 0;
  int _viewsCount = 0;
  bool _isLiked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _likesCount = widget.videoData['_count']?['reactions'] ?? 0;
    _viewsCount = widget.videoData['views_count'] ?? widget.videoData['viewsCount'] ?? 0;
    _initVideo();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive || state == AppLifecycleState.hidden) {
      // Force pause and mute when app goes to background
      if (_isYoutube) {
        _ytController?.pause();
        _ytController?.mute();
      } else {
        _controller?.pause();
      }
    } else if (state == AppLifecycleState.resumed && widget.isVisible) {
      // Resume only if this item is currently visible
      if (_isYoutube) {
        _ytController?.unMute();
        _ytController?.play();
      } else {
        _controller?.play();
      }
    }
  }

  Future<void> _initVideo() async {
    try {
      final url = widget.videoData['video_url'] ?? widget.videoData['videoUrl'] ?? widget.videoData['url'];
      final ytId = YoutubePlayer.convertUrlToId(url?.toString() ?? '');

      if (ytId != null && ytId.isNotEmpty) {
        _isYoutube = true;
        _ytController = YoutubePlayerController(
          initialVideoId: ytId,
          flags: YoutubePlayerFlags(
            autoPlay: widget.isVisible,
            loop: true,
            hideControls: true,
            mute: !widget.isVisible,
          ),
        );
        if (mounted) {
          setState(() {
            _isInitialized = true;
          });
        }
        if (widget.isVisible) {
          _ytController?.unMute();
          _ytController?.play();
        }
      } else if (url != null && url.toString().isNotEmpty) {
        _controller = VideoPlayerController.networkUrl(
          Uri.parse(url.toString()),
        );
        await _controller!.initialize();
        _controller!.setLooping(true);
        _controller!.setVolume(1.0);
        if (mounted) {
          setState(() {
            _isInitialized = true;
          });
        }
        if (widget.isVisible) {
          await _controller!.play();
        }
      } else {
        if (mounted) {
          setState(() {
            _hasError = true;
          });
        }
      }
    } catch (e) {
      debugPrint('Video init error: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void didUpdateWidget(VideoPlayerItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isVisible) {
      if (_isInitialized) {
        if (_isYoutube) {
          _ytController?.unMute();
          if (_ytController != null && !_ytController!.value.isPlaying) {
            _ytController?.play();
          }
        } else {
          if (_controller != null && !_controller!.value.isPlaying) {
            _controller?.play();
          }
        }
      } else if (!_hasError) {
        _initVideo();
      }
    } else {
      if (_isInitialized) {
        if (_isYoutube) {
          _ytController?.pause();
          _ytController?.mute();
        } else {
          _controller?.pause();
        }
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    _ytController?.dispose();
    super.dispose();
  }

  void _handleLike() {
    setState(() {
      if (_isLiked) {
        _likesCount--;
        widget.onLike('remove');
      } else {
        _likesCount++;
        widget.onLike('add');
      }
      _isLiked = !_isLiked;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Stack(
        children: [
          // Video Layer
          if (_hasError)
            const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, color: Colors.white54, size: 48),
                  SizedBox(height: 16),
                  Text('Video unavailable', style: TextStyle(color: Colors.white54)),
                ],
              ),
            )
          else if (_isInitialized)
            Center(
              child: _isYoutube
                  ? YoutubePlayer(
                      controller: _ytController!,
                      showVideoProgressIndicator: false,
                      bottomActions: const [], // hide all controls
                    )
                  : AspectRatio(
                      aspectRatio: _controller!.value.aspectRatio,
                      child: VideoPlayer(_controller!),
                    ),
            )
          else
            const Center(child: CircularProgressIndicator(color: Colors.white)),

          // Top-right side automatically added channel logo overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.65),
                borderRadius: BorderRadius.circular(8),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/logo.png',
                height: 24,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
          ),

          // UI Layer
          Positioned(
            bottom: 20,
            left: 16,
            right: 80,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.videoData['title'] ?? '',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.videoData['description'] ?? '',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 15.5,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Action Buttons
          Positioned(
            right: 16,
            bottom: 20,
            child: Column(
              children: [
                _buildActionButton(
                  _isLiked ? Icons.favorite : Icons.favorite_border,
                  '$_likesCount',
                  _handleLike,
                  color: _isLiked ? Colors.red : Colors.white,
                ),
                const SizedBox(height: 16),
                _buildActionButton(Icons.remove_red_eye_outlined, '$_viewsCount', () {}),
                const SizedBox(height: 16),
                _buildActionButton(Icons.share, 'Share', widget.onShare),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap, {Color color = Colors.white}) {
    return Column(
      children: [
        IconButton(
          icon: Icon(icon, color: color, size: 32),
          onPressed: onTap,
        ),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }
}

