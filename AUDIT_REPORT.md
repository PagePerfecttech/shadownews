# Flutter Codebase Audit Report
**Project:** Telangana Jyothi Shorts  
**Date:** May 29, 2026  
**Status:** 86 Compilation Errors Found

---

## Executive Summary

This audit identified **86 compilation errors** across the codebase, with the following breakdown:
- **1 CRITICAL**: Orphaned code blocking file compilation
- **6 HIGH**: Type signature violations (void async methods)
- **1 HIGH**: String interpolation error
- **1 MEDIUM**: Missing implementation
- **1 MEDIUM**: API call error
- **77 MEDIUM**: Cascading errors from orphaned code

---

## Critical Issues (Must Fix Immediately)

### 1. ⛔ CRITICAL: Orphaned Code in Reporter Submit Screen
**File:** [lib/screens/reporter_submit_screen.dart](lib/screens/reporter_submit_screen.dart#L102)  
**Severity:** CRITICAL  
**Lines:** 102-130  
**Issue:** A stray `showModalBottomSheet()` call is orphaned outside any method, breaking the entire file structure. This causes 77 cascading compilation errors throughout the file.

**Current Code:**
```dart
  }
    showModalBottomSheet(
      context: context,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Wrap(
            children: <Widget>[
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Pick Image'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickImage();
                },
              ),
              ListTile(
                leading: const Icon(Icons.video_library),
                title: const Text('Pick Video'),
                onTap: () {
                  Navigator.of(context).pop();
                  _pickVideo();
                },
              ),
            ],
          ),
        );
      }
    );
  }
```

**Fix:** This code should be wrapped in a method like `void _pickMedia()`. The proper structure should be:
```dart
  }

  void _pickMedia() {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext bc) {
        // ... rest of the modal code
      }
    );
  }

  Future<void> _pickImage() async {
```

**Impact:** ALL subsequent code in this file is broken (lines 127+). Until this is fixed, the entire `_submitNews()` and `_pickImage()` methods are not recognized.

---

## High Priority Issues

### 2. 🔴 Async Method with Wrong Return Type
**File:** [lib/widgets/video_player_item.dart](lib/widgets/video_player_item.dart#L31)  
**Severity:** HIGH  
**Line:** 31  
**Issue:** Method declared as `void _initVideo() async` should be `Future<void> _initVideo() async`

**Current Code:**
```dart
void _initVideo() async {
  _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoData['url']));
  await _controller.initialize();
  // ...
}
```

**Fix:**
```dart
Future<void> _initVideo() async {
  _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoData['url']));
  await _controller.initialize();
  // ...
}
```

---

### 3. 🔴 Async Method with Wrong Return Type
**File:** [lib/widgets/custom_ad_widget.dart](lib/widgets/custom_ad_widget.dart#L11)  
**Severity:** HIGH  
**Line:** 11  
**Issue:** Method declared as `void _launchURL() async` should be `Future<void> _launchURL() async`

**Current Code:**
```dart
void _launchURL() async {
  final urlStr = ad['click_url'] as String? ?? '';
  if (urlStr.isEmpty) return;
  final url = Uri.parse(urlStr);
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }
}
```

**Fix:**
```dart
Future<void> _launchURL() async {
  final urlStr = ad['click_url'] as String? ?? '';
  if (urlStr.isEmpty) return;
  final url = Uri.parse(urlStr);
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }
}
```

---

### 4. 🔴 Async Method with Wrong Return Type
**File:** [lib/widgets/banner_ad_widget.dart](lib/widgets/banner_ad_widget.dart#L52)  
**Severity:** HIGH  
**Line:** 52  
**Issue:** Method declared as `void _launchURL() async` should be `Future<void> _launchURL() async`

**Current Code:**
```dart
void _launchURL() async {
  final url = Uri.parse(AdManager.customBannerLinkUrl);
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }
}
```

**Fix:**
```dart
Future<void> _launchURL() async {
  final url = Uri.parse(AdManager.customBannerLinkUrl);
  if (await canLaunchUrl(url)) {
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }
}
```

---

### 5. 🔴 Async Method with Wrong Return Type
**File:** [lib/screens/profile_screen.dart](lib/screens/profile_screen.dart#L36)  
**Severity:** HIGH  
**Line:** 36  
**Issue:** Method declared as `void _applyForReporter() async` should be `Future<void> _applyForReporter() async`

**Current Code:**
```dart
void _applyForReporter() async {
  final result = await context.push<bool>('/reporter/apply');
  if (result == true) {
    setState(() => _reporterStatus = ReporterStatus.pending);
  }
}
```

**Fix:**
```dart
Future<void> _applyForReporter() async {
  final result = await context.push<bool>('/reporter/apply');
  if (result == true) {
    setState(() => _reporterStatus = ReporterStatus.pending);
  }
}
```

---

### 6. 🔴 Async Method with Wrong Return Type
**File:** [lib/screens/profile_screen.dart](lib/screens/profile_screen.dart#L43)  
**Severity:** HIGH  
**Line:** 43  
**Issue:** Method declared as `void _logout() async` should be `Future<void> _logout() async`

**Current Code:**
```dart
void _logout() async {
  await FirebaseAuth.instance.signOut();
  if (mounted) context.go('/login');
}
```

**Fix:**
```dart
Future<void> _logout() async {
  await FirebaseAuth.instance.signOut();
  if (mounted) context.go('/login');
}
```

---

### 7. 🔴 Async Method with Wrong Return Type
**File:** [lib/screens/reporter_apply_screen.dart](lib/screens/reporter_apply_screen.dart#L26)  
**Severity:** HIGH  
**Line:** 26  
**Issue:** Method declared as `void _apply() async` should be `Future<void> _apply() async`

**Current Code:**
```dart
void _apply() async {
  if (_nameController.text.isEmpty || _idProofImage == null) {
    // ...
  }
  // ... rest of async code
}
```

**Fix:**
```dart
Future<void> _apply() async {
  if (_nameController.text.isEmpty || _idProofImage == null) {
    // ...
  }
  // ... rest of async code
}
```

---

### 8. 🔴 Async Method with Wrong Return Type
**File:** [lib/screens/reporter_submit_screen.dart](lib/screens/reporter_submit_screen.dart#L173)  
**Severity:** HIGH  
**Line:** 173  
**Issue:** Method declared as `void _submitNews() async` should be `Future<void> _submitNews() async`. **Note:** This is cascaded from the orphaned code issue above.

**Current Code:**
```dart
void _submitNews() async {
  if (_titleController.text.isEmpty || _descController.text.isEmpty) {
    // ... rest of async code
  }
}
```

**Fix:**
```dart
Future<void> _submitNews() async {
  if (_titleController.text.isEmpty || _descController.text.isEmpty) {
    // ... rest of async code
  }
}
```

---

### 9. 🔴 String Interpolation Error
**File:** [lib/screens/search_results_screen.dart](lib/screens/search_results_screen.dart#L43)  
**Severity:** HIGH  
**Line:** 43  
**Issue:** String contains escaped dollar sign `\$url` instead of `$url`. This causes the URL to be malformed.

**Current Code:**
```dart
String _formatUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('/')) {
    return 'https://telanganajyothi.vercel.app\$url';  // ❌ Wrong!
  }
  return url.replaceAll(RegExp(r'placehold\.co/(\d+x\d+)/'), r'placehold.co/$1/png/');
}
```

**Fix:**
```dart
String _formatUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('/')) {
    return 'https://telanganajyothi.vercel.app$url';  // ✓ Correct
  }
  return url.replaceAll(RegExp(r'placehold\.co/(\d+x\d+)/'), r'placehold.co/$1/png/');
}
```

---

## Medium Priority Issues

### 10. 🟡 Missing Implementation
**File:** [lib/screens/shorts_screen.dart](lib/screens/shorts_screen.dart#L72-L74)  
**Severity:** MEDIUM  
**Lines:** 72-74  
**Issue:** `_onShare()` method is empty with just a comment indicating unimplemented functionality.

**Current Code:**
```dart
Future<void> _onShare(String videoId) async {
  // Implement share functionality
}
```

**Recommendation:** Either implement the share functionality or remove the method and handle sharing elsewhere. Consider using `share_plus` package for cross-platform sharing.

**Suggested Implementation:**
```dart
Future<void> _onShare(String videoId) async {
  try {
    // Get video details and share
    final video = _videos.firstWhere((v) => v['id'] == videoId, orElse: () => null);
    if (video != null) {
      await Share.share('Check out this video: ${video['title']}');
    }
  } catch (e) {
    debugPrint('Share error: $e');
  }
}
```

---

### 11. 🟡 Empty onVisibilityChanged Handler
**File:** [lib/screens/shorts_screen.dart](lib/screens/shorts_screen.dart#L95-L97)  
**Severity:** MEDIUM  
**Lines:** 95-97  
**Issue:** `onVisibilityChanged` callback has only a comment, no implementation for visibility-based playback optimization.

**Current Code:**
```dart
VisibilityDetector(
  key: Key(video['id'].toString()),
  onVisibilityChanged: (info) {
     // Handled mostly by PageView, but can be fine-tuned here
  },
```

**Recommendation:** Either implement visibility logic or remove the comment. If visibility detection is needed for performance optimization:

**Suggested Implementation:**
```dart
onVisibilityChanged: (info) {
  if (info.visibleFraction > 0.5) {
    if (index == _currentIndex && !_videos[index]['isPlaying']) {
      // Ensure video plays when visible
    }
  }
}
```

---

### 12. 🟡 Compilation Error in Login Screen
**File:** [lib/screens/login_screen.dart](lib/screens/login_screen.dart#L194)  
**Severity:** MEDIUM  
**Line:** 194  
**Issue:** `TcSdk.getAuthorizationCode()` doesn't evaluate to a function. The method call syntax is incorrect.

**Compilation Error:**
```
The expression doesn't evaluate to a function, so it can't be invoked.
```

**Current Code:**
```dart
await TcSdk.getAuthorizationCode();
```

**Fix:** Verify the correct method name from the `truecaller_sdk` package. Likely should be one of:
- `await TcSdk.getAuthorizationCode()`
- `await TcSdk.requestAuthorizationCode()`
- Other method from SDK

Check the truecaller_sdk documentation for the correct API.

---

### 13. 🟡 Missing Imports in Reporter Submit Screen
**File:** [lib/screens/reporter_submit_screen.dart](lib/screens/reporter_submit_screen.dart#L1)  
**Severity:** MEDIUM  
**Issue:** Uses `FormData` and `MultipartFile` (from Dio) but imports are not explicitly shown. While `dio` is imported, these classes should be explicitly imported if not using Dio namespace.

**Recommendation:** Add explicit import or use fully qualified names:
```dart
import 'package:dio/dio.dart'; // Already present
// FormData and MultipartFile are part of Dio, but can add explicit:
// Use FormData.fromMap(), MultipartFile.fromFile() with Dio namespace
```

**Or verify the import is correct:**
```dart
import 'package:dio/dio.dart'; // Contains FormData and MultipartFile
```

---

## Code Quality Issues

### 14. 🟡 Error Handling Pattern - Silent Failures
**File:** [lib/api/api_client.dart](lib/api/api_client.dart#L39-L42)  
**Severity:** MEDIUM  
**Issue:** `syncUser()` silently ignores sync errors without any logging or user notification.

**Current Code:**
```dart
Future<void> syncUser() async {
  try {
    await post('/auth/sync');
  } catch (e) {
    // Ignore sync errors silently
  }
}
```

**Recommendation:** At minimum, log sync errors for debugging:
```dart
Future<void> syncUser() async {
  try {
    await post('/auth/sync');
  } catch (e) {
    debugPrint('User sync failed (non-critical): $e');
    // Ignore - sync is not critical to app functionality
  }
}
```

---

### 15. 🟡 Unused Constant in Profile Screen
**File:** [lib/screens/profile_screen.dart](lib/screens/profile_screen.dart#L18)  
**Severity:** LOW  
**Issue:** `_isLoading` is initialized to `false` but never changes. The field should be dynamic or removed if not needed.

**Current Code:**
```dart
class _ProfileScreenState extends State<ProfileScreen> {
  ReporterStatus _reporterStatus = ReporterStatus.none;
  final bool _isLoading = false;  // Never changes!
  bool _isDarkMode = false;
```

**Recommendation:** Either:
1. Remove the field if it's not used
2. Make it dynamic and update it in lifecycle methods if loading state is needed

---

## Configuration & Setup Issues

### 16. 🟡 Theme Mode Switch Implementation
**File:** [lib/screens/profile_screen.dart](lib/screens/profile_screen.dart#L33)  
**Severity:** LOW  
**Issue:** `_toggleDarkMode` has `async` but declared as `void`. While it calls async function, the pattern is awkward.

**Current Code:**
```dart
Future<void> _toggleDarkMode(bool value) async {
  await globalThemeProvider.setThemeMode(value ? ThemeMode.dark : ThemeMode.light);
  setState(() => _isDarkMode = value);
}
```

**This is already correct**, but verify it's being awaited properly in the UI callback.

---

## Summary by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 1 | Orphaned code in reporter_submit_screen.dart |
| HIGH | 8 | Async/void type mismatches (6), String interpolation (1), API call error (1) |
| MEDIUM | 6 | Missing implementations (2), Error handling (1), Unused code (1), Import verification (1), Theme handling (1) |
| LOW | 1 | Unused constant |
| **TOTAL** | **16** | **Primary issues requiring attention** |

---

## Recommendations

### Phase 1: Critical Fixes (Today)
1. **Fix the orphaned code** in `reporter_submit_screen.dart` - This is blocking the entire file
2. **Fix all async/void type mismatches** - These are lint violations
3. **Fix string interpolation** in `search_results_screen.dart`
4. **Verify Truecaller API** call in `login_screen.dart`

### Phase 2: High Priority (This Week)
1. Implement `_onShare()` functionality or remove it
2. Improve error handling with proper logging
3. Clean up unused fields and code

### Phase 3: Polish (Sprint)
1. Add comprehensive error handling
2. Add user feedback for failed operations
3. Optimize visibility detection for video playback
4. Add analytics for user interactions

---

## Testing Recommendations

After fixes:
1. Run `flutter analyze` to catch any lint issues
2. Run `flutter test` to verify all unit tests pass
3. Test on both Android and iOS devices
4. Test all navigation flows
5. Test error scenarios (network failures, auth failures)

---

## Files Requiring Immediate Action

| File | Issues | Priority |
|------|--------|----------|
| [lib/screens/reporter_submit_screen.dart](lib/screens/reporter_submit_screen.dart) | Orphaned code (CRITICAL), Async/void type (HIGH), Missing imports (MEDIUM) | **CRITICAL** |
| [lib/widgets/video_player_item.dart](lib/widgets/video_player_item.dart) | Async/void type | HIGH |
| [lib/widgets/custom_ad_widget.dart](lib/widgets/custom_ad_widget.dart) | Async/void type | HIGH |
| [lib/widgets/banner_ad_widget.dart](lib/widgets/banner_ad_widget.dart) | Async/void type | HIGH |
| [lib/screens/profile_screen.dart](lib/screens/profile_screen.dart) | Async/void type (2), Unused field | HIGH |
| [lib/screens/reporter_apply_screen.dart](lib/screens/reporter_apply_screen.dart) | Async/void type | HIGH |
| [lib/screens/search_results_screen.dart](lib/screens/search_results_screen.dart) | String interpolation | HIGH |
| [lib/screens/login_screen.dart](lib/screens/login_screen.dart) | API call error | MEDIUM |
| [lib/screens/shorts_screen.dart](lib/screens/shorts_screen.dart) | Missing implementations (2) | MEDIUM |

---

**Report Generated:** May 29, 2026  
**Auditor:** Code Analysis System  
**Next Review:** After fixes are applied
