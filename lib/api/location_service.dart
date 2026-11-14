import 'package:flutter/foundation.dart';
import 'api_client.dart';

class Location {
  final String id;
  final String name;

  Location({required this.id, required this.name});

  factory Location.fromJson(Map<String, dynamic> json) {
    return Location(
      id: json['id'],
      name: json['name'],
    );
  }
}

class StateLocation extends Location {
  final String code;
  final List<Location> districts;

  StateLocation({
    required super.id,
    required super.name,
    required this.code,
    required this.districts,
  });

  factory StateLocation.fromJson(Map<String, dynamic> json) {
    return StateLocation(
      id: json['id'],
      name: json['name'],
      code: json['code'],
      districts: (json['districts'] as List?)
              ?.map((d) => Location.fromJson(d))
              .toList() ??
          [],
    );
  }
}

class LocationService {
  Future<List<StateLocation>> getLocations() async {
    try {
      final response = await ApiClient.instance.get('/locations');
      if (response.data['success'] == true) {
        final List statesData = response.data['states'];
        return statesData.map((s) => StateLocation.fromJson(s)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching locations: $e');
      return [];
    }
  }
}
