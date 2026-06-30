import 'package:flutter/material.dart';

import 'primary_button.dart';
import 'smart_card.dart';

class SmartErrorState extends StatelessWidget {
  const SmartErrorState({
    this.title = 'Não foi possível carregar agora.',
    this.message = 'Verifique sua conexão e tente novamente.',
    this.retryLabel = 'Tentar novamente',
    this.onRetry,
    super.key,
  });

  final String title;
  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: SmartCard(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                height: 62,
                width: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: theme.colorScheme.error.withValues(alpha: 0.11),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: theme.colorScheme.error.withValues(alpha: 0.24),
                  ),
                ),
                child: Icon(
                  Icons.wifi_off_rounded,
                  color: theme.colorScheme.error,
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
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
                  height: 1.35,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                PrimaryButton(
                  label: retryLabel,
                  icon: Icons.refresh_rounded,
                  fullWidth: true,
                  onPressed: onRetry,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({required this.message, this.onRetry, super.key});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return SmartErrorState(message: message, onRetry: onRetry);
  }
}
