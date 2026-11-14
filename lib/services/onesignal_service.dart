import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'package:flutter/material.dart';
import '../routes/app_router.dart';

/// Centralized OneSignal Service
/// 
/// This service wraps all OneSignal SDK interactions and provides a clean API
/// for the rest of the application to use. All direct OneSignal SDK calls should
/// go through this service.
class OneSignalService {
  static final OneSignalService _instance = OneSignalService._internal();

  factory OneSignalService() {
    return _instance;
  }

  OneSignalService._internal();

  // Constants
  static const String appId = 'eed09380-403a-4325-a8e3-9bf6bab20baa';

  // State
  bool _initialized = false;
  final ValueNotifier<bool> _pushSubscriptionStateNotifier =
      ValueNotifier<bool>(false);

  /// Get the push subscription state notifier
  ValueNotifier<bool> get pushSubscriptionStateNotifier =>
      _pushSubscriptionStateNotifier;

  /// Check if OneSignal is initialized
  bool get isInitialized => _initialized;

  /// Initialize OneSignal SDK
  Future<void> initialize() async {
    if (_initialized) {
      debugPrint('OneSignal already initialized');
      return;
    }

    try {
      // Configure OneSignal in silent production mode
      OneSignal.Debug.setLogLevel(OSLogLevel.none);
      OneSignal.initialize(appId);

      // Permanently suppress any OneSignal default In-App Messages / SDK Welcome Popups
      OneSignal.InAppMessages.paused(true);
      OneSignal.InAppMessages.clearTriggers();

      // Listen for notification clicks to handle deep linking
      OneSignal.Notifications.addClickListener((event) {
        debugPrint('[OneSignal] Notification clicked: ${event.notification.notificationId}');
        final data = event.notification.additionalData;
        if (data != null) {
          final route = data['route']?.toString();
          final newsId = data['newsId']?.toString() ??
              data['id']?.toString() ??
              data['articleId']?.toString();
          if (route != null && route.isNotEmpty) {
            appRouter.go(route);
          } else if (newsId != null && newsId.isNotEmpty) {
            appRouter.go('/p/$newsId');
          }
        }
      });

      // Set up push subscription observer
      _setupPushSubscriptionObserver();

      _initialized = true;
      debugPrint('OneSignal initialized successfully');
    } catch (e) {
      debugPrint('Error initializing OneSignal: $e');
      rethrow;
    }
  }

  /// Request push notification permission
  Future<bool> requestPushPermission() async {
    try {
      await OneSignal.Notifications.requestPermission(true);
      debugPrint('Push notification permission requested');
      return true;
    } catch (e) {
      debugPrint('Error requesting push permission: $e');
      return false;
    }
  }

  /// Set up push subscription observer to monitor subscription changes
  void _setupPushSubscriptionObserver() {
    try {
      final pushSubscription = OneSignal.User.pushSubscription;

      // Listen for push subscription state changes
      pushSubscription.addObserver((state) {
        final subscriptionId = state.current.id;
        debugPrint('Push subscription ID: $subscriptionId');

        // Update the subscription state
        if (subscriptionId != null && !subscriptionId.startsWith('local-')) {
          _pushSubscriptionStateNotifier.value = true;
        }
      });

      // Also check the current state immediately (in case it's already subscribed)
      final currentSubscriptionId = pushSubscription.id;
      if (currentSubscriptionId != null &&
          !currentSubscriptionId.startsWith('local-')) {
        _pushSubscriptionStateNotifier.value = true;
        debugPrint('Device already has subscription ID: $currentSubscriptionId');
      }
    } catch (e) {
      debugPrint('Error setting up push subscription observer: $e');
    }
  }

  /// Set user email
  Future<void> setUserEmail(String email) async {
    try {
      OneSignal.User.addEmail(email);
      debugPrint('Email set for OneSignal user: $email');
    } catch (e) {
      debugPrint('Error setting user email: $e');
      rethrow;
    }
  }

  /// Set user phone number
  Future<void> setUserPhone(String phone) async {
    try {
      OneSignal.User.addSms(phone);
      debugPrint('Phone set for OneSignal user: $phone');
    } catch (e) {
      debugPrint('Error setting user phone: $e');
      rethrow;
    }
  }

  /// Set user tags (for segmentation)
  Future<void> setUserTags(Map<String, dynamic> tags) async {
    try {
      OneSignal.User.addTags(tags);
      debugPrint('Tags set for OneSignal user: $tags');
    } catch (e) {
      debugPrint('Error setting user tags: $e');
      rethrow;
    }
  }

  /// Remove user tags
  Future<void> removeUserTags(List<String> tagKeys) async {
    try {
      OneSignal.User.removeTags(tagKeys);
      debugPrint('Tags removed for OneSignal user: $tagKeys');
    } catch (e) {
      debugPrint('Error removing user tags: $e');
      rethrow;
    }
  }

  /// Login user
  /// 
  /// This should be called after the user authenticates in your app
  Future<void> login(String userId) async {
    try {
      OneSignal.login(userId);
      debugPrint('OneSignal user login: $userId');
    } catch (e) {
      debugPrint('Error logging in OneSignal user: $e');
      rethrow;
    }
  }

  /// Logout user
  /// 
  /// This should be called when the user logs out from your app
  Future<void> logout() async {
    try {
      OneSignal.logout();
      debugPrint('OneSignal user logged out');
    } catch (e) {
      debugPrint('Error logging out OneSignal user: $e');
      rethrow;
    }
  }

  /// Get push subscription ID
  Future<String?> getPushSubscriptionId() async {
    try {
      return OneSignal.User.pushSubscription.id;
    } catch (e) {
      debugPrint('Error getting push subscription ID: $e');
      return null;
    }
  }

  /// Check if push notifications are enabled
  Future<bool> arePushNotificationsEnabled() async {
    try {
      return OneSignal.Notifications.permission;
    } catch (e) {
      debugPrint('Error checking push notification permission: $e');
      return false;
    }
  }

  /// Enable all push notification types
  Future<void> enableAllNotificationTypes() async {
    try {
      OneSignal.Notifications.requestPermission(true);
      debugPrint('All notification types enabled');
    } catch (e) {
      debugPrint('Error enabling all notification types: $e');
      rethrow;
    }
  }

  /// Disable all push notifications
  Future<void> disablePushNotifications() async {
    try {
      // Note: OneSignal doesn't have a built-in "disable all" method
      // Users typically manage this through device settings
      // This is a placeholder for future implementation
      debugPrint('Push notifications disabled (via device settings)');
    } catch (e) {
      debugPrint('Error disabling push notifications: $e');
      rethrow;
    }
  }

  /// Add tags for news categories (for targeted notifications)
  Future<void> subscribeToCategory(String categoryId, String categoryName) async {
    try {
      await setUserTags({
        'subscribed_category_$categoryId': true,
        'category_name_$categoryId': categoryName,
      });
      debugPrint('Subscribed to category: $categoryName ($categoryId)');
    } catch (e) {
      debugPrint('Error subscribing to category: $e');
      rethrow;
    }
  }

  /// Remove category subscription
  Future<void> unsubscribeFromCategory(String categoryId) async {
    try {
      await removeUserTags(['subscribed_category_$categoryId']);
      debugPrint('Unsubscribed from category: $categoryId');
    } catch (e) {
      debugPrint('Error unsubscribing from category: $e');
      rethrow;
    }
  }

  /// Set user preferences (for personalization)
  Future<void> setUserPreferences({
    String? timezone,
    String? language,
    String? preferredNotificationTime,
  }) async {
    try {
      final tags = <String, dynamic>{};

      if (timezone != null) tags['timezone'] = timezone;
      if (language != null) tags['language'] = language;
      if (preferredNotificationTime != null) {
        tags['preferred_notification_time'] = preferredNotificationTime;
      }

      if (tags.isNotEmpty) {
        await setUserTags(tags);
        debugPrint('User preferences set: $tags');
      }
    } catch (e) {
      debugPrint('Error setting user preferences: $e');
      rethrow;
    }
  }

  /// Dispose of the service
  void dispose() {
    _pushSubscriptionStateNotifier.dispose();
  }
}
