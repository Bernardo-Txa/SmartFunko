import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/auth/auth_controller.dart';
import '../core/cache/memory_cache.dart';
import '../core/settings/theme_mode_controller.dart';
import '../features/orders/data/orders_repository.dart';
import '../features/raffles/data/raffles_repository.dart';
import 'router.dart';
import 'theme.dart';

class SmartFunkosApp extends ConsumerWidget {
  const SmartFunkosApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    ref.listen(authControllerProvider, (previous, next) {
      final previousUserId = previous?.effectiveUser?.id;
      final nextUserId = next.effectiveUser?.id;

      if (previousUserId != nextUserId) {
        ref.read(memoryCacheProvider).invalidatePrefix('user:');
        ref.invalidate(ordersProvider);
        ref.invalidate(myRafflesProvider);
      }
    });

    return MaterialApp.router(
      title: 'Smart Funkos',
      debugShowCheckedModeBanner: false,
      theme: SmartFunkosTheme.light,
      darkTheme: SmartFunkosTheme.dark,
      themeMode: themeMode,
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: router,
    );
  }
}
