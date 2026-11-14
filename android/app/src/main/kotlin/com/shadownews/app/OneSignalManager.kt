package com.shadownews.app

import android.content.Context
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Centralized OneSignal Manager for Android.
 * Isolates and wraps all direct OneSignal SDK calls silently in production.
 */
class OneSignalManager private constructor(private val appContext: Context) {

    private var isInitialized = false

    companion object {
        const val ONESIGNAL_APP_ID = "eed09380-403a-4325-a8e3-9bf6bab20baa"

        @Volatile
        private var INSTANCE: OneSignalManager? = null

        fun getInstance(context: Context): OneSignalManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: OneSignalManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    /**
     * Initializes the OneSignal SDK silently.
     */
    fun initialize(appId: String = ONESIGNAL_APP_ID) {
        if (isInitialized) return
        OneSignal.Debug.logLevel = LogLevel.NONE
        OneSignal.initWithContext(appContext, appId)
        isInitialized = true
    }

    suspend fun initializeAsync(appId: String = ONESIGNAL_APP_ID) = withContext(Dispatchers.IO) {
        initialize(appId)
    }

    fun requestPushPermission() {
        CoroutineScope(Dispatchers.Main).launch {
            OneSignal.Notifications.requestPermission(true)
        }
    }

    /**
     * User identity & profile management
     */
    suspend fun login(externalId: String) = withContext(Dispatchers.IO) {
        OneSignal.login(externalId)
    }

    suspend fun logout() = withContext(Dispatchers.IO) {
        OneSignal.logout()
    }

    suspend fun setEmail(email: String) = withContext(Dispatchers.IO) {
        OneSignal.User.addEmail(email)
    }

    suspend fun setSmsNumber(number: String) = withContext(Dispatchers.IO) {
        OneSignal.User.addSms(number)
    }

    suspend fun setTag(key: String, value: String) = withContext(Dispatchers.IO) {
        OneSignal.User.addTag(key, value)
    }

    fun setLogLevel(level: LogLevel) {
        OneSignal.Debug.logLevel = level
    }
}
