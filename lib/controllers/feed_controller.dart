import 'package:flutter/foundation.dart';
import '../models/news_article_model.dart';
import '../repositories/news_repository.dart';

enum FeedStatus { initial, loading, loaded, error, empty }

class FeedController extends ChangeNotifier {
  final NewsRepository _repository;

  FeedController({NewsRepository? repository})
      : _repository = repository ?? NewsRepositoryImpl();

  FeedStatus _status = FeedStatus.initial;
  List<NewsArticle> _articles = [];
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  FeedStatus get status => _status;
  List<NewsArticle> get articles => _articles;
  String? get errorMessage => _errorMessage;
  bool get hasMore => _hasMore;
  bool get isLoadingMore => _isLoadingMore;

  Future<void> fetchFeed({
    String? categoryId,
    String? districtId,
    String? mandalId,
    bool forceRefresh = false,
  }) async {
    if (forceRefresh) {
      _currentPage = 1;
      _hasMore = true;
    }

    _status = FeedStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final fetched = await _repository.getNewsFeed(
        page: _currentPage,
        categoryId: categoryId,
        districtId: districtId,
        mandalId: mandalId,
        forceRefresh: forceRefresh,
      );

      _articles = fetched;
      _status = fetched.isEmpty ? FeedStatus.empty : FeedStatus.loaded;
    } catch (e) {
      _errorMessage = e.toString();
      _status = FeedStatus.error;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadNextPage({
    String? categoryId,
    String? districtId,
    String? mandalId,
  }) async {
    if (!_hasMore || _isLoadingMore) return;

    _isLoadingMore = true;
    notifyListeners();

    try {
      final nextPage = _currentPage + 1;
      final fetched = await _repository.getNewsFeed(
        page: nextPage,
        categoryId: categoryId,
        districtId: districtId,
        mandalId: mandalId,
      );

      if (fetched.isEmpty) {
        _hasMore = false;
      } else {
        _currentPage = nextPage;
        _articles.addAll(fetched);
      }
    } catch (e) {
      debugPrint('Error loading next page: $e');
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  Future<void> toggleBookmark(String newsId) async {
    final index = _articles.indexWhere((a) => a.id == newsId);
    if (index != -1) {
      final current = _articles[index];
      _articles[index] = current.copyWith(isBookmarked: !current.isBookmarked);
      notifyListeners();

      try {
        await _repository.toggleBookmark(newsId);
      } catch (e) {
        // Revert state on failure
        _articles[index] = current;
        notifyListeners();
      }
    }
  }

  Future<void> toggleLike(String newsId) async {
    final index = _articles.indexWhere((a) => a.id == newsId);
    if (index != -1) {
      final current = _articles[index];
      final newLikeState = !current.isLiked;
      final newLikeCount = newLikeState ? current.likes + 1 : (current.likes > 0 ? current.likes - 1 : 0);

      _articles[index] = current.copyWith(
        isLiked: newLikeState,
        likes: newLikeCount,
      );
      notifyListeners();

      try {
        await _repository.toggleLike(newsId);
      } catch (e) {
        _articles[index] = current;
        notifyListeners();
      }
    }
  }
}
