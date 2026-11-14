import '../models/news_article_model.dart';
import '../api/api_client.dart';
import '../api/cache_service.dart';

abstract class NewsRepository {
  Future<List<NewsArticle>> getNewsFeed({
    int page = 1,
    String? categoryId,
    String? districtId,
    String? mandalId,
    bool forceRefresh = false,
  });

  Future<NewsArticle?> getNewsById(String newsId);
  Future<bool> toggleBookmark(String newsId, {bool isBookmarked = false});
  Future<bool> toggleLike(String newsId, {bool isLiked = false});
  Future<List<NewsArticle>> getBookmarks();
}

class NewsRepositoryImpl implements NewsRepository {
  final ApiClient _apiClient;

  NewsRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient.instance;

  @override
  Future<List<NewsArticle>> getNewsFeed({
    int page = 1,
    String? categoryId,
    String? districtId,
    String? mandalId,
    bool forceRefresh = false,
  }) async {
    // 1. Return fresh cache if available and not forcing refresh
    if (!forceRefresh && page == 1 && CacheService.hasFreshCache()) {
      final cached = CacheService.getCachedFeed();
      if (cached != null && cached.isNotEmpty) {
        return cached.map((e) => NewsArticle.fromJson(Map<String, dynamic>.from(e))).toList();
      }
    }

    // 2. Query remote API
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        if (categoryId != null && categoryId.isNotEmpty) 'category': categoryId,
        if (districtId != null && districtId.isNotEmpty) 'district_id': districtId,
        if (mandalId != null && mandalId.isNotEmpty) 'mandal_id': mandalId,
      };

      final response = await _apiClient.get('/feed', queryParameters: queryParams);
      if (response.statusCode == 200 && response.data != null) {
        final List rawList = response.data['feed'] ?? response.data['articles'] ?? response.data['news'] ?? [];
        final List<NewsArticle> articles = [];
        for (var item in rawList) {
          if (item is Map && item['type'] == 'news' && item['news'] != null) {
            articles.add(NewsArticle.fromJson(Map<String, dynamic>.from(item['news'])));
          } else if (item is Map) {
            articles.add(NewsArticle.fromJson(Map<String, dynamic>.from(item)));
          }
        }

        if (page == 1) {
          await CacheService.cacheFeed(rawList);
        }

        return articles;
      }
      return [];
    } catch (e) {
      // Fallback to cache on error for page 1
      if (page == 1) {
        final cached = CacheService.getCachedFeed();
        if (cached != null) {
          return cached.map((e) => NewsArticle.fromJson(Map<String, dynamic>.from(e))).toList();
        }
      }
      rethrow;
    }
  }

  @override
  Future<NewsArticle?> getNewsById(String newsId) async {
    final response = await _apiClient.get('/news/$newsId');
    if (response.statusCode == 200 && response.data != null) {
      final data = response.data['article'] ?? response.data['news'] ?? response.data;
      return NewsArticle.fromJson(Map<String, dynamic>.from(data));
    }
    return null;
  }

  @override
  Future<bool> toggleBookmark(String newsId, {bool isBookmarked = false}) async {
    final response = await _apiClient.post('/bookmarks', data: {
      'newsId': newsId,
      'action': isBookmarked ? 'remove' : 'add',
    });
    return response.statusCode == 200;
  }

  @override
  Future<bool> toggleLike(String newsId, {bool isLiked = false}) async {
    final response = await _apiClient.post('/reactions', data: {
      'newsId': newsId,
      'action': isLiked ? 'remove' : 'add',
      'type': 'like',
    });
    return response.statusCode == 200;
  }

  @override
  Future<List<NewsArticle>> getBookmarks() async {
    final response = await _apiClient.get('/bookmarks');
    if (response.statusCode == 200 && response.data != null) {
      final List rawList = response.data is List ? response.data : (response.data['bookmarks'] ?? []);
      final List<NewsArticle> articles = [];
      for (var item in rawList) {
        if (item is Map && item['news'] != null) {
          articles.add(NewsArticle.fromJson(Map<String, dynamic>.from(item['news'])));
        } else if (item is Map) {
          articles.add(NewsArticle.fromJson(Map<String, dynamic>.from(item)));
        }
      }
      return articles;
    }
    return [];
  }
}
