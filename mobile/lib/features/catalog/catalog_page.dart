import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/currency_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/smart_card.dart';

class CatalogPage extends StatelessWidget {
  const CatalogPage({super.key});

  static const _products = [
    _ProductDemo('Funko Pop Spider-Man', 'Marvel', 129.90),
    _ProductDemo('Funko Pop Darth Vader', 'Star Wars', 149.90),
    _ProductDemo('Funko Pop Luffy Gear 5', 'Anime', 189.90),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Catálogo',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            enabled: false,
            decoration: InputDecoration(
              hintText: 'Buscar por personagem, franquia ou SKU',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: Icon(
                Icons.tune_rounded,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Destaques placeholder',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          for (final product in _products)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: SmartCard(
                onTap: () => context.go('/produto/demo'),
                child: Row(
                  children: [
                    Container(
                      height: 76,
                      width: 76,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.secondary.withValues(
                          alpha: 0.14,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.toys_rounded,
                        color: theme.colorScheme.secondary,
                        size: 34,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.franchise,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            CurrencyFormatter.brl(product.price),
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ProductDemo {
  const _ProductDemo(this.name, this.franchise, this.price);

  final String name;
  final String franchise;
  final double price;
}
