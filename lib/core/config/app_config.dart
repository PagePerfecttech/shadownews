class AppConfig {
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'https://www.shadownews.in',
  );
  
  static const String apiBaseUrl = '$baseUrl/api/mobile';

  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '620220523849-ci0pb079e79envogpn5qjts5pmqusmhr.apps.googleusercontent.com',
  );

  static const String defaultAppOpenAdId = String.fromEnvironment(
    'ADMOB_APP_OPEN_ID',
    defaultValue: 'ca-app-pub-8507128258192249/6357789009',
  );

  static const String defaultBannerAdId = String.fromEnvironment(
    'ADMOB_BANNER_ID',
    defaultValue: 'ca-app-pub-8507128258192249/6473998216',
  );

  static const String defaultInterstitialAdId = String.fromEnvironment(
    'ADMOB_INTERSTITIAL_ID',
    defaultValue: 'ca-app-pub-8507128258192249/2901759723',
  );

  static const String defaultNativeAdId = String.fromEnvironment(
    'ADMOB_NATIVE_ID',
    defaultValue: 'ca-app-pub-8507128258192249/9359036069',
  );

  static const String defaultRewardedAdId = String.fromEnvironment(
    'ADMOB_REWARDED_ID',
    defaultValue: 'ca-app-pub-8507128258192249/1779928946',
  );

  static const String defaultRewardedInterstitialAdId = String.fromEnvironment(
    'ADMOB_REWARDED_INTERSTITIAL_ID',
    defaultValue: 'ca-app-pub-8507128258192249/1588678059',
  );
}
