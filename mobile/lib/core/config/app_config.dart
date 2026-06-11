class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );
  static String get normalizedApiBaseUrl =>
      apiBaseUrl.replaceFirst(RegExp(r'/+$'), '');
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static List<String> get missingVariables {
    final missing = <String>[];
    if (apiBaseUrl.isEmpty) missing.add('API_BASE_URL');
    if (supabaseUrl.isEmpty) missing.add('SUPABASE_URL');
    if (supabaseAnonKey.isEmpty) missing.add('SUPABASE_ANON_KEY');
    return missing;
  }

  static bool get isComplete => missingVariables.isEmpty;
}
