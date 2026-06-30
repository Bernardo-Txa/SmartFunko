import 'package:flutter/material.dart';

import '../branding/smart_funko_brand.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import 'smart_card.dart';
import 'smart_progress.dart';

class SmartLoading extends StatelessWidget {
  const SmartLoading({
    this.message = 'Carregando...',
    this.showLogo = false,
    this.logoWidth = 206,
    super.key,
  });

  final String message;
  final bool showLogo;
  final double logoWidth;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SmartCard(
          expand: false,
          padding: EdgeInsets.fromLTRB(24, showLogo ? 26 : 22, 24, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showLogo) ...[
                SizedBox(
                  height: 74,
                  child: Center(
                    child: SmartFunkoLogo(
                      variant: SmartFunkoLogoVariant.horizontalWhite,
                      width: logoWidth,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
              ],
              Container(
                height: 58,
                width: 58,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.22),
                  ),
                ),
                child: const SmartSpinner(size: 30),
              ),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LoadingState extends StatelessWidget {
  const LoadingState({
    this.message = 'Carregando...',
    this.showLogo = false,
    super.key,
  });

  final String message;
  final bool showLogo;

  @override
  Widget build(BuildContext context) {
    return SmartLoading(message: message, showLogo: showLogo);
  }
}
