# Flutter Proguard Rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# AdMob Core & Google Play Services Ads
-keep class com.google.android.gms.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-keep class com.google.ads.mediation.** { *; }
-keep interface com.google.ads.mediation.** { *; }
-keep class com.google.ads.consent.** { *; }
-keep interface com.google.ads.consent.** { *; }
-dontwarn com.google.android.gms.ads.**

# AdMob Native Templates (Crucial for NativeTemplateStyle & medium_template_view_layout)
-keep class com.google.android.ads.nativetemplates.** { *; }
-dontwarn com.google.android.ads.nativetemplates.**

# Flutter Google Mobile Ads Plugin
-keep class io.flutter.plugins.googlemobileads.** { *; }
-dontwarn io.flutter.plugins.googlemobileads.**

# Firebase Proguard Rules
-keep class com.google.firebase.** { *; }

# UCrop (used by image_cropper)
-keep class com.yalantis.ucrop.** { *; }
-dontwarn com.yalantis.ucrop.**

# Truecaller SDK
-keep class com.truecaller.** { *; }
-dontwarn com.truecaller.**

# Google Play Core (Missing classes detected by R8)
-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication
-dontwarn com.google.android.play.core.splitinstall.SplitInstallException
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManager
-dontwarn com.google.android.play.core.splitinstall.SplitInstallManagerFactory
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest$Builder
-dontwarn com.google.android.play.core.splitinstall.SplitInstallRequest
-dontwarn com.google.android.play.core.splitinstall.SplitInstallSessionState
-dontwarn com.google.android.play.core.splitinstall.SplitInstallStateUpdatedListener
-dontwarn com.google.android.play.core.tasks.OnFailureListener
-dontwarn com.google.android.play.core.tasks.OnSuccessListener
-dontwarn com.google.android.play.core.tasks.Task

# OneSignal ProGuard Rules
-dontwarn com.onesignal.**
-keep class com.onesignal.** { *; }
-keep interface com.onesignal.** { *; }
