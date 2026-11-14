import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'firebase_options.dart';
import 'routes/app_router.dart';
import 'theme/app_theme.dart';
import 'services/onesignal_service.dart';
import 'services/ad_manager.dart';

// Global OneSignal service instance
final oneSignalService = OneSignalService();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Theme & Firebase (fast, local startup requirements)
  await globalThemeProvider.init();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Launch UI immediately so the user sees the Splash logo with ZERO delay
  runApp(const MyApp());

  // Initialize network & background SDKs without blocking the first frame
  Future.microtask(() async {
    try {
      await MobileAds.instance.initialize();
      await AdManager.init();
      WidgetsBinding.instance.addObserver(AppLifecycleReactor(adManager: AdManager.instance));
    } catch (e) {
      debugPrint('AdManager background init error: $e');
    }

    try {
      await oneSignalService.initialize();
    } catch (e) {
      debugPrint('OneSignal background init error: $e');
    }
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: globalThemeProvider,
      builder: (context, _) {
        return MaterialApp.router(
          routerConfig: appRouter,
          title: 'Shadow News',
          theme: AppTheme.lightTheme(),
          darkTheme: AppTheme.darkTheme(),
          themeMode: globalThemeProvider.themeMode,
          debugShowCheckedModeBanner: false,
          builder: (context, child) {
            final mediaQuery = MediaQuery.of(context);
            return MediaQuery(
              data: mediaQuery.copyWith(
                textScaler: TextScaler.linear(globalThemeProvider.textScaleFactor),
              ),
              child: child ?? const SizedBox.shrink(),
            );
          },
        );
      },
    );
  }
}
