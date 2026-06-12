import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/api_error.dart';
import '../../core/network/image_url_resolver.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';
import 'data/raffle_models.dart';
import 'data/raffles_repository.dart';
import 'domain/raffle_selection_controller.dart';

class RaffleDetailPage extends ConsumerWidget {
  const RaffleDetailPage({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(raffleDetailProvider(slug));

    return AppScaffold(
      title: 'Rifa',
      showBackButton: true,
      onRefresh: () async => ref.invalidate(raffleDetailProvider(slug)),
      body: detail.when(
        data: (raffle) => _RaffleDetailContent(raffle: raffle),
        loading: () => const LoadingState(message: 'Carregando rifa...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar esta rifa.',
          onRetry: () => ref.invalidate(raffleDetailProvider(slug)),
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
            _Pill(label: raffle.status == 'open' ? 'Aberta' : raffle.status),
            _Pill(
              label: '${raffle.pricePerNumber.formatted} por número',
              color: theme.colorScheme.secondary,
            ),
            if (raffle.drawDate != null)
              _Pill(
                label: 'Sorteio ${DateFormatter.dayMonthYear(raffle.drawDate)}',
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
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.4),
            ),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          'Escolha seus números',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 10),
        const _Legend(),
        const SizedBox(height: 10),
        _NumbersGrid(raffle: raffle, selected: selected),
        const SizedBox(height: 16),
        SmartCard(
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
              Text(
                '${raffle.pricePerNumber.formatted} cada • Total ${CurrencyFormatter.brl(total)}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
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
                onPressed: selected.isEmpty ? null : _reserve,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _reserve() async {
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
        await launchUrl(
          Uri.parse(response.paymentUrl!),
          mode: LaunchMode.externalApplication,
        );
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
        _Pill(label: 'Disponível'),
        _Pill(label: 'Selecionado', color: theme.colorScheme.primary),
        _Pill(label: 'Reservado', color: theme.colorScheme.secondary),
        _Pill(label: 'Vendido', color: theme.colorScheme.error),
      ],
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
