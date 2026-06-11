import 'package:flutter/material.dart';

import '../../shared/widgets/loading_state.dart';

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                height: 72,
                width: 72,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: theme.colorScheme.primary.withValues(alpha: 0.4),
                  ),
                ),
                child: Icon(
                  Icons.toys_rounded,
                  color: theme.colorScheme.primary,
                  size: 38,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Smart Funkos',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 24),
              const LoadingState(message: 'Preparando sua coleção...'),
            ],
          ),
        ),
      ),
    );
  }
}
