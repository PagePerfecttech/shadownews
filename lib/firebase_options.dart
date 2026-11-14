import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      return android;
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return ios;
    }
    throw UnsupportedError(
      'DefaultFirebaseOptions are not supported for this platform.',
    );
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyB3suUcFL83NjW43FrDT0ELeduHTvpToto',
    appId: '1:620220523849:web:e1b6b',
    messagingSenderId: '620220523849',
    projectId: 'shadownews-e1b6b',
    authDomain: 'shadownews-e1b6b.firebaseapp.com',
    storageBucket: 'shadownews-e1b6b.firebasestorage.app',
    measurementId: 'G-XXXXXXXXXX',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB3suUcFL83NjW43FrDT0ELeduHTvpToto',
    appId: '1:620220523849:android:b4d498c99e9c696ad7e698',
    messagingSenderId: '620220523849',
    projectId: 'shadownews-e1b6b',
    storageBucket: 'shadownews-e1b6b.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyB3suUcFL83NjW43FrDT0ELeduHTvpToto',
    appId: '1:620220523849:ios:b4d498c99e9c696ad7e698',
    messagingSenderId: '620220523849',
    projectId: 'shadownews-e1b6b',
    storageBucket: 'shadownews-e1b6b.firebasestorage.app',
  );
}
