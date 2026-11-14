import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';

class ReporterApplyScreen extends StatefulWidget {
  const ReporterApplyScreen({super.key});

  @override
  State<ReporterApplyScreen> createState() => _ReporterApplyScreenState();
}

class _ReporterApplyScreenState extends State<ReporterApplyScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _bioController = TextEditingController();

  bool _isSubmitting = false;
  File? _idProofImage;
  File? _profilePicImage;

  List<dynamic> _states = [];
  bool _isLoadingLocations = true;
  String? _selectedStateId;
  String? _selectedDistrictId;
  String? _selectedMandalId;

  @override
  void initState() {
    super.initState();
    _fetchLocations();
  }

  Future<void> _fetchLocations() async {
    try {
      final response = await apiClient.get('/locations');
      final statesData = response.data['states'] ?? [];
      setState(() {
        _states = statesData;
        _isLoadingLocations = false;
      });
    } catch (e) {
      setState(() => _isLoadingLocations = false);
    }
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 70,
    );
    if (pickedFile != null) {
      setState(() {
        _profilePicImage = File(pickedFile.path);
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 70,
    );
    if (pickedFile != null) {
      setState(() {
        _idProofImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _apply() async {
    if (_nameController.text.trim().isEmpty ||
        _idProofImage == null ||
        _profilePicImage == null ||
        _phoneController.text.trim().isEmpty ||
        _selectedStateId == null ||
        _selectedDistrictId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'All fields including Profile Picture, Location, and ID Proof are required',
          ),
          backgroundColor: Color(0xFFD32F2F),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final idBytes = await _idProofImage!.readAsBytes();
      final base64IdImage = 'data:image/jpeg;base64,${base64Encode(idBytes)}';

      final profileBytes = await _profilePicImage!.readAsBytes();
      final base64ProfileImage =
          'data:image/jpeg;base64,${base64Encode(profileBytes)}';

      final cleanEmail = _emailController.text.trim();
      final cleanBio = _bioController.text.trim();
      final cleanMandal = (_selectedMandalId != null && _selectedMandalId!.isNotEmpty) ? _selectedMandalId : null;

      final response = await apiClient.post(
        '/reporter/apply',
        data: {
          'name': _nameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'email': cleanEmail.isNotEmpty ? cleanEmail : null,
          'bio': cleanBio.isNotEmpty ? cleanBio : null,
          'stateId': _selectedStateId,
          'districtId': _selectedDistrictId,
          'mandalId': cleanMandal,
          'beat': 'general',
          'idProofUrl': base64IdImage,
          'avatar': base64ProfileImage,
        },
      );

      final successMsg = response.data?['message']?.toString() ??
          'మీ దరఖాస్తు విజయవంతంగా సమర్పించబడింది (Application submitted successfully!)';

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(successMsg),
            backgroundColor: Colors.green,
          ),
        );
        context.pop(true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = ApiClient.extractErrorMessage(
          e,
          fallback: 'దరఖాస్తు సమర్పించడం విఫలమైంది. దయచేసి వివరాలను పరిశీలించి మళ్లీ ప్రయత్నించండి.',
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: const Color(0xFFD32F2F),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Become a Reporter',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Reporter Details',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: GestureDetector(
                onTap: _pickProfileImage,
                child: CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.grey.shade300,
                  backgroundImage: _profilePicImage != null
                      ? FileImage(_profilePicImage!)
                      : null,
                  child: _profilePicImage == null
                      ? Icon(
                          Icons.camera_alt,
                          size: 40,
                          color: Colors.grey.shade600,
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                'Profile Picture',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'పూర్తి పేరు (Full Name)',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'ఫోన్ నంబర్ (Phone Number)',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'ఈమెయిల్ (Email Address)',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _bioController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'వివరాలు / అనుభవం (Bio / Experience)',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            if (_isLoadingLocations)
              const Center(child: CircularProgressIndicator())
            else ...[
              DropdownButtonFormField<String>(
                initialValue: _selectedStateId,
                decoration: const InputDecoration(
                  labelText: 'Select State / రాష్ట్రం',
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: _states.map<DropdownMenuItem<String>>((state) {
                  return DropdownMenuItem<String>(
                    value: state['id'].toString(),
                    child: Text(state['name']),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedStateId = value;
                    _selectedDistrictId = null; // Reset district
                    _selectedMandalId = null; // Reset mandal
                  });
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedDistrictId,
                decoration: const InputDecoration(
                  labelText: 'Select District / జిల్లా',
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: (_selectedStateId != null)
                    ? ((_states.firstWhere(
                                (s) => s['id'].toString() == _selectedStateId,
                                orElse: () => {'districts': []},
                              )['districts'] ??
                              []) as List)
                          .map<DropdownMenuItem<String>>((district) {
                            return DropdownMenuItem<String>(
                              value: district['id'].toString(),
                              child: Text(district['name']),
                            );
                          })
                          .toList()
                    : [],
                onChanged: _selectedStateId == null
                    ? null
                    : (value) {
                        setState(() {
                          _selectedDistrictId = value;
                          _selectedMandalId = null; // Reset mandal
                        });
                      },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedMandalId,
                decoration: const InputDecoration(
                  labelText: 'Select Mandal / మండలం (Optional)',
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: (_selectedStateId != null && _selectedDistrictId != null)
                    ? (((_states.firstWhere(
                                      (s) => s['id'].toString() == _selectedStateId,
                                      orElse: () => {'districts': []},
                                    )['districts'] as List? ??
                                    [])
                                .firstWhere(
                                  (d) => d['id'].toString() == _selectedDistrictId,
                                  orElse: () => {'mandals': []},
                                )['mandals'] ??
                            []) as List)
                        .map<DropdownMenuItem<String>>((mandal) {
                          return DropdownMenuItem<String>(
                            value: mandal['id'].toString(),
                            child: Text(mandal['name']),
                          );
                        })
                        .toList()
                    : [],
                onChanged: _selectedDistrictId == null
                    ? null
                    : (value) {
                        setState(() {
                          _selectedMandalId = value;
                        });
                      },
              ),
            ],
            const SizedBox(height: 24),
            Text(
              'గుర్తింపు కార్డు అప్‌లోడ్ (Aadhaar / PAN)',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                height: 160,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300, width: 2),
                  image: _idProofImage != null
                      ? DecorationImage(
                          image: FileImage(_idProofImage!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                child: _idProofImage == null
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.upload_file,
                            size: 48,
                            color: Colors.grey.shade400,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'ఫోటోను అప్‌లోడ్ చేయడానికి తాకండి',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD32F2F),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _isSubmitting ? null : _apply,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'Submit Application',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
