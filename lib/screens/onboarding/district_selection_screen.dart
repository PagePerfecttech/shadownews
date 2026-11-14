import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DistrictSelectionScreen extends StatelessWidget {
  final Map<String, dynamic> stateData;

  const DistrictSelectionScreen({
    super.key,
    required this.stateData,
  });

  @override
  Widget build(BuildContext context) {
    final List<dynamic> districts = stateData['districts'] ?? [];

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: Color(0xFF1A1A1A),
          ),
          onPressed: () => context.pop(),
        ),
        centerTitle: false,
        title: Text(
          'Select District',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1A1A1A),
          ),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              stateData['name'] ?? '',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          if (districts.isEmpty)
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
                itemCount: districts.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final district =
                      districts[index] as Map<String, dynamic>;
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
        'selected_state_id', stateData['id']?.toString() ?? '');
    await prefs.setString(
        'selected_state_name', stateData['name']?.toString() ?? '');
    await prefs.setString(
        'selected_district_id', district['id']?.toString() ?? '');
    await prefs.setString(
        'selected_district_name', district['name']?.toString() ?? '');

    if (context.mounted) {
      context.push('/onboarding/assembly', extra: district);
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
    return Material(
      color: Colors.white,
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
              color: Colors.grey.shade100,
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
                    color: const Color(0xFF1A1A1A),
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
