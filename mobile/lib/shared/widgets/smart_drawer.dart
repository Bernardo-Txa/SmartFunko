import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../features/cart/data/cart_controller.dart';
import '../theme/app_colors.dart';
import 'primary_button.dart';
import 'smart_card.dart';

class SmartDrawer extends ConsumerWidget {
  const SmartDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.effectiveUser;
    final cartQuantity = ref.watch(
      cartControllerProvider.select((cart) => cart.totalQuantity),
    );
    final theme = Theme.of(context);

    return Drawer(
      backgroundColor: AppColors.darkBackground,
      child: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.darkBackgroundAlt, AppColors.darkBackground],
            ),
          ),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              SmartCard(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: theme.colorScheme.primary.withValues(
                        alpha: 0.16,
                      ),
                      child: Icon(
                        auth.isAuthenticated
                            ? Icons.person_rounded
                            : Icons.login_rounded,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            auth.isAuthenticated
                                ? auth.displayName
                                : 'Entre na sua conta',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user?.email ?? 'Acompanhe pedidos, rifas e clube.',
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
              const SizedBox(height: 16),
              if (!auth.isAuthenticated) ...[
                PrimaryButton(
                  label: 'Entrar na minha conta',
                  icon: Icons.login_rounded,
                  fullWidth: true,
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.go('/login');
                  },
                ),
                const SizedBox(height: 10),
                PrimaryButton(
                  label: 'Explorar catálogo',
                  icon: Icons.storefront_rounded,
                  variant: PrimaryButtonVariant.outlined,
                  fullWidth: true,
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.go('/catalogo');
                  },
                ),
                const SizedBox(height: 18),
              ] else ...[
                _DrawerSectionTitle(title: 'Conta'),
                _DrawerTile(
                  icon: Icons.person_rounded,
                  label: 'Meu perfil',
                  onTap: () {
                    Navigator.of(context).pop();
                    context.go('/perfil');
                  },
                ),
                _DrawerTile(
                  icon: Icons.logout_rounded,
                  label: 'Sair',
                  onTap: () async {
                    Navigator.of(context).pop();
                    await ref.read(authControllerProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                ),
                const SizedBox(height: 12),
              ],
              _DrawerSectionTitle(title: 'Atalhos'),
              _DrawerTile(
                icon: Icons.receipt_long_rounded,
                label: 'Meus pedidos',
                onTap: () {
                  Navigator.of(context).pop();
                  context.go('/pedidos');
                },
              ),
              _DrawerTile(
                icon: Icons.confirmation_number_rounded,
                label: 'Minhas rifas',
                onTap: () {
                  Navigator.of(context).pop();
                  context.go('/minhas-rifas');
                },
              ),
              _DrawerTile(
                icon: Icons.workspace_premium_rounded,
                label: 'Clube',
                onTap: () {
                  Navigator.of(context).pop();
                  context.go('/clube');
                },
              ),
              _DrawerTile(
                icon: Icons.favorite_border_rounded,
                label: 'Wishlist',
                trailing: 'Em breve',
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Wishlist preparada para uma próxima etapa.',
                      ),
                    ),
                  );
                },
              ),
              _DrawerTile(
                icon: Icons.inventory_2_rounded,
                label: 'Minha coleção',
                trailing: 'Em breve',
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Minha coleção ainda está no roadmap.'),
                    ),
                  );
                },
              ),
              _DrawerTile(
                icon: Icons.notifications_none_rounded,
                label: 'Alertas de lançamento',
                trailing: 'Em breve',
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Alertas de lançamento ainda não estão ativos.',
                      ),
                    ),
                  );
                },
              ),
              _DrawerTile(
                icon: Icons.chat_bubble_outline_rounded,
                label: 'Ajuda / WhatsApp',
                trailing: 'Canal',
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Canal de ajuda será ligado ao suporte oficial.',
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              Text(
                'Cart: $cartQuantity item(ns)',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerSectionTitle extends StatelessWidget {
  const _DrawerSectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SmartCard(
        onTap: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            CircleAvatar(
              radius: 19,
              backgroundColor: theme.colorScheme.primary.withValues(
                alpha: 0.14,
              ),
              child: Icon(icon, size: 20, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            if (trailing != null)
              Text(
                trailing!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              )
            else
              const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    );
  }
}
