import 'package:flutter/material.dart';
import '../../services/phone_auth_service.dart';
import '../../services/firestore_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final PhoneAuthService _authService = PhoneAuthService();
  final FirestoreService _firestoreService = FirestoreService();
  Map<String, dynamic>? _userProfile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final currentUser = _authService.currentUser;
    if (currentUser != null) {
      try {
        final profile = await _firestoreService.getUserProfile(currentUser.uid);
        setState(() {
          _userProfile = profile;
          _isLoading = false;
        });
      } catch (e) {
        debugPrint('Error loading user profile: $e');
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = _authService.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        elevation: 0,
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Header
                  Center(
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 50,
                          backgroundColor: Colors.blueAccent,
                          child: Text(
                            (_userProfile?['displayName'] ?? 'U')
                                .toString()
                                .substring(0, 1)
                                .toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _userProfile?['displayName'] ?? 'User',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          currentUser?.phoneNumber ?? 'No phone number',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // User Info Section
                  Text(
                    'Account Information',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  _buildInfoTile(
                    label: 'Phone Number',
                    value: currentUser?.phoneNumber ?? 'Not available',
                    icon: Icons.phone,
                  ),
                  _buildInfoTile(
                    label: 'Email',
                    value: currentUser?.email ?? 'Not set',
                    icon: Icons.email,
                  ),
                  _buildInfoTile(
                    label: 'User ID',
                    value: currentUser?.uid ?? 'Not available',
                    icon: Icons.badge,
                    valueStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 40),

                  // Actions Section
                  Text(
                    'Actions',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  _buildActionButton(
                    label: 'Edit Profile',
                    icon: Icons.edit,
                    color: Colors.blue,
                    onPressed: () {
                      _showEditProfileDialog();
                    },
                  ),
                  const SizedBox(height: 12),
                  _buildActionButton(
                    label: 'Saved Articles',
                    icon: Icons.bookmark,
                    color: Colors.green,
                    onPressed: () {
                      Navigator.of(context).pushNamed('/bookmarks');
                    },
                  ),
                  const SizedBox(height: 12),
                  _buildActionButton(
                    label: 'Settings',
                    icon: Icons.settings,
                    color: Colors.orange,
                    onPressed: () {
                      Navigator.of(context).pushNamed('/settings');
                    },
                  ),
                  const SizedBox(height: 12),
                  _buildActionButton(
                    label: 'Sign Out',
                    icon: Icons.logout,
                    color: Colors.red,
                    onPressed: () {
                      _showSignOutDialog();
                    },
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoTile({
    required String label,
    required String value,
    required IconData icon,
    TextStyle? valueStyle,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.blueAccent),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: valueStyle ??
                      const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  void _showEditProfileDialog() {
    final nameController = TextEditingController(
      text: _userProfile?['displayName'] ?? '',
    );

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit Profile'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Display Name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final newName = nameController.text.trim();
              if (newName.isNotEmpty) {
                try {
                  await _authService.updateUserProfile(displayName: newName);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                  if (!mounted) return;
                  _loadUserProfile();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Profile updated successfully'),
                      backgroundColor: Colors.green,
                    ),
                  );
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error updating profile: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSignOutDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              try {
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext);
                }
                await _authService.signOut();
                if (!mounted) return;
                Navigator.of(context).pushNamedAndRemoveUntil(
                  '/auth/phone',
                  (route) => false,
                );
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error signing out: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text(
              'Sign Out',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
