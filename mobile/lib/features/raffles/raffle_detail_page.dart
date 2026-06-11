import 'package:flutter/material.dart';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class RaffleDetailPage extends StatelessWidget {
  const RaffleDetailPage({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Rifa',
      showBackButton: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.secondary.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.confirmation_number_rounded,
                color: theme.colorScheme.secondary,
                size: 72,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Rifa Demo',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text('Slug: $slug'),
          const SizedBox(height: 16),
          SmartCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Números demonstrativos',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                GridView.builder(
                  itemCount: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                    childAspectRatio: 1.8,
                  ),
                  itemBuilder: (context, index) {
                    final selected = index == 2 || index == 7;
                    return DecoratedBox(
                      decoration: BoxDecoration(
                        color: selected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: theme.colorScheme.outlineVariant.withValues(
                            alpha: 0.5,
                          ),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}'.padLeft(2, '0'),
                          style: TextStyle(
                            color: selected
                                ? theme.colorScheme.onPrimary
                                : null,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: 'Reserva e pagamento entram depois',
            icon: Icons.lock_clock_rounded,
            onPressed: null,
          ),
        ],
      ),
    );
  }
}
