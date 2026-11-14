import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../api/api_client.dart';

class InAppReviewService {
  static final InAppReviewService _instance = InAppReviewService._internal();
  static InAppReviewService get instance => _instance;
  InAppReviewService._internal();

  final InAppReview _inAppReview = InAppReview.instance;
  static const String _prefArticlesRead = 'app_articles_read_count';
  static const String _prefHasRated = 'app_has_rated_or_dismissed';
  static const String _prefLastPromptTime = 'app_last_review_prompt_time';

  /// Called each time an article is viewed in the feed
  Future<void> recordArticleRead(BuildContext context) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final hasRated = prefs.getBool(_prefHasRated) ?? false;
      if (hasRated) return;

      int count = (prefs.getInt(_prefArticlesRead) ?? 0) + 1;
      await prefs.setInt(_prefArticlesRead, count);

      // Prompt at milestone 10, 30, 60 reads
      if (count == 10 || count == 30 || count == 60) {
        final lastPrompt = prefs.getInt(_prefLastPromptTime) ?? 0;
        final now = DateTime.now().millisecondsSinceEpoch;
        // Don't prompt more than once every 3 days
        if (now - lastPrompt > 3 * 24 * 60 * 60 * 1000) {
          await prefs.setInt(_prefLastPromptTime, now);
          if (context.mounted) {
            showRatingPrompt(context);
          }
        }
      }
    } catch (e) {
      debugPrint('[InAppReview] Error recording article read: $e');
    }
  }

  /// Displays the interactive rating dialog
  Future<void> showRatingPrompt(BuildContext context, {bool isManual = false}) async {
    int selectedRating = 0;

    await showDialog(
      context: context,
      barrierDismissible: !isManual,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setModalState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3E2),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.amber.withValues(alpha: 0.2),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.star_rounded,
                      color: Color(0xFFF59E0B),
                      size: 38,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'యాప్‌ను రేట్ చేయండి',
                    style: GoogleFonts.notoSansTelugu(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'తెలంగాణ జ్యోతితో మీ అనుభవం ఎలా ఉంది?\nమీ విలువైన అభిప్రాయం మమ్మల్ని మరింత మెరుగుపరుస్తుంది.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.notoSansTelugu(
                      fontSize: 13,
                      color: const Color(0xFF64748B),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 20),
                  // 5 Interactive Stars
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      return IconButton(
                        iconSize: 34,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        onPressed: () {
                          setModalState(() {
                            selectedRating = starIndex;
                          });
                        },
                        icon: Icon(
                          starIndex <= selectedRating ? Icons.star_rounded : Icons.star_outline_rounded,
                          color: starIndex <= selectedRating ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                        ),
                      );
                    }),
                  ),
                  if (selectedRating > 0) ...[
                    const SizedBox(height: 8),
                    Text(
                      selectedRating >= 4 ? 'చాలా బాగుంది! 😊' : 'క్షమించండి! మేము మెరుగుపడతాము 🛠️',
                      style: GoogleFonts.notoSansTelugu(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: selectedRating >= 4 ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                      ),
                    ),
                  ],
                ],
              ),
              actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              actions: [
                TextButton(
                  onPressed: () async {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setBool(_prefHasRated, true);
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                  child: Text(
                    'తరువాత',
                    style: GoogleFonts.notoSansTelugu(
                      color: const Color(0xFF64748B),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  ),
                  onPressed: selectedRating == 0
                      ? null
                      : () async {
                          Navigator.pop(ctx);
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setBool(_prefHasRated, true);

                          if (selectedRating >= 4) {
                            // 4 or 5 stars: Trigger Play Store / In-App Review
                            await _triggerStoreReview();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(0xFF16A34A),
                                  content: Text(
                                    'మీ అమూల్యమైన రేటింగ్‌కు హృదయపూర్వక ధన్యవాదాలు! ✨',
                                    style: GoogleFonts.notoSansTelugu(fontSize: 13),
                                  ),
                                ),
                              );
                            }
                          } else {
                            // 1, 2, or 3 stars: Open in-app feedback dialog
                            if (context.mounted) {
                              _showFeedbackDialog(context, selectedRating);
                            }
                          }
                        },
                  child: Text(
                    'సమర్పించండి',
                    style: GoogleFonts.notoSansTelugu(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// Triggers Google In-App Review API or opens Store Listing
  Future<void> _triggerStoreReview() async {
    try {
      if (await _inAppReview.isAvailable()) {
        await _inAppReview.requestReview();
      } else {
        await _inAppReview.openStoreListing(
          appStoreId: 'com.shadownews.app',
        );
      }
    } catch (e) {
      debugPrint('[InAppReview] Failed to request review: $e');
      try {
        await _inAppReview.openStoreListing(
          appStoreId: 'com.shadownews.app',
        );
      } catch (_) {}
    }
  }

  /// Friendly in-app feedback dialog for low ratings (1-3 stars)
  void _showFeedbackDialog(BuildContext context, int rating) {
    final TextEditingController feedbackCtrl = TextEditingController();
    String selectedCategory = 'app_performance';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (bottomCtx, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(bottomCtx).viewInsets.bottom + 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3E2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.feedback_outlined, color: Color(0xFFD97706), size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'మీ అభిప్రాయాన్ని తెలియజేయండి',
                                style: GoogleFonts.notoSansTelugu(
                                  fontSize: 17,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1E293B),
                                ),
                              ),
                              Text(
                                'మేము ఎలా మెరుగుపడగలమో చెప్పండి (We listen to you)',
                                style: GoogleFonts.notoSansTelugu(
                                  fontSize: 12,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'సమస్య వర్గం (Category):',
                      style: GoogleFonts.notoSansTelugu(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _categoryChip('వేగం & పనితీరు', 'app_performance', selectedCategory, (val) {
                          setSheetState(() => selectedCategory = val);
                        }),
                        _categoryChip('వార్తల నాణ్యత', 'content_quality', selectedCategory, (val) {
                          setSheetState(() => selectedCategory = val);
                        }),
                        _categoryChip('యాప్ బగ్ / లోపం', 'bug', selectedCategory, (val) {
                          setSheetState(() => selectedCategory = val);
                        }),
                        _categoryChip('ఇతర సూచనలు', 'general', selectedCategory, (val) {
                          setSheetState(() => selectedCategory = val);
                        }),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: feedbackCtrl,
                      maxLines: 4,
                      style: GoogleFonts.notoSansTelugu(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'మీ సూచన లేదా లోపాన్ని ఇక్కడ వివరించండి...',
                        hintStyle: GoogleFonts.notoSansTelugu(fontSize: 13, color: Colors.grey.shade400),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFFD32F2F), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: () async {
                          final text = feedbackCtrl.text.trim();
                          Navigator.pop(sheetCtx);

                          // Send to backend
                          try {
                            String? appVer;
                            try {
                              final pkg = await PackageInfo.fromPlatform();
                              appVer = '${pkg.version}+${pkg.buildNumber}';
                            } catch (_) {}

                            await apiClient.post(
                              '/feedback',
                              data: {
                                'rating': rating,
                                'feedback': text,
                                'category': selectedCategory,
                                'appVersion': appVer,
                                'deviceInfo': Platform.operatingSystem,
                              },
                            );

                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: const Color(0xFF1E293B),
                                  content: Text(
                                    'మీ అభిప్రాయానికి ధన్యవాదాలు! మా ఇంజనీరింగ్ బృందం దీనిని పరిశీలిస్తుంది. 🤝',
                                    style: GoogleFonts.notoSansTelugu(fontSize: 13),
                                  ),
                                ),
                              );
                            }
                          } catch (e) {
                            debugPrint('[Feedback] Failed to send feedback: $e');
                          }
                        },
                        child: Text(
                          'అభిప్రాయాన్ని పంపండి (Submit Feedback)',
                          style: GoogleFonts.notoSansTelugu(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _categoryChip(
    String label,
    String key,
    String selectedKey,
    ValueChanged<String> onSelected,
  ) {
    final bool isSelected = key == selectedKey;
    return ChoiceChip(
      label: Text(label),
      labelStyle: GoogleFonts.notoSansTelugu(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        color: isSelected ? Colors.white : const Color(0xFF334155),
      ),
      selected: isSelected,
      selectedColor: const Color(0xFFD32F2F),
      backgroundColor: const Color(0xFFF1F5F9),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      side: BorderSide(
        color: isSelected ? const Color(0xFFD32F2F) : Colors.transparent,
      ),
      onSelected: (_) => onSelected(key),
    );
  }
}

