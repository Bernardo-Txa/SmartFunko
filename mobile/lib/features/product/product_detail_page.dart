import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/utils/currency_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class ProductDetailPage extends StatelessWidget {
  const ProductDetailPage({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Produto',
      showBackButton: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: theme.colorScheme.primary.withValues(alpha: 0.24),
                ),
              ),
              child: Icon(
                Icons.toys_rounded,
                size: 96,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Funko Pop Demo',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Slug: $slug',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(
                label: const Text('Pronta-entrega'),
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.12,
                ),
              ),
              Chip(
                label: const Text('Placeholder'),
                backgroundColor: theme.colorScheme.secondary.withValues(
                  alpha: 0.14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            CurrencyFormatter.brl(129.90),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 18),
          const SmartCard(
            child: Text(
              'Detalhe demonstrativo preparado para receber dados reais de produto na próxima sprint.',
            ),
          ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: 'Adicionar ao carrinho',
            icon: Icons.add_shopping_cart_rounded,
            onPressed: () => context.go('/carrinho'),
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: 'Compartilhar',
            icon: Icons.ios_share_rounded,
            variant: PrimaryButtonVariant.outlined,
            onPressed: () =>
                Share.share('Veja este produto na Smart Funkos: $slug'),
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: 'Ver catálogo',
            icon: Icons.manage_search_rounded,
            variant: PrimaryButtonVariant.outlined,
            onPressed: () => context.go('/catalogo'),
          ),
        ],
      ),
    );
  }
}
