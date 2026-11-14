import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();

  factory FirestoreService() {
    return _instance;
  }

  FirestoreService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Collection references
  static const String newsCollection = 'news';
  static const String usersCollection = 'users';
  static const String categoriesCollection = 'categories';
  static const String commentsCollection = 'comments';
  static const String bookmarksCollection = 'bookmarks';

  // ==================== NEWS OPERATIONS ====================

  /// Get all news articles
  Future<List<Map<String, dynamic>>> getAllNews({
    int limit = 50,
    DocumentSnapshot? lastDocument,
  }) async {
    try {
      Query query = _firestore.collection(newsCollection)
          .orderBy('createdAt', descending: true)
          .limit(limit);

      if (lastDocument != null) {
        query = query.startAfterDocument(lastDocument);
      }

      final QuerySnapshot snapshot = await query.get();
      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error fetching news: $e');
      rethrow;
    }
  }

  /// Get news by category
  Future<List<Map<String, dynamic>>> getNewsByCategory({
    required String categoryId,
    int limit = 50,
  }) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(newsCollection)
          .where('categoryId', isEqualTo: categoryId)
          .orderBy('createdAt', descending: true)
          .limit(limit)
          .get();

      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error fetching news by category: $e');
      rethrow;
    }
  }

  /// Get a single news article
  Future<Map<String, dynamic>?> getNewsArticle(String newsId) async {
    try {
      final DocumentSnapshot doc =
          await _firestore.collection(newsCollection).doc(newsId).get();

      if (doc.exists) {
        return {
          ...doc.data() as Map<String, dynamic>,
          'id': doc.id,
        };
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching news article: $e');
      rethrow;
    }
  }

  /// Create a new news article (admin only)
  Future<String> createNews({
    required String title,
    required String description,
    required String content,
    required String categoryId,
    required String imageUrl,
    String? authorId,
  }) async {
    try {
      final DocumentReference docRef =
          await _firestore.collection(newsCollection).add({
        'title': title,
        'description': description,
        'content': content,
        'categoryId': categoryId,
        'imageUrl': imageUrl,
        'authorId': authorId,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'views': 0,
        'likes': 0,
      });

      debugPrint('News article created with ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      debugPrint('Error creating news article: $e');
      rethrow;
    }
  }

  /// Update news article (admin only)
  Future<void> updateNews({
    required String newsId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      updates['updatedAt'] = FieldValue.serverTimestamp();
      await _firestore.collection(newsCollection).doc(newsId).update(updates);
      debugPrint('News article updated: $newsId');
    } catch (e) {
      debugPrint('Error updating news article: $e');
      rethrow;
    }
  }

  /// Delete news article (admin only)
  Future<void> deleteNews(String newsId) async {
    try {
      await _firestore.collection(newsCollection).doc(newsId).delete();
      debugPrint('News article deleted: $newsId');
    } catch (e) {
      debugPrint('Error deleting news article: $e');
      rethrow;
    }
  }

  /// Increment view count
  Future<void> incrementViewCount(String newsId) async {
    try {
      await _firestore.collection(newsCollection).doc(newsId).update({
        'views': FieldValue.increment(1),
      });
    } catch (e) {
      debugPrint('Error incrementing view count: $e');
    }
  }

  // ==================== USER OPERATIONS ====================

  /// Create or update user profile
  Future<void> createOrUpdateUserProfile({
    required String userId,
    required String phoneNumber,
    required String displayName,
    String? photoUrl,
  }) async {
    try {
      await _firestore.collection(usersCollection).doc(userId).set({
        'phoneNumber': phoneNumber,
        'displayName': displayName,
        'photoUrl': photoUrl,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      debugPrint('User profile created/updated: $userId');
    } catch (e) {
      debugPrint('Error creating/updating user profile: $e');
      rethrow;
    }
  }

  /// Get user profile
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final DocumentSnapshot doc =
          await _firestore.collection(usersCollection).doc(userId).get();

      if (doc.exists) {
        return doc.data() as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching user profile: $e');
      rethrow;
    }
  }

  // ==================== CATEGORY OPERATIONS ====================

  /// Get all categories
  Future<List<Map<String, dynamic>>> getAllCategories() async {
    try {
      final QuerySnapshot snapshot =
          await _firestore.collection(categoriesCollection).get();

      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error fetching categories: $e');
      rethrow;
    }
  }

  /// Create category (admin only)
  Future<String> createCategory({
    required String name,
    required String icon,
    String? description,
  }) async {
    try {
      final DocumentReference docRef =
          await _firestore.collection(categoriesCollection).add({
        'name': name,
        'icon': icon,
        'description': description,
        'createdAt': FieldValue.serverTimestamp(),
      });

      debugPrint('Category created with ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      debugPrint('Error creating category: $e');
      rethrow;
    }
  }

  // ==================== BOOKMARK OPERATIONS ====================

  /// Add bookmark
  Future<void> addBookmark({
    required String userId,
    required String newsId,
  }) async {
    try {
      await _firestore
          .collection(usersCollection)
          .doc(userId)
          .collection(bookmarksCollection)
          .doc(newsId)
          .set({
        'newsId': newsId,
        'bookmarkedAt': FieldValue.serverTimestamp(),
      });

      debugPrint('Bookmark added: $newsId');
    } catch (e) {
      debugPrint('Error adding bookmark: $e');
      rethrow;
    }
  }

  /// Remove bookmark
  Future<void> removeBookmark({
    required String userId,
    required String newsId,
  }) async {
    try {
      await _firestore
          .collection(usersCollection)
          .doc(userId)
          .collection(bookmarksCollection)
          .doc(newsId)
          .delete();

      debugPrint('Bookmark removed: $newsId');
    } catch (e) {
      debugPrint('Error removing bookmark: $e');
    }
  }

  /// Get user bookmarks
  Future<List<Map<String, dynamic>>> getUserBookmarks(String userId) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(usersCollection)
          .doc(userId)
          .collection(bookmarksCollection)
          .orderBy('bookmarkedAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error fetching bookmarks: $e');
      rethrow;
    }
  }

  /// Check if news is bookmarked
  Future<bool> isNewsBookmarked({
    required String userId,
    required String newsId,
  }) async {
    try {
      final DocumentSnapshot doc = await _firestore
          .collection(usersCollection)
          .doc(userId)
          .collection(bookmarksCollection)
          .doc(newsId)
          .get();

      return doc.exists;
    } catch (e) {
      debugPrint('Error checking bookmark: $e');
      return false;
    }
  }

  // ==================== SEARCH OPERATIONS ====================

  /// Search news by title
  Future<List<Map<String, dynamic>>> searchNews(String query) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(newsCollection)
          .where('title', isGreaterThanOrEqualTo: query)
          .where('title', isLessThan: '${query}z')
          .limit(20)
          .get();

      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error searching news: $e');
      rethrow;
    }
  }

  /// Get trending news (most viewed)
  Future<List<Map<String, dynamic>>> getTrendingNews({int limit = 10}) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(newsCollection)
          .orderBy('views', descending: true)
          .limit(limit)
          .get();

      return snapshot.docs
          .map((doc) => {
                ...doc.data() as Map<String, dynamic>,
                'id': doc.id,
              })
          .toList();
    } catch (e) {
      debugPrint('Error fetching trending news: $e');
      rethrow;
    }
  }

  /// Listen to news updates in real-time
  Stream<List<Map<String, dynamic>>> watchNews({
    int limit = 50,
  }) {
    return _firestore
        .collection(newsCollection)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => {
                ...doc.data(),
                'id': doc.id,
              })
          .toList();
    });
  }
}
