import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: const Text(
          '''
Privacy Policy for Shadow News

Last updated: May 2026

1. Introduction
Welcome to Shadow News. We respect your privacy and are committed to protecting your personal data.

2. Data We Collect
We may collect personal information such as your name, email address, phone number, and usage data when you use our app.

3. How We Use Your Data
We use your data to provide, maintain, and improve our services, as well as to personalize your experience.

4. Data Sharing
We do not sell or share your personal data with third parties except as necessary to provide our services or comply with the law.

5. Security
We implement appropriate security measures to protect your personal data from unauthorized access.

6. Changes to This Policy
We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.

7. Contact Us
If you have any questions about this privacy policy, please contact us at info@shadownews.in.
          ''',
          style: TextStyle(fontSize: 16, height: 1.5),
        ),
      ),
    );
  }
}
