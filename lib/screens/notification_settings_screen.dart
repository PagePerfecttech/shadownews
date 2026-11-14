import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> with WidgetsBindingObserver {
  bool _loading = true;
  bool _saving = false;
  bool _isOsPermissionDenied = false;

  // Settings
  bool _masterEnabled = true;

  // Quiet Hours
  bool _quietHoursEnabled = false;
  TimeOfDay _quietStart = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _quietEnd = const TimeOfDay(hour: 7, minute: 0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkOsPermission();
    _loadSettings();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkOsPermission();
    }
  }

  Future<void> _checkOsPermission() async {
    final status = await Permission.notification.status;
    setState(() {
      _isOsPermissionDenied = status.isDenied || status.isPermanentlyDenied;
    });
  }

  Future<void> _loadSettings() async {
    setState(() => _loading = true);
    try {
      final res = await apiClient.get('/user/notifications');
      if (res.data != null) {
        final d = res.data;
        _masterEnabled = d['notificationsEnabled'] ?? true;
        _quietHoursEnabled = d['quietHoursEnabled'] ?? false;

        if (d['quietHoursStart'] != null) {
          final parts = d['quietHoursStart'].toString().split(':');
          if (parts.length == 2) {
            _quietStart = TimeOfDay(hour: int.tryParse(parts[0]) ?? 22, minute: int.tryParse(parts[1]) ?? 0);
          }
        }
        if (d['quietHoursEnd'] != null) {
          final parts = d['quietHoursEnd'].toString().split(':');
          if (parts.length == 2) {
            _quietEnd = TimeOfDay(hour: int.tryParse(parts[0]) ?? 7, minute: int.tryParse(parts[1]) ?? 0);
          }
        }
      }
    } catch (e) {
      debugPrint('Failed to load notification settings from backend: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _saving = true);
    try {
      String? token;
      try {
        token = await FirebaseMessaging.instance.getToken();
      } catch (_) {}

      String formatTime(TimeOfDay t) =>
          '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

      final payload = {
        'fcmToken': token,
        'notificationsEnabled': _masterEnabled,
        'notifyBreaking': _masterEnabled,
        'notifyLocation': _masterEnabled,
        'notifyCategories': _masterEnabled,
        'notifyReporters': _masterEnabled,
        'notifyRewards': _masterEnabled,
        'notifyPromotions': _masterEnabled,
        'quietHoursEnabled': _quietHoursEnabled,
        'quietHoursStart': formatTime(_quietStart),
        'quietHoursEnd': formatTime(_quietEnd),
      };

      await apiClient.post('/user/notifications', data: payload);

      // Save locally to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('notifications_enabled', _masterEnabled);
      await prefs.setBool('notify_breaking', _masterEnabled);
      await prefs.setBool('notify_location', _masterEnabled);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('నోటిఫికేషన్ ప్రాధాన్యతలు భద్రపరచబడ్డాయి (Settings saved)'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save settings: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFFB71C1C);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        title: Text(
          'Notification Settings',
          style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.only(right: 16.0),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // OS Permission Denied Banner
                  if (_isOsPermissionDenied) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 24),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Notifications Blocked by System',
                                  style: GoogleFonts.poppins(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: Colors.amber.shade900,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Notifications are disabled in your Android/iOS system settings. Please enable them to receive breaking news and local updates.',
                            style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade800),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.amber.shade800,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () => openAppSettings(),
                              child: Text(
                                'Open Device Settings',
                                style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Master Toggle Card
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Push Notifications',
                                style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Text(
                                'Enable or disable all app notifications',
                                style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _masterEnabled,
                          activeThumbColor: primaryColor,
                          onChanged: (val) {
                            setState(() => _masterEnabled = val);
                            _saveSettings();
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Information Card showing what enabling notifications includes
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: primaryColor.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.notifications_active, color: primaryColor, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'నోటిఫికేషన్లలో చేర్చబడినవి (Includes All)',
                                style: GoogleFonts.notoSansTelugu(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                        _buildFeatureItem(Icons.flash_on, Colors.red, 'తాజా బ్రేకింగ్ న్యూస్ (Breaking News alerts)'),
                        const SizedBox(height: 10),
                        _buildFeatureItem(Icons.location_on, Colors.blue, 'మీ మండలం & జిల్లా స్థానిక వార్తలు (Local alerts)'),
                        const SizedBox(height: 10),
                        _buildFeatureItem(Icons.category, Colors.purple, 'అన్ని ప్రధాన వర్గాలు (రాజకీయాలు, సినిమా, క్రీడలు...)'),
                        const SizedBox(height: 10),
                        _buildFeatureItem(Icons.badge, Colors.indigo, 'రిపోర్టర్ అప్‌డేట్‌లు & వాలెట్ రివార్డులు (Reporter & Rewards)'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Quiet Hours
                  Text(
                    'Quiet Hours (నిశ్శబ్ద సమయం)',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey.shade800),
                  ),
                  const SizedBox(height: 8),

                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      children: [
                        _buildSwitchTile(
                          icon: Icons.bedtime_outlined,
                          iconColor: Colors.deepPurple,
                          title: 'Enable Quiet Hours',
                          subtitle: 'Mute push notifications during sleep hours',
                          value: _quietHoursEnabled,
                          onChanged: (v) {
                            setState(() => _quietHoursEnabled = v);
                            _saveSettings();
                          },
                        ),
                        if (_quietHoursEnabled) ...[
                          _buildDivider(),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: _quietStart,
                                      );
                                      if (picked != null) {
                                        setState(() => _quietStart = picked);
                                        _saveSettings();
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey.shade300),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Start Time', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                                          const SizedBox(height: 2),
                                          Text(_quietStart.format(context), style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: InkWell(
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: _quietEnd,
                                      );
                                      if (picked != null) {
                                        setState(() => _quietEnd = picked);
                                        _saveSettings();
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey.shade300),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('End Time', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                                          const SizedBox(height: 2),
                                          Text(_quietEnd.format(context), style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildFeatureItem(IconData icon, Color color, String text) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.notoSansTelugu(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF333333),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool>? onChanged,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
      trailing: Switch(
        value: value,
        activeThumbColor: const Color(0xFFB71C1C),
        onChanged: onChanged,
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, thickness: 1, color: Colors.grey.shade100, indent: 56);
  }
}
