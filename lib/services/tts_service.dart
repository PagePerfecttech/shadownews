import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  static final TtsService _instance = TtsService._internal();
  static TtsService get instance => _instance;

  final FlutterTts _flutterTts = FlutterTts();
  bool _isInitialized = false;
  String? _currentlySpeakingNewsId;
  final ValueNotifier<String?> currentSpeakingIdNotifier = ValueNotifier<String?>(null);

  TtsService._internal();

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      await _flutterTts.setSharedInstance(true);
      await _flutterTts.setIosAudioCategory(
        IosTextToSpeechAudioCategory.ambientSolo,
        [
          IosTextToSpeechAudioCategoryOptions.mixWithOthers,
          IosTextToSpeechAudioCategoryOptions.duckOthers,
        ],
      );

      // On Android, prefer Google TTS engine which has full Telugu (te-IN) voice model
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        try {
          final dynamic engines = await _flutterTts.getEngines;
          if (engines is List && engines.contains('com.google.android.tts')) {
            await _flutterTts.setEngine('com.google.android.tts');
          }
        } catch (e) {
          debugPrint('Engine selection error: $e');
        }
      }

      // Attempt Telugu voice first (te-IN or te), with fallback to en-IN
      final dynamic langs = await _flutterTts.getLanguages;
      if (langs is List) {
        if (langs.contains('te-IN')) {
          await _flutterTts.setLanguage('te-IN');
        } else if (langs.contains('te')) {
          await _flutterTts.setLanguage('te');
        } else {
          await _flutterTts.setLanguage('en-IN');
        }
      } else {
        await _flutterTts.setLanguage('te-IN');
      }

      await _flutterTts.setSpeechRate(0.48); // Optimal, clear Telugu reading rate
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);

      _flutterTts.setCompletionHandler(() {
        _currentlySpeakingNewsId = null;
        currentSpeakingIdNotifier.value = null;
      });

      _flutterTts.setCancelHandler(() {
        _currentlySpeakingNewsId = null;
        currentSpeakingIdNotifier.value = null;
      });

      _flutterTts.setErrorHandler((msg) {
        debugPrint('TTS Error: $msg');
        _currentlySpeakingNewsId = null;
        currentSpeakingIdNotifier.value = null;
      });

      _isInitialized = true;
    } catch (e) {
      debugPrint('Error initializing TTS: $e');
    }
  }

  bool isSpeaking(String newsId) => _currentlySpeakingNewsId == newsId;

  Future<void> speakNews({
    required String newsId,
    required String title,
    required String description,
  }) async {
    await init();
    if (_currentlySpeakingNewsId == newsId) {
      // Toggle off if already speaking this article
      await stop();
      return;
    }

    await stop();
    _currentlySpeakingNewsId = newsId;
    currentSpeakingIdNotifier.value = newsId;

    final cleanTitle = title.trim();
    final cleanDesc = description.trim();
    final textToSpeak = cleanDesc.isNotEmpty ? '$cleanTitle. $cleanDesc' : cleanTitle;

    try {
      await _flutterTts.speak(textToSpeak);
    } catch (e) {
      debugPrint('Error speaking news: $e');
      _currentlySpeakingNewsId = null;
      currentSpeakingIdNotifier.value = null;
    }
  }

  Future<void> stop() async {
    try {
      await _flutterTts.stop();
    } catch (e) {
      debugPrint('Error stopping TTS: $e');
    } finally {
      _currentlySpeakingNewsId = null;
      currentSpeakingIdNotifier.value = null;
    }
  }
}
