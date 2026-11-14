import '../models/video_short_model.dart';
import '../api/api_client.dart';

abstract class VideoRepository {
  Future<List<VideoShort>> getShortsFeed({int page = 1});
  Future<bool> toggleLikeVideo(String videoId, {bool isLiked = false});
}

class VideoRepositoryImpl implements VideoRepository {
  final ApiClient _apiClient;

  VideoRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient.instance;

  @override
  Future<List<VideoShort>> getShortsFeed({int page = 1}) async {
    final response = await _apiClient.get('/videos', queryParameters: {'page': page});
    if (response.statusCode == 200 && response.data != null) {
      final List rawList = response.data['videos'] ?? response.data['shorts'] ?? response.data['data'] ?? [];
      return rawList.map((item) => VideoShort.fromJson(Map<String, dynamic>.from(item))).toList();
    }
    return [];
  }

  @override
  Future<bool> toggleLikeVideo(String videoId, {bool isLiked = false}) async {
    final response = await _apiClient.post('/reactions', data: {
      'videoId': videoId,
      'action': isLiked ? 'remove' : 'add',
      'type': 'like',
    });
    return response.statusCode == 200;
  }
}
