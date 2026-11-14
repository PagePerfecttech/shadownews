# Shadow News - Firebase Setup Guide

## Project Overview
Shadow News is a modern Flutter news app with:
- **Phone Authentication** - Secure login via OTP
- **Firestore Database** - Real-time news content management
- **User Profiles** - Personalized experience
- **Bookmarks** - Save articles for later

---

## Firebase Configuration

### Project Credentials
- **Project ID**: shadownews-e1b6b
- **Project Number**: 620220523849
- **Storage Bucket**: shadownews-e1b6b.firebasestorage.app
- **Android App ID**: 1:620220523849:android:b4d498c99e9c696ad7e698

### Firebase Services Used
1. **Firebase Authentication** - Phone Number authentication
2. **Cloud Firestore** - Real-time database
3. **Firebase Messaging** - Push notifications (optional)

---

## Directory Structure

```
lib/
├── main.dart                          # App entry point with auth state management
├── firebase_options.dart              # Firebase configuration for all platforms
├── screens/
│   ├── auth/
│   │   ├── phone_number_screen.dart   # Phone number input screen
│   │   └── otp_verification_screen.dart # OTP verification screen
│   ├── home/
│   │   └── home_screen.dart           # News feed/home screen
│   └── profile/
│       └── profile_screen.dart        # User profile screen
├── services/
│   ├── phone_auth_service.dart        # Phone authentication logic
│   └── firestore_service.dart         # Firestore database operations
└── widgets/
    └── news_card.dart                 # Reusable news card widget
```

---

## Setup Instructions

### Step 1: Install Dependencies
```bash
flutter pub get
```

This will install all required packages including:
- `firebase_core` - Firebase initialization
- `firebase_auth` - Phone authentication
- `cloud_firestore` - Database
- `intl_phone_number_input` - Phone number input widget
- `pinput` - OTP input widget

### Step 2: Download google-services.json (Android)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select "shadownews-e1b6b" project
3. Go to Project Settings → Your Apps → select Android app
4. Download `google-services.json`
5. Place it in: `android/app/google-services.json`

### Step 3: Configure Android Manifest

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.shadownews.app">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Add Phone number permission -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.READ_SMS" />
    
    <application>
        <!-- Your activities here -->
    </application>
</manifest>
```

### Step 4: Update Android Gradle Files

Edit `android/build.gradle`:

```gradle
buildscript {
    ext {
        kotlin_version = '1.9.0'
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version'
        // Add Firebase plugin
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

Edit `android/app/build.gradle`:

```gradle
plugins {
    id 'com.android.application'
    id 'kotlin-android'
    // Add Firebase plugin
    id 'com.google.gms.google-services'
}

android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 21  // Firebase Phone Auth requires minimum API 21
    }
}

dependencies {
    // Firebase BOM ensures compatible versions
    implementation platform('com.google.firebase:firebase-bom:32.0.0')
}
```

### Step 5: Download GoogleService-Info.plist (iOS)

1. Go to Firebase Console → shadownews-e1b6b
2. Project Settings → Your Apps → select iOS app
3. Download `GoogleService-Info.plist`
4. Add to Xcode: `ios/Runner` folder
5. In Xcode: Select `GoogleService-Info.plist` → Target: Runner

### Step 6: Configure iOS

Edit `ios/Podfile`:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        'PERMISSION_PHONE_STATE=1',
      ]
    end
  end
end
```

### Step 7: Update App Name

Change `pubspec.yaml`:
```yaml
name: shadow_news
```

---

## Firestore Database Structure

### Collections to Create

#### 1. news (Main content collection)
```json
{
  "id": "auto-generated",
  "title": "Breaking News Title",
  "description": "Brief description",
  "content": "Full article content",
  "categoryId": "news-id",
  "imageUrl": "https://example.com/image.jpg",
  "authorId": "user-id",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "views": 0,
  "likes": 0
}
```

#### 2. users (User profiles)
```json
{
  "userId": "firebase-uid",
  "phoneNumber": "+1234567890",
  "displayName": "User Name",
  "photoUrl": "https://example.com/photo.jpg",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### 3. categories (News categories)
```json
{
  "id": "auto-generated",
  "name": "Technology",
  "icon": "📱",
  "description": "Tech news",
  "createdAt": "timestamp"
}
```

#### 4. users/{userId}/bookmarks (User bookmarks)
```json
{
  "newsId": "news-article-id",
  "bookmarkedAt": "timestamp"
}
```

### Firestore Security Rules

Edit Security Rules in Firebase Console:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Public read access to news
    match /news/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Public read, authenticated write for categories
    match /categories/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // User can only access their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      
      // User can manage their bookmarks
      match /bookmarks/{document=**} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }
  }
}
```

---

## Authentication Configuration

### Enable Phone Authentication

1. Go to Firebase Console → Authentication
2. Click "Sign-in method"
3. Enable "Phone"
4. Add test phone numbers (for testing):
   - Click "Phone numbers for testing"
   - Add: `+1 650-253-0000` with code `123456`

### Authentication Flow

1. **Phone Number Entry** → User enters phone number
2. **OTP Sent** → Firebase sends OTP via SMS
3. **OTP Verification** → User enters 6-digit code
4. **User Created** → Firestore user profile created
5. **Home Screen** → User navigated to news feed

---

## Running the App

### Android
```bash
flutter run -d android
```

### iOS
```bash
flutter run -d ios
```

### Web
```bash
flutter run -d chrome
```

---

## Features Implemented

### 1. Phone Authentication
- Send verification code via SMS
- Verify OTP and sign in
- Auto-retrieve SMS on Android
- Resend OTP functionality

### 2. Firestore Integration
- Fetch news articles in real-time
- Search and filter news
- Get trending articles (by views)
- Bookmark management

### 3. User Management
- Create user profile on first login
- Update display name
- Manage user data

### 4. News Feed
- Display all news articles
- Pull-to-refresh functionality
- View count tracking
- Infinite scrolling support

### 5. Profile Screen
- Display user information
- Edit profile
- Manage bookmarks
- Sign out functionality

---

## Troubleshooting

### Phone Auth Issues
- **"Invalid OTP"** → Check test phone number credentials
- **"No SMS received"** → Ensure device has SMS permissions
- **"Verification timeout"** → User took too long; restart process

### Firestore Issues
- **"Permission denied"** → Update Security Rules
- **"Document not found"** → Ensure document exists in Firebase
- **"Query failed"** → Check collection name and field names

### Build Issues
- **"google-services.json not found"** → Add file to `android/app/`
- **"Gradle sync failed"** → Run `flutter pub get && flutter pub upgrade`
- **"Dependency conflict"** → Update `pubspec.yaml` versions

---

## Next Steps

1. **Add Admin Panel** - Create backend for managing news
2. **Push Notifications** - Implement Firebase Messaging
3. **Social Sharing** - Share articles on social media
4. **Offline Support** - Cache articles locally with Hive
5. **Advanced Search** - Full-text search in Firestore
6. **Comments** - Add comment system for articles
7. **Ratings** - User ratings for articles
8. **Analytics** - Track user engagement

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Flutter Firebase Plugin](https://pub.dev/packages/firebase_core)
- [Firebase Phone Authentication](https://firebase.google.com/docs/auth/flutter/phone-auth)
- [Cloud Firestore Guide](https://firebase.google.com/docs/firestore)
- [Flutter Documentation](https://flutter.dev/docs)

---

## Support

For issues or questions:
1. Check Firebase Console for errors
2. Review Security Rules and permissions
3. Verify all configuration files are in place
4. Check device has internet connectivity
5. Review device logs: `flutter logs`

