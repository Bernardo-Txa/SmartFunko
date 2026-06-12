import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class ClubPage extends ConsumerWidget {
  const ClubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Clube',
      body: auth.isLoading
          ? const LoadingState(message: 'Verificando sua sessão...')
          : auth.isAuthenticated
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SmartCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Nível Colecionador',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '1.250 pontos demo',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 16),
                      LinearProgressIndicator(
                        value: 0.62,
                        minHeight: 10,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Progresso placeholder para o próximo nível.',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: const [
                    Chip(label: Text('Primeiro pedido')),
                    Chip(label: Text('Rifa paga')),
                    Chip(label: Text('Top 3 mensal')),
                  ],
                ),
              ],
            )
          : Column(
              children: [
                const EmptyState(
                  icon: Icons.workspace_premium_outlined,
                  title: 'Entre para acessar o Clube',
                  message:
                      'Pontos, níveis e benefícios ficam vinculados à sua conta.',
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
