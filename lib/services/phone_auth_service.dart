import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class PhoneAuthService {
  static final PhoneAuthService _instance = PhoneAuthService._internal();

  factory PhoneAuthService() {
    return _instance;
  }

  PhoneAuthService._internal();

  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Stream to listen to authentication state changes
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Get the current user
  User? get currentUser => _auth.currentUser;

  /// Check if user is logged in
  bool get isLoggedIn => _auth.currentUser != null;

  /// Phone number for verification (will be set during sign in)
  String? _verificationId;
  String? _phoneNumber;

  /// Get the phone number being verified
  String? get phoneNumber => _phoneNumber;

  /// Send verification code to phone number
  Future<void> sendVerificationCode(String phoneNumber) async {
    try {
      _phoneNumber = phoneNumber;
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (PhoneAuthCredential credential) async {
          // Auto-retrieve SMS on Android
          await _auth.signInWithCredential(credential);
        },
        verificationFailed: (FirebaseAuthException e) {
          debugPrint('Phone verification failed: ${e.message}');
          throw Exception('Phone verification failed: ${e.message}');
        },
        codeSent: (String verificationId, int? resendToken) {
          _verificationId = verificationId;
          debugPrint('Verification code sent to $phoneNumber');
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
      );
    } catch (e) {
      debugPrint('Error sending verification code: $e');
      rethrow;
    }
  }

  /// Verify the OTP code and sign in
  Future<UserCredential?> verifyOTP(String otp) async {
    try {
      if (_verificationId == null) {
        throw Exception('Verification ID not found. Please request verification code again.');
      }

      final PhoneAuthCredential credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: otp,
      );

      final UserCredential userCredential = await _auth.signInWithCredential(credential);
      debugPrint('User signed in successfully: ${userCredential.user?.uid}');
      return userCredential;
    } catch (e) {
      debugPrint('Error verifying OTP: $e');
      rethrow;
    }
  }

  /// Sign out the current user
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      _verificationId = null;
      _phoneNumber = null;
      debugPrint('User signed out');
    } catch (e) {
      debugPrint('Error signing out: $e');
      rethrow;
    }
  }

  /// Get current user's phone number
  String? getUserPhoneNumber() {
    return _auth.currentUser?.phoneNumber;
  }

  /// Update user profile
  Future<void> updateUserProfile({
    required String displayName,
    String? photoUrl,
  }) async {
    try {
      await _auth.currentUser?.updateDisplayName(displayName);
      if (photoUrl != null) {
        await _auth.currentUser?.updatePhotoURL(photoUrl);
      }
      await _auth.currentUser?.reload();
    } catch (e) {
      debugPrint('Error updating profile: $e');
      rethrow;
    }
  }

  /// Delete the current user account
  Future<void> deleteAccount() async {
    try {
      await _auth.currentUser?.delete();
      debugPrint('User account deleted');
    } catch (e) {
      debugPrint('Error deleting account: $e');
      rethrow;
    }
  }
}
