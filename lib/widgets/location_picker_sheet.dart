import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../api/api_client.dart';
import '../services/location_service.dart';

class LocationPickerSheet extends StatefulWidget {
  const LocationPickerSheet({super.key});

  @override
  State<LocationPickerSheet> createState() => _LocationPickerSheetState();
}

class _LocationPickerSheetState extends State<LocationPickerSheet> {
  List<dynamic> _states = [];
  bool _isLoading = true;
  bool _isAutoDetecting = false;

  Map<String, dynamic>? _selectedState;
  Map<String, dynamic>? _selectedDistrict;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchLocations();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLocations() async {
    try {
      final response = await apiClient.get('/locations');
      final statesData = response.data['states'] ?? [];
      setState(() {
        _states = statesData;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleAutoDetectGPS() async {
    setState(() => _isAutoDetecting = true);
    final success = await LocationService.instance.initGPSLocation();
    if (mounted) {
      setState(() => _isAutoDetecting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('📍 Location updated automatically via GPS!'),
            backgroundColor: Color(0xFF388E3C),
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not auto-detect GPS. Please select your location manually below.'),
          ),
        );
      }
    }
  }

  Future<void> _selectMandal(
    Map<String, dynamic> state,
    Map<String, dynamic> district,
    Map<String, dynamic>? assembly,
    Map<String, dynamic> mandal,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    
    final oldStateId = prefs.getString('selected_state_id');
    final newStateId = state['id']?.toString() ?? '';
    final oldDistrictId = prefs.getString('selected_district_id');
    final newDistrictId = district['id']?.toString() ?? '';
    
    if (oldStateId != null && oldStateId.isNotEmpty && oldStateId != newStateId) {
      try {
        await FirebaseMessaging.instance.unsubscribeFromTopic('state_$oldStateId');
      } catch (_) {}
    }

    if (newStateId.isNotEmpty) {
      try {
        await FirebaseMessaging.instance.subscribeToTopic('state_$newStateId');
      } catch (_) {}
    }

    if (oldDistrictId != null && oldDistrictId.isNotEmpty && oldDistrictId != newDistrictId) {
      try {
        await FirebaseMessaging.instance.unsubscribeFromTopic('district_$oldDistrictId');
      } catch (_) {}
    }
    
    if (newDistrictId.isNotEmpty) {
      try {
        await FirebaseMessaging.instance.subscribeToTopic('district_$newDistrictId');
      } catch (_) {}
    }

    await prefs.setString('selected_state_id', newStateId);
    await prefs.setString('selected_state_name', state['name']?.toString() ?? '');
    await prefs.setString('selected_district_id', newDistrictId);
    await prefs.setString('selected_district_name', district['name']?.toString() ?? '');
    if (assembly != null) {
      await prefs.setString('selected_assembly_id', assembly['id']?.toString() ?? '');
      await prefs.setString('selected_assembly_name', assembly['name']?.toString() ?? '');
    }
    await prefs.setString('selected_mandal_id', mandal['id']?.toString() ?? '');
    await prefs.setString('selected_mandal_name', mandal['name']?.toString() ?? '');

    final isGuest = prefs.getBool('is_guest') ?? false;
    if (!isGuest) {
      try {
        await apiClient.post(
          '/user/profile',
          data: {
            'stateId': newStateId,
            'districtId': newDistrictId,
            'assemblyId': assembly?['id']?.toString(),
            'mandalId': mandal['id']?.toString(),
          },
        );
      } catch (e) {
        debugPrint('Error updating profile: $e');
      }
    }

    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  List<dynamic> _getDistrictMandals(Map<dynamic, dynamic> district) {
    final directMandals = district['mandals'];
    if (directMandals is List && directMandals.isNotEmpty) {
      return directMandals;
    }
    final assemblies = district['assemblies'];
    if (assemblies is List) {
      final List<dynamic> combined = [];
      final Set<String> added = {};
      for (var a in assemblies) {
        final mList = a['mandals'];
        if (mList is List) {
          for (var m in mList) {
            final key = m['id']?.toString() ?? m['name']?.toString() ?? '';
            if (key.isNotEmpty && !added.contains(key)) {
              added.add(key);
              combined.add(m);
            }
          }
        }
      }
      return combined;
    }
    return [];
  }

  // Get search matches across all locations
  List<Map<String, dynamic>> _getSearchResults() {
    if (_searchQuery.trim().isEmpty) return [];
    final query = _searchQuery.trim().toLowerCase();
    final List<Map<String, dynamic>> results = [];

    for (var s in _states) {
      final districts = s['districts'] ?? [];
      for (var d in districts) {
        final mandals = _getDistrictMandals(d);

        for (var m in mandals) {
          final mName = m['name']?.toString() ?? '';
          final dName = d['name']?.toString() ?? '';
          final sName = s['name']?.toString() ?? '';
          
          if (mName.toLowerCase().contains(query) ||
              dName.toLowerCase().contains(query) ||
              sName.toLowerCase().contains(query)) {
            results.add({
              'state': s,
              'district': d,
              'mandal': m,
              'assembly': null,
            });
          }
        }
      }
    }
    return results;
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, controller) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag Indicator
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Title & Close Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Select Location',
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1A1A1A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.grey),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Auto-Detect GPS Button Pill
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: InkWell(
                  onTap: _isAutoDetecting ? null : _handleAutoDetectGPS,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFFCDD2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _isAutoDetecting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFD32F2F)),
                              )
                            : const Icon(Icons.my_location_rounded, color: Color(0xFFD32F2F), size: 20),
                        const SizedBox(width: 10),
                        Text(
                          _isAutoDetecting ? 'Detecting GPS location...' : 'Auto-Detect My Location (GPS)',
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFFD32F2F),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Instant Search Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search State, District or Mandal...',
                    hintStyle: GoogleFonts.poppins(fontSize: 14, color: Colors.grey[400]),
                    prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFD32F2F)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),

              // Breadcrumb Navigation Chips (if not searching)
              if (_searchQuery.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        // State Chip
                        FilterChip(
                          label: Text(_selectedState == null ? 'Select State' : _selectedState!['name']),
                          selected: _selectedState != null,
                          onSelected: (_) {
                            setState(() {
                              _selectedState = null;
                              _selectedDistrict = null;
                            });
                          },
                          selectedColor: const Color(0xFFFFEBEE),
                          checkmarkColor: const Color(0xFFD32F2F),
                          labelStyle: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: _selectedState != null ? const Color(0xFFD32F2F) : Colors.black87,
                          ),
                        ),
                        if (_selectedState != null) ...[
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6),
                            child: Icon(Icons.chevron_right_rounded, size: 18, color: Colors.grey),
                          ),
                          // District Chip
                          FilterChip(
                            label: Text(_selectedDistrict == null ? 'Select District' : _selectedDistrict!['name']),
                            selected: _selectedDistrict != null,
                            onSelected: (_) {
                              setState(() {
                                _selectedDistrict = null;
                              });
                            },
                            selectedColor: const Color(0xFFFFEBEE),
                            checkmarkColor: const Color(0xFFD32F2F),
                            labelStyle: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: _selectedDistrict != null ? const Color(0xFFD32F2F) : Colors.black87,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

              const Divider(height: 16),

              // Main Content Area
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)))
                    : _searchQuery.isNotEmpty
                        ? _buildSearchListView(controller)
                        : _buildStepListView(controller),
              ),
            ],
          ),
        );
      },
    );
  }

  // Render search results directly
  Widget _buildSearchListView(ScrollController controller) {
    final searchResults = _getSearchResults();

    if (searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_off_rounded, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              'No locations matching "$_searchQuery"',
              style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: controller,
      itemCount: searchResults.length,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        final item = searchResults[index];
        final state = item['state'];
        final district = item['district'];
        final mandal = item['mandal'];

        return Card(
          elevation: 0.5,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFFFEBEE),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.location_on_rounded, color: Color(0xFFD32F2F), size: 20),
            ),
            title: Text(
              mandal['name'] ?? '',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15),
            ),
            subtitle: Text(
              '${district['name']} District, ${state['name']}',
              style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600]),
            ),
            onTap: () => _selectMandal(state, district, null, mandal),
          ),
        );
      },
    );
  }

  // Render Step-by-Step selection (State -> District -> Mandal)
  Widget _buildStepListView(ScrollController controller) {
    // Step 1: Select State
    if (_selectedState == null) {
      return ListView.builder(
        controller: controller,
        itemCount: _states.length,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemBuilder: (context, index) {
          final state = _states[index];
          final districts = state['districts'] ?? [];

          return Card(
            elevation: 0.5,
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.map_rounded, color: Color(0xFFD32F2F), size: 22),
              ),
              title: Text(
                state['name'] ?? '',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 16),
              ),
              subtitle: Text(
                '${districts.length} Districts',
                style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600]),
              ),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
              onTap: () {
                setState(() {
                  _selectedState = state;
                });
              },
            ),
          );
        },
      );
    }

    // Step 2: Select District
    if (_selectedDistrict == null) {
      final List<dynamic> districts = _selectedState!['districts'] ?? [];

      return ListView.builder(
        controller: controller,
        itemCount: districts.length,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemBuilder: (context, index) {
          final district = districts[index];
          final mandals = _getDistrictMandals(district);

          return Card(
            elevation: 0.5,
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.location_city_rounded, color: Color(0xFFD32F2F), size: 20),
              ),
              title: Text(
                district['name'] ?? '',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              subtitle: Text(
                '${mandals.length} Mandals',
                style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600]),
              ),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
              onTap: () {
                setState(() {
                  _selectedDistrict = district;
                });
              },
            ),
          );
        },
      );
    }

    // Step 3: Select Mandal
    final List<dynamic> mandals = _getDistrictMandals(_selectedDistrict!);

    return ListView.builder(
      controller: controller,
      itemCount: mandals.length,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        final mandal = mandals[index];

        return Card(
          elevation: 0.5,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.place_rounded, color: Color(0xFFD32F2F), size: 20),
            ),
            title: Text(
              mandal['name'] ?? '',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15),
            ),
            subtitle: Text(
              '${_selectedDistrict!['name']} District',
              style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600]),
            ),
            onTap: () => _selectMandal(_selectedState!, _selectedDistrict!, null, mandal),
          ),
        );
      },
    );
  }
}
