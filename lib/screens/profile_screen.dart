import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../api/api_client.dart';
import '../services/in_app_review_service.dart';
import '../theme/app_theme.dart';

enum ReporterStatus { none, pending, active }

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  ReporterStatus _reporterStatus = ReporterStatus.none;
  String? _userName;
  String? _userAvatar;
  String? _userPhone;
  String? _userLocation;
  String _textSize = 'Medium';

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    await apiClient.syncUser();
    final prefs = await SharedPreferences.getInstance();

    setState(() {
      if (prefs.getBool('is_reporter') == true) {
        _reporterStatus = ReporterStatus.active;
      }
      _textSize = prefs.getString('text_size') ?? 'Medium';
    });

    try {
      final res = await apiClient.get('/user/profile');
      if (res.data != null && res.data['user'] != null) {
        final u = res.data['user'];
        setState(() {
          _userName = u['name'];
          _userAvatar = u['avatar'];
          _userPhone = u['phone'];
          final mandal = u['mandal']?['name'];
          final district = u['district']?['name'];
          if (mandal != null && district != null) {
            _userLocation = '$mandal, $district';
          } else if (district != null) {
            _userLocation = district;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _logout() async {
    await FirebaseAuth.instance.signOut();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('is_guest');
    if (mounted) context.go('/login');
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Delete Account (ఖాతాను తొలగించు)?',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.red),
        ),
        content: Text(
          'Are you sure you want to permanently delete your account and all associated preferences? This action cannot be undone.\n\n(మీ ఖాతా మరియు డేటా శాశ్వతంగా తొలగించబడుతుంది).',
          style: GoogleFonts.poppins(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.poppins(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete Permanently', style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await apiClient.delete('/user/profile');
        await FirebaseAuth.instance.signOut();
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Account deleted successfully')),
          );
          context.go('/login');
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete account: $e')),
          );
        }
      }
    }
  }

  void _showTextSizeDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Reading Text Size / అక్షరాల పరిమాణం', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
        content: RadioGroup<String>(
          groupValue: _textSize,
          onChanged: (val) async {
            if (val != null) {
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('text_size', val);
              setState(() => _textSize = val);
              if (ctx.mounted) Navigator.pop(ctx);
            }
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: ['Small', 'Medium', 'Large'].map((size) {
              return RadioListTile<String>(
                title: Text(size, style: GoogleFonts.poppins()),
                value: size,
                activeColor: const Color(0xFFB71C1C),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final isGuest = user == null;
    const bgColor = Color(0xFFF2F1ED);
    const primaryColor = Color(0xFFB71C1C);

    final displayName = _userName ?? (user?.displayName?.isNotEmpty == true ? user!.displayName! : (_userPhone ?? 'Shadow News Reader'));

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Custom App Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.black, size: 20),
                      onPressed: () {
                        context.go('/feed');
                      },
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Profile & Settings',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                children: [
                  // Profile Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: primaryColor.withValues(alpha: 0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            color: Colors.white.withValues(alpha: 0.15),
                          ),
                          child: ClipOval(
                            child: _userAvatar != null && _userAvatar!.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: _userAvatar!,
                                    fit: BoxFit.cover,
                                    errorWidget: (context, url, error) => const Icon(Icons.person, color: Colors.white, size: 40),
                                  )
                                : const Icon(Icons.person, color: Colors.white, size: 40),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isGuest ? 'Guest User' : displayName,
                                style: GoogleFonts.poppins(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (_userLocation != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  _userLocation!,
                                  style: GoogleFonts.poppins(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  if (!isGuest) ...[
                                    InkWell(
                                      onTap: () async {
                                        await context.push('/edit-profile');
                                        _loadUserData();
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Row(
                                          children: [
                                            Text(
                                              'Edit Profile',
                                              style: GoogleFonts.poppins(
                                                color: primaryColor,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 12,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            const Icon(Icons.edit, color: primaryColor, size: 13),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  InkWell(
                                    onTap: () async {
                                      if (isGuest) {
                                        final prefs = await SharedPreferences.getInstance();
                                        await prefs.remove('is_guest');
                                        try {
                                          await FirebaseAuth.instance.signOut();
                                        } catch (_) {}
                                        if (context.mounted) {
                                          context.go('/login');
                                        }
                                      } else {
                                        _logout();
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        isGuest ? 'Sign In' : 'Sign Out',
                                        style: GoogleFonts.poppins(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Settings Menu List
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
                      ],
                    ),
                    child: Column(
                      children: [
                        if (!isGuest) ...[
                          _buildMenuItem(
                            Icons.person_outline,
                            'Edit Profile (ప్రొఫైల్ సవరణ)',
                            subtitle: 'Name, photo, email, gender & DOB',
                            onTap: () async {
                              await context.push('/edit-profile');
                              _loadUserData();
                            },
                          ),
                          _buildDivider(),
                        ],

                        _buildMenuItem(
                          Icons.notifications_outlined,
                          'Notifications (నోటిఫికేషన్లు)',
                          subtitle: 'Breaking news, district alerts, quiet hours',
                          onTap: () => context.push('/settings/notifications'),
                        ),
                        _buildDivider(),

                        _buildMenuItem(
                          Icons.bookmark_outline_rounded,
                          'Saved Stories (బుక్‌మార్క్‌లు)',
                          subtitle: 'View your saved news stories',
                          onTap: () => context.push('/bookmarks'),
                        ),
                        _buildDivider(),

                        _buildMenuItem(
                          Icons.location_on_outlined,
                          'Change Location (ప్రాంతం మార్పు)',
                          subtitle: _userLocation ?? 'State, District & Mandal',
                          onTap: () => context.push('/onboarding/state'),
                        ),
                        _buildDivider(),

                        _buildMenuItem(
                          Icons.translate,
                          'App Language (భాష)',
                          subtitle: 'తెలుగు / English',
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text('Select Language / భాష', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    ListTile(
                                      title: Text('తెలుగు (Telugu)', style: GoogleFonts.poppins()),
                                      onTap: () async {
                                        final prefs = await SharedPreferences.getInstance();
                                        await prefs.setString('preferred_language', 'te');
                                        if (ctx.mounted) Navigator.pop(ctx);
                                      },
                                    ),
                                    ListTile(
                                      title: Text('English', style: GoogleFonts.poppins()),
                                      onTap: () async {
                                        final prefs = await SharedPreferences.getInstance();
                                        await prefs.setString('preferred_language', 'en');
                                        if (ctx.mounted) Navigator.pop(ctx);
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                        _buildDivider(),

                        _buildMenuItem(
                          Icons.format_size,
                          'Reading Text Size',
                          subtitle: _textSize,
                          onTap: _showTextSizeDialog,
                        ),
                        _buildDivider(),

                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                          leading: Icon(Icons.dark_mode_outlined, color: Colors.grey.shade600, size: 24),
                          title: Text('Dark Mode', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w500)),
                          trailing: Switch(
                            value: globalThemeProvider.isDarkMode,
                            activeThumbColor: primaryColor,
                            onChanged: (v) async {
                              await globalThemeProvider.setDarkMode(v);
                              setState(() {});
                            },
                          ),
                        ),
                        _buildDivider(),

                        _buildMenuItem(Icons.grid_view, 'Categories (వర్గాలు)', onTap: () => context.push('/discovery')),
                        _buildDivider(),

                        if (_reporterStatus == ReporterStatus.active) ...[
                          _buildMenuItem(
                            Icons.account_balance_wallet_outlined,
                            'Wallet & Earnings (వాలెట్ & సంపాదన)',
                            subtitle: 'View earnings and withdrawal history',
                            onTap: () => context.push('/reporter/wallet'),
                          ),
                          _buildDivider(),
                          _buildMenuItem(
                            Icons.menu_book_outlined,
                            'Reporter Guidelines (ప్రమోషన్ పాలసీ)',
                            onTap: () => context.push('/reporter-guidelines'),
                          ),
                          _buildDivider(),
                        ],

                        _buildMenuItem(Icons.gavel_outlined, 'Terms & Conditions (నిబంధనలు)', onTap: () => context.push('/terms-conditions')),
                        _buildDivider(),

                        _buildMenuItem(
                          Icons.star_rate_rounded,
                          'Rate the App (యాప్‌ను రేట్ చేయండి)',
                          subtitle: 'Share your feedback or review on Google Play',
                          iconColor: const Color(0xFFF59E0B),
                          onTap: () => InAppReviewService.instance.showRatingPrompt(context, isManual: true),
                        ),
                        _buildDivider(),

                        _buildMenuItem(Icons.privacy_tip_outlined, 'Privacy Policy (గోప్యతా విధానం)', onTap: () => context.push('/privacy-policy')),
                        _buildDivider(),

                        _buildMenuItem(Icons.help_outline, 'Support & Contact Us', subtitle: 'info@shadownews.in', onTap: () => context.push('/contact-us')),

                        if (!isGuest) ...[
                          _buildDivider(),
                          _buildMenuItem(
                            Icons.delete_forever_outlined,
                            'Delete Account (ఖాతా తొలగింపు)',
                            subtitle: 'Permanently remove your account and data',
                            textColor: Colors.red.shade700,
                            iconColor: Colors.red.shade700,
                            onTap: _deleteAccount,
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    IconData icon,
    String title, {
    String? subtitle,
    VoidCallback? onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      leading: Icon(icon, color: iconColor ?? Colors.grey.shade600, size: 24),
      title: Text(
        title,
        style: GoogleFonts.poppins(
          color: textColor ?? const Color(0xFF333333),
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: subtitle != null
          ? Padding(
              padding: const EdgeInsets.only(top: 2.0),
              child: Text(
                subtitle,
                style: GoogleFonts.poppins(color: Colors.grey.shade500, fontSize: 12),
              ),
            )
          : null,
      trailing: Icon(Icons.arrow_forward_ios, color: Colors.grey.shade400, size: 14),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, thickness: 1, color: Colors.grey.shade100, indent: 20, endIndent: 20);
  }
}
