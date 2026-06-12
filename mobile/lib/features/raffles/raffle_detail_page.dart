import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/api_error.dart';
import '../../core/network/image_url_resolver.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/url/open_payment_url.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/raffle_models.dart';
import 'data/raffles_repository.dart';
import 'domain/raffle_selection_controller.dart';
import 'domain/raffle_status_mapper.dart';

class RaffleDetailPage extends ConsumerWidget {
  const RaffleDetailPage({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(raffleDetailProvider(slug));

    return AppScaffold(
      title: 'Rifa',
      showBackButton: true,
      onRefresh: () async {
        ref.read(rafflesRepositoryProvider).invalidateRaffleDetail(slug);
        ref.invalidate(raffleDetailProvider(slug));
      },
      body: detail.when(
        data: (raffle) => _RaffleDetailContent(raffle: raffle),
        loading: () => const LoadingState(message: 'Carregando rifa...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar esta rifa.',
          onRetry: () {
            ref.read(rafflesRepositoryProvider).invalidateRaffleDetail(slug);
            ref.invalidate(raffleDetailProvider(slug));
          },
        ),
      ),
    );
  }
}

class _RaffleDetailContent extends ConsumerStatefulWidget {
  const _RaffleDetailContent({required this.raffle});

  final RaffleDetail raffle;

  @override
  ConsumerState<_RaffleDetailContent> createState() =>
      _RaffleDetailContentState();
}

class _RaffleDetailContentState extends ConsumerState<_RaffleDetailContent> {
  bool _isSubmitting = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final raffle = widget.raffle;
    final theme = Theme.of(context);
    final selected = ref.watch(raffleSelectionControllerProvider(raffle.slug));
    final total = selected.length * raffle.pricePerNumber.value;
    final soldPercent = raffle.totalNumbers == 0
        ? 0.0
        : raffle.soldNumbers / raffle.totalNumbers;
    final status = mapRaffleStatus(context, raffle.status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 16 / 9,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: _RaffleHeroImage(imageUrl: raffle.imageUrl),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          raffle.title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          raffle.description,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 14),
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
              label: raffle.pricePerNumber.formatted,
              icon: Icons.sell_rounded,
            ),
            if (raffle.drawDate != null)
              StatusBadge(
                label: 'Sorteio ${DateFormatter.dayMonthYear(raffle.drawDate)}',
                icon: Icons.event_rounded,
              ),
          ],
        ),
        const SizedBox(height: 16),
        SmartCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${raffle.soldNumbers}/${raffle.totalNumbers} vendidos',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              LinearProgressIndicator(value: soldPercent.clamp(0, 1)),
            ],
          ),
        ),
        if (raffle.rules != null) ...[
          const SizedBox(height: 16),
          SmartCard(
            child: Text(
              raffle.rules!,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
            ),
          ),
        ],
        const SizedBox(height: 16),
        const SectionHeader(
          title: 'Escolha seus números',
          subtitle: 'Selecione apenas os números disponíveis para reservar.',
        ),
        const SizedBox(height: 10),
        const _Legend(),
        const SizedBox(height: 10),
        _NumbersGrid(raffle: raffle, selected: selected),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: SmartCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${selected.length} número(s) selecionado(s)',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    PriceTag(
                      label: raffle.pricePerNumber.formatted,
                      subtitle: 'Cada número',
                    ),
                    PriceTag(
                      label: CurrencyFormatter.brl(total),
                      subtitle: 'Total',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _error!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                PrimaryButton(
                  label: 'Reservar números',
                  icon: Icons.confirmation_number_rounded,
                  isLoading: _isSubmitting,
                  fullWidth: true,
                  onPressed: selected.isEmpty ? null : _reserve,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _reserve() async {
    if (_isSubmitting) {
      return;
    }

    final auth = await ref.read(authControllerProvider.notifier).syncSession();
    final raffle = widget.raffle;
    final selectedNumbers =
        ref.read(raffleSelectionControllerProvider(raffle.slug)).toList()
          ..sort();

    if (kDebugMode) {
      debugPrint(
        '[Raffle] userPresent=${auth.effectiveUser != null} '
        'sessionPresent=${auth.effectiveSession != null} '
        'selectedNumbers=${selectedNumbers.length}',
      );
    }

    if (!auth.isAuthenticated) {
      if (!mounted) {
        return;
      }
      context.go('/login?from=/rifas/${raffle.slug}');
      return;
    }

    if (!mounted) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Confirmar reserva'),
          content: Text(
            'Você vai reservar ${selectedNumbers.length} número(s) por ${CurrencyFormatter.brl(selectedNumbers.length * raffle.pricePerNumber.value)}.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Confirmar'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      if (kDebugMode) {
        final token = auth.effectiveSession?.accessToken.trim();
        debugPrint(
          '[Raffle] submitting tokenPresent=${token != null && token.isNotEmpty}',
        );
      }

      final response = await ref
          .read(rafflesRepositoryProvider)
          .reserveNumbers(
            slug: raffle.slug,
            request: CreateRaffleEntryRequest(numbers: selectedNumbers),
          );

      ref.read(raffleSelectionControllerProvider(raffle.slug).notifier).clear();
      ref.invalidate(raffleDetailProvider(raffle.slug));
      ref.invalidate(myRafflesProvider);

      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(response.message)));

      if (response.paymentUrl != null) {
        await openPaymentUrl(context, response.paymentUrl!);
      } else if (mounted) {
        context.go('/minhas-rifas');
      }
    } catch (error) {
      final sessionExpired = error is ApiError && error.statusCode == 401;
      setState(() {
        if (sessionExpired) {
          _error = 'Sua sessão expirou. Entre novamente para continuar.';
        } else {
          _error = error.toString();
        }
      });
      if (sessionExpired) {
        await ref.read(authControllerProvider.notifier).signOut();
      }
      ref.invalidate(raffleDetailProvider(raffle.slug));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}

class _NumbersGrid extends ConsumerWidget {
  const _NumbersGrid({required this.raffle, required this.selected});

  final RaffleDetail raffle;
  final Set<int> selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.sizeOf(context).width;
    final columns = width >= 720
        ? 10
        : width >= 430
        ? 6
        : 5;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: raffle.numbers.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1.5,
      ),
      itemBuilder: (context, index) {
        final number = raffle.numbers[index];
        final isSelected = selected.contains(number.number);
        return _NumberTile(
          number: number,
          selected: isSelected,
          onTap: () => ref
              .read(raffleSelectionControllerProvider(raffle.slug).notifier)
              .toggle(number, maxNumbers: raffle.maxNumbersPerCustomer),
        );
      },
    );
  }
}

class _NumberTile extends StatelessWidget {
  const _NumberTile({
    required this.number,
    required this.selected,
    required this.onTap,
  });

  final RaffleNumber number;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color color = selected
        ? theme.colorScheme.primary
        : number.sold
        ? theme.colorScheme.error
        : number.reserved
        ? theme.colorScheme.secondary
        : theme.colorScheme.surface;
    final Color foreground = selected
        ? theme.colorScheme.onPrimary
        : theme.colorScheme.onSurface;

    return InkWell(
      onTap: number.selectable ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color.withValues(
            alpha: selected
                ? 1
                : number.selectable
                ? 0.55
                : 0.14,
          ),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant.withValues(alpha: 0.55),
          ),
        ),
        child: Center(
          child: Text(
            number.label,
            style: TextStyle(color: foreground, fontWeight: FontWeight.w900),
          ),
        ),
      ),
    );
  }
}

class _RaffleHeroImage extends StatelessWidget {
  const _RaffleHeroImage({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.secondary.withValues(alpha: 0.12),
      child: Icon(
        Icons.confirmation_number_rounded,
        color: theme.colorScheme.secondary,
        size: 72,
      ),
    );
    final resolved = resolveImageUrl(imageUrl);

    if (resolved.isEmpty) return fallback;

    return CachedNetworkImage(
      imageUrl: resolved,
      fit: BoxFit.cover,
      memCacheWidth: 1000,
      memCacheHeight: 560,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        StatusBadge(label: 'Disponível'),
        StatusBadge(
          label: 'Selecionado',
          color: theme.colorScheme.primary,
          icon: Icons.check_circle_rounded,
        ),
        StatusBadge(
          label: 'Reservado',
          color: theme.colorScheme.secondary,
          icon: Icons.lock_rounded,
        ),
        StatusBadge(
          label: 'Vendido',
          color: theme.colorScheme.error,
          icon: Icons.block_rounded,
        ),
      ],
    );
  }
}
