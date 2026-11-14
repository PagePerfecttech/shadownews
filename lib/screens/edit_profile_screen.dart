import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import '../api/api_client.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();

  String? _avatarUrl;
  File? _localAvatarFile;
  String _phone = '';
  String _preferredLanguage = 'te';
  String? _gender;
  DateTime? _dob;

  // Locations
  List<dynamic> _states = [];
  List<dynamic> _districts = [];
  List<dynamic> _mandals = [];

  String? _selectedStateId;
  String? _selectedDistrictId;
  String? _selectedMandalId;

  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    setState(() => _loading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      _phone = user?.phoneNumber ?? '';

      // 1. Fetch locations
      final locRes = await apiClient.get('/locations');
      if (locRes.data != null && locRes.data['states'] != null) {
        _states = locRes.data['states'] as List<dynamic>;
      }

      // 2. Fetch User Profile
      final profileRes = await apiClient.get('/user/profile');
      if (profileRes.data != null && profileRes.data['user'] != null) {
        final u = profileRes.data['user'];
        _nameController.text = u['name'] ?? user?.displayName ?? '';
        _emailController.text = u['email'] ?? user?.email ?? '';
        _avatarUrl = u['avatar'] ?? user?.photoURL;
        _preferredLanguage = u['preferredLanguage'] ?? 'te';
        _gender = u['gender'];
        if (u['dob'] != null) {
          _dob = DateTime.tryParse(u['dob'].toString());
        }

        _selectedStateId = u['stateId'];
        _selectedDistrictId = u['districtId'];
        _selectedMandalId = u['mandalId'];

        _filterDistrictsAndMandals();
      }
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _filterDistrictsAndMandals() {
    if (_selectedStateId != null && _states.isNotEmpty) {
      final stateObj = _states.firstWhere(
        (s) => s['id'] == _selectedStateId,
        orElse: () => null,
      );
      if (stateObj != null && stateObj['districts'] != null) {
        _districts = stateObj['districts'] as List<dynamic>;
      } else {
        _districts = [];
      }
    } else {
      _districts = [];
    }

    if (_selectedDistrictId != null && _districts.isNotEmpty) {
      final distObj = _districts.firstWhere(
        (d) => d['id'] == _selectedDistrictId,
        orElse: () => null,
      );
      if (distObj != null && distObj['mandals'] != null) {
        _mandals = distObj['mandals'] as List<dynamic>;
      } else {
        _mandals = [];
      }
    } else {
      _mandals = [];
    }
  }

  Future<void> _pickAvatar(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(source: source, imageQuality: 85);
      if (picked == null) return;

      // Crop image to 1:1 circle/square
      final cropped = await ImageCropper().cropImage(
        sourcePath: picked.path,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Profile Photo',
            toolbarColor: const Color(0xFFB71C1C),
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
          ),
          IOSUiSettings(
            title: 'Crop Profile Photo',
            aspectRatioLockEnabled: true,
          ),
        ],
      );

      if (cropped != null) {
        setState(() {
          _localAvatarFile = File(cropped.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e')),
        );
      }
    }
  }

  void _showAvatarOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Change Profile Photo',
                style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: Color(0xFFB71C1C)),
                title: Text('Take a Photo', style: GoogleFonts.poppins()),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAvatar(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Color(0xFFB71C1C)),
                title: Text('Choose from Gallery', style: GoogleFonts.poppins()),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAvatar(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<String?> _uploadAvatar(File file) async {
    try {
      final fileName = file.path.split(Platform.pathSeparator).last;
      final ext = fileName.split('.').last.toLowerCase();
      final contentType = ext == 'png' ? 'image/png' : (ext == 'webp' ? 'image/webp' : 'image/jpeg');

      final presignRes = await apiClient.post('/user/avatar-upload-url', data: {
        'filename': fileName,
        'contentType': contentType,
      });

      if (presignRes.data != null && presignRes.data['uploadUrl'] != null) {
        final uploadUrl = presignRes.data['uploadUrl'] as String;
        final publicUrl = presignRes.data['publicUrl'] as String;

        final fileLength = await file.length();
        final uploadDio = Dio();
        await uploadDio.put(
          uploadUrl,
          data: file.openRead(),
          options: Options(
            headers: {
              'Content-Type': contentType,
              'Content-Length': fileLength,
            },
          ),
        );
        return publicUrl;
      }
    } catch (e) {
      debugPrint('Avatar direct upload failed: $e');
    }
    return null;
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      String? finalAvatarUrl = _avatarUrl;
      if (_localAvatarFile != null) {
        final uploaded = await _uploadAvatar(_localAvatarFile!);
        if (uploaded != null) {
          finalAvatarUrl = uploaded;
        }
      }

      final payload = {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'avatar': finalAvatarUrl,
        'preferredLanguage': _preferredLanguage,
        'gender': _gender,
        'dob': _dob?.toIso8601String(),
        'stateId': _selectedStateId,
        'districtId': _selectedDistrictId,
        'mandalId': _selectedMandalId,
      };

      final res = await apiClient.post('/user/profile', data: payload);
      if (res.data != null && res.data['success'] == true) {
        // Also update Firebase profile if available
        try {
          await FirebaseAuth.instance.currentUser?.updateDisplayName(_nameController.text.trim());
          if (finalAvatarUrl != null) {
            await FirebaseAuth.instance.currentUser?.updatePhotoURL(finalAvatarUrl);
          }
        } catch (_) {}

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది (Profile updated successfully)'),
              backgroundColor: Colors.green,
            ),
          );
          context.pop();
        }
      } else {
        throw Exception(res.data?['error'] ?? 'Update failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile: $e'), backgroundColor: Colors.red),
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
          'Edit Profile',
          style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Avatar Picker
                    Center(
                      child: Stack(
                        children: [
                          Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: primaryColor, width: 2.5),
                              color: Colors.grey.shade200,
                            ),
                            child: ClipOval(
                              child: _localAvatarFile != null
                                  ? Image.file(_localAvatarFile!, fit: BoxFit.cover)
                                  : (_avatarUrl != null && _avatarUrl!.isNotEmpty
                                      ? CachedNetworkImage(
                                          imageUrl: _avatarUrl!,
                                          fit: BoxFit.cover,
                                          errorWidget: (context, url, error) =>
                                              const Icon(Icons.person, size: 50, color: Colors.grey),
                                        )
                                      : const Icon(Icons.person, size: 50, color: Colors.grey)),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: _showAvatarOptions,
                              child: Container(
                                padding: const EdgeInsets.all(7),
                                decoration: const BoxDecoration(
                                  color: primaryColor,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tap to change photo',
                      style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600),
                    ),

                    const SizedBox(height: 24),

                    // Card container for form inputs
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Name
                          _buildLabel('Full Name *'),
                          TextFormField(
                            controller: _nameController,
                            style: GoogleFonts.poppins(fontSize: 14),
                            decoration: _inputDecoration('Enter your full name', Icons.person_outline),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter your name' : null,
                          ),

                          const SizedBox(height: 16),

                          // Phone (Read-Only)
                          _buildLabel('Phone Number'),
                          TextFormField(
                            initialValue: _phone.isNotEmpty ? _phone : 'Not verified',
                            readOnly: true,
                            enabled: false,
                            style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey.shade700),
                            decoration: _inputDecoration('Phone number', Icons.phone_outlined),
                          ),

                          const SizedBox(height: 16),

                          // Email
                          _buildLabel('Email Address (Optional)'),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            style: GoogleFonts.poppins(fontSize: 14),
                            decoration: _inputDecoration('name@example.com', Icons.email_outlined),
                            validator: (v) {
                              if (v != null && v.trim().isNotEmpty) {
                                final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                                if (!emailRegex.hasMatch(v.trim())) {
                                  return 'Enter a valid email address';
                                }
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          // Preferred Language
                          _buildLabel('Preferred Language / ప్రాధాన్యత భాష'),
                          DropdownButtonFormField<String>(
                            initialValue: _preferredLanguage,
                            decoration: _inputDecoration('Language', Icons.language_outlined),
                            items: [
                              DropdownMenuItem(
                                value: 'te',
                                child: Text('తెలుగు (Telugu)', style: GoogleFonts.poppins(fontSize: 14)),
                              ),
                              DropdownMenuItem(
                                value: 'en',
                                child: Text('English', style: GoogleFonts.poppins(fontSize: 14)),
                              ),
                            ],
                            onChanged: (v) => setState(() => _preferredLanguage = v ?? 'te'),
                          ),

                          const SizedBox(height: 16),

                          // Gender & DOB Row
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildLabel('Gender'),
                                    DropdownButtonFormField<String>(
                                      initialValue: _gender,
                                      decoration: _inputDecoration('Gender', Icons.wc_outlined),
                                      hint: Text('Select', style: GoogleFonts.poppins(fontSize: 13)),
                                      items: [
                                        DropdownMenuItem(
                                          value: 'male',
                                          child: Text('Male', style: GoogleFonts.poppins(fontSize: 13)),
                                        ),
                                        DropdownMenuItem(
                                          value: 'female',
                                          child: Text('Female', style: GoogleFonts.poppins(fontSize: 13)),
                                        ),
                                        DropdownMenuItem(
                                          value: 'other',
                                          child: Text('Other', style: GoogleFonts.poppins(fontSize: 13)),
                                        ),
                                      ],
                                      onChanged: (v) => setState(() => _gender = v),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildLabel('Date of Birth'),
                                    InkWell(
                                      onTap: () async {
                                        final picked = await showDatePicker(
                                          context: context,
                                          initialDate: _dob ?? DateTime(2000, 1, 1),
                                          firstDate: DateTime(1940),
                                          lastDate: DateTime.now(),
                                        );
                                        if (picked != null) {
                                          setState(() => _dob = picked);
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 15),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: Colors.grey.shade300),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                                            const SizedBox(width: 8),
                                            Text(
                                              _dob != null ? DateFormat('dd/MM/yyyy').format(_dob!) : 'DD/MM/YYYY',
                                              style: GoogleFonts.poppins(
                                                fontSize: 13,
                                                color: _dob != null ? Colors.black : Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),
                          const Divider(),
                          const SizedBox(height: 12),

                          // Location Preferences
                          Text(
                            'Preferred Location (నా ప్రాంతం)',
                            style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'News from your preferred mandal and district will be prioritized.',
                            style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 16),

                          // State Dropdown
                          _buildLabel('State (రాష్ట్రం)'),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedStateId,
                            decoration: _inputDecoration('Select State', Icons.map_outlined),
                            items: _states.map<DropdownMenuItem<String>>((s) {
                              return DropdownMenuItem<String>(
                                value: s['id'].toString(),
                                child: Text(s['name'] ?? '', style: GoogleFonts.poppins(fontSize: 13)),
                              );
                            }).toList(),
                            onChanged: (v) {
                              setState(() {
                                _selectedStateId = v;
                                _selectedDistrictId = null;
                                _selectedMandalId = null;
                                _filterDistrictsAndMandals();
                              });
                            },
                          ),

                          const SizedBox(height: 14),

                          // District Dropdown
                          _buildLabel('District (జిల్లా)'),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedDistrictId,
                            decoration: _inputDecoration('Select District', Icons.location_city_outlined),
                            items: _districts.map<DropdownMenuItem<String>>((d) {
                              return DropdownMenuItem<String>(
                                value: d['id'].toString(),
                                child: Text(d['name'] ?? '', style: GoogleFonts.poppins(fontSize: 13)),
                              );
                            }).toList(),
                            onChanged: (v) {
                              setState(() {
                                _selectedDistrictId = v;
                                _selectedMandalId = null;
                                _filterDistrictsAndMandals();
                              });
                            },
                          ),

                          const SizedBox(height: 14),

                          // Mandal Dropdown
                          _buildLabel('Mandal (మండలం)'),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedMandalId,
                            decoration: _inputDecoration('Select Mandal', Icons.pin_drop_outlined),
                            items: _mandals.map<DropdownMenuItem<String>>((m) {
                              return DropdownMenuItem<String>(
                                value: m['id'].toString(),
                                child: Text(m['name'] ?? '', style: GoogleFonts.poppins(fontSize: 13)),
                              );
                            }).toList(),
                            onChanged: (v) => setState(() => _selectedMandalId = v),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        onPressed: _saving ? null : _saveProfile,
                        child: _saving
                            ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                            : Text(
                                'Save Profile (భద్రపరచు)',
                                style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                              ),
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Text(
        text,
        style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.grey.shade800),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, size: 20, color: Colors.grey.shade500),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFB71C1C), width: 1.5),
      ),
    );
  }
}

