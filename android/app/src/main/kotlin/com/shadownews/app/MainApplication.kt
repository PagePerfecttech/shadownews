package com.shadownews.app

import com.google.android.gms.ads.MobileAds
import io.flutter.app.FlutterApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainApplication : FlutterApplication() {
    override fun onCreate() {
        super.onCreate()
        OneSignalManager.getInstance(this).initialize()

        // Initialize the Google Mobile Ads SDK on a background thread
        val backgroundScope = CoroutineScope(Dispatchers.IO)
        backgroundScope.launch {
            MobileAds.initialize(this@MainApplication) {}
        }
    }
}

