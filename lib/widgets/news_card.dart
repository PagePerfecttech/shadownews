import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:go_router/go_router.dart';
import '../config.dart';
import '../api/api_client.dart';
import 'comments_sheet.dart';
import 'news_inline_video_player.dart';

// Official WhatsApp icon SVG for vector sharpness
const String _whatsAppSvg = '''
<svg viewBox="0 0 24 24" fill="white">
  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm-3.52 4.19c-.19 0-.41.07-.63.31-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.54 4.03 3.56.56.24 1 .39 1.34.5.56.18 1.08.15 1.48.09.45-.07 1.39-.57 1.59-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.47-.28s-1.47-.73-1.7-.81c-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.3.19-.55.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.42-.06-.12-.56-1.36-.78-1.86-.21-.49-.42-.42-.58-.43l-.49-.01z"/>
</svg>
''';

class NewsCard extends StatefulWidget {
  final Map<dynamic, dynamic> news;
  final VoidCallback? onTap;
  final VoidCallback? onReaction;
  final VoidCallback? onShare;
  final VoidCallback? onWhatsAppShare;
  final String? timeAgo;
  final bool isVisible;
  final int? pageIndex;
  final int? totalPages;

  const NewsCard({
    super.key,
    required this.news,
    this.onTap,
    this.onReaction,
    this.onShare,
    this.onWhatsAppShare,
    this.timeAgo,
    this.isVisible = true,
    this.pageIndex,
    this.totalPages,
  });

  static void showFullNewsModal({
    required BuildContext context,
    required String title,
    required String shortDesc,
    required String fullContent,
    required String imageUrl,
    required String locationName,
    required String timeAgo,
    required String reporterName,
    required String categoryName,
    required String shortCode,
    required bool isDark,
    VoidCallback? onWhatsAppShare,
    VoidCallback? onBookmark,
    bool isBookmarked = false,
    VoidCallback? onCopyLink,
  }) {
    final List<String> paragraphs = fullContent
        .split(RegExp(r'\n+'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.90,
        minChildSize: 0.55,
        maxChildSize: 0.96,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                width: 44,
                height: 4.5,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2.5),
                ),
              ),

              // Header bar with Category, Location, Time & Close
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    if (categoryName.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD32F2F).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          categoryName,
                          style: GoogleFonts.notoSansTelugu(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFD32F2F),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (locationName.isNotEmpty) ...[
                      const Icon(Icons.location_on, size: 14, color: Color(0xFFD32F2F)),
                      const SizedBox(width: 3),
                      Text(
                        locationName,
                        style: GoogleFonts.notoSansTelugu(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFFD32F2F),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      timeAgo,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(ctx),
                      color: isDark ? Colors.white70 : Colors.black87,
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Scrollable full article content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 24),
                  children: [
                    // Headline
                    Text(
                      title,
                      style: GoogleFonts.notoSansTelugu(
                        fontSize: 20.0,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF111827),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Reporter & Byline
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: const Color(0xFFD32F2F).withValues(alpha: 0.12),
                          child: const Icon(Icons.person_rounded, size: 14, color: Color(0xFFD32F2F)),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          reporterName.isNotEmpty ? reporterName : 'Shadow News Bureau',
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.grey[300] : const Color(0xFF374151),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Article Photo (if available)
                    if (imageUrl.isNotEmpty) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: imageUrl,
                          height: 220,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(
                            height: 220,
                            color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE5E7EB),
                          ),
                          errorWidget: (context, url, error) => const SizedBox.shrink(),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Key Summary Box (6-8 lines shortDesc) if distinct from full content
                    if (shortDesc.isNotEmpty && shortDesc != fullContent) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF262626) : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE5E7EB),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.flash_on_rounded, size: 15, color: Color(0xFFD32F2F)),
                                const SizedBox(width: 5),
                                Text(
                                  'ముఖ్య సారాంశం (Summary)',
                                  style: GoogleFonts.notoSansTelugu(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFFD32F2F),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              shortDesc,
                              style: GoogleFonts.notoSansTelugu(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w400,
                                color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Section Header: "పూర్తి వార్తా కథనం"
                    Row(
                      children: [
                        const Icon(Icons.article_rounded, size: 16, color: Color(0xFFD32F2F)),
                        const SizedBox(width: 6),
                        Text(
                          'పూర్తి వార్తా కథనం (Complete Article)',
                          style: GoogleFonts.notoSansTelugu(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : const Color(0xFF1E2022),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Paragraphs of the complete rewritten news article
                    if (paragraphs.isNotEmpty)
                      ...paragraphs.map(
                        (p) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Text(
                            p,
                            style: GoogleFonts.notoSansTelugu(
                              fontSize: 16.0,
                              fontWeight: FontWeight.w400,
                              color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF1F2937),
                              height: 1.65,
                            ),
                          ),
                        ),
                      )
                    else
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Text(
                          fullContent.isNotEmpty ? fullContent : shortDesc,
                          style: GoogleFonts.notoSansTelugu(
                            fontSize: 16.0,
                            fontWeight: FontWeight.w400,
                            color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF1F2937),
                            height: 1.65,
                          ),
                        ),
                      ),

                    const SizedBox(height: 20),

                    // Bottom Action Bar inside the Full Reader
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF262626) : const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.pop(ctx);
                                onWhatsAppShare?.call();
                              },
                              icon: const Icon(Icons.share, size: 16, color: Colors.white),
                              label: Text(
                                'వాట్సాప్ షేర్',
                                style: GoogleFonts.notoSansTelugu(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF25D366),
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (onBookmark != null)
                            IconButton(
                              icon: Icon(
                                isBookmarked ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                                color: isBookmarked ? const Color(0xFFD32F2F) : (isDark ? Colors.white70 : Colors.black87),
                              ),
                              onPressed: () {
                                Navigator.pop(ctx);
                                onBookmark();
                              },
                              tooltip: 'Bookmark',
                            ),
                          if (onCopyLink != null)
                            IconButton(
                              icon: Icon(Icons.link_rounded, color: isDark ? Colors.white70 : Colors.black87),
                              onPressed: () {
                                Navigator.pop(ctx);
                                onCopyLink();
                              },
                              tooltip: 'Copy Link',
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  State<NewsCard> createState() => _NewsCardState();
}

class _NewsCardState extends State<NewsCard> {
  late bool _isLiked;
  late bool _isDisliked;
  late bool _isBookmarked;
  late int _likesCount;
  late int _dislikesCount;
  late int _commentsCount;

  @override
  void initState() {
    super.initState();
    _initStats();
  }

  @override
  void didUpdateWidget(NewsCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.news['id'] != oldWidget.news['id']) {
      _initStats();
    }
  }

  void _initStats() {
    final n = widget.news;
    _isLiked = n['isLiked'] == true || n['liked'] == true;
    _isDisliked = n['isDisliked'] == true || n['disliked'] == true;
    _isBookmarked = n['isBookmarked'] == true || n['bookmarked'] == true;

    final rawLikes = n['likesCount'] ?? n['likes'] ?? n['_count']?['reactions'] ?? 0;
    _likesCount = int.tryParse(rawLikes.toString()) ?? 0;

    final rawDislikes = n['dislikesCount'] ?? n['dislikes'] ?? 0;
    _dislikesCount = int.tryParse(rawDislikes.toString()) ?? 0;

    final rawComments = n['commentsCount'] ?? n['comments'] ?? n['_count']?['comments'] ?? 0;
    _commentsCount = int.tryParse(rawComments.toString()) ?? 0;
  }

  String _resolveMediaUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.isEmpty) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    final base = AppConfig.baseUrl.endsWith('/')
        ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1)
        : AppConfig.baseUrl;
    final path = rawUrl.startsWith('/') ? rawUrl : '/$rawUrl';
    return '$base$path';
  }

  String _formatTimeAgo(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'Just now';
    try {
      final date = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(date);
      if (diff.inDays > 365) return '${(diff.inDays / 365).floor()}y ago';
      if (diff.inDays > 30) return '${(diff.inDays / 30).floor()}mo ago';
      if (diff.inDays > 0) return '${diff.inDays}d ago';
      if (diff.inHours > 0) return '${diff.inHours}h ago';
      if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
      return 'Just now';
    } catch (_) {
      return 'Recently';
    }
  }

  void _showLoginPrompt(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'లాగిన్ అవ్వండి (Login Required)',
          style: GoogleFonts.notoSansTelugu(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        content: Text(
          message,
          style: GoogleFonts.notoSansTelugu(fontSize: 14.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('రద్దు (Cancel)'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.go('/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD32F2F),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('లాగిన్ (Login)', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showFullNewsModal({
    required BuildContext context,
    required String title,
    required String shortDesc,
    required String fullContent,
    required String imageUrl,
    required String locationName,
    required String timeAgo,
    required String reporterName,
    required String categoryName,
    required String shortCode,
    required bool isDark,
  }) {
    NewsCard.showFullNewsModal(
      context: context,
      title: title,
      shortDesc: shortDesc,
      fullContent: fullContent,
      imageUrl: imageUrl,
      locationName: locationName,
      timeAgo: timeAgo,
      reporterName: reporterName,
      categoryName: categoryName,
      shortCode: shortCode,
      isDark: isDark,
      onWhatsAppShare: widget.onWhatsAppShare,
      onBookmark: () => _handleMoreOption('bookmark'),
      isBookmarked: _isBookmarked,
      onCopyLink: () => _handleMoreOption('copy_link'),
    );
  }

  Future<void> _toggleLike() async {
    final newsId = widget.news['id']?.toString();
    if (newsId == null || newsId.isEmpty) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showLoginPrompt(context, 'లైక్ చేయడానికి దయచేసి లాగిన్ అవ్వండి (Please login to like this article)');
      return;
    }

    setState(() {
      if (_isLiked) {
        _isLiked = false;
        if (_likesCount > 0) _likesCount--;
      } else {
        _isLiked = true;
        _likesCount++;
        if (_isDisliked) {
          _isDisliked = false;
          if (_dislikesCount > 0) _dislikesCount--;
        }
      }
    });

    try {
      await apiClient.post('/reactions', data: {
        'newsId': newsId,
        'type': 'like',
        'action': _isLiked ? 'add' : 'remove',
      });
    } catch (e) {
      debugPrint('Failed to save like reaction: $e');
    }
  }

  Future<void> _toggleDislike() async {
    final newsId = widget.news['id']?.toString();
    if (newsId == null || newsId.isEmpty) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showLoginPrompt(context, 'డిస్‌లైక్ చేయడానికి దయచేసి లాగిన్ అవ్వండి (Please login to dislike this article)');
      return;
    }

    setState(() {
      if (_isDisliked) {
        _isDisliked = false;
        if (_dislikesCount > 0) _dislikesCount--;
      } else {
        _isDisliked = true;
        _dislikesCount++;
        if (_isLiked) {
          _isLiked = false;
          if (_likesCount > 0) _likesCount--;
        }
      }
    });

    try {
      await apiClient.post('/reactions', data: {
        'newsId': newsId,
        'type': 'dislike',
        'action': _isDisliked ? 'add' : 'remove',
      });
    } catch (e) {
      debugPrint('Failed to save dislike reaction: $e');
    }
  }

  void _openComments() {
    final newsId = widget.news['id']?.toString();
    if (newsId == null || newsId.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CommentsSheet(newsId: newsId),
    ).then((_) {
      // Refresh comment count if needed
    });
  }

  Future<void> _handleMoreOption(String action) async {
    final newsId = widget.news['id']?.toString() ?? '';
    if (action == 'bookmark') {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        _showLoginPrompt(context, 'బుక్‌మార్క్ చేయడానికి దయచేసి లాగిన్ అవ్వండి (Please login to bookmark this article)');
        return;
      }

      final newStatus = !_isBookmarked;
      setState(() => _isBookmarked = newStatus);
      try {
        await apiClient.post('/bookmarks', data: {
          'newsId': newsId,
          'action': newStatus ? 'add' : 'remove',
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(newStatus ? 'Article saved to bookmarks' : 'Bookmark removed'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        debugPrint('Bookmark action error: $e');
      }
    } else if (action == 'copy_link') {
      String shortCode = (widget.news['short_code'] ?? widget.news['shortCode'])?.toString() ?? '';
      if (shortCode.isEmpty || shortCode.length > 5) {
        if (newsId.length == 5) {
          shortCode = newsId;
        } else {
          try {
            final res = await apiClient.get('/news/$newsId');
            if (res.data != null && res.data['news'] != null) {
              final fetched = res.data['news'];
              final fetchedCode = (fetched['short_code'] ?? fetched['shortCode'])?.toString() ?? '';
              if (fetchedCode.isNotEmpty && fetchedCode.length <= 5) {
                shortCode = fetchedCode;
                widget.news['short_code'] = fetchedCode;
                widget.news['shortCode'] = fetchedCode;
              }
            }
          } catch (_) {}
        }
      }
      if (shortCode.isEmpty) {
        shortCode = newsId;
      }
      final link = 'https://www.shadownews.in/p/$shortCode';
      await Clipboard.setData(ClipboardData(text: link));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Link copied to clipboard!'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else if (action == 'report') {
      _showReportDialog(newsId);
    }
  }

  void _showReportDialog(String newsId) {
    final reasons = [
      'Misleading or False Information',
      'Inappropriate / Offensive Content',
      'Spam or Clickbait',
      'Copyright Violation',
      'Other',
    ];
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Report News'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: reasons
              .map(
                (reason) => ListTile(
                  title: Text(reason, style: const TextStyle(fontSize: 14)),
                  dense: true,
                  onTap: () async {
                    Navigator.of(ctx).pop();
                    try {
                      await apiClient.post('/news/$newsId/report', data: {
                        'reason': reason,
                      });
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Thank you. Report submitted for review.')),
                        );
                      }
                    } catch (_) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Report submitted.')),
                        );
                      }
                    }
                  },
                ),
              )
              .toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;
    final mediaHeight = (screenHeight * 0.38).clamp(230.0, 310.0);

    final n = widget.news;
    final title = (n['title'] as String?)?.trim() ?? '';
    final shortDesc = (n['shortDesc'] ?? n['short_desc'] ?? n['description'] ?? '')
        .toString()
        .trim();
    final fullContent = (n['content'] ?? n['aiContent'] ?? n['description'] ?? shortDesc)
        .toString()
        .trim();
    final description = shortDesc.isNotEmpty ? shortDesc : fullContent;
    final categoryName = (n['category'] is Map ? n['category']['name'] : n['category'])?.toString() ?? '';
    final reporterName = (n['reporter_name'] ?? n['reporter']?['name'] ?? 'Shadow News').toString();
    final shortCode = (n['short_code'] ?? n['shortCode'] ?? n['id'] ?? '').toString();

    final rawImageUrl = n['thumbnailUrl'] ??
        n['thumbnail_url'] ??
        n['imageUrl'] ??
        (n['imagesUrls'] is List && (n['imagesUrls'] as List).isNotEmpty ? n['imagesUrls'][0] : null);
    final imageUrl = _resolveMediaUrl(rawImageUrl?.toString());

    final rawVideoUrl = n['videoUrl'] ?? n['video_url'] ?? n['video'];
    final videoUrl = rawVideoUrl?.toString();
    final hasVideo = videoUrl != null && videoUrl.isNotEmpty;

    final displayTimeAgo = widget.timeAgo != null && widget.timeAgo!.isNotEmpty
        ? widget.timeAgo!
        : _formatTimeAgo((n['publishedAt'] ?? n['created_at'] ?? n['createdAt'])?.toString());

    final pageIndicator = (widget.pageIndex != null && widget.totalPages != null)
        ? '${widget.pageIndex} of ${widget.totalPages} Pages'
        : '';
    final locationName = (n['locationName'] ?? n['location_name'] ?? n['mandal']?['name'] ?? n['district']?['name'] ?? '').toString();

    return RepaintBoundary(
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ==============================================================
            // 1. TOP MEDIA SECTION (IMAGE / VIDEO WITH PLAY BUTTON & BADGE)
            // ==============================================================
            SizedBox(
              height: mediaHeight,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // MEDIA LAYER
                  if (hasVideo)
                    NewsInlineVideoPlayer(
                      videoUrl: _resolveMediaUrl(videoUrl),
                      thumbnailUrl: imageUrl.isNotEmpty ? imageUrl : null,
                      isVisible: widget.isVisible,
                    )
                  else if (imageUrl.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      memCacheWidth: 720,
                      memCacheHeight: 960,
                      placeholder: (context, url) => Container(
                        color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE0E0E0),
                        child: const Center(
                          child: SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Color(0xFFD32F2F),
                            ),
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFF0F0F0),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset(
                                'assets/images/logo.png',
                                width: 44,
                                height: 44,
                                errorBuilder: (_, _, _) => const Icon(
                                  Icons.newspaper_rounded,
                                  size: 40,
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Shadow News',
                                style: GoogleFonts.poppins(
                                  color: Colors.grey,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    Container(
                      color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFF5F5F5),
                      child: Center(
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 56,
                          height: 56,
                          errorBuilder: (_, _, _) => const Icon(
                            Icons.newspaper_rounded,
                            size: 48,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                    ),

                  // WAY2NEWS STYLE CENTER PLAY BUTTON (FOR PLAYABLE MEDIA)
                  if (hasVideo && !widget.isVisible)
                    Center(
                      child: Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.45),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.9),
                            width: 2.2,
                          ),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 38,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ==============================================================
            // 2. MIDDLE TEXT CONTENT (HEADLINE + 6-8 LINES SUMMARY + "పూర్తి వివరాలు" BUTTON)
            // ==============================================================
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // TITLE / HEADLINE (Modern Telugu Sans-serif, 17.5 px, 700 bold)
                            if (title.isNotEmpty)
                              InkWell(
                                onTap: () => _showFullNewsModal(
                                  context: context,
                                  title: title,
                                  shortDesc: description,
                                  fullContent: fullContent.isNotEmpty ? fullContent : description,
                                  imageUrl: imageUrl,
                                  locationName: locationName,
                                  timeAgo: displayTimeAgo,
                                  reporterName: reporterName,
                                  categoryName: categoryName,
                                  shortCode: shortCode,
                                  isDark: isDark,
                                ),
                                borderRadius: BorderRadius.circular(6),
                                child: Text(
                                  title,
                                  style: GoogleFonts.notoSansTelugu(
                                    fontSize: 17.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : const Color(0xFF1E2022),
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            if (title.isNotEmpty) const SizedBox(height: 8),

                            // 6-8 LINES SUMMARIZED CONTENT
                            if (description.isNotEmpty)
                              InkWell(
                                onTap: () => _showFullNewsModal(
                                  context: context,
                                  title: title,
                                  shortDesc: description,
                                  fullContent: fullContent.isNotEmpty ? fullContent : description,
                                  imageUrl: imageUrl,
                                  locationName: locationName,
                                  timeAgo: displayTimeAgo,
                                  reporterName: reporterName,
                                  categoryName: categoryName,
                                  shortCode: shortCode,
                                  isDark: isDark,
                                ),
                                borderRadius: BorderRadius.circular(6),
                                child: Text(
                                  description,
                                  maxLines: 7, // Clean 6-8 lines summary
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.notoSansTelugu(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w400,
                                    color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF333333),
                                    height: 1.48,
                                  ),
                                ),
                              ),

                            // "పూర్తి వివరాలు" (Purthi Vivaralu) Action Button
                            Padding(
                              padding: const EdgeInsets.only(top: 10, bottom: 4),
                              child: InkWell(
                                onTap: () => _showFullNewsModal(
                                  context: context,
                                  title: title,
                                  shortDesc: description,
                                  fullContent: fullContent.isNotEmpty ? fullContent : description,
                                  imageUrl: imageUrl,
                                  locationName: locationName,
                                  timeAgo: displayTimeAgo,
                                  reporterName: reporterName,
                                  categoryName: categoryName,
                                  shortCode: shortCode,
                                  isDark: isDark,
                                ),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6.5),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF2A1C1C) : const Color(0xFFFFF1F1),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: const Color(0xFFD32F2F).withValues(alpha: 0.38),
                                      width: 1.2,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.menu_book_rounded,
                                        size: 15,
                                        color: Color(0xFFD32F2F),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'పూర్తి వివరాలు',
                                        style: GoogleFonts.notoSansTelugu(
                                          fontSize: 13.0,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFFD32F2F),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.arrow_forward_ios_rounded,
                                        size: 11,
                                        color: Color(0xFFD32F2F),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ==============================================================
            // 3. METADATA ROW: (CLOCK) 20m ago  ------  4 of 93 Pages
            // ==============================================================
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.access_time_outlined,
                    size: 14,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  const SizedBox(width: 5),
                  Text(
                    displayTimeAgo,
                    style: GoogleFonts.notoSansTelugu(
                      fontSize: 13.0,
                      color: isDark ? Colors.grey[400] : const Color(0xFF555555),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  if (pageIndicator.isNotEmpty)
                    Text(
                      pageIndicator,
                      style: GoogleFonts.notoSansTelugu(
                        fontSize: 14.0,
                        color: isDark ? Colors.grey[400] : const Color(0xFF666666),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                ],
              ),
            ),

            // ==============================================================
            // 4. BOTTOM ACTION BAR: [👍 367] [👎 34] [🟢 SHARE] [💬 4] [⋮] [↗]
            // ==============================================================
            Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                border: Border(
                  top: BorderSide(
                    color: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFEEEEEE),
                    width: 1.0,
                  ),
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // LIKE BUTTON
                  InkWell(
                    onTap: _toggleLike,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isLiked ? Icons.thumb_up_rounded : Icons.thumb_up_alt_outlined,
                            size: 20,
                            color: _isLiked
                                ? const Color(0xFF1976D2)
                                : (isDark ? Colors.white70 : const Color(0xFF555555)),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$_likesCount',
                            style: GoogleFonts.poppins(
                              fontSize: 15.0,
                              fontWeight: FontWeight.w400,
                              color: isDark ? Colors.white70 : const Color(0xFF555555),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 4),

                  // DISLIKE BUTTON
                  InkWell(
                    onTap: _toggleDislike,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isDisliked ? Icons.thumb_down_rounded : Icons.thumb_down_alt_outlined,
                            size: 20,
                            color: _isDisliked
                                ? const Color(0xFFE53935)
                                : (isDark ? Colors.white70 : const Color(0xFF555555)),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$_dislikesCount',
                            style: GoogleFonts.poppins(
                              fontSize: 15.0,
                              fontWeight: FontWeight.w400,
                              color: isDark ? Colors.white70 : const Color(0xFF555555),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // CENTER WHATSAPP SHARE BUTTON
                  GestureDetector(
                    onTap: widget.onWhatsAppShare,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: const Color(0xFF25D366),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF25D366).withValues(alpha: 0.35),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(9),
                          child: SvgPicture.string(
                            _whatsAppSvg,
                            width: 24,
                            height: 24,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'SHARE',
                          style: GoogleFonts.poppins(
                            fontSize: 9.0,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.grey[400] : const Color(0xFF666666),
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Spacer(),

                  // COMMENTS BUTTON
                  InkWell(
                    onTap: _openComments,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.chat_bubble_outline_rounded,
                            size: 19,
                            color: isDark ? Colors.white70 : const Color(0xFF555555),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$_commentsCount',
                            style: GoogleFonts.poppins(
                              fontSize: 15.0,
                              fontWeight: FontWeight.w400,
                              color: isDark ? Colors.white70 : const Color(0xFF555555),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 2),

                  // 3-DOTS MORE OPTIONS
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert,
                      size: 20,
                      color: isDark ? Colors.white70 : const Color(0xFF666666),
                    ),
                    onSelected: _handleMoreOption,
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'bookmark',
                        child: Row(
                          children: [
                            Icon(
                              _isBookmarked ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                              size: 18,
                              color: const Color(0xFFD32F2F),
                            ),
                            const SizedBox(width: 10),
                            Text(_isBookmarked ? 'Remove Bookmark' : 'Save / Bookmark'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'copy_link',
                        child: Row(
                          children: [
                            Icon(Icons.link_rounded, size: 18, color: Color(0xFF1976D2)),
                            SizedBox(width: 10),
                            Text('Copy Link'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'report',
                        child: Row(
                          children: [
                            Icon(Icons.flag_outlined, size: 18, color: Colors.orange),
                            SizedBox(width: 10),
                            Text('Report News'),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(width: 2),

                  // BLUE CURVED SHARE ARROW
                  InkWell(
                    onTap: widget.onShare,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                      child: Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.rotationY(math.pi),
                        child: const Icon(
                          Icons.reply_rounded,
                          color: Color(0xFF1976D2),
                          size: 25,
                        ),
                      ),
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
}
}
