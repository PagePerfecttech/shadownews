import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

class NewsInlineVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final String? thumbnailUrl;
  final bool isVisible;

  const NewsInlineVideoPlayer({
    super.key,
    required this.videoUrl,
    this.thumbnailUrl,
    this.isVisible = true,
  });

  @override
  State<NewsInlineVideoPlayer> createState() => _NewsInlineVideoPlayerState();
}

class _NewsInlineVideoPlayerState extends State<NewsInlineVideoPlayer> with WidgetsBindingObserver {
  VideoPlayerController? _controller;
  YoutubePlayerController? _ytController;
  bool _isInitialized = false;
  bool _isLoading = false;
  bool _hasError = false;
  bool _isYoutube = false;
  bool _isMuted = false;
  bool _showControls = true;
  Timer? _controlsTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.isVisible) {
      _initVideo();
    }
  }

  @override
  void didUpdateWidget(NewsInlineVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.videoUrl != oldWidget.videoUrl) {
      _disposeControllers();
      _isInitialized = false;
      _hasError = false;
      if (widget.isVisible) {
        _initVideo();
      }
    } else if (widget.isVisible != oldWidget.isVisible) {
      if (widget.isVisible) {
        if (!_isInitialized && !_hasError) {
          _initVideo();
        } else {
          _playVideo();
        }
      } else {
        _pauseVideo();
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      _pauseVideo();
    } else if (state == AppLifecycleState.resumed && widget.isVisible) {
      _playVideo();
    }
  }

  void _pauseVideo() {
    if (_isInitialized) {
      if (_isYoutube && _ytController != null) {
        _ytController?.pause();
        _ytController?.mute();
      } else if (_controller != null) {
        _controller?.pause();
      }
      _cancelControlsTimer();
      if (mounted) setState(() => _showControls = true);
    }
  }

  void _playVideo() {
    if (_isInitialized) {
      if (_isYoutube && _ytController != null) {
        if (!_isMuted) _ytController?.unMute();
        _ytController?.play();
      } else if (_controller != null) {
        _controller?.setVolume(_isMuted ? 0.0 : 1.0);
        _controller?.play();
      }
      _startControlsTimer();
      if (mounted) setState(() {});
    }
  }

  Future<void> _initVideo() async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _hasError = false;
    });

    try {
      final ytId = YoutubePlayer.convertUrlToId(widget.videoUrl);
      if (ytId != null && ytId.isNotEmpty) {
        _isYoutube = true;
        _ytController = YoutubePlayerController(
          initialVideoId: ytId,
          flags: YoutubePlayerFlags(
            autoPlay: widget.isVisible,
            loop: true,
            hideControls: false,
            mute: _isMuted || !widget.isVisible,
          ),
        );
        _ytController!.addListener(_videoListener);
        if (mounted) {
          setState(() {
            _isInitialized = true;
            _isLoading = false;
          });
          if (widget.isVisible) {
            _startControlsTimer();
          }
        }
      } else {
        _isYoutube = false;
        final controller = VideoPlayerController.networkUrl(
          Uri.parse(widget.videoUrl),
          videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
        );
        _controller = controller;

        await controller.initialize();
        controller.setLooping(true);
        controller.setVolume(_isMuted ? 0.0 : 1.0);
        controller.addListener(_videoListener);

        if (mounted) {
          setState(() {
            _isInitialized = true;
            _isLoading = false;
          });
          if (widget.isVisible) {
            await controller.play();
            _startControlsTimer();
          }
        }
      }
    } catch (e) {
      debugPrint('[NewsInlineVideoPlayer] Error initializing video: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _isLoading = false;
          _isInitialized = false;
        });
      }
    }
  }

  void _videoListener() {
    if (!mounted) return;
    setState(() {});
  }

  void _startControlsTimer() {
    _controlsTimer?.cancel();
    _controlsTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _cancelControlsTimer() {
    _controlsTimer?.cancel();
    _controlsTimer = null;
  }

  bool get _isPlaying {
    if (_isYoutube && _ytController != null) {
      return _ytController!.value.isPlaying;
    } else if (_controller != null && _controller!.value.isInitialized) {
      return _controller!.value.isPlaying;
    }
    return false;
  }

  void _togglePlayPause() {
    if (!_isInitialized) {
      _initVideo();
      return;
    }
    if (_isPlaying) {
      _pauseVideo();
    } else {
      _playVideo();
    }
  }

  void _toggleMute() {
    if (!_isInitialized) return;
    setState(() {
      _isMuted = !_isMuted;
    });
    if (_isYoutube && _ytController != null) {
      _isMuted ? _ytController!.mute() : _ytController!.unMute();
    } else if (_controller != null) {
      _controller!.setVolume(_isMuted ? 0.0 : 1.0);
    }
  }

  void _handleTapScreen() {
    if (!_isInitialized) {
      _initVideo();
      return;
    }
    setState(() {
      _showControls = !_showControls;
    });
    if (_showControls && _isPlaying) {
      _startControlsTimer();
    } else {
      _cancelControlsTimer();
    }
  }

  void _openFullScreen() {
    _pauseVideo();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => FullScreenVideoViewer(
          videoUrl: widget.videoUrl,
          isYoutube: _isYoutube,
          initialPosition: _controller?.value.position ?? Duration.zero,
          isMuted: _isMuted,
        ),
      ),
    ).then((_) {
      if (widget.isVisible && mounted) {
        _playVideo();
      }
    });
  }

  void _disposeControllers() {
    _cancelControlsTimer();
    _controller?.removeListener(_videoListener);
    _controller?.dispose();
    _controller = null;
    _ytController?.removeListener(_videoListener);
    _ytController?.dispose();
    _ytController = null;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeControllers();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    if (duration.inHours > 0) {
      return '${twoDigits(duration.inHours)}:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: GestureDetector(
        onTap: _handleTapScreen,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 1. VIDEO LAYER OR THUMBNAIL PLACEHOLDER
            if (_isInitialized && !_hasError) ...[
              _isYoutube && _ytController != null
                  ? Center(
                      child: YoutubePlayer(
                        controller: _ytController!,
                        showVideoProgressIndicator: true,
                        progressIndicatorColor: const Color(0xFFD32F2F),
                      ),
                    )
                  : Center(
                      child: AspectRatio(
                        aspectRatio: _controller!.value.aspectRatio > 0 ? _controller!.value.aspectRatio : 16 / 9,
                        child: VideoPlayer(_controller!),
                      ),
                    ),
            ] else ...[
              if (widget.thumbnailUrl != null && widget.thumbnailUrl!.isNotEmpty)
                CachedNetworkImage(
                  imageUrl: widget.thumbnailUrl!,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(color: Colors.black),
                  errorWidget: (context, url, error) => Container(
                    color: Colors.black87,
                    child: const Center(
                      child: Icon(Icons.videocam_outlined, color: Colors.white54, size: 48),
                    ),
                  ),
                )
              else
                Container(
                  color: Colors.black87,
                  child: const Center(
                    child: Icon(Icons.videocam_outlined, color: Colors.white54, size: 48),
                  ),
                ),
            ],

            // 2. LOADING SPINNER
            if (_isLoading || (_isInitialized && _controller != null && _controller!.value.isBuffering))
              Container(
                color: Colors.black38,
                child: const Center(
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: CircularProgressIndicator(
                      color: Color(0xFFD32F2F),
                      strokeWidth: 3.5,
                    ),
                  ),
                ),
              ),

            // 3. ERROR OVERLAY (IF ANY)
            if (_hasError)
              Container(
                color: Colors.black87,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white70, size: 36),
                      const SizedBox(height: 8),
                      const Text(
                        'వీడియో ప్లే కాలేదు',
                        style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: _initVideo,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('మళ్ళీ ప్రయత్నించండి'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          textStyle: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // 4. WAY 2 NEWS STYLE CENTER PLAY/PAUSE BUTTON
            if (!_hasError && (_showControls || !_isPlaying))
              Center(
                child: GestureDetector(
                  onTap: _togglePlayPause,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 2.5),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(
                      _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 40,
                    ),
                  ),
                ),
              ),

            // 5. TOP BAR: Channel Logo & Audio Mute/Unmute
            Positioned(
              top: 10,
              left: 12,
              right: 10,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Channel Watermark
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Image.asset(
                      'assets/images/logo.png',
                      height: 18,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const SizedBox(),
                    ),
                  ),

                  // Mute / Unmute Button
                  if (_isInitialized)
                    GestureDetector(
                      onTap: _toggleMute,
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white24, width: 1),
                        ),
                        child: Icon(
                          _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // 6. BOTTOM CONTROLS OVERLAY (Scrubber, Time, Fullscreen, Video Badge)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.only(left: 10, right: 10, bottom: 6, top: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.8),
                    ],
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Badge row
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD32F2F),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.play_circle_fill, color: Colors.white, size: 12),
                              SizedBox(width: 4),
                              Text(
                                'వీడియో న్యూస్',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        // Fullscreen button
                        if (_isInitialized && !_isYoutube)
                          GestureDetector(
                            onTap: _openFullScreen,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Icon(
                                Icons.fullscreen_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                          ),
                      ],
                    ),

                    const SizedBox(height: 4),

                    // Progress Bar & Time Row
                    if (_isInitialized && _controller != null && !_isYoutube) ...[
                      Row(
                        children: [
                          Text(
                            _formatDuration(_controller!.value.position),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: VideoProgressIndicator(
                              _controller!,
                              allowScrubbing: true,
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              colors: const VideoProgressColors(
                                playedColor: Color(0xFFD32F2F),
                                bufferedColor: Colors.white38,
                                backgroundColor: Colors.white24,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _formatDuration(_controller!.value.duration),
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ] else if (!_isYoutube && !_hasError) ...[
                      // Thin progress line placeholder while loading
                      Container(
                        height: 3,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dedicated Fullscreen Video Viewer
class FullScreenVideoViewer extends StatefulWidget {
  final String videoUrl;
  final bool isYoutube;
  final Duration initialPosition;
  final bool isMuted;

  const FullScreenVideoViewer({
    super.key,
    required this.videoUrl,
    required this.isYoutube,
    required this.initialPosition,
    required this.isMuted,
  });

  @override
  State<FullScreenVideoViewer> createState() => _FullScreenVideoViewerState();
}

class _FullScreenVideoViewerState extends State<FullScreenVideoViewer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isMuted = false;
  bool _showControls = true;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    _isMuted = widget.isMuted;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    await _controller!.initialize();
    await _controller!.seekTo(widget.initialPosition);
    _controller!.setLooping(true);
    _controller!.setVolume(_isMuted ? 0.0 : 1.0);
    _controller!.addListener(() {
      if (mounted) setState(() {});
    });
    await _controller!.play();
    if (mounted) {
      setState(() => _isInitialized = true);
      _startTimer();
    }
  }

  void _startTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && (_controller?.value.isPlaying ?? false)) {
        setState(() => _showControls = false);
      }
    });
  }

  void _togglePlay() {
    if (_controller == null) return;
    if (_controller!.value.isPlaying) {
      _controller!.pause();
      setState(() => _showControls = true);
      _hideTimer?.cancel();
    } else {
      _controller!.play();
      _startTimer();
      setState(() {});
    }
  }

  void _seekRelative(int seconds) {
    if (_controller == null || !_isInitialized) return;
    final newPos = _controller!.value.position + Duration(seconds: seconds);
    _controller!.seekTo(newPos);
    _startTimer();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _controller?.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: () {
          setState(() => _showControls = !_showControls);
          if (_showControls) _startTimer();
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video Layer
            if (_isInitialized && _controller != null)
              Center(
                child: AspectRatio(
                  aspectRatio: _controller!.value.aspectRatio,
                  child: VideoPlayer(_controller!),
                ),
              )
            else
              const Center(
                child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
              ),

            // Animated Controls Overlay
            if (_showControls) ...[
              // Top Bar
              Positioned(
                top: 24,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 22),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: Icon(
                        _isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      onPressed: () {
                        setState(() => _isMuted = !_isMuted);
                        _controller?.setVolume(_isMuted ? 0.0 : 1.0);
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.screen_rotation_rounded, color: Colors.white, size: 24),
                      onPressed: () {
                        final isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;
                        if (isPortrait) {
                          SystemChrome.setPreferredOrientations([
                            DeviceOrientation.landscapeLeft,
                            DeviceOrientation.landscapeRight,
                          ]);
                        } else {
                          SystemChrome.setPreferredOrientations([
                            DeviceOrientation.portraitUp,
                          ]);
                        }
                      },
                    ),
                  ],
                ),
              ),

              // Center Controls (Skip backward 10s, Play/Pause, Skip forward 10s)
              Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 38),
                      onPressed: () => _seekRelative(-10),
                    ),
                    const SizedBox(width: 24),
                    GestureDetector(
                      onTap: _togglePlay,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD32F2F).withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          (_controller?.value.isPlaying ?? false) ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                    ),
                    const SizedBox(width: 24),
                    IconButton(
                      icon: const Icon(Icons.forward_10_rounded, color: Colors.white, size: 38),
                      onPressed: () => _seekRelative(10),
                    ),
                  ],
                ),
              ),

              // Bottom Progress Bar & Time
              Positioned(
                bottom: 24,
                left: 20,
                right: 20,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isInitialized && _controller != null)
                      Row(
                        children: [
                          Text(
                            _formatDuration(_controller!.value.position),
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: VideoProgressIndicator(
                              _controller!,
                              allowScrubbing: true,
                              colors: const VideoProgressColors(
                                playedColor: Color(0xFFD32F2F),
                                bufferedColor: Colors.white38,
                                backgroundColor: Colors.white24,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            _formatDuration(_controller!.value.duration),
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
