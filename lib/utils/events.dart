import 'dart:async';
import 'package:flutter/foundation.dart';

class AppEvents {
  static final StreamController<void> homeTabTapped = StreamController<void>.broadcast();
  static final StreamController<int> tabChanged = StreamController<int>.broadcast();
  static int currentTab = 2; // Default to Home tab (index 2)

  // Home screen bottom navigation visibility (defaults to false/hidden for full screen news card)
  static final ValueNotifier<bool> isBottomNavVisible = ValueNotifier<bool>(false);

  static void toggleBottomNav() {
    isBottomNavVisible.value = !isBottomNavVisible.value;
  }

  static void showBottomNav() {
    isBottomNavVisible.value = true;
  }

  static void hideBottomNav() {
    isBottomNavVisible.value = false;
  }
}
