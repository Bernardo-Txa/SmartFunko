import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class OrdersPage extends ConsumerWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return AppScaffold(
      title: 'Pedidos',
      body: auth.isAuthenticated
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: 'Seus pedidos aparecerão aqui',
                  message:
                      'A integração com pedidos reais entra depois da base mobile.',
                  actionLabel: 'Ver catálogo',
                  onAction: () => context.go('/catalogo'),
                ),
                const SizedBox(height: 20),
                SmartCard(
                  onTap: () => context.go('/pedidos/SF-DEMO'),
                  child: const Row(
                    children: [
                      Icon(Icons.receipt_long_rounded),
                      SizedBox(width: 12),
                      Expanded(child: Text('Abrir detalhe demo SF-DEMO')),
                      Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              children: [
                const EmptyState(
                  icon: Icons.lock_outline_rounded,
                  title: 'Entre para ver pedidos',
                  message:
                      'Use sua conta Smart Funkos para acompanhar pedidos e pagamentos.',
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: 'Entrar',
                  icon: Icons.login_rounded,
                  onPressed: () => context.go('/login'),
                ),
              ],
            ),
    );
  }
}
