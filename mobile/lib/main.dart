import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/smart_funkos_app.dart';
import 'core/config/app_config.dart';
import 'shared/theme/app_colors.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: AppColors.darkBackground,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: AppColors.darkBackground,
      systemNavigationBarIconBrightness: Brightness.light,
      systemNavigationBarDividerColor: AppColors.darkBorder,
    ),
  );
  await initializeDateFormatting('pt_BR', null);

  if (AppConfig.isComplete) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabaseAnonKey,
    );
  }

  runApp(
    const ProviderScope(retry: appProviderRetry, child: SmartFunkosBootstrap()),
  );
}

Duration? appProviderRetry(int retryCount, Object error) {
  // One delayed retry covers brief connectivity changes without trapping the
  // user in Riverpod's default retry sequence. A visible retry remains
  // available after the second failure.
  return retryCount == 0 ? const Duration(seconds: 1) : null;
}

class SmartFunkosBootstrap extends StatelessWidget {
  const SmartFunkosBootstrap({super.key});

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.isComplete) {
      return MaterialApp(
        title: 'SmartFunko',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.brandYellow,
            brightness: Brightness.dark,
          ),
        ),
        home: Scaffold(
          body: SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 540),
                child: _ConfigErrorCard(missing: AppConfig.missingVariables),
              ),
            ),
          ),
        ),
      );
    }

    return const SmartFunkosApp();
  }
}

class _ConfigErrorCard extends StatelessWidget {
  const _ConfigErrorCard({required this.missing});

  final List<String> missing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Card(
        elevation: 0,
        color: colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.4),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: colorScheme.error,
                size: 32,
              ),
              const SizedBox(height: 16),
              Text(
                'Configurações obrigatórias ausentes',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Defina os dart-defines abaixo antes de abrir o app.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              ...missing.map(
                (value) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text('• $value'),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Exemplo: flutter run --dart-define=API_BASE_URL=... --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
