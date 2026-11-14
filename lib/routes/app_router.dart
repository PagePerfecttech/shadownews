import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/otp_screen.dart';
import '../screens/onboarding/state_selection_screen.dart';
import '../screens/onboarding/district_selection_screen.dart';
import '../screens/onboarding/mandal_selection_screen.dart';
import '../screens/onboarding/assembly_selection_screen.dart';
import '../screens/feed_screen.dart';
import '../screens/shorts_screen.dart';
import '../screens/discovery_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/bookmarks_screen.dart';
import '../screens/main_scaffold.dart';
import '../screens/reporter_submit_screen.dart';
import '../screens/reporter_apply_screen.dart';
import '../screens/reporter_dashboard_screen.dart';
import '../screens/search_screen.dart';
import '../screens/article_webview_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../screens/terms_conditions_screen.dart';
import '../screens/reporter_guidelines_screen.dart';
import '../screens/about_us_screen.dart';
import '../screens/contact_us_screen.dart';
import '../screens/wallet_screen.dart';
import '../screens/withdraw_screen.dart';
import '../screens/edit_profile_screen.dart';
import '../screens/notification_settings_screen.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);
final GlobalKey<NavigatorState> _feedNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'feedNav',
);
final GlobalKey<NavigatorState> _shortsNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'shortsNav',
);
final GlobalKey<NavigatorState> _postNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'postNav',
);
final GlobalKey<NavigatorState> _shareNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'shareNav');
final GlobalKey<NavigatorState> _profileNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'profileNav');

// Cache SharedPreferences to avoid re-instantiating on every route redirect
SharedPreferences? _cachedPrefs;
Future<SharedPreferences> _getPrefs() async {
  _cachedPrefs ??= await SharedPreferences.getInstance();
  return _cachedPrefs!;
}

// Stores incoming deep link route so splash screen can hand off to it
String? pendingDeepLinkRoute;

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  redirect: (context, state) async {
    final location = state.matchedLocation;
    final isSplashRoute = location == '/splash';

    // Capture incoming deep link (e.g. /p/:id or /s/:id) to restore after splash finishes
    if (location.startsWith('/p/') || location.startsWith('/s/')) {
      pendingDeepLinkRoute = location;
    }

    // Allow splash through without redirect to let it handle initialization
    if (isSplashRoute) {
      return null;
    }

    final user = FirebaseAuth.instance.currentUser;

    final isAuthRoute =
        location.startsWith('/login') || location.startsWith('/otp');
    final isOnboardingRoute = location.startsWith('/onboarding');

    // Public routes that don't require authentication
    final isPublicRoute =
        location.startsWith('/search') ||
        location.startsWith('/article') ||
        location.startsWith('/p/') ||
        location.startsWith('/s/') ||
        location == '/privacy-policy' ||
        location == '/terms-conditions' ||
        location == '/reporter-guidelines' ||
        location == '/about-us' ||
        location == '/contact-us';

    // Allow public routes without login
    if (isPublicRoute) {
      return null;
    }

    // Check Guest mode (uses cached prefs to avoid repeated disk reads)
    final prefs = await _getPrefs();
    final isGuest = prefs.getBool('is_guest') ?? false;

    // If user is not logged in and not a guest, redirect to login
    if (user == null && !isGuest) {
      if (isAuthRoute || isOnboardingRoute) {
        return null; // Allow auth and onboarding screens
      }
      return '/login'; // Redirect to login for protected routes
    }

    // If user is logged in (and not in guest mode) and trying to go to auth screens, redirect to feed
    if (isAuthRoute && user != null && !isGuest) {
      return '/feed';
    }

    return null;
  },
  routes: <RouteBase>[
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/otp',
      builder: (context, state) {
        final verificationId = state.extra as String? ?? '';
        return OtpScreen(verificationId: verificationId);
      },
    ),
    GoRoute(
      path: '/onboarding/state',
      builder: (context, state) => const StateSelectionScreen(),
    ),
    GoRoute(
      path: '/onboarding/district',
      builder: (context, state) {
        final extra = state.extra;
        final stateData = extra is Map
            ? Map<String, dynamic>.from(extra)
            : <String, dynamic>{};
        return DistrictSelectionScreen(stateData: stateData);
      },
    ),
    GoRoute(
      path: '/onboarding/assembly',
      builder: (context, state) {
        final extra = state.extra;
        final districtData = extra is Map
            ? Map<String, dynamic>.from(extra)
            : <String, dynamic>{};
        return AssemblySelectionScreen(districtData: districtData);
      },
    ),
    GoRoute(
      path: '/onboarding/mandal',
      builder: (context, state) {
        final extra = state.extra;
        final assemblyData = extra is Map
            ? Map<String, dynamic>.from(extra)
            : <String, dynamic>{};
        return MandalSelectionScreen(districtData: assemblyData);
      },
    ),
    GoRoute(
      path: '/reporter/submit',
      builder: (context, state) => const ReporterSubmitScreen(),
    ),
    GoRoute(
      path: '/reporter/apply',
      builder: (context, state) => const ReporterApplyScreen(),
    ),
    GoRoute(
      path: '/reporter/dashboard',
      builder: (context, state) => const ReporterDashboardScreen(),
    ),
    GoRoute(
      path: '/reporter/wallet',
      builder: (context, state) => const WalletScreen(),
    ),
    GoRoute(
      path: '/reporter/wallet/withdraw',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        final earningsBal = (extra['earningsBalance'] ?? extra['balance'] ?? 0.0) is num
            ? (extra['earningsBalance'] ?? extra['balance']).toDouble()
            : 0.0;
        final minW = (extra['minWithdrawalInr'] ?? 500.0) is num
            ? (extra['minWithdrawalInr'] ?? 500.0).toDouble()
            : 500.0;
        return WithdrawScreen(
          balance: earningsBal,
          minWithdrawal: minW,
          savedUpiId: extra['savedUpiId']?.toString(),
          savedBankAccountNumber: extra['savedBankAccountNumber']?.toString(),
          savedBankIfsc: extra['savedBankIfsc']?.toString(),
          savedBankAccountName: extra['savedBankAccountName']?.toString(),
          lastWithdrawalAt: extra['lastWithdrawalAt']?.toString(),
        );
      },
    ),
    GoRoute(
      path: '/bookmarks',
      builder: (context, state) => const BookmarksScreen(),
    ),
    GoRoute(
      path: '/search',
      builder: (context, state) {
        final query = state.extra as String? ?? '';
        return SearchScreen(query: query);
      },
    ),
    GoRoute(
      path: '/discovery',
      builder: (context, state) => const DiscoveryScreen(),
    ),
    GoRoute(
      path: '/article',
      builder: (context, state) {
        final extra = state.extra;
        final data = extra is Map
            ? Map<String, String>.from(extra)
            : <String, String>{};
        return ArticleWebViewScreen(
          url: data['url'] ?? '',
          title: data['title'] ?? 'Article',
        );
      },
    ),
    GoRoute(
      path: '/privacy-policy',
      builder: (context, state) => const PrivacyPolicyScreen(),
    ),
    GoRoute(
      path: '/terms-conditions',
      builder: (context, state) => const TermsConditionsScreen(),
    ),
    GoRoute(
      path: '/reporter-guidelines',
      builder: (context, state) => const ReporterGuidelinesScreen(),
    ),
    GoRoute(
      path: '/about-us',
      builder: (context, state) => const AboutUsScreen(),
    ),
    GoRoute(
      path: '/contact-us',
      builder: (context, state) => const ContactUsScreen(),
    ),
    GoRoute(
      path: '/edit-profile',
      builder: (context, state) => const EditProfileScreen(),
    ),
    GoRoute(
      path: '/settings/notifications',
      builder: (context, state) => const NotificationSettingsScreen(),
    ),
    StatefulShellRoute.indexedStack(
      builder:
          (
            BuildContext context,
            GoRouterState state,
            StatefulNavigationShell navigationShell,
          ) {
            return MainScaffold(navigationShell: navigationShell);
          },
      branches: <StatefulShellBranch>[
        // Tab 0: Post
        StatefulShellBranch(
          navigatorKey: _postNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/post_tab',
              builder: (BuildContext context, GoRouterState state) =>
                  const ReporterDashboardScreen(),
            ),
          ],
        ),
        // Tab 1: Video (Shorts)
        StatefulShellBranch(
          navigatorKey: _shortsNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/shorts',
              builder: (BuildContext context, GoRouterState state) =>
                  const ShortsScreen(),
            ),
          ],
        ),
        // Tab 2: Home (Feed)
        StatefulShellBranch(
          navigatorKey: _feedNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/feed',
              builder: (BuildContext context, GoRouterState state) {
                final extra = state.extra as Map<String, dynamic>?;
                final refresh = extra?['refresh'] == true;
                final newsId = state.uri.queryParameters['newsId'] ?? extra?['newsId'] as String?;
                return FeedScreen(
                  key: refresh
                      ? ValueKey(DateTime.now().toString())
                      : (newsId != null ? ValueKey('feed_$newsId') : const ValueKey('feed_screen')),
                  newsId: newsId,
                );
              },
            ),
            GoRoute(
              path: '/p/:id',
              builder: (BuildContext context, GoRouterState state) {
                final id = state.pathParameters['id'] ?? '';
                return FeedScreen(
                  key: ValueKey('feed_p_$id'),
                  newsId: id,
                );
              },
            ),
            GoRoute(
              path: '/s/:id',
              builder: (BuildContext context, GoRouterState state) {
                final id = state.pathParameters['id'] ?? '';
                return FeedScreen(
                  key: ValueKey('feed_s_$id'),
                  newsId: id,
                );
              },
            ),
          ],
        ),

        // Tab 3: WhatsApp Share
        StatefulShellBranch(
          navigatorKey: _shareNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/share_tab',
              builder: (BuildContext context, GoRouterState state) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) {
                    context.go('/');
                  }
                });
                return const Scaffold(
                  body: SizedBox.shrink(),
                );
              },
            ),
          ],
        ),
        // Tab 4: Menu (Profile)
        StatefulShellBranch(
          navigatorKey: _profileNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/profile',
              builder: (BuildContext context, GoRouterState state) =>
                  const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);
