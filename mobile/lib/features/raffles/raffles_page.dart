import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/image_url_resolver.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/raffle_models.dart';
import 'data/raffles_repository.dart';
import 'domain/raffle_status_mapper.dart';

class RafflesPage extends ConsumerWidget {
  const RafflesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final raffles = ref.watch(rafflesListProvider);

    return AppScaffold(
      title: 'Rifas',
      onRefresh: () async => ref.invalidate(rafflesListProvider),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _ExperimentalNotice(),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Minhas rifas',
            icon: Icons.confirmation_number_outlined,
            variant: PrimaryButtonVariant.outlined,
            onPressed: () => context.go('/minhas-rifas'),
          ),
          const SizedBox(height: 18),
          raffles.when(
            data: (items) => _RafflesContent(raffles: items),
            loading: () => const LoadingState(message: 'Carregando rifas...'),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar as rifas.',
              onRetry: () => ref.invalidate(rafflesListProvider),
            ),
          ),
        ],
      ),
    );
  }
}

class _RafflesContent extends StatelessWidget {
  const _RafflesContent({required this.raffles});

  final List<RaffleSummary> raffles;

  @override
  Widget build(BuildContext context) {
    if (raffles.isEmpty) {
      return const EmptyState(
        icon: Icons.confirmation_number_outlined,
        title: 'Nenhuma rifa aberta',
        message:
            'As campanhas experimentais aparecerão aqui quando estiverem disponíveis.',
      );
    }

    return Column(
      children: [
        for (final raffle in raffles)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _RaffleCard(raffle: raffle),
          ),
      ],
    );
  }
}

class _RaffleCard extends StatelessWidget {
  const _RaffleCard({required this.raffle});

  final RaffleSummary raffle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final soldText = '${raffle.soldNumbers}/${raffle.totalNumbers} vendidos';
    final status = mapRaffleStatus(context, raffle.status);

    return SmartCard(
      onTap: () => context.go('/rifas/${raffle.slug}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 92,
              width: 92,
              child: _RaffleImage(imageUrl: raffle.imageUrl),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusBadge(
                      label: status.label,
                      icon: status.icon,
                      color: status.color,
                    ),
                    const StatusBadge(
                      label: 'Experimental',
                      icon: Icons.science_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  raffle.title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                PriceTag(
                  label: raffle.pricePerNumber.formatted,
                  subtitle: '$soldText • por número',
                ),
                if (raffle.drawDate != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Sorteio ${DateFormatter.dayMonthYear(raffle.drawDate)}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _RaffleImage extends StatelessWidget {
  const _RaffleImage({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.secondary.withValues(alpha: 0.12),
      child: Icon(
        Icons.confirmation_number_rounded,
        color: theme.colorScheme.secondary,
        size: 34,
      ),
    );
    final resolved = resolveImageUrl(imageUrl);

    if (resolved.isEmpty) return fallback;

    return CachedNetworkImage(
      imageUrl: resolved,
      fit: BoxFit.cover,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}

class _ExperimentalNotice extends StatelessWidget {
  const _ExperimentalNotice();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: theme.colorScheme.secondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Funcionalidade experimental. Rifas dependem de regras legais e validação operacional.',
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
