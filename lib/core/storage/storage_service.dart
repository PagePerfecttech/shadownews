import 'package:shared_preferences/shared_preferences.dart';

class StorageKeys {
  static const String isGuest = 'is_guest';
  static const String isReporter = 'is_reporter';
  static const String userStateId = 'selected_state_id';
  static const String userStateName = 'selected_state_name';
  static const String userDistrictId = 'selected_district_id';
  static const String userDistrictName = 'selected_district_name';
  static const String userMandalId = 'selected_mandal_id';
  static const String userMandalName = 'selected_mandal_name';
  static const String userAssemblyId = 'selected_assembly_id';
  static const String userAssemblyName = 'selected_assembly_name';
  static const String selectedTopics = 'selected_topics';
  static const String themeMode = 'theme_mode';
  static const String dataSaverEnabled = 'data_saver_enabled';
  static const String appVersion = 'app_version';
}

class StorageService {
  static StorageService? _instance;
  static SharedPreferences? _prefs;

  StorageService._();

  static Future<StorageService> getInstance() async {
    _instance ??= StorageService._();
    _prefs ??= await SharedPreferences.getInstance();
    return _instance!;
  }

  // String Getters & Setters
  String? getString(String key) => _prefs?.getString(key);
  Future<bool> setString(String key, String value) async =>
      _prefs?.setString(key, value) ?? Future.value(false);

  // Bool Getters & Setters
  bool getBool(String key, {bool defaultValue = false}) =>
      _prefs?.getBool(key) ?? defaultValue;
  Future<bool> setBool(String key, bool value) async =>
      _prefs?.setBool(key, value) ?? Future.value(false);

  // Int Getters & Setters
  int? getInt(String key) => _prefs?.getInt(key);
  Future<bool> setInt(String key, int value) async =>
      _prefs?.setInt(key, value) ?? Future.value(false);

  // Remove & Clear
  Future<bool> remove(String key) async =>
      _prefs?.remove(key) ?? Future.value(false);
  Future<bool> clear() async => _prefs?.clear() ?? Future.value(false);
}
