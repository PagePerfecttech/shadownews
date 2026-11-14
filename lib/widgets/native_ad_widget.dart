import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../services/ad_manager.dart';

class NativeAdWidget extends StatefulWidget {
  const NativeAdWidget({super.key});

  @override
  State<NativeAdWidget> createState() => _NativeAdWidgetState();
}

class _NativeAdWidgetState extends State<NativeAdWidget> {
  NativeAd? _nativeAd;
  bool _isLoaded = false;
  bool _hasFailed = false;

  @override
  void initState() {
    super.initState();
    _loadNativeAd();
  }

  void _loadNativeAd() {
    if (AdManager.nativeAdUnitId.isEmpty) {
      if (mounted) setState(() => _hasFailed = true);
      return;
    }

    AdManager.logDiagnostic('NATIVE_DISCOVERY', 'Loading Native Ad for Discovery screen: ${AdManager.nativeAdUnitId}');

    _nativeAd = NativeAd(
      adUnitId: AdManager.nativeAdUnitId,
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.medium,
        mainBackgroundColor: Colors.white,
        cornerRadius: 12.0,
        callToActionTextStyle: NativeTemplateTextStyle(
          textColor: Colors.white,
          backgroundColor: const Color(0xFFD32F2F),
          style: NativeTemplateFontStyle.bold,
          size: 15.0,
        ),
        primaryTextStyle: NativeTemplateTextStyle(
          textColor: Colors.black87,
          backgroundColor: Colors.transparent,
          style: NativeTemplateFontStyle.bold,
          size: 15.0,
        ),
        secondaryTextStyle: NativeTemplateTextStyle(
          textColor: Colors.black54,
          backgroundColor: Colors.transparent,
          style: NativeTemplateFontStyle.normal,
          size: 13.0,
        ),
        tertiaryTextStyle: NativeTemplateTextStyle(
          textColor: Colors.black45,
          backgroundColor: Colors.transparent,
          style: NativeTemplateFontStyle.normal,
          size: 13.0,
        ),
      ),
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          AdManager.logDiagnostic('NATIVE_DISCOVERY', 'Native Ad loaded successfully.');
          if (mounted) {
            setState(() {
              _isLoaded = true;
              _hasFailed = false;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          final desc = AdManager.getErrorDescription(error.code);
          AdManager.logDiagnostic('NATIVE_DISCOVERY', 'Failed to load: Code ${error.code} ($desc), Message: ${error.message}');
          ad.dispose();
          if (mounted) {
            setState(() {
              _isLoaded = false;
              _hasFailed = true;
            });
          }
        },
      ),
      request: const AdRequest(),
    )..load();
  }

  @override
  void dispose() {
    _nativeAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoaded && _nativeAd != null) {
      return Container(
        color: theme.scaffoldBackgroundColor,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          clipBehavior: Clip.hardEdge,
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: 320,
              maxHeight: 380,
            ),
            child: AdWidget(ad: _nativeAd!),
          ),
        ),
      );
    }

    if (_hasFailed) {
      return const SizedBox.shrink();
    }

    return Container(
      color: theme.scaffoldBackgroundColor,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              color: Color(0xFFD32F2F),
              strokeWidth: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Sponsored Content',
            style: TextStyle(
              color: isDark ? Colors.white60 : Colors.black54,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
