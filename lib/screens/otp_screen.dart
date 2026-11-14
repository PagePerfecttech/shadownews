import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class OtpScreen extends StatefulWidget {
  final String verificationId;

  const OtpScreen({super.key, required this.verificationId});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final TextEditingController _otpController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _verifyOtp() async {
    final smsCode = _otpController.text.trim();
    if (smsCode.isEmpty || smsCode.length < 6) return;

    setState(() => _isLoading = true);

    try {
      PhoneAuthCredential credential = PhoneAuthProvider.credential(
        verificationId: widget.verificationId,
        smsCode: smsCode,
      );

      await FirebaseAuth.instance.signInWithCredential(credential);
      
      final user = FirebaseAuth.instance.currentUser;
      if (user != null && (user.displayName == null || user.displayName!.isEmpty)) {
        if (mounted) {
          final name = await showDialog<String>(
            context: context,
            barrierDismissible: false,
            builder: (context) {
              final controller = TextEditingController();
              return AlertDialog(
                title: Text('Enter Your Name', style: GoogleFonts.poppins()),
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
                    child: Text('Save', style: GoogleFonts.poppins()),
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

      bool hasOnboarded = await apiClient.syncUser();
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_guest');
      
      if (mounted) {
        if (hasOnboarded) {
          context.go('/feed');
        } else {
          context.go('/onboarding/state');
        }
      }
    } on FirebaseAuthException catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Invalid OTP: ${e.message}'),
            backgroundColor: const Color(0xFFD32F2F),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.appBarTheme.backgroundColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: theme.iconTheme.color,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Verify OTP',
          style: GoogleFonts.poppins(
            color: theme.textTheme.titleLarge?.color,
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.sms_outlined,
                size: 64,
                color: Color(0xFFD32F2F),
              ),
              const SizedBox(height: 16),
              Text(
                'Enter the 6-digit code sent to your phone',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 8,
                  color: theme.textTheme.bodyLarge?.color,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: '------',
                  hintStyle: GoogleFonts.poppins(
                    fontSize: 24,
                    letterSpacing: 8,
                    color: isDark ? Colors.grey[700] : const Color(0xFFCCCCCC),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.grey[800]! : const Color(0xFFE0E0E0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: isDark ? Colors.grey[800]! : const Color(0xFFE0E0E0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFFD32F2F),
                      width: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _verifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    disabledBackgroundColor:
                        const Color(0xFFD32F2F).withValues(alpha: 0.7),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          'Verify',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
