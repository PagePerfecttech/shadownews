# OneSignal Integration - Quick Reference

## 🎯 What's Done

✅ OneSignal Service created and centralized
✅ Flutter SDK added (v5.5.2)
✅ Android SDK added (v5.9.2)
✅ Integration dialog widget created
✅ Main.dart initialized OneSignal
✅ Home screen integrated OneSignal login
✅ Permissions added to manifest
✅ Full documentation provided

---

## 📱 Quick Start

### 1. Get Dependencies
```bash
flutter pub get
```

### 2. Build Android
```bash
flutter run -d android
```

### 3. Test Integration
- Sign in with test phone number
- Wait for "OneSignal SDK integration is complete!" dialog
- Tap "Got it" to enable notifications
- Verify device appears in OneSignal dashboard

---

## 🚀 Key APIs

### Initialize (Done automatically in main.dart)
```dart
await oneSignalService.initialize();
```

### Login User (Done in home_screen.dart)
```dart
await oneSignalService.login(userId);
```

### Set User Phone
```dart
await oneSignalService.setUserPhone(phoneNumber);
```

### Subscribe to Category
```dart
await oneSignalService.subscribeToCategory(categoryId, categoryName);
```

### Request Push Permission
```dart
await oneSignalService.requestPushPermission();
```

### Set User Tags
```dart
await oneSignalService.setUserTags({
  'category': 'news',
  'premium': true,
});
```

### Logout
```dart
await oneSignalService.logout();
```

---

## 📊 OneSignal App ID

```
eed09380-403a-4325-a8e3-9bf6bab20baa
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/services/onesignal_service.dart` | Centralized OneSignal wrapper |
| `lib/widgets/onesignal_integration_dialog.dart` | Integration verification dialog |
| `lib/main.dart` | SDK initialization |
| `lib/screens/home/home_screen.dart` | User login integration |
| `pubspec.yaml` | Flutter SDK dependency |
| `android/app/build.gradle.kts` | Android SDK dependency |
| `android/app/src/main/AndroidManifest.xml` | Permissions |
| `ONESIGNAL_SETUP.md` | Full setup guide |

---

## ✅ Verification Checklist

- [ ] `flutter pub get` completed
- [ ] App builds without errors
- [ ] App runs on Android device/emulator
- [ ] User can sign in
- [ ] Integration dialog appears within 5 seconds
- [ ] User can tap "Got it" to enable notifications
- [ ] Device appears in OneSignal dashboard under "Subscriptions"
- [ ] Test notification sent from dashboard is received on device

---

## 🧪 Test Steps

```bash
# 1. Clean and prepare
flutter clean
flutter pub get

# 2. Build and run
flutter run -d android

# 3. Sign in (use test phone: +1 650-253-0000, OTP: 123456)

# 4. Wait for integration dialog

# 5. Check OneSignal Dashboard
# Go to: https://onesignal.com/apps
# Select your app → Audience → Subscriptions
# Should see your test device listed
```

---

## 🔧 Common Commands

```dart
// Get current user's subscription ID
String? subId = await oneSignalService.getPushSubscriptionId();

// Check if notifications are enabled
bool enabled = await oneSignalService.arePushNotificationsEnabled();

// Set user email
await oneSignalService.setUserEmail('user@example.com');

// Remove tags
await oneSignalService.removeUserTags(['tag1', 'tag2']);

// Set preferences
await oneSignalService.setUserPreferences(
  timezone: 'America/New_York',
  language: 'en',
);
```

---

## 📲 Sending Test Notifications

1. Go to https://onesignal.com/apps
2. Select your app
3. Click "New Message" → "Push Notification"
4. Write message
5. Under "Audience":
   - Select "All Users" for everyone
   - Or select specific users/segments
6. Click "Schedule" or "Send Now"
7. Check device for notification

---

## 🎨 Dashboard URL

```
https://onesignal.com/apps/{app-id}
```

For this app:
```
https://onesignal.com/apps/eed09380-403a-4325-a8e3-9bf6bab20baa
```

---

## 📊 Segmentation with Tags

Tag users for targeted messaging:

```dart
// Tag by news category
await oneSignalService.setUserTags({
  'interested_in_technology': true,
  'interested_in_sports': false,
});

// Tag by user type
await oneSignalService.setUserTags({
  'user_type': 'premium',
  'subscription_active': true,
});

// Tag by location
await oneSignalService.setUserTags({
  'country': 'US',
  'timezone': 'EST',
});
```

Then in OneSignal Dashboard, send to users with specific tags.

---

## 🚨 Troubleshooting

### Dialog doesn't appear
- Check: Device has internet
- Check: App ID is correct
- Check: POST_NOTIFICATIONS permission granted
- Check: Device is connected to OneSignal (check dashboard)

### No notifications received
- Check: Push permission enabled on device
- Check: Device is in OneSignal subscriptions list
- Check: Notification is set to "Send Now"
- Check: Device is not in DND mode

### App crashes on startup
- Check: OneSignal SDK version correct (5.5.2 Flutter, 5.9.2 Android)
- Check: Gradle build errors
- Check: Manifest merge conflicts

---

## 📈 What's Next

1. **Add notification preferences UI** - Let users customize notifications
2. **Track engagement** - Monitor opens and clicks in OneSignal
3. **Implement news categories** - Auto-tag users by interest
4. **Add deep links** - Link notifications to specific articles
5. **A/B testing** - Test different message content in OneSignal
6. **Analytics** - Track notification impact on user behavior

---

## 🔗 Useful Links

- [OneSignal Dashboard](https://onesignal.com/apps)
- [OneSignal Docs](https://documentation.onesignal.com/)
- [Flutter SDK GitHub](https://github.com/OneSignal/OneSignal-Flutter-SDK)
- [Android SDK GitHub](https://github.com/OneSignal/OneSignal-Android-SDK)

---

## 📞 Support

For issues:
1. Check ONESIGNAL_SETUP.md for detailed troubleshooting
2. Review OneSignal documentation
3. Check device logs: `adb logcat | grep OneSignal`
4. Check OneSignal dashboard for errors

---

**Ready to send push notifications!** 🎉

