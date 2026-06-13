import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/image_url_resolver.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import '../catalog/data/catalog_repository.dart';
import '../catalog/data/product_models.dart';
import '../raffles/data/raffle_models.dart';
import '../raffles/data/raffles_repository.dart';
import '../raffles/domain/raffle_status_mapper.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final featuredProducts = ref.watch(featuredProductsProvider);
    final raffles = ref.watch(rafflesListProvider);

    return AppScaffold(
      title: 'SmartFunko',
      subtitle: 'Colecionáveis, rifas e pedidos em um só lugar.',
      showAppBar: false,
      showSearch: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _IntroCard(
            displayName: auth.isAuthenticated ? auth.displayName : null,
          ),
          const SizedBox(height: 16),
          const _MainActions(),
          const SizedBox(height: 24),
          featuredProducts.when(
            data: (products) => _FeaturedProducts(products: products),
            loading: () => const _SectionLoading(title: 'Produtos em destaque'),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar os produtos em destaque.',
              onRetry: () {
                ref
                    .read(catalogRepositoryProvider)
                    .invalidateProducts(
                      const CatalogRequest(pageSize: 6, sort: 'specials_first'),
                    );
                ref.invalidate(featuredProductsProvider);
              },
            ),
          ),
          const SizedBox(height: 24),
          raffles.when(
            data: (items) => _ActiveRaffles(raffles: items),
            loading: () => const _SectionLoading(title: 'Rifas ativas'),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar as rifas ativas.',
              onRetry: () {
                ref.read(rafflesRepositoryProvider).invalidateRaffles();
                ref.invalidate(rafflesListProvider);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard({this.displayName});

  final String? displayName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (displayName != null) ...[
            Text(
              'Olá, $displayName',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
          ],
          Text(
            'SmartFunko',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Colecionáveis, rifas e pedidos em um só lugar.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _MainActions extends StatelessWidget {
  const _MainActions();

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: MediaQuery.sizeOf(context).width >= 520 ? 4 : 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.45,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _ActionCard(
          label: 'Ver catálogo',
          icon: Icons.manage_search_rounded,
          onTap: () => context.go('/catalogo'),
        ),
        _ActionCard(
          label: 'Ver rifas',
          icon: Icons.confirmation_number_rounded,
          onTap: () => context.go('/rifas'),
        ),
        _ActionCard(
          label: 'Meus pedidos',
          icon: Icons.receipt_long_rounded,
          onTap: () => context.go('/pedidos'),
        ),
        _ActionCard(
          label: 'Meu perfil',
          icon: Icons.person_rounded,
          onTap: () => context.go('/perfil'),
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: theme.colorScheme.primary),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturedProducts extends StatelessWidget {
  const _FeaturedProducts({required this.products});

  final List<ProductSummary> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const EmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'Nenhum produto em destaque',
        message: 'Quando houver produtos disponíveis, eles aparecerão aqui.',
      );
    }

    final visibleProducts = products.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Produtos em destaque',
          actionLabel: 'Ver catálogo',
          onAction: () => context.go('/catalogo'),
        ),
        const SizedBox(height: 12),
        for (final product in visibleProducts)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _ProductListItem(product: product),
          ),
      ],
    );
  }
}

class _ProductListItem extends StatelessWidget {
  const _ProductListItem({required this.product});

  final ProductSummary product;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      onTap: () => context.go('/produto/${product.slug}'),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              height: 72,
              width: 72,
              child: _NetworkThumb(imageUrl: product.imageUrl),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  product.price.formatted,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                StatusBadge(label: product.status.label),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _ActiveRaffles extends StatelessWidget {
  const _ActiveRaffles({required this.raffles});

  final List<RaffleSummary> raffles;

  @override
  Widget build(BuildContext context) {
    if (raffles.isEmpty) {
      return const EmptyState(
        icon: Icons.confirmation_number_outlined,
        title: 'Nenhuma rifa ativa',
        message: 'Rifas abertas aparecerão aqui quando estiverem disponíveis.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Rifas ativas',
          actionLabel: 'Ver rifas',
          onAction: () => context.go('/rifas'),
        ),
        const SizedBox(height: 12),
        for (final raffle in raffles.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _RaffleListItem(raffle: raffle),
          ),
      ],
    );
  }
}

class _RaffleListItem extends StatelessWidget {
  const _RaffleListItem({required this.raffle});

  final RaffleSummary raffle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = mapRaffleStatus(context, raffle.status);

    return SmartCard(
      onTap: () => context.go('/rifas/${raffle.slug}'),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              height: 72,
              width: 72,
              child: _NetworkThumb(
                imageUrl: raffle.imageUrl,
                fallbackIcon: Icons.confirmation_number_rounded,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  raffle.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${raffle.pricePerNumber.formatted} por número',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                StatusBadge(
                  label: status.label,
                  icon: status.icon,
                  color: status.color,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }
}

class _NetworkThumb extends StatelessWidget {
  const _NetworkThumb({this.imageUrl, this.fallbackIcon = Icons.toys_rounded});

  final String? imageUrl;
  final IconData fallbackIcon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.primary.withValues(alpha: 0.10),
      child: Icon(fallbackIcon, color: theme.colorScheme.primary, size: 30),
    );
    final resolvedUrl = resolveImageUrl(imageUrl);

    if (resolvedUrl.isEmpty) {
      return fallback;
    }

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: BoxFit.cover,
      memCacheWidth: 180,
      memCacheHeight: 180,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}

class _SectionLoading extends StatelessWidget {
  const _SectionLoading({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: title),
        const SizedBox(height: 12),
        const SmartCard(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(8),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
      ],
    );
  }
}
