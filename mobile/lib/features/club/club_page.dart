import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/drop_badge.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/section_header.dart';
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
                const SizedBox(height: 18),
                const SectionHeader(
                  title: 'Benefícios planejados',
                  subtitle:
                      'Funcionalidades preparadas na experiência, sem promessa de dado real ainda.',
                ),
                const SizedBox(height: 12),
                const _ClubRoadmapCard(
                  title: 'Wishlist e alertas',
                  subtitle:
                      'Favoritos, aviso de retorno ao estoque e pré-vendas por fandom.',
                  icon: Icons.favorite_rounded,
                ),
                const _ClubRoadmapCard(
                  title: 'Ranking de colecionadores',
                  subtitle:
                      'Mais desejados e destaques mensais quando houver backend dedicado.',
                  icon: Icons.leaderboard_rounded,
                ),
                const _ClubRoadmapCard(
                  title: 'Coleção e scanner',
                  subtitle:
                      'Organização da coleção pessoal e leitura de códigos ficam no roadmap.',
                  icon: Icons.qr_code_scanner_rounded,
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
                  fullWidth: true,
                  onPressed: () => context.go('/login'),
                ),
              ],
            ),
    );
  }
}

class _ClubRoadmapCard extends StatelessWidget {
  const _ClubRoadmapCard({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SmartCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropBadge(label: 'Roadmap', icon: icon),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
