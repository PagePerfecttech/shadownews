import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import '../core/config/app_config.dart';
import '../api/api_client.dart';

class CustomAdWidget extends StatefulWidget {
  final Map<dynamic, dynamic> ad;
  final VoidCallback? onSkip;

  const CustomAdWidget({
    super.key,
    required this.ad,
    this.onSkip,
  });

  @override
  State<CustomAdWidget> createState() => _CustomAdWidgetState();
}

class _CustomAdWidgetState extends State<CustomAdWidget> {
  final PageController _pageController = PageController();
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;
  bool _isMuted = true;
  bool _hasLoggedImpression = false;

  Timer? _skipTimer;
  int _secondsLeft = 5;
  bool _canSkip = false;

  @override
  void initState() {
    super.initState();
    _logImpression();
    _initVideoIfApplicable();
  }

  void _logImpression() {
    if (_hasLoggedImpression) return;
    _hasLoggedImpression = true;
    final adId = widget.ad['id']?.toString();
    if (adId != null && adId.isNotEmpty) {
      try {
        apiClient.post('/ads/impression', data: {'adId': adId});
      } catch (_) {}
    }
  }

  void _logClick() {
    final adId = widget.ad['id']?.toString();
    if (adId != null && adId.isNotEmpty) {
      try {
        apiClient.post('/ads/click', data: {'adId': adId});
      } catch (_) {}
    }
  }

  void _initVideoIfApplicable() {
    final isVideo = widget.ad['type'] == 'video' ||
        (widget.ad['videoUrl'] != null && widget.ad['videoUrl'].toString().isNotEmpty) ||
        (widget.ad['video_url'] != null && widget.ad['video_url'].toString().isNotEmpty);

    if (isVideo) {
      final rawVideoUrl = widget.ad['videoUrl']?.toString() ?? widget.ad['video_url']?.toString() ?? '';
      if (rawVideoUrl.isNotEmpty) {
        final uri = Uri.parse(rawVideoUrl);
        _videoController = VideoPlayerController.networkUrl(uri)
          ..initialize().then((_) {
            if (mounted) {
              setState(() {
                _isVideoInitialized = true;
              });
              _videoController?.setVolume(0.0);
              _videoController?.setLooping(true);
              _videoController?.play();
            }
          }).catchError((e) {
            debugPrint('Video ad playback error: $e');
          });

        final skipAfter = widget.ad['skipAfterSeconds'] ?? widget.ad['skip_after_seconds'] ?? 5;
        _secondsLeft = (skipAfter is int) ? skipAfter : (int.tryParse(skipAfter.toString()) ?? 5);

        if (_secondsLeft <= 0) {
          _canSkip = true;
        } else {
          _skipTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
            if (!mounted) {
              timer.cancel();
              return;
            }
            if (_secondsLeft > 1) {
              setState(() {
                _secondsLeft--;
              });
            } else {
              setState(() {
                _secondsLeft = 0;
                _canSkip = true;
              });
              timer.cancel();
            }
          });
        }
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _skipTimer?.cancel();
    _videoController?.pause();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _launchURL() async {
    _logClick();
    final urlStr = widget.ad['click_url'] as String? ??
        widget.ad['clickUrl'] as String? ??
        widget.ad['link'] as String? ??
        '';
    if (urlStr.isEmpty) return;
    final url = Uri.parse(urlStr);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildImage(String rawUrl) {
    final String url = () {
      if (rawUrl.isEmpty) return '';
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        return rawUrl;
      }
      final path = rawUrl.startsWith('/') ? rawUrl : '/$rawUrl';
      return '${AppConfig.baseUrl}$path';
    }();
    if (url.isEmpty) {
      return Container(
        color: Colors.grey[900],
        child: const Icon(Icons.campaign, color: Colors.white54, size: 48),
      );
    }
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(
        color: Colors.grey[900],
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
        ),
      ),
      errorWidget: (context, url, error) => Container(
        color: Colors.grey[900],
        child: const Icon(Icons.campaign, color: Colors.white54, size: 48),
      ),
    );
  }

  Widget _buildVideoPlayer() {
    if (_videoController == null || !_isVideoInitialized) {
      final thumbUrl = widget.ad['videoThumbnailUrl']?.toString() ??
          widget.ad['video_thumbnail_url']?.toString() ??
          '';
      return Stack(
        fit: StackFit.expand,
        children: [
          if (thumbUrl.isNotEmpty)
            _buildImage(thumbUrl)
          else
            Container(color: Colors.black),
          const Center(
            child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
          ),
        ],
      );
    }

    return GestureDetector(
      onTap: () {
        if (_videoController != null) {
          setState(() {
            _isMuted = !_isMuted;
            _videoController!.setVolume(_isMuted ? 0.0 : 1.0);
          });
        }
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _videoController!.value.size.width,
              height: _videoController!.value.size.height,
              child: VideoPlayer(_videoController!),
            ),
          ),
          Positioned(
            right: 16,
            bottom: 120,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                _isMuted ? Icons.volume_off : Icons.volume_up,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ad = widget.ad;
    final isVideo = ad['type'] == 'video' ||
        (ad['videoUrl'] != null && ad['videoUrl'].toString().isNotEmpty) ||
        (ad['video_url'] != null && ad['video_url'].toString().isNotEmpty);

    List<String> images = [];
    final imagesUrls = ad['imagesUrls'] ?? ad['images_urls'];
    if (imagesUrls is List && imagesUrls.isNotEmpty) {
      images = imagesUrls.map((e) => e.toString()).toList();
    } else {
      final imgUrl = ad['image_url'] as String? ?? ad['imageUrl'] as String? ?? '';
      if (imgUrl.isNotEmpty) {
        images = [imgUrl];
      }
    }

    final urlStr = ad['click_url'] as String? ?? ad['clickUrl'] as String? ?? ad['link'] as String? ?? '';
    final buttonName = ad['ctaText'] as String? ??
        ad['cta_text'] as String? ??
        ad['button_name'] as String? ??
        ad['buttonName'] as String? ??
        ad['buttonText'] as String? ??
        'Learn More';
    final layout = ad['layout'] as String? ?? 'grid';

    Widget backgroundContent;

    if (isVideo) {
      backgroundContent = _buildVideoPlayer();
    } else if (images.isEmpty) {
      backgroundContent = Container(
        color: const Color(0xFF1A1A1A),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/images/logo.png',
                  width: 90,
                  height: 90,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.campaign, size: 60, color: Color(0xFFD32F2F)),
                ),
                const SizedBox(height: 16),
                Text(
                  ad['title']?.toString() ?? 'తెలంగాణ జ్యోతి స్పాట్ న్యూస్',
                  style: GoogleFonts.notoSansTelugu(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  ad['description']?.toString() ?? 'వ్యాపార ప్రకటనల కోసం సంప్రదించండి',
                  style: GoogleFonts.notoSansTelugu(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    } else if (images.length == 1) {
      backgroundContent = _buildImage(images.first);
    } else {
      if (layout == 'carousel') {
        backgroundContent = Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              itemCount: images.length,
              itemBuilder: (context, index) {
                return _buildImage(images[index]);
              },
            ),
            Positioned(
              bottom: 120,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(images.length, (index) {
                  return AnimatedBuilder(
                    animation: _pageController,
                    builder: (context, child) {
                      double selected = 0;
                      if (_pageController.position.haveDimensions) {
                        selected = _pageController.page ?? 0;
                      }
                      bool isActive = (selected.round() == index);
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 8 : 6,
                        height: isActive ? 8 : 6,
                        decoration: BoxDecoration(
                          color: isActive ? Colors.white : Colors.white.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                          boxShadow: const [
                            BoxShadow(color: Colors.black26, blurRadius: 2, spreadRadius: 1)
                          ],
                        ),
                      );
                    },
                  );
                }),
              ),
            ),
          ],
        );
      } else {
        if (images.length == 2) {
          backgroundContent = Column(
            children: [
              Expanded(child: SizedBox(width: double.infinity, child: _buildImage(images[0]))),
              const SizedBox(height: 2),
              Expanded(child: SizedBox(width: double.infinity, child: _buildImage(images[1]))),
            ],
          );
        } else if (images.length == 3) {
          backgroundContent = Column(
            children: [
              Expanded(child: SizedBox(width: double.infinity, child: _buildImage(images[0]))),
              const SizedBox(height: 2),
              Expanded(
                child: Row(
                  children: [
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[1]))),
                    const SizedBox(width: 2),
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[2]))),
                  ],
                ),
              ),
            ],
          );
        } else {
          backgroundContent = Column(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[0]))),
                    const SizedBox(width: 2),
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[1]))),
                  ],
                ),
              ),
              const SizedBox(height: 2),
              Expanded(
                child: Row(
                  children: [
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[2]))),
                    const SizedBox(width: 2),
                    Expanded(child: SizedBox(height: double.infinity, child: _buildImage(images[3]))),
                  ],
                ),
              ),
            ],
          );
        }
      }
    }

    return Container(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          backgroundContent,

          // Subtle gradient protection
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.5),
                  Colors.transparent,
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.75),
                ],
                stops: const [0.0, 0.2, 0.7, 1.0],
              ),
            ),
          ),

          // Sponsored Tag
          Positioned(
            left: 16,
            top: MediaQuery.of(context).padding.top + 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFD32F2F).withValues(alpha: 0.95),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'SPONSORED',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          // Skip Button for Video Ads
          if (isVideo && widget.onSkip != null)
            Positioned(
              right: 16,
              top: MediaQuery.of(context).padding.top + 16,
              child: GestureDetector(
                onTap: _canSkip ? widget.onSkip : null,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: _canSkip ? Colors.black87 : Colors.black45,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _canSkip ? Colors.white70 : Colors.white24,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _canSkip ? 'Skip Ad' : 'Skip in ${_secondsLeft}s',
                        style: GoogleFonts.inter(
                          color: _canSkip ? Colors.white : Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (_canSkip) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.skip_next, size: 16, color: Colors.white),
                      ]
                    ],
                  ),
                ),
              ),
            ),

          // Bottom CTA Button
          if (urlStr.isNotEmpty)
            Positioned(
              left: 20,
              right: 20,
              bottom: 40,
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _launchURL,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: Text(
                    buttonName,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
