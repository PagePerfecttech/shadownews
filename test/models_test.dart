import 'package:flutter_test/flutter_test.dart';
import 'package:shadow_news/models/news_article_model.dart';
import 'package:shadow_news/models/video_short_model.dart';
import 'package:shadow_news/models/location_model.dart';
import 'package:shadow_news/models/user_profile_model.dart';

void main() {
  group('Data Models Tests', () {
    test('NewsArticle JSON deserialization and copyWith', () {
      final json = {
        'id': '101',
        'title': 'Test Telangana News',
        'content': 'News details content',
        'imageUrl': 'https://example.com/image.jpg',
        'category': 'Politics',
        'views': '250',
        'likes': 10,
        'isBookmarked': true,
      };

      final article = NewsArticle.fromJson(json);
      expect(article.id, '101');
      expect(article.title, 'Test Telangana News');
      expect(article.views, 250);
      expect(article.likes, 10);
      expect(article.isBookmarked, isTrue);

      final updated = article.copyWith(views: 300, isLiked: true);
      expect(updated.views, 300);
      expect(updated.isLiked, isTrue);
      expect(updated.title, 'Test Telangana News');
    });

    test('VideoShort JSON deserialization', () {
      final json = {
        'id': 'v55',
        'title': 'Shorts Reel Video',
        'videoUrl': 'https://example.com/video.mp4',
        'likes': 45,
        'commentsCount': 12,
      };

      final video = VideoShort.fromJson(json);
      expect(video.id, 'v55');
      expect(video.title, 'Shorts Reel Video');
      expect(video.videoUrl, 'https://example.com/video.mp4');
      expect(video.likes, 45);
      expect(video.commentsCount, 12);
    });

    test('StateLocationModel JSON deserialization', () {
      final json = {
        'id': 's1',
        'name': 'Telangana',
        'code': 'TG',
        'districts': [
          {
            'id': 'd1',
            'name': 'Hyderabad',
            'mandals': [
              {'id': 'm1', 'name': 'Amberpet'},
            ]
          }
        ]
      };

      final stateLoc = StateLocationModel.fromJson(json);
      expect(stateLoc.id, 's1');
      expect(stateLoc.name, 'Telangana');
      expect(stateLoc.districts.length, 1);
      expect(stateLoc.districts.first.name, 'Hyderabad');
      expect(stateLoc.districts.first.mandals.length, 1);
      expect(stateLoc.districts.first.mandals.first.name, 'Amberpet');
    });

    test('UserProfile JSON deserialization', () {
      final json = {
        'uid': 'user_99',
        'phone': '9876543210',
        'name': 'Jyothi User',
        'role': 'reporter',
        'selectedTopics': ['Politics', 'Sports'],
      };

      final user = UserProfile.fromJson(json);
      expect(user.uid, 'user_99');
      expect(user.phoneNumber, '9876543210');
      expect(user.displayName, 'Jyothi User');
      expect(user.role, 'reporter');
      expect(user.isReporterApproved, isTrue);
      expect(user.selectedTopics, contains('Politics'));
    });
  });
}
