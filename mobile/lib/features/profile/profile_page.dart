import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.effectiveUser;

    return AppScaffold(
      title: 'Perfil',
      body: auth.isLoading
          ? const LoadingState(message: 'Verificando sua sessão...')
          : auth.isAuthenticated && user != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SmartCard(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        child: Text(
                          (user.email ?? 'S').substring(0, 1).toUpperCase(),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.displayName,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(user.email ?? 'E-mail não informado'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                const SectionHeader(
                  title: 'Área do colecionador',
                  subtitle: 'Atalhos e recursos preparados para evoluir.',
                ),
                const SizedBox(height: 12),
                _ProfileActionCard(
                  title: 'Meus pedidos',
                  subtitle: 'Acompanhe pedidos e links de pagamento liberados.',
                  icon: Icons.receipt_long_rounded,
                  onTap: () => context.go('/pedidos'),
                ),
                _ProfileActionCard(
                  title: 'Minhas rifas',
                  subtitle: 'Veja reservas e campanhas vinculadas à sua conta.',
                  icon: Icons.confirmation_number_rounded,
                  onTap: () => context.go('/minhas-rifas'),
                ),
                _ProfileActionCard(
                  title: 'Clube Smart Funkos',
                  subtitle: 'Pontos, níveis e benefícios em evolução.',
                  icon: Icons.workspace_premium_rounded,
                  onTap: () => context.go('/clube'),
                ),
                const _RoadmapCard(
                  title: 'Minha coleção',
                  subtitle:
                      'Roadmap: organizar itens comprados, desejados e raros.',
                  icon: Icons.inventory_2_rounded,
                ),
                const _RoadmapCard(
                  title: 'Scanner',
                  subtitle:
                      'Roadmap: leitura de código para consultar item e preço.',
                  icon: Icons.qr_code_scanner_rounded,
                ),
                const _RoadmapCard(
                  title: 'Comunidade',
                  subtitle:
                      'Roadmap: ranking, wishlist pública e trocas entre fãs.',
                  icon: Icons.groups_rounded,
                ),
                const SizedBox(height: 6),
                PrimaryButton(
                  label: 'Sair',
                  icon: Icons.logout_rounded,
                  variant: PrimaryButtonVariant.outlined,
                  fullWidth: true,
                  onPressed: () async {
                    await ref.read(authControllerProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                ),
              ],
            )
          : Column(
              children: [
                const EmptyState(
                  icon: Icons.person_outline_rounded,
                  title: 'Você está como visitante',
                  message:
                      'Entre para ver perfil, pedidos e Clube Smart Funkos.',
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: 'Entrar',
                  icon: Icons.login_rounded,
                  fullWidth: true,
                  onPressed: () => context.go('/login?from=/perfil'),
                ),
              ],
            ),
    );
  }
}

class _ProfileActionCard extends StatelessWidget {
  const _ProfileActionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _ProfileTile(
      title: title,
      subtitle: subtitle,
      icon: icon,
      trailing: Icons.chevron_right_rounded,
      onTap: onTap,
    );
  }
}

class _RoadmapCard extends StatelessWidget {
  const _RoadmapCard({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return _ProfileTile(
      title: title,
      subtitle: subtitle,
      icon: icon,
      trailing: Icons.lock_clock_rounded,
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.trailing,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final IconData trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SmartCard(
        onTap: onTap,
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: theme.colorScheme.primary.withValues(
                alpha: 0.14,
              ),
              child: Icon(icon, color: theme.colorScheme.primary),
            ),
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
            const SizedBox(width: 10),
            Icon(trailing),
          ],
        ),
      ),
    );
  }
}
