import 'package:flutter_test/flutter_test.dart';
import 'package:shadow_news/core/utils/form_validators.dart';
import 'package:shadow_news/models/news_article_model.dart';
import 'package:shadow_news/models/video_short_model.dart';

void main() {
  group('FormValidators Unit Tests', () {
    test('validateRequired tests', () {
      expect(FormValidators.validateRequired(null), isNotNull);
      expect(FormValidators.validateRequired(''), isNotNull);
      expect(FormValidators.validateRequired('   '), isNotNull);
      expect(FormValidators.validateRequired('Telangana'), isNull);
    });

    test('validatePhone tests', () {
      expect(FormValidators.validatePhone(''), isNotNull);
      expect(FormValidators.validatePhone('12345'), isNotNull);
      expect(FormValidators.validatePhone('9876543210'), isNull);
      expect(FormValidators.validatePhone('+91 98765 43210'), isNull);
    });

    test('validateEmail tests', () {
      expect(FormValidators.validateEmail('invalid-email'), isNotNull);
      expect(FormValidators.validateEmail('test@domain.com'), isNull);
    });

    test('validateUpiId tests', () {
      expect(FormValidators.validateUpiId('invalidupi'), isNotNull);
      expect(FormValidators.validateUpiId('user@upi'), isNull);
      expect(FormValidators.validateUpiId('9999999999@ybl'), isNull);
    });
  });

  group('Data Models & Contract Deserialization Tests', () {
    test('NewsArticle supports reporter metadata and location', () {
      final json = {
        'id': 'news_101',
        'title': 'Test Headline',
        'content': 'Test Content Body',
        'reporter_name': 'Jyothi Reporter',
        'reporter_image': 'https://example.com/reporter.jpg',
        'location_name': 'Hyderabad',
        'views': 120,
      };

      final article = NewsArticle.fromJson(json);

      expect(article.id, equals('news_101'));
      expect(article.reporterName, equals('Jyothi Reporter'));
      expect(article.reporterImage, equals('https://example.com/reporter.jpg'));
      expect(article.locationName, equals('Hyderabad'));
      expect(article.views, equals(120));
    });

    test('VideoShort deserialization contract', () {
      final json = {
        'id': 'vid_202',
        'title': 'Short Video News',
        'videoUrl': 'https://example.com/video.mp4',
        'thumbnailUrl': 'https://example.com/thumb.jpg',
        'likes': 45,
      };

      final video = VideoShort.fromJson(json);

      expect(video.id, equals('vid_202'));
      expect(video.title, equals('Short Video News'));
      expect(video.videoUrl, equals('https://example.com/video.mp4'));
      expect(video.likes, equals(45));
    });
  });
}
