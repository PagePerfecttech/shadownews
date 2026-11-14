import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ReporterGuidelinesScreen extends StatelessWidget {
  const ReporterGuidelinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text(
          'Terms & Conditions / Reporter Guidelines',
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFD32F2F),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCard(
              title: 'Hello Friends,',
              icon: Icons.waving_hand,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'If you identify any problems in our app, please report them to our grievance email:',
                    style: GoogleFonts.poppins(fontSize: 14, color: const Color(0xFF374151), height: 1.5),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'admin@shadownews.in',
                    style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFFD32F2F)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _buildCard(
              title: 'Note:',
              icon: Icons.info_outline,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBulletPoint('News can be submitted only between 8:00 AM and 8:00 PM. No news will be accepted after this time.'),
                  const SizedBox(height: 8),
                  _buildBulletPoint('Junior Reporters: Should submit a minimum of 3 news items daily. Earning: 3/- per news item. Total: 9/- daily. Payout at the end of the month via PhonePe.'),
                  const SizedBox(height: 8),
                  _buildBulletPoint('Senior Reporters: Should submit a minimum of 4 news items daily. Earning: 5/- per news item. Total: 20/- daily. Payout at the end of the month via PhonePe.'),
                  const SizedBox(height: 8),
                  _buildBulletPoint('Any reporter with consecutive zero posts for 3 days will automatically have their ID suspended.'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _buildCard(
              title: 'Rules for Uploading News',
              icon: Icons.rule,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Copy-Pasting:',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF111827)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Reporters are fully responsible for the content they copy-paste and upload. If any issues/complaints arise, the reporter\'s ID will be blocked permanently.',
                    style: GoogleFonts.poppins(fontSize: 14, color: const Color(0xFF374151), height: 1.5),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Original Content:',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: const Color(0xFF111827)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Reporters are solely responsible for any news they publish regarding other individuals. If a valid complaint is received against a reporter\'s post, the management will cooperate with the complainer and hand over the reporter\'s details if required. In case of legal issues, the management will step back and suspend the reporter\'s ID.',
                    style: GoogleFonts.poppins(fontSize: 14, color: const Color(0xFF374151), height: 1.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFFD32F2F), size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF111827)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 6.0, right: 8.0),
          child: Icon(Icons.circle, size: 6, color: Color(0xFF374151)),
        ),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.poppins(fontSize: 14, color: const Color(0xFF374151), height: 1.5),
          ),
        ),
      ],
    );
  }
}
