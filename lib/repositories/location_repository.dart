import '../models/location_model.dart';
import '../api/api_client.dart';

abstract class LocationRepository {
  Future<List<StateLocationModel>> getLocations();
  Future<Map<String, dynamic>?> matchGpsLocation(double latitude, double longitude);
}

class LocationRepositoryImpl implements LocationRepository {
  final ApiClient _apiClient;

  LocationRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient.instance;

  @override
  Future<List<StateLocationModel>> getLocations() async {
    final response = await _apiClient.get('/locations');
    if (response.statusCode == 200 && response.data != null && response.data['success'] == true) {
      final List rawStates = response.data['states'] ?? [];
      return rawStates
          .map((s) => StateLocationModel.fromJson(Map<String, dynamic>.from(s)))
          .toList();
    }
    return [];
  }

  @override
  Future<Map<String, dynamic>?> matchGpsLocation(double latitude, double longitude) async {
    final response = await _apiClient.post(
      '/locations/match-gps',
      data: {
        'latitude': latitude,
        'longitude': longitude,
      },
    );
    if (response.statusCode == 200 && response.data != null && response.data['success'] == true) {
      return Map<String, dynamic>.from(response.data);
    }
    return null;
  }
}
