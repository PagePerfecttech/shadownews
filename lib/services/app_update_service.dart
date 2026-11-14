import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';

class AppUpdateService {
  static final AppUpdateService _instance = AppUpdateService._internal();
  static AppUpdateService get instance => _instance;
  AppUpdateService._internal();

  bool _hasCheckedThisSession = false;

  /// Checks for available app update on startup
  Future<void> checkForUpdate(BuildContext context) async {
    if (_hasCheckedThisSession) return;
    _hasCheckedThisSession = true;

    try {
      final response = await apiClient.get('/config');
      if (response.statusCode != 200 || response.data == null) return;

      final data = response.data;
      final forceUpdateConfig = data['forceUpdate'];
      if (forceUpdateConfig == null || forceUpdateConfig is! Map) return;

      final String minAndroidVersion = forceUpdateConfig['android']?.toString() ?? '1.0.0';
      final String minIosVersion = forceUpdateConfig['ios']?.toString() ?? '1.0.0';
      final bool hardBlock = forceUpdateConfig['hardBlock'] == true;

      final packageInfo = await PackageInfo.fromPlatform();
      final String currentVersion = packageInfo.version;

      final String requiredVersion = Platform.isIOS ? minIosVersion : minAndroidVersion;

      if (_isVersionLower(currentVersion, requiredVersion)) {
        if (context.mounted) {
          _showUpdateDialog(
            context,
            currentVersion: currentVersion,
            requiredVersion: requiredVersion,
            hardBlock: hardBlock,
          );
        }
      }
    } catch (e) {
      debugPrint('[AppUpdateService] Error checking update: $e');
    }
  }

  /// Compares semantic version strings e.g. "1.0.1" vs "1.0.2"
  bool _isVersionLower(String current, String target) {
    try {
      final List<int> currentParts = current.split('.').map((e) => int.tryParse(e.replaceAll(RegExp(r'\D'), '')) ?? 0).toList();
      final List<int> targetParts = target.split('.').map((e) => int.tryParse(e.replaceAll(RegExp(r'\D'), '')) ?? 0).toList();

      final int len = currentParts.length > targetParts.length ? currentParts.length : targetParts.length;
      for (int i = 0; i < len; i++) {
        final int c = i < currentParts.length ? currentParts[i] : 0;
        final int t = i < targetParts.length ? targetParts[i] : 0;
        if (c < t) return true;
        if (c > t) return false;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Launch store listing
  Future<void> _launchStore() async {
    final Uri url = Platform.isIOS
        ? Uri.parse('https://apps.apple.com/app/id6440000000')
        : Uri.parse('https://play.google.com/store/apps/details?id=com.shadownews.app');

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('[AppUpdateService] Could not launch store URL: $e');
    }
  }

  void _showUpdateDialog(
    BuildContext context, {
    required String currentVersion,
    required String requiredVersion,
    required bool hardBlock,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !hardBlock,
      builder: (dialogCtx) {
        return PopScope(
          canPop: !hardBlock,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.red.withValues(alpha: 0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.system_update_rounded,
                    color: Color(0xFFDC2626),
                    size: 34,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  hardBlock ? 'అప్‌డేట్ తప్పనిసరి (Update Required)' : 'కొత్త వెర్షన్ అందుబాటులో ఉంది',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.notoSansTelugu(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  hardBlock
                      ? 'మీరు ఉపయోగిస్తున్న వెర్షన్ ($currentVersion) పాతది. యాప్‌ను నిరంతరాయంగా ఉపయోగించడానికి దయచేసి వెర్షన్ $requiredVersion కి అప్‌డేట్ చేయండి.'
                      : 'తెలంగాణ జ్యోతి కొత్త వెర్షన్ ($requiredVersion) విడుదలైంది. తాజా ఫీచర్లు మరియు మెరుగైన వేగం కోసం అప్‌డేట్ చేయండి.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.notoSansTelugu(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'ప్రస్తుత వెర్షన్: v$currentVersion ➔ సరికొత్త వెర్షన్: v$requiredVersion',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
            actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            actions: [
              if (!hardBlock)
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: Text(
                    'తరువాత (Later)',
                    style: GoogleFonts.notoSansTelugu(
                      color: const Color(0xFF64748B),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              Expanded(
                flex: hardBlock ? 1 : 0,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD32F2F),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    elevation: 0,
                  ),
                  onPressed: _launchStore,
                  child: Text(
                    'ఇప్పుడే అప్‌డేట్ చేయండి',
                    style: GoogleFonts.notoSansTelugu(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

