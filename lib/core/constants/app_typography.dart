import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  static TextStyle titleLarge({Color color = AppColors.textPrimaryLight}) {
    return GoogleFonts.poppins(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: color,
    );
  }

  static TextStyle titleMedium({Color color = AppColors.textPrimaryLight}) {
    return GoogleFonts.poppins(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: color,
    );
  }

  static TextStyle bodyLarge({Color color = AppColors.textPrimaryLight}) {
    return GoogleFonts.notoSansTelugu(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      color: color,
    );
  }

  static TextStyle bodyMedium({Color color = AppColors.textPrimaryLight}) {
    return GoogleFonts.notoSansTelugu(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      color: color,
    );
  }

  static TextStyle bodySmall({Color color = AppColors.textSecondaryLight}) {
    return GoogleFonts.notoSansTelugu(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: color,
    );
  }

  static TextStyle caption({Color color = AppColors.textSecondaryLight}) {
    return GoogleFonts.notoSansTelugu(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      color: color,
    );
  }
}
