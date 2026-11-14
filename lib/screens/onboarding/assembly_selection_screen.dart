import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AssemblySelectionScreen extends StatelessWidget {
  final Map<String, dynamic> districtData;

  const AssemblySelectionScreen({
    super.key,
    required this.districtData,
  });

  @override
  Widget build(BuildContext context) {
    final List<dynamic> assemblies = districtData['assemblies'] ?? [];

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
          'Select Assembly',
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
              districtData['name'] ?? '',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          if (assemblies.isEmpty)
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
                      'No assembly constituencies found',
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
                itemCount: assemblies.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final assembly =
                      assemblies[index] as Map<String, dynamic>;
                  return _AssemblyCard(
                    assemblyName: assembly['name'] ?? '',
                    onTap: () => _onAssemblySelected(context, assembly),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _onAssemblySelected(
    BuildContext context,
    Map<String, dynamic> assembly,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        'selected_assembly_id', assembly['id']?.toString() ?? '');
    await prefs.setString(
        'selected_assembly_name', assembly['name']?.toString() ?? '');

    if (context.mounted) {
      context.push('/onboarding/mandal', extra: assembly);
    }
  }
}

class _AssemblyCard extends StatelessWidget {
  final String assemblyName;
  final VoidCallback onTap;

  const _AssemblyCard({
    required this.assemblyName,
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
                  assemblyName,
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
