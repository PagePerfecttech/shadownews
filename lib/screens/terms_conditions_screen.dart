import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text(
          'నిబంధనలు & షరతులు (Terms & Conditions)',
          style: GoogleFonts.notoSansTelugu(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFFD32F2F),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'మిత్రులకు స్వాగతం,',
                  style: GoogleFonts.notoSansTelugu(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'మా యాప్‌లో మీకు ఏవైనా సమస్యలు లేదా ఫిర్యాదులు ఉంటే, దయచేసి మా గ్రీవెన్స్ ఇమెయిల్‌కి తెలియజేయండి:',
                  style: GoogleFonts.notoSansTelugu(fontSize: 14, color: const Color(0xFF374151), height: 1.5),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFFCDD2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.email, color: Color(0xFFD32F2F), size: 20),
                      const SizedBox(width: 10),
                      SelectableText(
                        'admin@shadownews.in',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFD32F2F),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                Text(
                  'ముఖ్య గమనిక (Note):',
                  style: GoogleFonts.notoSansTelugu(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFFD32F2F),
                  ),
                ),
                const SizedBox(height: 12),
                _buildBulletPoint('వార్తలను ఉదయం 8:00 AM నుండి రాత్రి 8:00 PM వరకు మాత్రమే పంపడానికి సదుపాయం ఉంటుంది.'),
                const SizedBox(height: 10),
                _buildBulletPoint('కాపీ చేసి పేస్ట్ చేసిన వార్తలకు రిపోర్టర్లు మాత్రమే పూర్తి బాధ్యత వహించాలి.'),
                const SizedBox(height: 10),
                _buildBulletPoint('సమర్పించిన వార్తలపై ఎలాంటి చట్టపరమైన సమస్యలు తలెత్తినా, దానికి సంబంధిత రిపోర్టర్ మాత్రమే ముమ్మాటికీ బాధ్యత వహించాల్సి ఉంటుంది.'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('• ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F))),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.notoSansTelugu(fontSize: 14, color: const Color(0xFF374151), height: 1.45),
          ),
        ),
      ],
    );
  }
}
