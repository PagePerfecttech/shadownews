import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../core/config/app_config.dart';

class AdManager {
  // Singleton pattern for instance operations (AppOpen, Interstitial)
  static final AdManager instance = AdManager();

  // Configurable ad unit IDs with AppConfig environment defaults
  static String appOpenAdUnitId = AppConfig.defaultAppOpenAdId;
  static String bannerAdUnitId = AppConfig.defaultBannerAdId;
  static String interstitialAdUnitId = AppConfig.defaultInterstitialAdId;
  static String nativeAdUnitId = AppConfig.defaultNativeAdId;
  static String rewardedAdUnitId = AppConfig.defaultRewardedAdId;
  static String rewardedInterstitialAdUnitId = AppConfig.defaultRewardedInterstitialAdId;
  
  static int adFeedFrequency = 3;
  static bool admobFeedEnabled = true;
  static bool customBannerEnabled = false;
  static String customBannerImageUrl = '';
  static String customBannerLinkUrl = '';
  static bool isTestMode = false;

  // Diagnostic helper for decoding AdMob LoadAdError codes
  static String getErrorDescription(int code) {
    switch (code) {
      case 0:
        return 'ERROR_CODE_INTERNAL_ERROR (AdMob internal error / SDK configuration mismatch)';
      case 1:
        return 'ERROR_CODE_INVALID_REQUEST (Invalid ad unit ID or targeting parameters)';
      case 2:
        return 'ERROR_CODE_NETWORK_ERROR (Network connectivity or DNS error)';
      case 3:
        return 'ERROR_CODE_NO_FILL (No ad inventory available from Google AdMob servers)';
      default:
        return 'UNKNOWN_ERROR ($code)';
    }
  }

  static void logDiagnostic(String tag, String message) {
    debugPrint('[ADMOB][$tag] $message');
  }

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    
    // 1. Load from Cache
    _loadSettingsFromCache(prefs);

    // 2. Log loaded configuration
    logDiagnostic('INIT', 'Cached config loaded -> Native: $nativeAdUnitId, Banner: $bannerAdUnitId, Interstitial: $interstitialAdUnitId, AppOpen: $appOpenAdUnitId, Rewarded: $rewardedAdUnitId, RewardedInterstitial: $rewardedInterstitialAdUnitId, TestMode: $isTestMode');

    // 3. Request UMP Consent if applicable
    await requestConsent();

    // 4. Fetch fresh config from backend
    try {
      await _fetchRemoteSettings(prefs);
    } catch (e) {
      logDiagnostic('INIT', 'Error fetching remote ad settings: $e');
    }

    // 5. Preload Ads
    instance.loadInterstitialAd();
    instance.loadAppOpenAd();
    instance.loadRewardedAd();
    instance.loadRewardedInterstitialAd();
  }

  static Future<void> requestConsent() async {
    if (kIsWeb) return;
    try {
      final params = ConsentRequestParameters();
      ConsentInformation.instance.requestConsentInfoUpdate(
        params,
        () async {
          logDiagnostic('CONSENT', 'Consent info updated successfully.');
          final isFormAvailable = await ConsentInformation.instance.isConsentFormAvailable();
          if (isFormAvailable) {
            ConsentForm.loadAndShowConsentFormIfRequired((formError) {
              if (formError != null) {
                logDiagnostic('CONSENT', 'Consent form dismissed with error: ${formError.message}');
              } else {
                logDiagnostic('CONSENT', 'Consent form completed or not required.');
              }
            });
          }
        },
        (FormError error) {
          logDiagnostic('CONSENT', 'Consent info update failed: ${error.message} (code: ${error.errorCode})');
        },
      );
    } catch (e) {
      logDiagnostic('CONSENT', 'Consent initialization exception: $e');
    }
  }

  static void _loadSettingsFromCache(SharedPreferences prefs) {
    String os = kIsWeb ? 'web' : (defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios');
    appOpenAdUnitId = prefs.getString('admob_app_open_id_$os') ?? AppConfig.defaultAppOpenAdId;
    bannerAdUnitId = prefs.getString('admob_banner_id_$os') ?? AppConfig.defaultBannerAdId;
    interstitialAdUnitId = prefs.getString('admob_interstitial_id_$os') ?? AppConfig.defaultInterstitialAdId;
    nativeAdUnitId = prefs.getString('admob_native_id_$os') ?? AppConfig.defaultNativeAdId;
    rewardedAdUnitId = prefs.getString('admob_rewarded_id_$os') ?? AppConfig.defaultRewardedAdId;
    rewardedInterstitialAdUnitId = prefs.getString('admob_rewarded_interstitial_id_$os') ?? AppConfig.defaultRewardedInterstitialAdId;
    
    adFeedFrequency = prefs.getInt('admob_feed_frequency') ?? 3;
    admobFeedEnabled = prefs.getBool('admob_feed_enabled') ?? true;
    customBannerEnabled = prefs.getBool('custom_banner_enabled') ?? false;
    customBannerImageUrl = prefs.getString('custom_banner_image_url') ?? '';
    customBannerLinkUrl = prefs.getString('custom_banner_link_url') ?? '';

    // Only switch to Google test ad units if test mode is explicitly enabled from backend settings
    isTestMode = prefs.getBool('admob_test_mode') ?? false;
    if (isTestMode) {
      nativeAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/2247696110'
          : 'ca-app-pub-3940256099942544/3986624511';
      bannerAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/6300978111'
          : 'ca-app-pub-3940256099942544/2934735716';
      interstitialAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/1033173712'
          : 'ca-app-pub-3940256099942544/4411468910';
      appOpenAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/9257390508'
          : 'ca-app-pub-3940256099942544/5662855259';
      rewardedAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/5224354917'
          : 'ca-app-pub-3940256099942544/1712485313';
      rewardedInterstitialAdUnitId = defaultTargetPlatform == TargetPlatform.android
          ? 'ca-app-pub-3940256099942544/5354046379'
          : 'ca-app-pub-3940256099942544/6978759866';
    }
  }

  static Future<void> _fetchRemoteSettings(SharedPreferences prefs) async {
    try {
      final response = await apiClient.get('/settings/ads');
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        
        void saveString(String key) {
          if (data.containsKey(key) && data[key].toString().isNotEmpty) {
            prefs.setString(key, data[key].toString());
          }
        }
        
        saveString('admob_app_open_id_android');
        saveString('admob_app_open_id_ios');
        saveString('admob_banner_id_android');
        saveString('admob_banner_id_ios');
        saveString('admob_interstitial_id_android');
        saveString('admob_interstitial_id_ios');
        saveString('admob_native_id_android');
        saveString('admob_native_id_ios');
        saveString('admob_rewarded_id_android');
        saveString('admob_rewarded_id_ios');
        saveString('admob_rewarded_interstitial_id_android');
        saveString('admob_rewarded_interstitial_id_ios');

        if (data.containsKey('admob_test_mode')) {
          prefs.setBool('admob_test_mode', data['admob_test_mode'] == 'true');
        }

        if (data.containsKey('admob_feed_frequency')) {
          prefs.setInt('admob_feed_frequency', int.tryParse(data['admob_feed_frequency'].toString()) ?? 3);
        }
        if (data.containsKey('admob_feed_enabled')) {
          prefs.setBool('admob_feed_enabled', data['admob_feed_enabled'] == 'true');
        }
        if (data.containsKey('custom_banner_enabled')) {
          prefs.setBool('custom_banner_enabled', data['custom_banner_enabled'] == 'true');
        }
        saveString('custom_banner_image_url');
        saveString('custom_banner_link_url');

        // Reload fresh settings into memory
        _loadSettingsFromCache(prefs);
        logDiagnostic('REMOTE_SYNC', 'Remote settings applied successfully -> Native: $nativeAdUnitId, TestMode: $isTestMode');
      }
    } catch (e) {
      logDiagnostic('REMOTE_SYNC', 'Error fetching remote ad settings: $e');
    }
  }

  // --- App Open Ad ---
  AppOpenAd? _appOpenAd;
  bool _isShowingAppOpenAd = false;
  bool _isLoadingAppOpen = false;
  DateTime? _appOpenLoadTime;
  int _appOpenRetryCount = 0;

  /// Load an AppOpenAd.
  void loadAppOpenAd() {
    if (kIsWeb || appOpenAdUnitId.isEmpty || _isLoadingAppOpen || _appOpenAd != null) return;
    _isLoadingAppOpen = true;

    logDiagnostic('APP_OPEN', 'Requesting App Open Ad with Unit ID: $appOpenAdUnitId');
    AppOpenAd.load(
      adUnitId: appOpenAdUnitId,
      request: const AdRequest(),
      adLoadCallback: AppOpenAdLoadCallback(
        onAdLoaded: (ad) {
          _appOpenLoadTime = DateTime.now();
          _appOpenAd = ad;
          _isLoadingAppOpen = false;
          _appOpenRetryCount = 0;
          logDiagnostic('APP_OPEN', 'App Open Ad loaded successfully.');
        },
        onAdFailedToLoad: (error) {
          _isLoadingAppOpen = false;
          _appOpenAd = null;
          logDiagnostic('APP_OPEN', 'Failed to load: Code ${error.code} (${getErrorDescription(error.code)}), Domain: ${error.domain}, Message: ${error.message}, ResponseInfo: ${error.responseInfo}');
          if (_appOpenRetryCount < 3) {
            _appOpenRetryCount++;
            final delaySeconds = _appOpenRetryCount * 15;
            logDiagnostic('APP_OPEN', 'Scheduling retry #$_appOpenRetryCount in ${delaySeconds}s');
            Future.delayed(Duration(seconds: delaySeconds), () => loadAppOpenAd());
          }
        },
      ),
    );
  }

  /// Whether an ad is available to be shown.
  bool get isAppOpenAdAvailable {
    return _appOpenAd != null &&
        _appOpenLoadTime != null &&
        DateTime.now().difference(_appOpenLoadTime!).inHours < 4;
  }

  /// Shows the app open ad.
  void showAppOpenAdIfAvailable() {
    if (kIsWeb) return;
    if (!isAppOpenAdAvailable) {
      logDiagnostic('APP_OPEN', 'Ad not available. Requesting new ad.');
      loadAppOpenAd();
      return;
    }
    if (_isShowingAppOpenAd) {
      logDiagnostic('APP_OPEN', 'Already showing an ad, skipping.');
      return;
    }

    _appOpenAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdShowedFullScreenContent: (ad) {
        _isShowingAppOpenAd = true;
        logDiagnostic('APP_OPEN', 'App Open Ad presented full screen.');
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        logDiagnostic('APP_OPEN', 'Failed to show App Open Ad: ${error.message}');
        _isShowingAppOpenAd = false;
        ad.dispose();
        _appOpenAd = null;
        loadAppOpenAd();
      },
      onAdDismissedFullScreenContent: (ad) {
        logDiagnostic('APP_OPEN', 'App Open Ad dismissed.');
        _isShowingAppOpenAd = false;
        ad.dispose();
        _appOpenAd = null;
        loadAppOpenAd();
      },
    );
    _appOpenAd!.show();
  }

  // --- Interstitial Ad ---
  InterstitialAd? _interstitialAd;
  bool _isLoadingInterstitial = false;
  int _interstitialRetryCount = 0;
  DateTime? _lastInterstitialShowTime;
  int _swipedStoriesCount = 0;
  static const int interstitialSwipeThreshold = 8;
  static const int minInterstitialIntervalSeconds = 120; // 2 minutes between interstitials

  void loadInterstitialAd() {
    if (kIsWeb || interstitialAdUnitId.isEmpty || _isLoadingInterstitial || _interstitialAd != null) return;
    _isLoadingInterstitial = true;

    logDiagnostic('INTERSTITIAL', 'Requesting Interstitial Ad with Unit ID: $interstitialAdUnitId');
    InterstitialAd.load(
      adUnitId: interstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _interstitialAd = ad;
          _isLoadingInterstitial = false;
          _interstitialRetryCount = 0;
          _interstitialAd!.setImmersiveMode(true);
          logDiagnostic('INTERSTITIAL', 'Interstitial Ad loaded successfully.');
        },
        onAdFailedToLoad: (error) {
          _isLoadingInterstitial = false;
          _interstitialAd = null;
          logDiagnostic('INTERSTITIAL', 'Failed to load: Code ${error.code} (${getErrorDescription(error.code)}), Domain: ${error.domain}, Message: ${error.message}, ResponseInfo: ${error.responseInfo}');
          if (_interstitialRetryCount < 3) {
            _interstitialRetryCount++;
            final delaySeconds = _interstitialRetryCount * 20;
            logDiagnostic('INTERSTITIAL', 'Scheduling retry #$_interstitialRetryCount in ${delaySeconds}s');
            Future.delayed(Duration(seconds: delaySeconds), () => loadInterstitialAd());
          }
        },
      ),
    );
  }

  /// Track story swipe count and trigger interstitial when threshold is reached
  void notifyStorySwiped() {
    _swipedStoriesCount++;
    logDiagnostic('INTERSTITIAL', 'Story swiped -> count: $_swipedStoriesCount / $interstitialSwipeThreshold');
    if (_swipedStoriesCount >= interstitialSwipeThreshold) {
      showInterstitialAdIfReady(onAdClosed: () {
        _swipedStoriesCount = 0;
      });
    }
  }

  bool get isInterstitialReady {
    if (_interstitialAd == null) return false;
    if (_lastInterstitialShowTime != null) {
      final elapsed = DateTime.now().difference(_lastInterstitialShowTime!).inSeconds;
      if (elapsed < minInterstitialIntervalSeconds) {
        return false;
      }
    }
    return true;
  }

  void showInterstitialAdIfReady({VoidCallback? onAdClosed}) {
    if (kIsWeb) {
      onAdClosed?.call();
      return;
    }
    if (!isInterstitialReady) {
      logDiagnostic('INTERSTITIAL', 'Ad not ready or frequency cap active. Skipping.');
      if (_interstitialAd == null) {
        loadInterstitialAd();
      }
      onAdClosed?.call();
      return;
    }

    _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        logDiagnostic('INTERSTITIAL', 'Interstitial Ad dismissed.');
        ad.dispose();
        _interstitialAd = null;
        _lastInterstitialShowTime = DateTime.now();
        loadInterstitialAd();
        onAdClosed?.call();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        logDiagnostic('INTERSTITIAL', 'Failed to show interstitial: ${error.message}');
        ad.dispose();
        _interstitialAd = null;
        loadInterstitialAd();
        onAdClosed?.call();
      },
    );

    _interstitialAd!.show();
  }

  void showInterstitialAd({VoidCallback? onAdClosed}) {
    showInterstitialAdIfReady(onAdClosed: onAdClosed);
  }

  // --- Rewarded Ad ---
  RewardedAd? _rewardedAd;
  bool _isLoadingRewarded = false;
  int _rewardedRetryCount = 0;

  void loadRewardedAd() {
    if (kIsWeb || rewardedAdUnitId.isEmpty || _isLoadingRewarded || _rewardedAd != null) return;
    _isLoadingRewarded = true;

    logDiagnostic('REWARDED', 'Requesting Rewarded Ad with Unit ID: $rewardedAdUnitId');
    RewardedAd.load(
      adUnitId: rewardedAdUnitId,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedAd = ad;
          _isLoadingRewarded = false;
          _rewardedRetryCount = 0;
          _rewardedAd!.setImmersiveMode(true);
          logDiagnostic('REWARDED', 'Rewarded Ad loaded successfully.');
        },
        onAdFailedToLoad: (error) {
          _isLoadingRewarded = false;
          _rewardedAd = null;
          logDiagnostic('REWARDED', 'Failed to load: Code ${error.code} (${getErrorDescription(error.code)}), Domain: ${error.domain}, Message: ${error.message}, ResponseInfo: ${error.responseInfo}');
          if (_rewardedRetryCount < 3) {
            _rewardedRetryCount++;
            final delaySeconds = _rewardedRetryCount * 20;
            logDiagnostic('REWARDED', 'Scheduling retry #$_rewardedRetryCount in ${delaySeconds}s');
            Future.delayed(Duration(seconds: delaySeconds), () => loadRewardedAd());
          }
        },
      ),
    );
  }

  bool get isRewardedAdAvailable => _rewardedAd != null;

  void showRewardedAd({required void Function(RewardItem reward) onUserEarnedReward, VoidCallback? onAdClosed}) {
    if (kIsWeb) {
      onAdClosed?.call();
      return;
    }
    if (!isRewardedAdAvailable) {
      logDiagnostic('REWARDED', 'Rewarded ad not ready. Requesting load.');
      loadRewardedAd();
      onAdClosed?.call();
      return;
    }

    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        logDiagnostic('REWARDED', 'Rewarded Ad dismissed.');
        ad.dispose();
        _rewardedAd = null;
        loadRewardedAd();
        onAdClosed?.call();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        logDiagnostic('REWARDED', 'Failed to show Rewarded Ad: ${error.message}');
        ad.dispose();
        _rewardedAd = null;
        loadRewardedAd();
        onAdClosed?.call();
      },
    );

    _rewardedAd!.show(onUserEarnedReward: (_, reward) {
      logDiagnostic('REWARDED', 'User earned reward: ${reward.amount} ${reward.type}');
      onUserEarnedReward(reward);
    });
  }

  // --- Rewarded Interstitial Ad ---
  RewardedInterstitialAd? _rewardedInterstitialAd;
  bool _isLoadingRewardedInterstitial = false;
  int _rewardedInterstitialRetryCount = 0;

  void loadRewardedInterstitialAd() {
    if (kIsWeb || rewardedInterstitialAdUnitId.isEmpty || _isLoadingRewardedInterstitial || _rewardedInterstitialAd != null) return;
    _isLoadingRewardedInterstitial = true;

    logDiagnostic('REWARDED_INTERSTITIAL', 'Requesting Rewarded Interstitial Ad with Unit ID: $rewardedInterstitialAdUnitId');
    RewardedInterstitialAd.load(
      adUnitId: rewardedInterstitialAdUnitId,
      request: const AdRequest(),
      rewardedInterstitialAdLoadCallback: RewardedInterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedInterstitialAd = ad;
          _isLoadingRewardedInterstitial = false;
          _rewardedInterstitialRetryCount = 0;
          _rewardedInterstitialAd!.setImmersiveMode(true);
          logDiagnostic('REWARDED_INTERSTITIAL', 'Rewarded Interstitial Ad loaded successfully.');
        },
        onAdFailedToLoad: (error) {
          _isLoadingRewardedInterstitial = false;
          _rewardedInterstitialAd = null;
          logDiagnostic('REWARDED_INTERSTITIAL', 'Failed to load: Code ${error.code} (${getErrorDescription(error.code)}), Domain: ${error.domain}, Message: ${error.message}, ResponseInfo: ${error.responseInfo}');
          if (_rewardedInterstitialRetryCount < 3) {
            _rewardedInterstitialRetryCount++;
            final delaySeconds = _rewardedInterstitialRetryCount * 20;
            logDiagnostic('REWARDED_INTERSTITIAL', 'Scheduling retry #$_rewardedInterstitialRetryCount in ${delaySeconds}s');
            Future.delayed(Duration(seconds: delaySeconds), () => loadRewardedInterstitialAd());
          }
        },
      ),
    );
  }

  bool get isRewardedInterstitialAdAvailable => _rewardedInterstitialAd != null;

  void showRewardedInterstitialAd({required void Function(RewardItem reward) onUserEarnedReward, VoidCallback? onAdClosed}) {
    if (kIsWeb) {
      onAdClosed?.call();
      return;
    }
    if (!isRewardedInterstitialAdAvailable) {
      logDiagnostic('REWARDED_INTERSTITIAL', 'Rewarded Interstitial ad not ready. Requesting load.');
      loadRewardedInterstitialAd();
      onAdClosed?.call();
      return;
    }

    _rewardedInterstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        logDiagnostic('REWARDED_INTERSTITIAL', 'Rewarded Interstitial Ad dismissed.');
        ad.dispose();
        _rewardedInterstitialAd = null;
        loadRewardedInterstitialAd();
        onAdClosed?.call();
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        logDiagnostic('REWARDED_INTERSTITIAL', 'Failed to show Rewarded Interstitial Ad: ${error.message}');
        ad.dispose();
        _rewardedInterstitialAd = null;
        loadRewardedInterstitialAd();
        onAdClosed?.call();
      },
    );

    _rewardedInterstitialAd!.show(onUserEarnedReward: (_, reward) {
      logDiagnostic('REWARDED_INTERSTITIAL', 'User earned reward: ${reward.amount} ${reward.type}');
      onUserEarnedReward(reward);
    });
  }
}

/// A LifecycleObserver to handle showing App Open Ads when app is resumed
class AppLifecycleReactor extends WidgetsBindingObserver {
  final AdManager adManager;

  AppLifecycleReactor({required this.adManager});

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      adManager.showAppOpenAdIfAvailable();
    }
  }
}
