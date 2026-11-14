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
  String _textSize = 'Medium';
  double _textScaleFactor = 1.0;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;
  bool get isDataSaverEnabled => _isDataSaverEnabled;
  String get textSize => _textSize;
  double get textScaleFactor => _textScaleFactor;

  static const Map<String, double> textSizeScales = {
    'Small': 0.88,
    'Medium': 1.0,
    'Large': 1.16,
    'Extra Large': 1.32,
  };

  Future<void> init() async {
    final storage = await StorageService.getInstance();
    final savedMode = storage.getString(StorageKeys.themeMode) ?? 'light';
    final isDarkSaved = storage.getBool('dark_mode', defaultValue: false);

    if (savedMode == 'dark' || isDarkSaved) {
      _themeMode = ThemeMode.dark;
    } else if (savedMode == 'system') {
      _themeMode = ThemeMode.system;
    } else {
      _themeMode = ThemeMode.light;
    }

    _isDataSaverEnabled = storage.getBool(StorageKeys.dataSaverEnabled, defaultValue: false);
    _textSize = storage.getString('text_size') ?? 'Medium';
    _textScaleFactor = textSizeScales[_textSize] ?? 1.0;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    final storage = await StorageService.getInstance();
    String modeStr = 'light';
    if (mode == ThemeMode.dark) modeStr = 'dark';
    if (mode == ThemeMode.system) modeStr = 'system';
    await storage.setString(StorageKeys.themeMode, modeStr);
    await storage.setBool('dark_mode', mode == ThemeMode.dark);
  }

  Future<void> setDarkMode(bool isDark) async {
    await setThemeMode(isDark ? ThemeMode.dark : ThemeMode.light);
  }

  Future<void> toggleTheme() async {
    await setDarkMode(_themeMode != ThemeMode.dark);
  }

  Future<void> setTextSize(String size) async {
    if (!textSizeScales.containsKey(size)) return;
    _textSize = size;
    _textScaleFactor = textSizeScales[size] ?? 1.0;
    notifyListeners();
    final storage = await StorageService.getInstance();
    await storage.setString('text_size', size);
  }

  Future<void> setTextScaleFactor(double factor) async {
    _textScaleFactor = factor.clamp(0.85, 1.35);
    if (_textScaleFactor <= 0.92) {
      _textSize = 'Small';
    } else if (_textScaleFactor <= 1.08) {
      _textSize = 'Medium';
    } else if (_textScaleFactor <= 1.24) {
      _textSize = 'Large';
    } else {
      _textSize = 'Extra Large';
    }
    notifyListeners();
    final storage = await StorageService.getInstance();
    await storage.setString('text_size', _textSize);
  }

  Future<void> setDataSaverEnabled(bool enabled) async {
    _isDataSaverEnabled = enabled;
    notifyListeners();
    final storage = await StorageService.getInstance();
    await storage.setBool(StorageKeys.dataSaverEnabled, enabled);
  }
}
