import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import 'primary_button.dart';
import 'smart_card.dart';

class SmartEmptyState extends StatelessWidget {
  const SmartEmptyState({
    required this.title,
    required this.message,
    this.actionLabel,
    this.icon = Icons.inventory_2_outlined,
    this.onAction,
    super.key,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final IconData icon;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final actionLabel = this.actionLabel;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: SmartCard(
          tone: SmartCardTone.sky,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: 62,
                width: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: theme.colorScheme.secondary.withValues(alpha: 0.24),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: theme.colorScheme.secondary.withValues(alpha: 0.5),
                  ),
                ),
                child: Icon(icon, color: AppColors.brandNavy, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  color: AppColors.brandNavy,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.brandNavy.withValues(alpha: 0.74),
                  height: 1.35,
                ),
              ),
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: 18),
                PrimaryButton(
                  label: actionLabel,
                  fullWidth: true,
                  onPressed: onAction,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.title,
    required this.message,
    this.actionLabel,
    this.icon = Icons.inventory_2_outlined,
    this.onAction,
    super.key,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final IconData icon;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return SmartEmptyState(
      title: title,
      message: message,
      actionLabel: actionLabel,
      icon: icon,
      onAction: onAction,
    );
  }
}
