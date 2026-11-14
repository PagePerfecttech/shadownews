import 'dart:async';
import 'dart:math' as dart_math;
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:truecaller_sdk/truecaller_sdk.dart';
import '../api/api_client.dart';
import '../core/config/app_config.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  StreamSubscription? _truecallerSubscription;
  String _currentCodeVerifier = '';

  Future<bool> initTruecaller({
    required Function(bool) onLoading,
    required Function(String) onError,
    required Function() onSuccess,
  }) async {
    TcSdk.initializeSDK(
      sdkOption: TcSdkOptions.OPTION_VERIFY_ONLY_TC_USERS,
      consentHeadingOption: TcSdkOptions.SDK_CONSENT_HEADING_LOG_IN_TO,
      footerType: TcSdkOptions.FOOTER_TYPE_ANOTHER_MOBILE_NO,
      ctaText: TcSdkOptions.CTA_TEXT_CONTINUE,
    );
    
    _truecallerSubscription?.cancel();
    _truecallerSubscription = TcSdk.streamCallbackData.listen((event) async {
        switch (event.result) {
          case TcSdkCallbackResult.success:
            try {
              if (event.tcOAuthData != null) {
                final authCode = event.tcOAuthData!.authorizationCode;
                final res = await apiClient.post('/auth/truecaller', data: {
                  'code': authCode,
                  'codeVerifier': _currentCodeVerifier,
                });
                await _handleBackendAuthResponse(res.data['token']);
                onSuccess();
              } else if (event.profile != null) {
                final profile = event.profile!;
                final res = await apiClient.post('/auth/truecaller', data: {
                  'payload': profile.payload,
                  'signature': profile.signature,
                  'signatureAlgorithm': profile.signatureAlgorithm,
                });
                await _handleBackendAuthResponse(res.data['token']);
                onSuccess();
              }
            } catch (e) {
              onLoading(false);
              onError('Truecaller Login failed: $e');
            }
            break;
          case TcSdkCallbackResult.failure:
            onLoading(false);
            onError('Truecaller Error: ${event.error?.message ?? "Unknown error"}');
            break;
          case TcSdkCallbackResult.verification:
            break;
          default:
            onLoading(false);
        }
    });

    return await TcSdk.isOAuthFlowUsable;
  }

  Future<void> loginWithTruecaller() async {
    try {
      TcSdk.setOAuthState('tc_login_state');
      TcSdk.setOAuthScopes(['profile', 'phone', 'openid']);
      _currentCodeVerifier = _generateRandomString(64);
      String codeChallenge = await TcSdk.generateCodeChallenge(_currentCodeVerifier);
      await TcSdk.setCodeChallenge(codeChallenge);
      TcSdk.getAuthorizationCode;
    } catch (e) {
      debugPrint("Truecaller init error: $e");
      rethrow;
    }
  }

  Future<void> sendOtp({
    required String phone,
    required Function(bool) onLoading,
    required Function(String) onError,
    required Function(String) onCodeSent,
    required Function() onVerified,
  }) async {
    if (phone.isEmpty || phone.length < 10) {
      onError('Please enter a valid 10-digit number');
      return;
    }
    onLoading(true);

    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: '+91$phone',
        verificationCompleted: (PhoneAuthCredential credential) async {
          await FirebaseAuth.instance.signInWithCredential(credential);
          await apiClient.syncUser();
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('is_guest');
          onVerified();
        },
        verificationFailed: (FirebaseAuthException e) {
          onLoading(false);
          String errorMsg = e.message ?? 'Verification failed';
          if (e.code == 'operation-not-allowed') {
            errorMsg = 'Phone authentication is disabled in Firebase Console. Please enable "Phone" under Firebase Auth -> Sign-in method, or sign in with Google.';
          } else if (e.code == 'invalid-phone-number') {
            errorMsg = 'The provided phone number is not valid.';
          } else if (e.code == 'too-many-requests' || e.code == 'quota-exceeded') {
            errorMsg = 'SMS quota reached or too many requests. Please try again later or sign in with Google.';
          } else if (e.code == 'app-not-authorized') {
            errorMsg = 'App not authorized. Please check SHA-1 fingerprint in Firebase Console.';
          }
          onError(errorMsg);
        },
        codeSent: (String verificationId, int? resendToken) {
          onLoading(false);
          onCodeSent(verificationId);
        },
        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      onLoading(false);
      onError('Failed to initiate phone verification: $e');
    }
  }

  Future<void> signInWithGoogle() async {
    final GoogleSignIn googleSignIn = GoogleSignIn(
      serverClientId: AppConfig.googleServerClientId,
    );
    final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
    if (googleUser == null) return;
    
    final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
    final AuthCredential credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );
    
    await FirebaseAuth.instance.signInWithCredential(credential);
    await apiClient.syncUser();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('is_guest');
  }

  Future<void> _handleBackendAuthResponse(String? token) async {
    if (token != null) {
      await FirebaseAuth.instance.signInWithCustomToken(token);
      await apiClient.syncUser(); 
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_guest');
    } else {
      throw Exception('No token returned from backend');
    }
  }

  void dispose() {
    _truecallerSubscription?.cancel();
  }

  String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    final rnd = dart_math.Random.secure();
    return String.fromCharCodes(Iterable.generate(
        length, (_) => chars.codeUnitAt(rnd.nextInt(chars.length))));
  }
}
