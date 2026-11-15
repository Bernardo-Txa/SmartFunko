import 'package:flutter/material.dart';

import '../../../shared/theme/app_colors.dart';

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
            backgroundColor: AppColors.surfaceIntermediate,
            side: const BorderSide(color: AppColors.border),
            labelStyle: theme.textTheme.labelMedium?.copyWith(
              color: AppColors.darkTextPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
      ],
    );
  }
}
