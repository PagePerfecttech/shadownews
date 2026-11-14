import 'package:flutter/foundation.dart';
import '../models/video_short_model.dart';
import '../repositories/video_repository.dart';

enum ShortsStatus { initial, loading, loaded, error, empty }

class ShortsController extends ChangeNotifier {
  final VideoRepository _repository;

  ShortsController({VideoRepository? repository})
      : _repository = repository ?? VideoRepositoryImpl();

  ShortsStatus _status = ShortsStatus.initial;
  List<VideoShort> _shorts = [];
  int _currentIndex = 0;
  String? _errorMessage;

  ShortsStatus get status => _status;
  List<VideoShort> get shorts => _shorts;
  int get currentIndex => _currentIndex;
  String? get errorMessage => _errorMessage;

  Future<void> fetchShorts() async {
    _status = ShortsStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final items = await _repository.getShortsFeed();
      _shorts = items;
      _status = items.isEmpty ? ShortsStatus.empty : ShortsStatus.loaded;
    } catch (e) {
      _errorMessage = e.toString();
      _status = ShortsStatus.error;
    } finally {
      notifyListeners();
    }
  }

  void onPageChanged(int index) {
    _currentIndex = index;
    notifyListeners();
  }

  Future<void> toggleLike(String videoId) async {
    final index = _shorts.indexWhere((s) => s.id == videoId);
    if (index != -1) {
      final current = _shorts[index];
      final newIsLiked = !current.isLiked;
      final newLikes = newIsLiked ? current.likes + 1 : (current.likes > 0 ? current.likes - 1 : 0);

      _shorts[index] = VideoShort(
        id: current.id,
        title: current.title,
        videoUrl: current.videoUrl,
        thumbnailUrl: current.thumbnailUrl,
        reporterName: current.reporterName,
        reporterAvatar: current.reporterAvatar,
        category: current.category,
        likes: newLikes,
        shares: current.shares,
        commentsCount: current.commentsCount,
        isLiked: newIsLiked,
      );
      notifyListeners();

      try {
        await _repository.toggleLikeVideo(videoId);
      } catch (e) {
        _shorts[index] = current;
        notifyListeners();
      }
    }
  }
}
