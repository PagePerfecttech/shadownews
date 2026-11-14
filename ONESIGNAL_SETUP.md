# Shadow News - OneSignal Push Notifications Setup Guide

## Overview

Shadow News now includes OneSignal SDK for push notifications and in-app messaging. This guide will help you complete the setup and verify the integration.

---

## OneSignal Project Details

- **App ID**: eed09380-403a-4325-a8e3-9bf6bab20baa
- **SDK Version**: 5.5.2 (Flutter), 5.9.2 (Android native)
- **Platforms**: Android, iOS, Web

---

## What's Been Integrated

### 1. **Centralized OneSignal Service**
- Location: `lib/services/onesignal_service.dart`
- Features:
  - SDK initialization
  - User login/logout
  - Push subscription management
  - User tags and preferences
  - Category subscriptions

### 2. **Integration Dialog Widget**
- Location: `lib/widgets/onesignal_integration_dialog.dart`
- Displays when push subscription is successfully established
- Prompts user to enable push notifications

### 3. **Updated Dependencies**
- Added: `onesignal_flutter: ^5.5.2`
- Android: `com.onesignal:OneSignal:5.9.2`

### 4. **Updated Configuration Files**
- `pubspec.yaml` - Added OneSignal dependency
- `android/app/build.gradle.kts` - Added OneSignal native SDK
- `android/app/src/main/AndroidManifest.xml` - Added required permissions
- `lib/main.dart` - Initialized OneSignal at app startup
- `lib/screens/home/home_screen.dart` - Integrated OneSignal user login

---

## Setup Instructions

### Step 1: Update App Packages

```bash
flutter pub get
cd android
./gradlew clean
cd ..
```

### Step 2: Android Configuration

#### 2a. Verify Google Services Plugin

Ensure `android/build.gradle.kts` has the Google Services plugin:

```gradle
plugins {
    id("com.google.gms.google-services")
}
```

#### 2b. Verify Android Manifest

Check that `AndroidManifest.xml` has these permissions:

```xml
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

#### 2c. Verify OneSignal Dependency

Confirm `android/app/build.gradle.kts` includes:

```gradle
implementation("com.onesignal:OneSignal:5.9.2")
```

### Step 3: iOS Configuration (if building for iOS)

OneSignal Flutter SDK handles most iOS setup automatically via pod install.

```bash
cd ios
pod install
cd ..
```

### Step 4: Firebase Configuration

OneSignal works alongside Firebase. Ensure your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in place.

### Step 5: Test the Integration

1. **Build and run the app**:
   ```bash
   flutter run -d android
   ```

2. **Sign in with a test phone number**

3. **Wait for the OneSignal integration dialog**:
   - Dialog title: "Your OneSignal SDK integration is complete!"
   - This appears when the device receives a server-assigned subscription ID

4. **Tap "Got it"** to request push notification permission

5. **Verify in OneSignal Dashboard**:
   - Go to https://onesignal.com/apps
   - Select your app
   - Go to "Audience" → "Subscriptions"
   - You should see your test device listed

---

## How OneSignal Is Integrated

### Initialization Flow

1. **App Startup** (`main.dart`):
   ```dart
   await oneSignalService.initialize();
   ```

2. **User Login** (`home_screen.dart`):
   ```dart
   await oneSignalService.login(currentUser.uid);
   await oneSignalService.setUserPhone(currentUser.phoneNumber);
   await oneSignalService.subscribeToCategory('all', 'All News');
   ```

3. **Push Subscription Listener**:
   - OneSignal monitors subscription state
   - When server-assigned ID is received, dialog appears
   - User can tap to enable push notifications

### OneSignalService Methods

#### Initialization
```dart
await oneSignalService.initialize();
```

#### User Management
```dart
// Login user
await oneSignalService.login(userId);

// Logout user
await oneSignalService.logout();
```

#### Notification Permission
```dart
// Request push permission
await oneSignalService.requestPushPermission();

// Check if enabled
bool enabled = await oneSignalService.arePushNotificationsEnabled();
```

#### User Preferences
```dart
// Set user email
await oneSignalService.setUserEmail('user@example.com');

// Set user phone
await oneSignalService.setUserPhone('+1234567890');

// Set user tags (for segmentation)
await oneSignalService.setUserTags({
  'news_category': 'technology',
  'user_type': 'premium',
});

// Set user preferences
await oneSignalService.setUserPreferences(
  timezone: 'America/New_York',
  language: 'en',
);
```

#### Category Subscriptions
```dart
// Subscribe to a news category
await oneSignalService.subscribeToCategory(categoryId, categoryName);

// Unsubscribe from a category
await oneSignalService.unsubscribeFromCategory(categoryId);
```

#### Get Subscription Info
```dart
// Get push subscription ID
String? subscriptionId = await oneSignalService.getPushSubscriptionId();
```

---

## Sending Push Notifications

### From OneSignal Dashboard

1. Go to https://onesignal.com/apps
2. Select your app
3. Click "New Message" → "Push Notification"
4. Compose your message
5. Target your audience (by tags, segments, or all users)
6. Schedule or send immediately

### Targeting by Category

When users subscribe to a category, you can target them:

1. Go to "New Message"
2. Select "Push Notification"
3. Under "Audience", filter by tag:
   - Key: `subscribed_category_{categoryId}`
   - Value: `true`

### Targeting by User

1. Go to "New Message"
2. Select "Push Notification"
3. Under "Audience", choose "Specific Users"
4. Enter the user ID (Firebase UID)

---

## Architecture

```
┌─────────────────────────────────────────┐
│   Flutter App                           │
│  ┌───────────────────────────────────┐  │
│  │  Home Screen / Other Screens      │  │
│  └────────────┬──────────────────────┘  │
│               │                         │
│  ┌────────────▼──────────────────────┐  │
│  │  OneSignal Service (Wrapper)      │  │
│  │  - Centralized SDK calls          │  │
│  │  - User management                │  │
│  │  - Tag management                 │  │
│  └────────────┬──────────────────────┘  │
│               │                         │
│  ┌────────────▼──────────────────────┐  │
│  │  OneSignal Flutter SDK            │  │
│  │  v5.5.2                           │  │
│  └────────────┬──────────────────────┘  │
└───────────────┼────────────────────────┘
                │
    ┌───────────┴────────────┐
    │                        │
┌───▼────────────┐   ┌──────▼──────────┐
│ OneSignal       │   │  OneSignal      │
│ Cloud Service   │   │  Servers        │
│                 │   │                 │
│ - Push Msgs     │   │ - Subscriptions │
│ - Analytics     │   │ - Audience Seg  │
│ - IAM           │   │ - Delivery      │
└─────────────────┘   └─────────────────┘
```

---

## Testing Guide

### Test 1: Verify Initialization

```dart
// In your app code
final oneSignalService = OneSignalService();
print('OneSignal initialized: ${oneSignalService.isInitialized}');
```

### Test 2: Check Subscription

```dart
final subscriptionId = await oneSignalService.getPushSubscriptionId();
print('Subscription ID: $subscriptionId');
// Should NOT start with "local-"
```

### Test 3: Send Test Notification

1. In OneSignal Dashboard: "New Message" → "Push Notification"
2. Select your test device/user
3. Send a test message
4. Verify notification appears on device

### Test 4: Verify User Tags

1. Go to OneSignal Dashboard
2. Click "Audience" → "Subscriptions"
3. Select a device
4. Check "Tags" section shows your custom tags

### Test 5: Category Subscription

```dart
// Subscribe to a category
await oneSignalService.subscribeToCategory(
  'technology',
  'Technology News',
);

// Verify in OneSignal
// Device should have tag: subscribed_category_technology = true
```

---

## Troubleshooting

### Issue: Integration Dialog Never Appears

**Cause**: Device not receiving server-assigned subscription ID

**Solutions**:
1. Check internet connectivity
2. Verify App ID is correct: `eed09380-403a-4325-a8e3-9bf6bab20baa`
3. Ensure POST_NOTIFICATIONS permission is granted
4. Check OneSignal dashboard for any errors
5. Review logcat for OneSignal debug messages:
   ```bash
   adb logcat | grep OneSignal
   ```

### Issue: Push Notifications Not Received

**Solutions**:
1. Verify POST_NOTIFICATIONS permission is granted (Android 13+)
2. Check notification settings on device
3. Ensure app has internet connection
4. Verify device is subscribed in OneSignal dashboard
5. Check OneSignal message delivery report in dashboard

### Issue: Duplicate Subscriptions

**Cause**: Clearing app data or reinstalling creates new subscription

**Solution**: Use normal relaunch instead of uninstall/reinstall for testing

### Issue: ProGuard/R8 Issues

**Solution**: OneSignal rules should be included automatically. If not, add to `android/app/proguard-rules.pro`:

```proguard
# OneSignal
-keep class com.onesignal.** { *; }
-keep interface com.onesignal.** { *; }
```

### Issue: Manifest Merge Conflicts

**Cause**: Multiple apps declaring the same permissions

**Solution**: Use `tools:replace` instead of `tools:node="replace"`

```xml
<application
    android:label="@string/app_name"
    tools:replace="android:label">
    <!-- ... -->
</application>
```

---

## Integration Checklist

- [ ] Added `onesignal_flutter: ^5.5.2` to pubspec.yaml
- [ ] Ran `flutter pub get`
- [ ] Verified OneSignal dependency in `build.gradle.kts`
- [ ] Verified permissions in `AndroidManifest.xml`
- [ ] Verified OneSignal initialization in `main.dart`
- [ ] Verified user login in `home_screen.dart`
- [ ] Installed firebase files (google-services.json, etc.)
- [ ] Built and ran the app successfully
- [ ] Saw OneSignal integration dialog
- [ ] Verified device appears in OneSignal dashboard
- [ ] Sent and received a test notification

---

## Security Considerations

1. **App ID**: Keep your OneSignal App ID secure
2. **User Data**: OneSignal handles PII securely
3. **Permissions**: Only request necessary permissions
4. **Tags**: Don't store sensitive data in tags
5. **API Keys**: Protect your REST API key

---

## Best Practices

1. **Initialize Early**: Initialize OneSignal in `main()` before `runApp()`
2. **Login After Auth**: Call `oneSignalService.login(userId)` after user authenticates
3. **Use Tags for Segmentation**: Tag users by preferences for targeted messaging
4. **Test on Real Device**: Push notifications work best on real devices
5. **Monitor Analytics**: Use OneSignal dashboard to track message performance
6. **Handle Opt-out**: Respect user privacy preferences
7. **Update Regularly**: Keep OneSignal SDK updated for security patches

---

## Additional Resources

- [OneSignal Website](https://onesignal.com/)
- [OneSignal Documentation](https://documentation.onesignal.com/)
- [OneSignal Flutter SDK](https://github.com/OneSignal/OneSignal-Flutter-SDK)
- [OneSignal Android SDK](https://github.com/OneSignal/OneSignal-Android-SDK)
- [Push Notification Best Practices](https://documentation.onesignal.com/docs/mobile-sdk-reference)

---

## Next Steps

1. **Verify Integration**:
   - Build and run the app
   - Sign in and wait for integration dialog
   - Send a test notification

2. **Customize Notifications**:
   - Update notification icons
   - Customize notification channels
   - Set up notification sounds

3. **Implement Features**:
   - Add notification preferences screen
   - Implement category subscriptions UI
   - Track notification engagement

4. **Production Deployment**:
   - Generate production signing keys
   - Update notification icons for production
   - Test on production devices
   - Monitor analytics and delivery rates

---

## Support

For integration issues, check:
1. OneSignal Dashboard error logs
2. Device logs: `adb logcat | grep OneSignal`
3. [OneSignal Documentation](https://documentation.onesignal.com/)
4. [OneSignal GitHub Issues](https://github.com/OneSignal/OneSignal-Flutter-SDK/issues)

