import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../api/api_client.dart';


import '../services/location_service.dart';
import '../routes/app_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    try {
      // Ensure splash displays gracefully for at least 1500ms
      await Future.delayed(const Duration(milliseconds: 1500));

      final prefs = await SharedPreferences.getInstance();
      bool hasOnboarded = prefs.containsKey('selected_district_id');
      final isGuest = prefs.getBool('is_guest') ?? false;
      final user = FirebaseAuth.instance.currentUser;
      
      // Asynchronously refresh token and sync roles if logged in (non-blocking)
      if (user != null) {
        apiClient.syncUser(); 
      }

      // If user has not onboarded, attempt background GPS location match without blocking navigation
      if (!hasOnboarded) {
        LocationService.instance.initGPSLocation().catchError((e) {
          debugPrint('Background GPS init error on splash: $e');
          return false;
        });
      }
      
      if (mounted) {
        if (pendingDeepLinkRoute != null && pendingDeepLinkRoute!.isNotEmpty) {
          final target = pendingDeepLinkRoute!;
          pendingDeepLinkRoute = null;
          context.go(target);
        } else if (hasOnboarded || user != null || isGuest) {
          context.go('/feed');
        } else {
          context.go('/login');
        }
      }
    } catch (e) {
      debugPrint('Error in splash screen navigation: $e');
      if (mounted) {
        context.go('/login');
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Full Screen Image
          FadeTransition(
            opacity: _fadeAnimation,
            child: Image.asset(
              'assets/images/splash_logo.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Center(
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 140,
                  height: 140,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ),
          // Loading indicator at the bottom
          Positioned(
            bottom: 64,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: const Center(
                child: SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    color: Color(0xFFD32F2F),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
