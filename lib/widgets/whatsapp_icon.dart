import 'package:flutter/material.dart';

class WhatsAppIcon extends StatelessWidget {
  final double size;
  final Color color;

  const WhatsAppIcon({
    super.key,
    this.size = 18,
    this.color = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _WhatsAppIconPainter(color: color),
      ),
    );
  }
}

class _WhatsAppIconPainter extends CustomPainter {
  final Color color;
  _WhatsAppIconPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final double w = size.width;
    final double h = size.height;

    // Draw speech bubble body
    final Path bubblePath = Path();
    bubblePath.addOval(Rect.fromLTWH(w * 0.04, 0, w * 0.92, h * 0.92));

    // Tail at bottom-left
    bubblePath.moveTo(w * 0.16, h * 0.70);
    bubblePath.lineTo(w * 0.02, h * 0.98);
    bubblePath.lineTo(w * 0.34, h * 0.85);
    bubblePath.close();

    canvas.drawPath(bubblePath, paint);

    // Inner Phone Handset Shape Cutout
    final Paint innerPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final Path phonePath = Path();
    phonePath.moveTo(w * 0.35, h * 0.28);
    phonePath.cubicTo(w * 0.35, h * 0.28, w * 0.42, h * 0.34, w * 0.40, h * 0.42);
    phonePath.cubicTo(w * 0.38, h * 0.50, w * 0.48, h * 0.60, w * 0.56, h * 0.58);
    phonePath.cubicTo(w * 0.64, h * 0.56, w * 0.70, h * 0.63, w * 0.70, h * 0.63);
    phonePath.cubicTo(w * 0.72, h * 0.65, w * 0.68, h * 0.73, w * 0.62, h * 0.73);
    phonePath.cubicTo(w * 0.50, h * 0.73, w * 0.28, h * 0.50, w * 0.28, h * 0.38);
    phonePath.cubicTo(w * 0.28, h * 0.32, w * 0.35, h * 0.28, w * 0.35, h * 0.28);
    phonePath.close();

    canvas.drawPath(phonePath, innerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

