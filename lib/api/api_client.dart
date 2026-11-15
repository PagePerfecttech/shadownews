import 'dart:convert';
import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

class ApiClient {
  final Dio _dio;

  ApiClient._internal()
    : _dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(minutes: 2),
          sendTimeout: const Duration(minutes: 2),
        ),
      ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            final user = FirebaseAuth.instance.currentUser;
            if (user != null) {
              final token = await user.getIdToken(); // Auto-refreshes if expired
              options.headers['Authorization'] = 'Bearer $token';
              debugPrint('Sending request to ${options.path} with token');
            } else {
              debugPrint('Sending request to ${options.path} WITHOUT token (Guest)');
            }
          } catch (e) {
            debugPrint('Failed to get Firebase token: $e');
            // Do not force sign out on transient token fetch error; proceed without token
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          debugPrint(
            'API Error [${e.response?.statusCode}]: ${e.requestOptions.path} - ${e.message}',
          );
          // Only sign out if an explicit auth verification endpoint rejects the token
          if (e.response?.statusCode == 401 && e.requestOptions.path.contains('/auth/')) {
            final user = FirebaseAuth.instance.currentUser;
            if (user != null) {
              debugPrint('Invalid session detected on auth endpoint. Signing out.');
              await _handleForceSignOut();
            }
          }
          return handler.next(e);
        },
      ),
    );
  }

  static Future<void> _handleForceSignOut() async {
    try {
      await FirebaseAuth.instance.signOut();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_guest');
      await prefs.remove('selected_topics');
      await prefs.remove('selected_district_id');
      // Navigation layer (app_router) will handle the redirect on next interaction
    } catch (_) {}
  }

  static final ApiClient instance = ApiClient._internal();

  Dio get dio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path, {dynamic data}) {
    return _dio.delete(path, data: data);
  }

  Future<bool> syncUser() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        return false; // Skip sync for guests
      }

      await user.getIdToken(
        true,
      ); // Force refresh to get latest claims (like reporter role)

      String? fcmToken;
      try {
        fcmToken = await FirebaseMessaging.instance.getToken();
      } catch (_) {}

      String? appVersion;
      try {
        final pkg = await PackageInfo.fromPlatform();
        appVersion = '${pkg.version}+${pkg.buildNumber}';
      } catch (_) {}

      final String devicePlatform = kIsWeb
          ? 'web'
          : (Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'unknown'));

      final payload = <String, dynamic>{
        'devicePlatform': devicePlatform,
      };
      if (fcmToken != null) payload['fcmToken'] = fcmToken;
      if (appVersion != null) payload['appVersion'] = appVersion;

      final response = await post('/auth/sync', data: payload);
      if (response.data != null && response.data['user'] != null) {
        final userData = response.data['user'];
        final prefs = await SharedPreferences.getInstance();
        if (userData['role'] == 'reporter' || userData['role'] == 'admin') {
          await prefs.setBool('is_reporter', true);
        } else {
          await prefs.setBool('is_reporter', false);
        }

        bool hasOnboarded = false;

        if (userData['stateId'] != null) {
          await prefs.setString('user_state_id', userData['stateId']);
          if (prefs.getString('selected_state_id') == null) {
            await prefs.setString('selected_state_id', userData['stateId']);
          }
        }
        if (userData['districtId'] != null) {
          await prefs.setString('user_district_id', userData['districtId']);
          if (prefs.getString('selected_district_id') == null) {
            await prefs.setString('selected_district_id', userData['districtId']);
          }
          // Location selected means onboarded
          hasOnboarded = true;
        }
        if (userData['assemblyId'] != null) {
          await prefs.setString('user_assembly_id', userData['assemblyId']);
          if (prefs.getString('selected_assembly_id') == null) {
            await prefs.setString('selected_assembly_id', userData['assemblyId']);
          }
        }
        if (userData['mandalId'] != null) {
          await prefs.setString('user_mandal_id', userData['mandalId']);
          if (prefs.getString('selected_mandal_id') == null) {
            await prefs.setString('selected_mandal_id', userData['mandalId']);
          }
        }
        if (userData['villageId'] != null) {
          await prefs.setString('user_village_id', userData['villageId']);
          if (prefs.getString('selected_village_id') == null) {
            await prefs.setString('selected_village_id', userData['villageId']);
          }
        }

        // Save reporter-specific location & posting scope
        if (userData['homeStateId'] != null) {
          await prefs.setString('reporter_home_state_id', userData['homeStateId'].toString());
        }
        if (userData['homeDistrictId'] != null) {
          await prefs.setString('reporter_home_district_id', userData['homeDistrictId'].toString());
        }
        if (userData['homeMandalId'] != null) {
          await prefs.setString('reporter_home_mandal_id', userData['homeMandalId'].toString());
        }
        if (userData['postingScope'] != null) {
          await prefs.setString('reporter_posting_scope', userData['postingScope'].toString());
        }
        if (userData['reporterLevel'] != null) {
          await prefs.setString('reporter_level', userData['reporterLevel'].toString());
        }
        if (userData['allowedDistrictIds'] != null) {
          await prefs.setString('reporter_allowed_district_ids', jsonEncode(userData['allowedDistrictIds']));
        }
        if (userData['allowedMandalIds'] != null) {
          await prefs.setString('reporter_allowed_mandal_ids', jsonEncode(userData['allowedMandalIds']));
        }

        debugPrint('User sync completed successfully');
        return hasOnboarded;
      }
      return false;
    } catch (e) {
      // Sync is non-critical, log but don't throw
      debugPrint('User sync failed (non-critical): $e');
      return false;
    }
  }

  static String extractErrorMessage(
    dynamic error, {
    String fallback = 'సమర్పణ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  }) {
    if (error is DioException) {
      final res = error.response;
      if (res?.data != null && res!.data is Map) {
        final Map map = res.data;
        if (map['error'] != null && map['error'].toString().isNotEmpty) {
          return map['error'].toString();
        }
        if (map['message'] != null && map['message'].toString().isNotEmpty) {
          return map['message'].toString();
        }
      }
      if (res?.statusCode == 429) {
        return 'రోజూవారీ వార్తల పరిమితి పూర్తయింది (Daily limit reached). దయచేసి రేపు ప్రయత్నించండి.';
      }
      if (res?.statusCode == 403) {
        return 'అనుమతి నిరాకరించబడింది (Access Denied).';
      }
      if (res?.statusCode == 401) {
        return 'సెషన్ ముగిసింది. దయచేసి మళ్లీ లాగిన్ అవ్వండి.';
      }
      if (error.message != null && error.message!.isNotEmpty) {
        return error.message!;
      }
    }
    return error?.toString() ?? fallback;
  }
}

final apiClient = ApiClient.instance;
