import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../api/api_client.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final FocusNode _phoneFocusNode = FocusNode();
  bool _isLoading = false;

  @override
  void dispose() {
    AuthService().dispose();
    _phoneController.dispose();
    _phoneFocusNode.dispose();
    super.dispose();
  }

  Future<void> _skipLogin() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_guest', true);
    if (mounted) {
      context.go('/feed');
    }
  }

  Future<void> _checkAndPromptName() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null && (user.displayName == null || user.displayName!.isEmpty)) {
      if (mounted) {
        final name = await showDialog<String>(
          context: context,
          barrierDismissible: false,
          builder: (context) {
            final controller = TextEditingController();
            return AlertDialog(
              title: const Text('Enter Your Name', style: TextStyle(fontWeight: FontWeight.bold)),
              content: TextField(
                controller: controller,
                decoration: const InputDecoration(hintText: 'Full Name'),
                textCapitalization: TextCapitalization.words,
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    if (controller.text.trim().isNotEmpty) {
                      Navigator.pop(context, controller.text.trim());
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
        if (name != null && name.isNotEmpty) {
          await user.updateDisplayName(name);
        }
      }
    }
  }

  void _sendOtp() {
    final phone = _phoneController.text.trim();
    if (phone.length != 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 10-digit mobile number'),
          backgroundColor: Color(0xFFD32F2F),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    _phoneFocusNode.unfocus();

    AuthService().sendOtp(
      phone: phone,
      onLoading: (loading) {
        if (mounted) setState(() => _isLoading = loading);
      },
      onError: (error) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error),
              backgroundColor: const Color(0xFFD32F2F),
            ),
          );
        }
      },
      onCodeSent: (verificationId) {
        if (mounted) {
          setState(() => _isLoading = false);
          context.push('/otp', extra: verificationId);
        }
      },
      onVerified: () async {
        await _checkAndPromptName();
        if (mounted) {
          setState(() => _isLoading = false);
          bool onboarded = await apiClient.syncUser();
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('is_guest');
          if (mounted) {
            if (onboarded) {
              context.go('/feed');
            } else {
              context.go('/onboarding/state');
            }
          }
        }
      },
    );
  }

  Future<void> _signInWithGoogle() async {
    setState(() => _isLoading = true);
    try {
      await AuthService().signInWithGoogle();
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        bool onboarded = await apiClient.syncUser();
        if (mounted) {
          if (onboarded) {
            context.go('/feed');
          } else {
            context.go('/onboarding/state');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Google Sign-In failed: $e'),
            backgroundColor: const Color(0xFFD32F2F),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        automaticallyImplyLeading: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: _skipLogin,
              icon: const Text(
                'Skip',
                style: TextStyle(
                  color: Color(0xFFD32F2F),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              label: const Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: Color(0xFFD32F2F),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              // App Brand Logo
              Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset(
                    'assets/images/logo.png',
                    height: 100,
                    width: 100,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.newspaper,
                      size: 80,
                      color: Color(0xFFD32F2F),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Shadow News',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Your Daily News in Telugu & English',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 36),

              // Phone Number Input Container
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter your mobile number',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'We will send a 6-digit verification code',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Phone input row: Fixed +91 (India) only
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // India flag & +91 badge (Fixed, NO dropdown)
                        Container(
                          height: 52,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey[850] : Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('🇮🇳', style: TextStyle(fontSize: 22)),
                              const SizedBox(width: 8),
                              Text(
                                '+91',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Native numeric phone keypad field
                        Expanded(
                          child: SizedBox(
                            height: 52,
                            child: TextField(
                              controller: _phoneController,
                              focusNode: _phoneFocusNode,
                              keyboardType: TextInputType.phone,
                              textInputAction: TextInputAction.done,
                              maxLength: 10,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(10),
                              ],
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1.5,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                              decoration: InputDecoration(
                                counterText: '',
                                hintText: '9876543210',
                                hintStyle: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 16,
                                  letterSpacing: 0,
                                  fontWeight: FontWeight.normal,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                filled: true,
                                fillColor: isDark ? Colors.grey[900] : Colors.grey[50],
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Color(0xFFD32F2F),
                                    width: 2,
                                  ),
                                ),
                              ),
                              onChanged: (_) => setState(() {}),
                              onSubmitted: (_) {
                                if (_phoneController.text.trim().length == 10 && !_isLoading) {
                                  _sendOtp();
                                }
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Get OTP Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: (_isLoading || _phoneController.text.trim().length != 10)
                            ? null
                            : _sendOtp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          disabledBackgroundColor: isDark
                              ? const Color(0xFF5A2020)
                              : const Color(0xFFEF9A9A),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Get OTP',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // OR divider
              Row(
                children: [
                  Expanded(child: Divider(color: isDark ? Colors.grey[800] : Colors.grey[300])),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'OR',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[500],
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: isDark ? Colors.grey[800] : Colors.grey[300])),
                ],
              ),

              const SizedBox(height: 16),

              // Continue with Google Button
              OutlinedButton(
                onPressed: _isLoading ? null : _signInWithGoogle,
                style: OutlinedButton.styleFrom(
                  backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  foregroundColor: isDark ? Colors.white : Colors.black87,
                  side: BorderSide(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  minimumSize: const Size(double.infinity, 52),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SvgPicture.asset(
                      'assets/images/google_logo.svg',
                      width: 20,
                      height: 20,
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Continue with Google',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Skip and Continue as Guest Button
              TextButton(
                onPressed: _skipLogin,
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey[700],
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: Text(
                  'Skip and Continue as Guest',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.grey[400] : Colors.grey[700],
                  ),
                ),
              ),

              const SizedBox(height: 24),
              // Footer disclaimer
              Text(
                'By continuing, you agree to our Terms of Service & Privacy Policy',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
