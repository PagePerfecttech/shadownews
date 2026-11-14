import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../api/api_client.dart';

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
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
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
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled.');
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('Location permissions are denied');
          return false;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        debugPrint('Location permissions are permanently denied.');
        return false;
      }

      Position? position;
      try {
        position = await Geolocator.getLastKnownPosition();
        position ??= await _getCurrentPositionSafely(const Duration(seconds: 3));
      } catch (e) {
        debugPrint('GPS fetch error: $e');
      }

      if (position == null) {
        debugPrint('Could not acquire valid GPS position.');
        return false;
      }

      debugPrint('GPS coordinates matched: ${position.latitude}, ${position.longitude}');

      // Call backend to match coordinates
      final response = await apiClient.post(
        '/locations/match-gps',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
        },
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

        // Handle subscriptions
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
        }
        if (mandal != null) {
          await prefs.setString('selected_mandal_id', mandal['id']?.toString() ?? '');
          await prefs.setString('selected_mandal_name', mandal['name']?.toString() ?? '');
        }
        if (village != null) {
          await prefs.setString('selected_village_id', village['id']?.toString() ?? '');
          await prefs.setString('selected_village_name', village['name']?.toString() ?? '');
        }

        // Save matched location to backend profile
        final isGuest = prefs.getBool('is_guest') ?? false;
        if (!isGuest) {
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
        }

        debugPrint('Successfully matched location using GPS: ${mandal?['name']}');
        return true;
      }
    } catch (e) {
      debugPrint('Failed to sync location via GPS: $e');
    }
    return false;
  }
}
