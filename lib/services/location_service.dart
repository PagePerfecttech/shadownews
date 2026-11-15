import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../api/api_client.dart';

enum LocationStatus {
  success,
  serviceDisabled,
  permissionDenied,
  permissionDeniedForever,
  positionUnavailable,
  serverMatchFailed,
  error,
}

class LocationResult {
  final bool success;
  final LocationStatus status;
  final String message;
  final Map<String, dynamic>? data;

  LocationResult({
    required this.success,
    required this.status,
    required this.message,
    this.data,
  });
}

class LocationService {
  static final LocationService instance = LocationService._();
  LocationService._();

  Future<Position?> _getCurrentPositionSafely(Duration timeoutDuration) async {
    final completer = Completer<Position?>();
    Timer? timer;

    timer = Timer(timeoutDuration, () {
      if (!completer.isCompleted) {
        completer.complete(null);
      }
    });

    try {
      Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
          timeLimit: Duration(seconds: 5),
        ),
      ).then((pos) {
        timer?.cancel();
        if (!completer.isCompleted) {
          completer.complete(pos);
        }
      }).catchError((e) {
        timer?.cancel();
        if (!completer.isCompleted) {
          completer.complete(null);
        }
      });
    } catch (e) {
      timer.cancel();
      if (!completer.isCompleted) {
        completer.complete(null);
      }
    }

    return completer.future;
  }

  Future<bool> initGPSLocation() async {
    final res = await initGPSLocationWithDetails();
    return res.success;
  }

  Future<LocationResult> initGPSLocationWithDetails() async {
    try {
      bool serviceEnabled = false;
      try {
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
      } catch (_) {}

      LocationPermission permission = LocationPermission.denied;
      if (serviceEnabled) {
        try {
          permission = await Geolocator.checkPermission();
          if (permission == LocationPermission.denied) {
            permission = await Geolocator.requestPermission();
          }
        } catch (_) {}
      }

      Position? position;
      if (serviceEnabled &&
          permission != LocationPermission.denied &&
          permission != LocationPermission.deniedForever) {
        try {
          position = await Geolocator.getLastKnownPosition();
          position ??= await _getCurrentPositionSafely(const Duration(seconds: 5));
        } catch (e) {
          debugPrint('GPS fetch error: $e');
        }
      }

      // If we have GPS coordinates, match via GPS
      if (position != null) {
        debugPrint('GPS coordinates acquired: ${position.latitude}, ${position.longitude}');
        final res = await _matchAndSaveLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          source: 'GPS',
        );
        if (res.success) return res;
      }

      // Graceful Fallback: IP-based auto-detection
      debugPrint('Attempting IP-based geolocation fallback...');
      final ipRes = await _matchAndSaveLocation(
        ipFallback: true,
        source: 'Network',
      );
      if (ipRes.success) {
        return ipRes;
      }

      if (!serviceEnabled) {
        return LocationResult(
          success: false,
          status: LocationStatus.serviceDisabled,
          message: 'GPS ఆఫ్‌లో ఉంది. దయచేసి GPS ఆన్ చేయండి లేదా కింద మాన్యువల్‌గా ఎంచుకోండి.',
        );
      }

      if (permission == LocationPermission.deniedForever) {
        return LocationResult(
          success: false,
          status: LocationStatus.permissionDeniedForever,
          message: 'లొకేషన్ అనుమతి శాశ్వతంగా నిరాకరించబడింది. దయచేసి సెట్టింగ్స్‌లో అనుమతించండి.',
        );
      }

      return LocationResult(
        success: false,
        status: LocationStatus.positionUnavailable,
        message: 'స్థానాన్ని గుర్తించలేకపోయాము. దయచేసి కింద జాబితా నుండి ఎంచుకోండి.',
      );
    } catch (e) {
      debugPrint('Failed to sync location via GPS: $e');
      return LocationResult(
        success: false,
        status: LocationStatus.error,
        message: 'లొకేషన్ లోపం ఏర్పడింది. దయచేసి మాన్యువల్‌గా ఎంచుకోండి.',
      );
    }
  }

  Future<LocationResult> _matchAndSaveLocation({
    double? latitude,
    double? longitude,
    bool ipFallback = false,
    String source = 'GPS',
  }) async {
    try {
      final payload = <String, dynamic>{};
      if (latitude != null && longitude != null) {
        payload['latitude'] = latitude;
        payload['longitude'] = longitude;
      }
      if (ipFallback) {
        payload['ipFallback'] = true;
      }

      final response = await apiClient.post(
        '/locations/match-gps',
        data: payload,
      );

      if (response.data != null && response.data['success'] == true) {
        final data = response.data;
        final state = data['state'];
        final district = data['district'];
        final assembly = data['assembly'];
        final mandal = data['mandal'];
        final village = data['village'];

        final prefs = await SharedPreferences.getInstance();
        final oldStateId = prefs.getString('selected_state_id');
        final newStateId = state['id']?.toString() ?? '';
        final oldDistrictId = prefs.getString('selected_district_id');
        final newDistrictId = district['id']?.toString() ?? '';

        // Handle notification topics
        if (oldStateId != newStateId) {
          if (oldStateId != null && oldStateId.isNotEmpty) {
            await FirebaseMessaging.instance.unsubscribeFromTopic('state_$oldStateId');
          }
          if (newStateId.isNotEmpty) {
            await FirebaseMessaging.instance.subscribeToTopic('state_$newStateId');
          }
        }

        if (oldDistrictId != newDistrictId) {
          if (oldDistrictId != null && oldDistrictId.isNotEmpty) {
            await FirebaseMessaging.instance.unsubscribeFromTopic('district_$oldDistrictId');
          }
          if (newDistrictId.isNotEmpty) {
            await FirebaseMessaging.instance.subscribeToTopic('district_$newDistrictId');
          }
        }

        // Store matched location
        await prefs.setString('selected_state_id', newStateId);
        await prefs.setString('selected_state_name', state['name']?.toString() ?? '');
        await prefs.setString('selected_district_id', newDistrictId);
        await prefs.setString('selected_district_name', district['name']?.toString() ?? '');

        if (assembly != null) {
          await prefs.setString('selected_assembly_id', assembly['id']?.toString() ?? '');
          await prefs.setString('selected_assembly_name', assembly['name']?.toString() ?? '');
        } else {
          await prefs.remove('selected_assembly_id');
          await prefs.remove('selected_assembly_name');
        }

        if (mandal != null) {
          await prefs.setString('selected_mandal_id', mandal['id']?.toString() ?? '');
          await prefs.setString('selected_mandal_name', mandal['name']?.toString() ?? '');
        } else {
          await prefs.remove('selected_mandal_id');
          await prefs.remove('selected_mandal_name');
        }

        if (village != null) {
          await prefs.setString('selected_village_id', village['id']?.toString() ?? '');
          await prefs.setString('selected_village_name', village['name']?.toString() ?? '');
        } else {
          await prefs.remove('selected_village_id');
          await prefs.remove('selected_village_name');
        }

        // Save matched location to backend profile for logged in users
        final isGuest = prefs.getBool('is_guest') ?? false;
        if (!isGuest) {
          try {
            await apiClient.post(
              '/user/profile',
              data: {
                'stateId': newStateId,
                'districtId': newDistrictId,
                'assemblyId': assembly?['id']?.toString(),
                'mandalId': mandal?['id']?.toString(),
                'villageId': village?['id']?.toString(),
              },
            );
          } catch (e) {
            debugPrint('Error syncing profile location: $e');
          }
        }

        final locName = mandal?['name'] ?? district['name'] ?? state['name'];
        return LocationResult(
          success: true,
          status: LocationStatus.success,
          message: '$locName ప్రాంతం విజయవంతంగా గుర్తించబడింది!',
          data: data,
        );
      }
    } catch (e) {
      debugPrint('Error matching location via API: $e');
    }

    return LocationResult(
      success: false,
      status: LocationStatus.serverMatchFailed,
      message: 'మీ ప్రాంతాన్ని సరిపోల్చలేకపోయాము. దయచేసి కింద మాన్యువల్‌గా ఎంచుకోండి.',
    );
  }
}
