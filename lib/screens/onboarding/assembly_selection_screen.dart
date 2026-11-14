import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AssemblySelectionScreen extends StatefulWidget {
  final Map<String, dynamic> districtData;

  const AssemblySelectionScreen({
    super.key,
    required this.districtData,
  });

  @override
  State<AssemblySelectionScreen> createState() => _AssemblySelectionScreenState();
}

class _AssemblySelectionScreenState extends State<AssemblySelectionScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _assemblies = [];
  List<dynamic> _filteredAssemblies = [];

  @override
  void initState() {
    super.initState();
    _assemblies = widget.districtData['assemblies'] ?? [];
    _filteredAssemblies = List.from(_assemblies);
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
        _filteredAssemblies = List.from(_assemblies);
      } else {
        _filteredAssemblies = _assemblies.where((a) {
          final name = (a['name'] ?? '').toString().toLowerCase();
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
          'Select Assembly',
          style: GoogleFonts.poppins(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => context.go('/feed', extra: {'refresh': true}),
            child: Text(
              'Skip (స్కిప్)',
              style: GoogleFonts.poppins(
                color: const Color(0xFFD32F2F),
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(
              widget.districtData['name'] ?? '',
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
                hintText: 'Search Assembly / నియోజకవర్గాన్ని వెతకండి...',
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
          if (_filteredAssemblies.isEmpty)
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
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        context.push('/onboarding/mandal', extra: widget.districtData);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD32F2F),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Continue to Mandals'),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: _filteredAssemblies.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final assembly =
                      _filteredAssemblies[index] as Map<String, dynamic>;
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

    // Fallback: If assembly has no mandals, use district's mandals
    final assemblyMandals = assembly['mandals'] as List?;
    if ((assemblyMandals == null || assemblyMandals.isEmpty) && widget.districtData['mandals'] != null) {
      assembly['mandals'] = widget.districtData['mandals'];
    }

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
                  assemblyName,
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
