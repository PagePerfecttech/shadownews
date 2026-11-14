import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DistrictSelectionScreen extends StatefulWidget {
  final Map<String, dynamic> stateData;

  const DistrictSelectionScreen({
    super.key,
    required this.stateData,
  });

  @override
  State<DistrictSelectionScreen> createState() => _DistrictSelectionScreenState();
}

class _DistrictSelectionScreenState extends State<DistrictSelectionScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _districts = [];
  List<dynamic> _filteredDistricts = [];

  @override
  void initState() {
    super.initState();
    _districts = widget.stateData['districts'] ?? [];
    _filteredDistricts = List.from(_districts);
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
        _filteredDistricts = List.from(_districts);
      } else {
        _filteredDistricts = _districts.where((d) {
          final name = (d['name'] ?? '').toString().toLowerCase();
          return name.contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_rounded,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
          onPressed: () => context.pop(),
        ),
        centerTitle: false,
        title: Text(
          'Select District',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              widget.stateData['name'] ?? '',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search District / జిల్లాను వెతకండి...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFFD32F2F)),
                filled: true,
                fillColor: isDark ? const Color(0xFF2C2C2C) : const Color(0xFFF5F5F5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          if (_filteredDistricts.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.location_off_rounded,
                      size: 56,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No districts found',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: _filteredDistricts.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final district =
                      _filteredDistricts[index] as Map<String, dynamic>;
                  return _DistrictCard(
                    districtName: district['name'] ?? '',
                    onTap: () => _onDistrictSelected(context, district),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _onDistrictSelected(
    BuildContext context,
    Map<String, dynamic> district,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        'selected_state_id', widget.stateData['id']?.toString() ?? '');
    await prefs.setString(
        'selected_state_name', widget.stateData['name']?.toString() ?? '');
    await prefs.setString(
        'selected_district_id', district['id']?.toString() ?? '');
    await prefs.setString(
        'selected_district_name', district['name']?.toString() ?? '');

    final assemblies = district['assemblies'] as List?;
    if (context.mounted) {
      if (assemblies != null && assemblies.isNotEmpty) {
        context.push('/onboarding/assembly', extra: district);
      } else {
        context.push('/onboarding/mandal', extra: district);
      }
    }
  }
}

class _DistrictCard extends StatelessWidget {
  final String districtName;
  final VoidCallback onTap;

  const _DistrictCard({
    required this.districtName,
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
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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
                  districtName,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
