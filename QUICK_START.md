# Shadow News - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### What's Already Done
✅ App renamed to "Shadow News"
✅ Firebase configured for shadownews-e1b6b project
✅ Phone authentication service created
✅ Firestore database service created
✅ Authentication screens built (Phone + OTP)
✅ Home screen with news feed
✅ User profile screen
✅ All UI screens designed

---

## 📥 3 Critical Setup Steps

### Step 1: Download Firebase Config Files
```
1. Go to https://console.firebase.google.com/
2. Select project: shadownews-e1b6b
3. Download google-services.json (for Android)
4. Download GoogleService-Info.plist (for iOS)
5. Place files in:
   - android/app/google-services.json
   - ios/Runner/GoogleService-Info.plist
```

### Step 2: Enable Phone Authentication
```
1. Firebase Console → Authentication → Sign-in method
2. Enable "Phone"
3. Add test phone number (e.g., +1 650-253-0000)
4. Set test code (e.g., 123456)
```

### Step 3: Set Up Firestore Collections
```
1. Firebase Console → Firestore Database
2. Create collections:
   - news
   - users  
   - categories
3. Set up Security Rules (see FIREBASE_SETUP.md)
```

---

## 🏃 Run the App

### Android
```bash
flutter pub get
flutter run -d android
```

### iOS
```bash
cd ios
pod install
cd ..
flutter run -d ios
```

### Web
```bash
flutter run -d chrome
```

---

## 🧪 Test the Authentication

1. **Open the app** → You'll see Phone Number screen
2. **Enter test phone** → +1 650-253-0000
3. **Tap "Send Verification Code"** → SMS will be sent
4. **Enter OTP** → 123456
5. **Tap "Verify & Continue"** → User created in Firestore
6. **Home screen** → News feed displays

---

## 📁 Project Structure

```
lib/
├── main.dart                          ← App entry point
├── firebase_options.dart              ← Firebase config
├── services/
│   ├── phone_auth_service.dart        ← Auth logic
│   └── firestore_service.dart         ← Database logic
├── screens/
│   ├── auth/
│   │   ├── phone_number_screen.dart
│   │   └── otp_verification_screen.dart
│   ├── home/
│   │   └── home_screen.dart
│   └── profile/
│       └── profile_screen.dart
└── widgets/
    └── news_card.dart
```

---

## 🔑 Key Files to Know

| File | Purpose |
|------|---------|
| `lib/main.dart` | App initialization & routing |
| `lib/services/phone_auth_service.dart` | Phone login logic |
| `lib/services/firestore_service.dart` | Database operations |
| `lib/screens/auth/*` | Login screens |
| `lib/screens/home/home_screen.dart` | News feed |
| `android/app/build.gradle` | Android config |
| `ios/Podfile` | iOS dependencies |

---

## 📱 Available Screens

### 1. Phone Number Screen
- User enters phone number
- International format support
- Send verification code

### 2. OTP Verification Screen
- 6-digit code input
- Auto-verify when complete
- Resend with 60-second timer

### 3. Home Screen
- News feed with articles
- Pull-to-refresh
- Tap to view details
- Sign out button

### 4. Profile Screen
- User information
- Edit profile
- View bookmarks
- Sign out

---

## 🛠️ Development Commands

```bash
# Check Flutter setup
flutter doctor

# Get dependencies
flutter pub get

# Upgrade packages
flutter pub upgrade

# Analyze code
flutter analyze

# Format code
flutter format .

# Run tests
flutter test

# Build for release
flutter build apk --release
flutter build ios --release

# Clean build
flutter clean
flutter pub get
flutter run
```

---

## 🚨 Common Issues & Fixes

### "google-services.json not found"
```
Solution: Download from Firebase Console
Place in: android/app/google-services.json
```

### "Pod install error"
```
Solution:
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### "Phone auth not working"
```
Solution:
1. Verify phone number in Firebase Console
2. Check internet connection
3. Ensure test phone is configured
4. Review Android manifest permissions
```

### "Firestore permission denied"
```
Solution:
1. Update Security Rules in Firebase Console
2. Check user authentication
3. Verify collection names match
```

---

## 💡 Usage Examples

### Send Verification Code
```dart
final phoneAuth = PhoneAuthService();
await phoneAuth.sendVerificationCode('+1234567890');
```

### Verify OTP
```dart
final userCredential = await phoneAuth.verifyOTP('123456');
```

### Create User Profile
```dart
final firestore = FirestoreService();
await firestore.createOrUpdateUserProfile(
  userId: 'user-id',
  phoneNumber: '+1234567890',
  displayName: 'User Name',
);
```

### Fetch News
```dart
final newsList = await firestore.getAllNews();
```

### Add Bookmark
```dart
await firestore.addBookmark(
  userId: 'user-id',
  newsId: 'news-id',
);
```

---

## 📊 Database Sample Data

### Sample News Article
```json
{
  "id": "news_001",
  "title": "Flutter 3.0 Released",
  "description": "New features and improvements",
  "content": "Flutter 3.0 brings...",
  "categoryId": "technology",
  "imageUrl": "https://example.com/image.jpg",
  "authorId": "admin",
  "createdAt": "2024-01-01T12:00:00Z",
  "views": 0,
  "likes": 0
}
```

### Sample User
```json
{
  "userId": "firebase-uid",
  "phoneNumber": "+1234567890",
  "displayName": "John Doe",
  "photoUrl": null,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

---

## ✨ What's Next?

After getting the app running:

1. **Add News Data** - Create news articles in Firestore
2. **Customize UI** - Update colors, fonts, branding
3. **Add Features**:
   - [ ] Article detail view
   - [ ] Search functionality
   - [ ] Bookmark management
   - [ ] Share articles
   - [ ] Comments
   - [ ] Notifications
4. **Deploy** - Build and release to app stores

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────┐
│         Flutter App (UI)            │
├─────────────────────────────────────┤
│      Services Layer                 │
│  ┌──────────────────────────────┐   │
│  │  PhoneAuthService            │   │
│  │  FirestoreService            │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│      Firebase Backend               │
│  ┌──────────────────────────────┐   │
│  │  Authentication (Phone)      │   │
│  │  Cloud Firestore (Database)  │   │
│  │  Cloud Storage (Files)       │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 📞 Firebase Project Details

**Project**: shadownews-e1b6b
**Region**: Global
**Services**: 
- Authentication (Phone)
- Cloud Firestore
- Firebase Messaging (optional)

---

## 📚 Resources

- [Flutter Docs](https://flutter.dev/docs)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Pub.dev Packages](https://pub.dev)

---

## ✅ Pre-Launch Checklist

- [ ] Downloaded google-services.json
- [ ] Downloaded GoogleService-Info.plist
- [ ] Enabled Phone Auth in Firebase
- [ ] Created Firestore collections
- [ ] Updated Security Rules
- [ ] Tested phone authentication
- [ ] Tested home screen
- [ ] Tested profile screen
- [ ] App builds without errors
- [ ] App runs on device/emulator

---

**Ready to build?** Start with Step 1 above and let's go! 🚀
