import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/smart_card.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Smart Funkos',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auth.isAuthenticated
                ? 'Olá, ${auth.displayName}'
                : 'Bem-vindo à Smart Funkos',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            auth.isAuthenticated
                ? 'Sua conta está conectada.'
                : 'Explore o catálogo e entre para acompanhar pedidos.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          _FeatureCard(
            title: 'Catálogo',
            subtitle: 'Veja colecionáveis, pronta-entrega e encomendas.',
            icon: Icons.manage_search_rounded,
            onTap: () => context.go('/catalogo'),
          ),
          _FeatureCard(
            title: 'Rifas',
            subtitle: 'Acompanhe campanhas experimentais da Smart Funkos.',
            icon: Icons.confirmation_number_rounded,
            onTap: () => context.go('/rifas'),
          ),
          _FeatureCard(
            title: 'Meus pedidos',
            subtitle: 'Consulte pedidos aprovados, pendentes e histórico.',
            icon: Icons.receipt_long_rounded,
            onTap: () => context.go('/pedidos'),
          ),
          _FeatureCard(
            title: 'Clube Smart Funkos',
            subtitle: 'Pontos, níveis e benefícios futuros.',
            icon: Icons.workspace_premium_rounded,
            onTap: () => context.go('/clube'),
          ),
          _FeatureCard(
            title: 'Carrinho',
            subtitle: 'Base do carrinho assistido do cliente.',
            icon: Icons.shopping_bag_rounded,
            onTap: () => context.go('/carrinho'),
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
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
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SmartCard(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
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
            const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    );
  }
}
