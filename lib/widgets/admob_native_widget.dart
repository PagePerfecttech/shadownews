import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../services/ad_manager.dart';

class AdmobNativeWidget extends StatefulWidget {
  const AdmobNativeWidget({super.key});

  @override
  State<AdmobNativeWidget> createState() => _AdmobNativeWidgetState();
}

class _AdmobNativeWidgetState extends State<AdmobNativeWidget> {
  NativeAd? _nativeAd;
  BannerAd? _fallbackBannerAd;
  bool _isNativeLoaded = false;
  bool _isBannerLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadAd();
  }

  void _loadAd() {
    if (AdManager.nativeAdUnitId.isEmpty && AdManager.bannerAdUnitId.isEmpty) {
      AdManager.logDiagnostic('NATIVE', 'Ad Unit IDs are empty. Skipping.');
      return;
    }

    if (AdManager.nativeAdUnitId.isNotEmpty) {
      AdManager.logDiagnostic('NATIVE', 'Requesting Native Ad with ID: ${AdManager.nativeAdUnitId}');

      // Fast timeout: If native ad hasn't loaded within 1200ms, trigger fast banner load
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (mounted && !_isNativeLoaded && !_isBannerLoaded) {
          _loadFallbackBanner();
        }
      });

      _nativeAd = NativeAd(
        adUnitId: AdManager.nativeAdUnitId,
        request: const AdRequest(),
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
            AdManager.logDiagnostic('NATIVE', 'Native Ad loaded successfully.');
            if (mounted) {
              setState(() {
                _isNativeLoaded = true;
              });
            }
          },
          onAdFailedToLoad: (ad, error) {
            final desc = AdManager.getErrorDescription(error.code);
            AdManager.logDiagnostic('NATIVE', 'Native load failed: Code ${error.code} ($desc). Trying fallback banner ad...');
            ad.dispose();
            _nativeAd = null;
            // Immediate fallback to High-Fill AdMob Medium Rectangle banner ad
            _loadFallbackBanner();
          },
          onAdClicked: (ad) {
            AdManager.logDiagnostic('NATIVE', 'Native Ad clicked.');
          },
          onAdImpression: (ad) {
            AdManager.logDiagnostic('NATIVE', 'Native Ad impression registered.');
          },
        ),
      )..load();
    } else {
      _loadFallbackBanner();
    }
  }

  void _loadFallbackBanner() {
    final adUnit = AdManager.bannerAdUnitId.isNotEmpty
        ? AdManager.bannerAdUnitId
        : 'ca-app-pub-3940256099942544/6300978111';

    AdManager.logDiagnostic('NATIVE_FALLBACK', 'Requesting fallback Medium Rectangle banner: $adUnit');

    _fallbackBannerAd = BannerAd(
      adUnitId: adUnit,
      size: AdSize.mediumRectangle, // 300x250 standard medium rectangle ad
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          AdManager.logDiagnostic('NATIVE_FALLBACK', 'Fallback Medium Rectangle banner loaded successfully.');
          if (mounted) {
            setState(() {
              _isBannerLoaded = true;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          final desc = AdManager.getErrorDescription(error.code);
          AdManager.logDiagnostic('NATIVE_FALLBACK', 'Fallback banner failed: Code ${error.code} ($desc). Trying Google test ad...');
          ad.dispose();
          _fallbackBannerAd = null;
          _loadTestAd();
        },
        onAdClicked: (ad) {
          AdManager.logDiagnostic('NATIVE_FALLBACK', 'Banner clicked.');
        },
        onAdImpression: (ad) {
          AdManager.logDiagnostic('NATIVE_FALLBACK', 'Banner impression.');
        },
      ),
    )..load();
  }

  void _loadTestAd() {
    AdManager.logDiagnostic('NATIVE_TEST', 'Requesting Google test native ad...');
    _nativeAd = NativeAd(
      adUnitId: 'ca-app-pub-3940256099942544/2247696110', // Google Official Test Native Ad ID
      request: const AdRequest(),
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
      ),
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          AdManager.logDiagnostic('NATIVE_TEST', 'Google test ad loaded successfully.');
          if (mounted) {
            setState(() {
              _isNativeLoaded = true;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          AdManager.logDiagnostic('NATIVE_TEST', 'Google test native failed: ${error.code}. Trying test banner...');
          ad.dispose();
          _nativeAd = null;
          _loadTestBanner();
        },
      ),
    )..load();
  }

  void _loadTestBanner() {
    _fallbackBannerAd = BannerAd(
      adUnitId: 'ca-app-pub-3940256099942544/6300978111', // Google Official Test Banner ID
      size: AdSize.mediumRectangle,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          AdManager.logDiagnostic('NATIVE_TEST_BANNER', 'Test banner loaded successfully.');
          if (mounted) {
            setState(() {
              _isBannerLoaded = true;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          AdManager.logDiagnostic('NATIVE_TEST_BANNER', 'All ad attempts completed: ${error.code}');
          ad.dispose();
          _fallbackBannerAd = null;
        },
      ),
    )..load();
  }

  @override
  void dispose() {
    _nativeAd?.dispose();
    _fallbackBannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgDark = const Color(0xFF1E1E1E);

    if (_isNativeLoaded && _nativeAd != null) {
      return Container(
        color: isDark ? bgDark : const Color(0xFFF5F5F5),
        child: Center(
          child: Container(
            height: 360,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            alignment: Alignment.center,
            child: AdWidget(ad: _nativeAd!),
          ),
        ),
      );
    }

    if (_isBannerLoaded && _fallbackBannerAd != null) {
      return Container(
        color: isDark ? bgDark : const Color(0xFFF5F5F5),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFD32F2F),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'SPONSORED',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              Container(
                width: 300,
                height: 250,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                alignment: Alignment.center,
                child: AdWidget(ad: _fallbackBannerAd!),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      color: isDark ? bgDark : const Color(0xFFF5F5F5),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD32F2F),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'SPONSORED',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 56,
                  height: 56,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Shadow News Featured Ads',
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Swipe for next news card',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.white60 : Colors.black45,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
