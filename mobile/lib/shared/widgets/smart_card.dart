import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';
import '../theme/app_text_styles.dart';
import 'pressable_scale.dart';

class SmartCard extends StatelessWidget {
  const SmartCard({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.expand = true,
    this.tone = SmartCardTone.elevated,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final bool expand;
  final SmartCardTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isSky = tone == SmartCardTone.sky;
    final skyScheme = theme.colorScheme.copyWith(
      primary: AppColors.brandNavy,
      onPrimary: AppColors.darkTextPrimary,
      surface: AppColors.brandSky,
      onSurface: AppColors.brandNavy,
      onSurfaceVariant: AppColors.brandNavy.withValues(alpha: 0.74),
      outline: AppColors.brandNavy.withValues(alpha: 0.22),
      outlineVariant: AppColors.brandNavy.withValues(alpha: 0.16),
    );
    final themedChild = isSky
        ? Theme(
            data: theme.copyWith(
              colorScheme: skyScheme,
              textTheme: AppTextStyles.build(skyScheme),
              iconTheme: const IconThemeData(color: AppColors.brandNavy),
            ),
            child: child,
          )
        : child;
    final card = DecoratedBox(
      decoration: BoxDecoration(
        color: isSky
            ? AppColors.brandSky
            : isDark
            ? AppColors.darkSurfaceElevated
            : theme.cardColor,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isSky
              ? AppColors.brandNavy.withValues(alpha: 0.20)
              : isDark
              ? AppColors.darkBorder
              : AppColors.lightBorder,
        ),
        boxShadow: AppShadows.card,
      ),
      child: Padding(padding: padding, child: themedChild),
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

    return PressableScale(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: onTap,
          splashColor: AppColors.brandSky.withValues(alpha: 0.16),
          highlightColor: AppColors.brandSky.withValues(alpha: 0.10),
          child: content,
        ),
      ),
    );
  }
}

enum SmartCardTone { elevated, sky }
