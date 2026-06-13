import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';

class SmartCard extends StatelessWidget {
  const SmartCard({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.expand = true,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final card = DecoratedBox(
      decoration: BoxDecoration(
        gradient: isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.darkSurfaceElevated, AppColors.darkSurface],
              )
            : null,
        color: isDark ? null : theme.cardColor,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.10)),
        boxShadow: AppShadows.card,
      ),
      child: Padding(padding: padding, child: child),
    );

    final content = expand
        ? LayoutBuilder(
            builder: (context, constraints) {
              if (!constraints.hasBoundedWidth) {
                return card;
              }

              return SizedBox(width: double.infinity, child: card);
            },
          )
        : card;

    if (onTap == null) {
      return content;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        onTap: onTap,
        child: content,
      ),
    );
  }
}
