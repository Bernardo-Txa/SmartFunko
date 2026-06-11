import 'package:flutter/material.dart';

class ProductBadges extends StatelessWidget {
  const ProductBadges({required this.badges, super.key});

  final List<String> badges;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final badge in badges)
          Chip(
            label: Text(badge),
            backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
            side: BorderSide(
              color: theme.colorScheme.primary.withValues(alpha: 0.26),
            ),
            labelStyle: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
      ],
    );
  }
}
