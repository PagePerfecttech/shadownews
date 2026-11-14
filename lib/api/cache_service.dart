import 'package:hive_flutter/hive_flutter.dart';

class CacheService {
  static const String _feedBoxName = 'feed_cache';
  static const String _feedKey = 'cached_feed';
  static const String _feedTimestampKey = 'feed_cached_at';
  static const int _cacheExpiryMinutes = 30;

  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    await Hive.initFlutter();
    await Hive.openBox(_feedBoxName);
    _initialized = true;
  }

  /// Cache feed data locally
  static Future<void> cacheFeed(List<dynamic> feedItems) async {
    if (!_initialized) return;
    final box = Hive.box(_feedBoxName);
    // Store as list of maps (Hive can handle basic types)
    final serializable = feedItems.map((item) => Map<String, dynamic>.from(item)).toList();
    await box.put(_feedKey, serializable);
    await box.put(_feedTimestampKey, DateTime.now().toIso8601String());
  }

  /// Get cached feed data (returns null if Hive not yet initialized)
  static List<dynamic>? getCachedFeed() {
    if (!_initialized) return null;
    final box = Hive.box(_feedBoxName);
    final cached = box.get(_feedKey);
    if (cached == null) return null;

    // Check expiry
    final timestampStr = box.get(_feedTimestampKey) as String?;
    if (timestampStr != null) {
      final cachedAt = DateTime.parse(timestampStr);
      if (DateTime.now().difference(cachedAt).inMinutes > _cacheExpiryMinutes) {
        return null; // Cache expired
      }
    }

    return List<dynamic>.from(cached);
  }

  /// Check if we have a valid cache
  static bool hasFreshCache() {
    if (!_initialized) return false;
    return getCachedFeed() != null;
  }

  /// Clear all caches
  static Future<void> clearAll() async {
    if (!_initialized) return;
    final box = Hive.box(_feedBoxName);
    await box.clear();
  }
}

