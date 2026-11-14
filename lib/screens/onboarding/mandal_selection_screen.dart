import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../../api/api_client.dart';

class MandalSelectionScreen extends StatelessWidget {
  final Map<String, dynamic> districtData;

  const MandalSelectionScreen({
    super.key,
    required this.districtData,
  });

  @override
  Widget build(BuildContext context) {
    final List<dynamic> mandals = districtData['mandals'] ?? [];

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
          'Select Mandal / City',
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
          if (mandals.isEmpty)
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
                      'No mandals/cities found',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Allow user to skip mandal selection
                    ElevatedButton(
                      onPressed: () => _onSkipMandal(context),
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
                        'Continue without mandal',
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
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
                itemCount: mandals.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final mandal =
                      mandals[index] as Map<String, dynamic>;
                  return _MandalCard(
                    mandalName: mandal['name'] ?? '',
                    onTap: () => _onMandalSelected(context, mandal),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _subscribeToNotifications(SharedPreferences prefs) async {
    try {
      final stateId = prefs.getString('selected_state_id');
      final districtId = prefs.getString('selected_district_id');
      if (stateId != null && stateId.isNotEmpty) {
        await FirebaseMessaging.instance.subscribeToTopic('state_$stateId');
        debugPrint('Subscribed to state_$stateId during onboarding');
      }
      if (districtId != null && districtId.isNotEmpty) {
        await FirebaseMessaging.instance.subscribeToTopic('district_$districtId');
        debugPrint('Subscribed to district_$districtId during onboarding');
      }
    } catch (e) {
      debugPrint('Failed to subscribe to topics during onboarding: $e');
    }
  }

  Future<void> _onSkipMandal(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    // Save profile to backend without mandal
    final isGuest = prefs.getBool('is_guest') ?? false;
    if (!isGuest) {
      try {
        await ApiClient.instance.post(
          '/user/profile',
          data: {
            'stateId': prefs.getString('selected_state_id'),
            'districtId': prefs.getString('selected_district_id'),
            'assemblyId': prefs.getString('selected_assembly_id'),
          },
        );
      } catch (e) {
        debugPrint('Failed to save profile: $e');
      }
    }

    await _subscribeToNotifications(prefs);

    if (context.mounted) {
      context.go('/feed', extra: {'refresh': true});
    }
  }

  Future<void> _onMandalSelected(
    BuildContext context,
    Map<String, dynamic> mandal,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        'selected_mandal_id', mandal['id']?.toString() ?? '');
    await prefs.setString(
        'selected_mandal_name', mandal['name']?.toString() ?? '');

    // Save profile to backend
    final isGuest = prefs.getBool('is_guest') ?? false;
    if (!isGuest) {
      try {
        await ApiClient.instance.post(
          '/user/profile',
          data: {
            'stateId': prefs.getString('selected_state_id'),
            'districtId': prefs.getString('selected_district_id'),
            'assemblyId': prefs.getString('selected_assembly_id'),
            'mandalId': mandal['id']?.toString(),
          },
        );
      } catch (e) {
        debugPrint('Failed to save profile: $e');
      }
    }

    await _subscribeToNotifications(prefs);

    if (context.mounted) {
      context.go('/feed', extra: {'refresh': true});
    }
  }
}

class _MandalCard extends StatelessWidget {
  final String mandalName;
  final VoidCallback onTap;

  const _MandalCard({
    required this.mandalName,
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
                  mandalName,
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
