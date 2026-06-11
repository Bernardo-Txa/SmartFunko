import 'package:flutter/material.dart';

import 'primary_button.dart';

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
    final theme = Theme.of(context);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 44),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 18),
            PrimaryButton(label: actionLabel!, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}
