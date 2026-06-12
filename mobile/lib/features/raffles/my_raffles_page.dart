import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import '../../core/url/open_payment_url.dart';
import 'data/raffle_models.dart';
import 'data/raffles_repository.dart';
import 'domain/raffle_status_mapper.dart';

class MyRafflesPage extends ConsumerWidget {
  const MyRafflesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (auth.isLoading) {
      return const AppScaffold(
        title: 'Minhas rifas',
        showBackButton: true,
        body: LoadingState(message: 'Verificando sua sessão...'),
      );
    }

    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Minhas rifas',
        showBackButton: true,
        body: EmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'Entre para continuar.',
          message: 'Entre para ver suas rifas.',
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(
          title: 'Suas participações',
          subtitle: 'Acompanhe reservas, pagamentos e status em um só lugar.',
        ),
        const SizedBox(height: 16),
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
    final status = mapRaffleStatus(context, entry.status);

    return SizedBox(
      width: double.infinity,
      child: SmartCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              entry.title ?? entry.orderNumber,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusBadge(
                  label: status.label,
                  icon: status.icon,
                  color: status.color,
                ),
                StatusBadge(
                  label: DateFormatter.dayMonthYear(entry.createdAt),
                  icon: Icons.calendar_today_rounded,
                ),
                PriceTag(label: entry.total.formatted, subtitle: 'Total'),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Números: ${entry.numbersLabel}',
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
            const SizedBox(height: 14),
            if (entry.isPendingPayment) ...[
              if (entry.paymentUrl != null)
                PrimaryButton(
                  label: 'Abrir pagamento',
                  icon: Icons.open_in_new_rounded,
                  onPressed: () => openPaymentUrl(context, entry.paymentUrl!),
                )
              else
                Text(
                  'Pagamento em processamento',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
            ] else if (entry.isPaid) ...[
              Text(
                'Pagamento confirmado',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.tertiary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ] else if (entry.isCancelled) ...[
              Text(
                'Cancelado',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
