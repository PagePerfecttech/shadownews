import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';

import '../../api/api_client.dart';
import '../../services/location_service.dart';

class StateSelectionScreen extends StatefulWidget {
  const StateSelectionScreen({super.key});

  @override
  State<StateSelectionScreen> createState() => _StateSelectionScreenState();
}

class _StateSelectionScreenState extends State<StateSelectionScreen> {
  List<Map<String, dynamic>> _states = [];
  List<Map<String, dynamic>> _filteredStates = [];
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true;
  bool _isAutoDetecting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkExistingLocation();
    _fetchStates();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final query = _searchController.text.trim().toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredStates = List.from(_states);
      } else {
        _filteredStates = _states.where((s) {
          final name = (s['name'] ?? '').toString().toLowerCase();
          final code = (s['code'] ?? '').toString().toLowerCase();
          return name.contains(query) || code.contains(query);
        }).toList();
      }
    });
  }

  Future<void> _checkExistingLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final mandalId = prefs.getString('selected_mandal_id') ?? prefs.getString('user_mandal_id');
    final districtId = prefs.getString('selected_district_id') ?? prefs.getString('user_district_id');
    if (mandalId != null && mandalId.isNotEmpty && districtId != null && districtId.isNotEmpty) {
      if (mounted) {
        context.go('/feed', extra: {'refresh': true});
      }
    }
  }

  Future<void> _handleAutoDetectLocation() async {
    if (_isAutoDetecting) return;
    setState(() => _isAutoDetecting = true);

    final res = await LocationService.instance.initGPSLocationWithDetails();

    if (mounted) {
      setState(() => _isAutoDetecting = false);
      if (res.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.message),
            backgroundColor: const Color(0xFF388E3C),
          ),
        );
        context.go('/feed', extra: {'refresh': true});
      } else {
        if (res.status == LocationStatus.serviceDisabled) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('GPS ఆన్ చేయండి'),
              content: const Text('ఖచ్చితమైన వార్తలను అందించడానికి దయచేసి మీ ఫోన్ GPS లొకేషన్ ఆన్ చేయండి.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('సరే'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await Geolocator.openLocationSettings();
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)),
                  child: const Text('సెట్టింగ్స్ తెరవండి', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        } else if (res.status == LocationStatus.permissionDeniedForever) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('లొకేషన్ అనుమతి అవసరం'),
              content: const Text('మీ ప్రాంతానికి సంబంధించిన వార్తలను అందించడానికి లొకేషన్ అనుమతి అవసరం. దయచేసి యాప్ సెట్టింగ్స్‌లో అనుమతించండి.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('రద్దు'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await Geolocator.openAppSettings();
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)),
                  child: const Text('యాప్ సెట్టింగ్స్', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res.message),
              backgroundColor: Colors.orange.shade800,
            ),
          );
        }
      }
    }
  }

  Future<void> _fetchStates() async {
    try {
      final response = await ApiClient.instance.get('/locations');
      final List<dynamic> statesData = response.data['states'] ?? [];
      if (mounted) {
        setState(() {
          _states = statesData.cast<Map<String, dynamic>>();
          _filteredStates = List.from(_states);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load states. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        leading: Navigator.of(context).canPop()
            ? IconButton(
                icon: const Icon(
                  Icons.arrow_back_rounded,
                  color: Color(0xFF1A1A1A),
                ),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        centerTitle: false,
        title: Text(
          'Select Your State',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: Color(0xFFD32F2F),
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline_rounded,
                size: 56,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _fetchStates();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD32F2F),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 14,
                  ),
                ),
                child: Text(
                  'Retry',
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search State / రాష్ట్రాన్ని వెతకండి...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFFD32F2F)),
              filled: true,
              fillColor: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF2C2C2C)
                  : const Color(0xFFF5F5F5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            itemCount: _filteredStates.length + 1,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              if (index == 0) {
                return _AutoDetectCard(
                  isDetecting: _isAutoDetecting,
                  onTap: _handleAutoDetectLocation,
                );
              }
              final state = _filteredStates[index - 1];
              return _StateCard(
                stateName: state['name'] ?? '',
                onTap: () {
                  context.push('/onboarding/district', extra: state);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AutoDetectCard extends StatelessWidget {
  final bool isDetecting;
  final VoidCallback onTap;

  const _AutoDetectCard({
    required this.isDetecting,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFFFF5F5),
      borderRadius: BorderRadius.circular(12),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFFEF5350).withValues(alpha: 0.4),
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              if (isDetecting) ...[
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFD32F2F),
                  ),
                ),
              ] else ...[
                const Icon(
                  Icons.my_location_rounded,
                  size: 22,
                  color: Color(0xFFD32F2F),
                ),
              ],
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isDetecting ? 'Detecting Location...' : 'Use Current Location',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFD32F2F),
                      ),
                    ),
                    Text(
                      'Auto-detect State, District & Mandal via GPS',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: Color(0xFFD32F2F),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StateCard extends StatelessWidget {
  final String stateName;
  final VoidCallback onTap;

  const _StateCard({
    required this.stateName,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark ? const Color(0xFF262626) : Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 1.5,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  stateName,
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 18,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
