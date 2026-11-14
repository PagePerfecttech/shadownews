import 'dart:ui' as ui;
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';
import '../utils/short_code_util.dart';

Future<Uint8List?> preloadImageBytes(String imageUrl) async {
  if (imageUrl.isEmpty || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
    return null;
  }
  try {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ),
    );
    final response = await dio.get<List<int>>(
      imageUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    if (response.data != null && response.data!.isNotEmpty) {
      return Uint8List.fromList(response.data!);
    }
  } catch (e) {
    debugPrint('Preload image bytes failed: $e');
  }
  return null;
}

class ShareCardWidget extends StatelessWidget {
  final String title;
  final String shortDesc;
  final String imageUrl;
  final String timeAgo;
  final String sourceUrl;
  final String location;
  final String reporter;
  final String? reporterImage;
  final Color stripColor;
  final GlobalKey repaintKey;
  final Uint8List? preloadedImageBytes;

  const ShareCardWidget({
    super.key,
    required this.title,
    required this.shortDesc,
    required this.imageUrl,
    required this.timeAgo,
    required this.sourceUrl,
    required this.location,
    required this.reporter,
    this.reporterImage,
    this.stripColor = const Color(0xFFD32F2F),
    required this.repaintKey,
    this.preloadedImageBytes,
  });

  Widget _buildReporterAvatar(String? imageUrl, String name) {
    const double size = 18.0;
    if (imageUrl != null &&
        imageUrl.isNotEmpty &&
        (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1.0),
        ),
        clipBehavior: Clip.antiAlias,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          memCacheWidth: 60,
          placeholder: (context, url) => Container(
            color: Colors.grey.shade800,
            child: const Icon(Icons.person, size: 11, color: Colors.white70),
          ),
          errorWidget: (context, url, error) => Container(
            color: Colors.grey.shade800,
            child: const Icon(Icons.person, size: 11, color: Colors.white70),
          ),
        ),
      );
    }

    final lowerName = name.toLowerCase();
    if (lowerName.contains('shadow') ||
        lowerName.contains('spot') ||
        lowerName.contains('admin')) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1.0),
        ),
        clipBehavior: Clip.antiAlias,
        child: Image.asset(
          'assets/images/logo.png',
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => Container(
            color: const Color(0xFFD32F2F),
            child: const Icon(Icons.flash_on, size: 11, color: Colors.white),
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.25),
        border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 0.8),
      ),
      child: const Icon(
        Icons.person,
        size: 11,
        color: Colors.white,
      ),
    );
  }

  Widget _buildMediaFallback() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2A2A2A), Color(0xFF141414)],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 58,
              height: 58,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(
                Icons.newspaper_rounded,
                size: 48,
                color: Color(0xFFD32F2F),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'SHADOW NEWS',
              style: GoogleFonts.poppins(
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDataSaver = globalThemeProvider.isDataSaverEnabled;

    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 440,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. TOP MEDIA PHOTO WITH OVERLAY REPORTER PILL
            AspectRatio(
              aspectRatio: 16 / 11,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (preloadedImageBytes != null && preloadedImageBytes!.isNotEmpty)
                    Image.memory(
                      preloadedImageBytes!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => _buildMediaFallback(),
                    )
                  else if (imageUrl.isNotEmpty && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')))
                    CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      memCacheWidth: isDataSaver ? 440 : 880,
                      placeholder: (context, url) => _buildMediaFallback(),
                      errorWidget: (context, url, error) => _buildMediaFallback(),
                    )
                  else
                    _buildMediaFallback(),

                  // Bottom-Left Overlay: "By {Reporter}" pill matching reference photo
                  if (reporter.isNotEmpty)
                    Positioned(
                      left: 12,
                      bottom: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.2),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            _buildReporterAvatar(reporterImage, reporter),
                            const SizedBox(width: 6),
                            Text(
                              'By $reporter',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 11.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // 2. DOWNLOAD APP BAR (MATCHING REFERENCE IMAGE)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              color: const Color(0xFF101010),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'బెస్ట్ న్యూస్ - బెస్ట్ ఎంటర్‌టైన్‌మెంట్ కోసం.. డౌన్‌లోడ్',
                      style: GoogleFonts.notoSansTelugu(
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  // App Brand Logo Image & Google Play Badge
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(5),
                        child: Image.asset(
                          'assets/images/logo.png',
                          height: 28,
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Google Play Store Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.25),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.play_arrow, color: Colors.white, size: 12),
                            const SizedBox(width: 3),
                            Text(
                              'Google Play',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 3. NEWS CONTENT AREA (HEADLINE & SUMMARY WITH LOGO WATERMARK)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Stack(
                children: [
                  // WATERMARK: Logo in background of content (not on media)
                  Positioned.fill(
                    child: Center(
                      child: Opacity(
                        opacity: 0.08,
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 150,
                          height: 150,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Telugu Headline with quotes matching reference
                      Text(
                        title.startsWith("'") || title.startsWith('"') ? title : "'$title'",
                        style: GoogleFonts.notoSansTelugu(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF111111),
                          height: 1.38,
                        ),
                      ),

                      const SizedBox(height: 8),

                      // News Summary Text
                      Text(
                        shortDesc,
                        style: GoogleFonts.notoSansTelugu(
                          fontSize: 14,
                          color: const Color(0xFF2B2B2B),
                          height: 1.55,
                        ),
                        maxLines: 9,
                        overflow: TextOverflow.ellipsis,
                      ),

                      const SizedBox(height: 16),

                      // 4. BOTTOM METADATA ROW (LOCATION PILL & TIMESTAMP)
                      Row(
                        children: [
                          // Location Pill (Yellow / Amber rounded chip matching reference)
                          if (location.isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3E2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.location_on,
                                    size: 13,
                                    color: Color(0xFFB7791F),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    location,
                                    style: GoogleFonts.notoSansTelugu(
                                      color: const Color(0xFF744210),
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                          ],

                          // Formatted Timestamp
                          Text(
                            timeAgo.isEmpty ? 'Just now' : timeAgo,
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                          ),

                          const Spacer(),

                          // App Watermark / Domain
                          Text(
                            'shadownews.in',
                            style: GoogleFonts.poppins(
                              fontSize: 11,
                              color: const Color(0xFFD32F2F),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
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

Future<XFile?> captureNewsCardImage({
  required GlobalKey repaintKey,
  required String newsId,
}) async {
  try {
    RenderRepaintBoundary? boundary;
    // Wait for the render object to be mounted, laid out, and painted
    for (int i = 0; i < 25; i++) {
      final ctx = repaintKey.currentContext;
      if (ctx != null && ctx.mounted) {
        final ro = ctx.findRenderObject();
        if (ro is RenderRepaintBoundary) {
          boundary = ro;
          if (!boundary.debugNeedsPaint && boundary.hasSize && boundary.size.width > 0) {
            break;
          }
        }
      }
      WidgetsBinding.instance.scheduleFrame();
      try {
        await WidgetsBinding.instance.endOfFrame;
      } catch (_) {
        await Future.delayed(const Duration(milliseconds: 50));
      }
    }

    if (boundary != null && !boundary.debugNeedsPaint) {
      await Future.delayed(const Duration(milliseconds: 150));
      final ui.Image image = await boundary.toImage(pixelRatio: 2.5);
      final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final Uint8List pngBytes = byteData.buffer.asUint8List();
        final tempDir = await getTemporaryDirectory();
        final file = File('${tempDir.path}/shadownews_$newsId.png');
        await file.writeAsBytes(pngBytes, flush: true);
        debugPrint('Screenshot captured: ${file.path} (${pngBytes.length} bytes)');
        return XFile(
          file.path,
          mimeType: 'image/png',
          name: 'shadownews_$newsId.png',
        );
      }
    } else {
      debugPrint('Error capturing screenshot: boundary not ready or needs paint');
    }
  } catch (e, stack) {
    debugPrint('Error capturing screenshot: $e\n$stack');
  }
  return null;
}

Future<void> shareNewsAsImage({
  required GlobalKey repaintKey,
  required String title,
  required String shortDesc,
  required String sourceUrl,
  required String newsId,
  String location = '',
  String reporterName = '',
  bool directWhatsApp = false,
  VoidCallback? onBeforeShare,
}) async {
  try {
    final xFile = await captureNewsCardImage(
      repaintKey: repaintKey,
      newsId: newsId,
    );

    // Call onBeforeShare so callers can dismiss loading dialogs before external share intent launches
    if (onBeforeShare != null) {
      onBeforeShare();
    }

    // Short alphanumeric share link as ID (strictly 5 characters, e.g. https://www.shadownews.in/p/aB3x9)
    final rawCleanId = newsId.trim();
    final cleanId = rawCleanId.length == 5
        ? rawCleanId
        : getDeterministicShortCode(rawCleanId);
    final dynamicLink = 'https://www.shadownews.in/p/$cleanId';
    final cleanTitle = title.trim();

    // Clean 2-lines summary content
    final cleanDesc = shortDesc.replaceAll(RegExp(r'\s+'), ' ').trim();
    String twoLinesContent = cleanDesc;
    if (twoLinesContent.length > 130) {
      final lastSpace = twoLinesContent.lastIndexOf(' ', 125);
      if (lastSpace > 75) {
        twoLinesContent = '${twoLinesContent.substring(0, lastSpace)}...';
      } else {
        twoLinesContent = '${twoLinesContent.substring(0, 120)}...';
      }
    }

    final StringBuffer buffer = StringBuffer();
    // 1. Headline in bold
    buffer.writeln('*$cleanTitle*');

    // 2. 2 lines content
    if (twoLinesContent.isNotEmpty) {
      buffer.writeln();
      buffer.writeln(twoLinesContent);
    }

    // 3. Call to action & share link as ID
    buffer.writeln();
    buffer.writeln('మరిన్ని వివరాల కోసం క్లిక్ చేయండి 👇');
    buffer.write(dynamicLink);

    final shareText = buffer.toString();

    // Asynchronously record share count on backend
    try {
      apiClient.post('/news/$newsId/share');
    } catch (_) {}

    // Share image screenshot along with title, 2 lines content & short URL caption
    if (xFile != null) {
      // ignore: deprecated_member_use
      await Share.shareXFiles(
        [xFile],
        text: shareText,
        subject: cleanTitle,
      );
    } else {
      // ignore: deprecated_member_use
      await Share.share(shareText, subject: cleanTitle);
    }
  } catch (e) {
    debugPrint('Share error: $e');
  }
}
