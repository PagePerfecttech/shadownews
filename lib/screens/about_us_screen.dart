import 'package:flutter/material.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('About Us'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Image.asset(
                'assets/images/logo.png',
                height: 80,
                errorBuilder: (context, error, stackTrace) => const SizedBox(height: 80),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Shadow News is your daily news companion, bringing you the latest and most relevant news. Our mission is to keep you informed about the world around you with accurate, timely, and unbiased reporting.',
              style: TextStyle(fontSize: 16, height: 1.5),
            ),
            const SizedBox(height: 16),
            const Text(
              'We cover a wide range of topics including politics, entertainment, sports, technology, and regional updates.',
              style: TextStyle(fontSize: 16, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
