import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_typography.dart';
import '../core/storage/storage_service.dart';

class AppTheme {
  static ThemeData lightTheme() {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.scaffoldBackgroundLight,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceLight,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: AppColors.textPrimaryLight),
        titleTextStyle: AppTypography.titleLarge(color: AppColors.textPrimaryLight),
      ),
      cardColor: AppColors.surfaceLight,
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceLight,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondaryLight,
      ),
      textTheme: GoogleFonts.notoSansTeluguTextTheme(),
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.scaffoldBackgroundDark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primaryLight,
        brightness: Brightness.dark,
        surface: AppColors.surfaceDark,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: AppColors.textPrimaryDark),
        titleTextStyle: AppTypography.titleLarge(color: AppColors.textPrimaryDark),
      ),
      cardColor: AppColors.surfaceDark,
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceDark,
        selectedItemColor: AppColors.primaryLight,
        unselectedItemColor: AppColors.textSecondaryDark,
      ),
      textTheme: GoogleFonts.notoSansTeluguTextTheme(ThemeData.dark().textTheme),
    );
  }
}

final globalThemeProvider = ThemeProvider();

class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.light;
  bool _isDataSaverEnabled = false;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;
  bool get isDataSaverEnabled => _isDataSaverEnabled;

  Future<void> init() async {
    final storage = await StorageService.getInstance();
    final savedMode = storage.getString(StorageKeys.themeMode) ?? 'light';
    final isDarkSaved = storage.getBool('dark_mode', defaultValue: false);

    if (savedMode == 'dark' || isDarkSaved) {
      _themeMode = ThemeMode.dark;
    } else {
      _themeMode = ThemeMode.light;
    }

    _isDataSaverEnabled = storage.getBool(StorageKeys.dataSaverEnabled, defaultValue: false);
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    final storage = await StorageService.getInstance();
    await storage.setString(StorageKeys.themeMode, mode == ThemeMode.dark ? 'dark' : 'light');
    await storage.setBool('dark_mode', mode == ThemeMode.dark);
  }

  Future<void> setDarkMode(bool isDark) async {
    await setThemeMode(isDark ? ThemeMode.dark : ThemeMode.light);
  }

  Future<void> toggleTheme() async {
    await setDarkMode(_themeMode != ThemeMode.dark);
  }

  Future<void> setDataSaverEnabled(bool enabled) async {
    _isDataSaverEnabled = enabled;
    notifyListeners();
    final storage = await StorageService.getInstance();
    await storage.setBool(StorageKeys.dataSaverEnabled, enabled);
  }
}
