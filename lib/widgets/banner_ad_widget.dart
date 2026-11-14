import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/ad_manager.dart';

class BannerAdWidget extends StatefulWidget {
  const BannerAdWidget({super.key});

  @override
  State<BannerAdWidget> createState() => _BannerAdWidgetState();
}

class _BannerAdWidgetState extends State<BannerAdWidget> {
  BannerAd? _bannerAd;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    if (!AdManager.customBannerEnabled) {
      _loadBannerAd();
    }
  }

  void _loadBannerAd() {
    if (AdManager.bannerAdUnitId.isEmpty) {
      AdManager.logDiagnostic('BANNER', 'Banner ad unit ID is empty. Skipping.');
      return;
    }

    AdManager.logDiagnostic('BANNER', 'Loading banner ad with ID: ${AdManager.bannerAdUnitId}');
    _bannerAd = BannerAd(
      adUnitId: AdManager.bannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          AdManager.logDiagnostic('BANNER', 'Banner ad loaded successfully.');
          if (mounted) {
            setState(() {
              _isLoaded = true;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          final desc = AdManager.getErrorDescription(error.code);
          AdManager.logDiagnostic('BANNER', 'Failed to load: Code ${error.code} ($desc), Domain: ${error.domain}, Message: ${error.message}, ResponseInfo: ${error.responseInfo}');
          ad.dispose();
          if (mounted) {
            setState(() {
              _isLoaded = false;
              _bannerAd = null;
            });
          }
        },
        onAdClicked: (ad) {
          AdManager.logDiagnostic('BANNER', 'Banner ad clicked.');
        },
        onAdImpression: (ad) {
          AdManager.logDiagnostic('BANNER', 'Banner ad impression registered.');
        },
      ),
    )..load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  Future<void> _launchURL() async {
    final url = Uri.parse(AdManager.customBannerLinkUrl);
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (AdManager.customBannerEnabled &&
        AdManager.customBannerImageUrl.isNotEmpty) {
      return GestureDetector(
        onTap: _launchURL,
        child: Container(
          width: double.infinity,
          height: 50,
          color: Colors.black,
          child: CachedNetworkImage(
            imageUrl: AdManager.customBannerImageUrl,
            fit: BoxFit.cover,
            placeholder: (context, url) =>
                const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            errorWidget: (context, url, error) => const SizedBox.shrink(),
          ),
        ),
      );
    }

    if (_isLoaded && _bannerAd != null) {
      return Container(
        width: _bannerAd!.size.width.toDouble(),
        height: _bannerAd!.size.height.toDouble(),
        alignment: Alignment.center,
        child: AdWidget(ad: _bannerAd!),
      );
    }

    return const SizedBox.shrink();
  }
}
