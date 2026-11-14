import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../api/api_client.dart';

class VillageSelectionScreen extends StatefulWidget {
  final Map<String, dynamic> mandalData;

  const VillageSelectionScreen({
    super.key,
    required this.mandalData,
  });

  @override
  State<VillageSelectionScreen> createState() => _VillageSelectionScreenState();
}

class _VillageSelectionScreenState extends State<VillageSelectionScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _villages = [];
  List<dynamic> _filteredVillages = [];

  @override
  void initState() {
    super.initState();
    _villages = widget.mandalData['villages'] ?? [];
    _filteredVillages = List.from(_villages);
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
        _filteredVillages = List.from(_villages);
      } else {
        _filteredVillages = _villages.where((v) {
          final name = (v['name'] ?? '').toString().toLowerCase();
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
          'Select Village / Town',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => _finishOnboarding(null),
            child: Text(
              'Skip',
              style: GoogleFonts.poppins(
                color: const Color(0xFFD32F2F),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              widget.mandalData['name'] ?? '',
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
                hintText: 'Search Village / గ్రామాన్ని వెతకండి...',
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
          if (_filteredVillages.isEmpty)
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
                      'No specific towns/villages listed',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () => _finishOnboarding(null),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD32F2F),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Complete Onboarding'),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: _filteredVillages.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final village =
                      _filteredVillages[index] as Map<String, dynamic>;
                  return _VillageCard(
                    villageName: village['name'] ?? '',
                    onTap: () => _finishOnboarding(village),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _finishOnboarding(Map<String, dynamic>? village) async {
    final prefs = await SharedPreferences.getInstance();

    if (village != null) {
      await prefs.setString(
          'selected_village_id', village['id']?.toString() ?? '');
      await prefs.setString(
          'selected_village_name', village['name']?.toString() ?? '');
    }

    final isGuest = prefs.getBool('is_guest') ?? false;
    if (!isGuest) {
      try {
        await ApiClient.instance.post(
          '/user/profile',
          data: {
            'stateId': prefs.getString('selected_state_id'),
            'districtId': prefs.getString('selected_district_id'),
            'assemblyId': prefs.getString('selected_assembly_id'),
            'mandalId': prefs.getString('selected_mandal_id'),
            'villageId': village?['id']?.toString(),
          },
        );
      } catch (e) {
        debugPrint('Failed to save profile: $e');
      }
    }

    if (mounted) {
      context.go('/feed', extra: {'refresh': true});
    }
  }
}

class _VillageCard extends StatelessWidget {
  final String villageName;
  final VoidCallback onTap;

  const _VillageCard({
    required this.villageName,
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
                  villageName,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                  ),
                ),
              ),
              Icon(
                Icons.check_circle_outline_rounded,
                size: 18,
                color: const Color(0xFFD32F2F),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
