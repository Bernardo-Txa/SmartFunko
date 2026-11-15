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
  static const mobileOrderCreationEnabled = bool.fromEnvironment(
    'ENABLE_MOBILE_ORDER_CREATION',
    defaultValue: false,
  );
  static const mobilePaymentsEnabled = bool.fromEnvironment(
    'ENABLE_MOBILE_PAYMENTS',
    defaultValue: false,
  );
  static const mobileFeatures = MobileFeatureFlags(
    orderCreation: mobileOrderCreationEnabled,
    payments: mobilePaymentsEnabled,
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

class MobileFeatureFlags {
  const MobileFeatureFlags({
    required this.orderCreation,
    required this.payments,
  });

  final bool orderCreation;
  final bool payments;
  bool get canCreateOrder => orderCreation;
  bool get canPay => payments;
}
