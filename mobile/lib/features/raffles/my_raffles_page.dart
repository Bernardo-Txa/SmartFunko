import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';
import 'data/raffle_models.dart';
import 'data/raffles_repository.dart';

class MyRafflesPage extends ConsumerWidget {
  const MyRafflesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Minhas rifas',
        showBackButton: true,
        body: EmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'Entre para ver suas rifas',
          message:
              'Use sua conta Smart Funkos para acompanhar reservas e números.',
          actionLabel: 'Entrar',
          onAction: () => context.go('/login?from=/minhas-rifas'),
        ),
      );
    }

    final entries = ref.watch(myRafflesProvider);

    return AppScaffold(
      title: 'Minhas rifas',
      showBackButton: true,
      onRefresh: () async => ref.invalidate(myRafflesProvider),
      body: entries.when(
        data: (items) => _MyRafflesContent(entries: items),
        loading: () => const LoadingState(message: 'Carregando suas rifas...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar suas rifas.',
          onRetry: () => ref.invalidate(myRafflesProvider),
        ),
      ),
    );
  }
}

class _MyRafflesContent extends StatelessWidget {
  const _MyRafflesContent({required this.entries});

  final List<RaffleEntry> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return EmptyState(
        icon: Icons.confirmation_number_outlined,
        title: 'Nenhuma participação',
        message: 'Escolha números em uma rifa aberta para acompanhar por aqui.',
        actionLabel: 'Ver rifas',
        onAction: () => context.go('/rifas'),
      );
    }

    return Column(
      children: [
        for (final entry in entries)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _EntryCard(entry: entry),
          ),
      ],
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry});

  final RaffleEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            entry.title ?? entry.orderNumber,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Pill(label: entry.status),
              _Pill(label: DateFormatter.dayMonthYear(entry.createdAt)),
              _Pill(
                label: entry.total.formatted,
                color: theme.colorScheme.secondary,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Números: ${entry.numbers.isEmpty ? '-' : entry.numbers.join(', ')}',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (entry.reservedUntil != null) ...[
            const SizedBox(height: 6),
            Text(
              'Reserva até ${DateFormatter.dayMonthYearHour(entry.reservedUntil)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          if (entry.paymentUrl != null) ...[
            const SizedBox(height: 12),
            PrimaryButton(
              label: 'Abrir pagamento',
              icon: Icons.open_in_new_rounded,
              onPressed: () => launchUrl(
                Uri.parse(entry.paymentUrl!),
                mode: LaunchMode.externalApplication,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveColor = color ?? theme.colorScheme.primary;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: effectiveColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: effectiveColor.withValues(alpha: 0.24)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        child: Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: effectiveColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
