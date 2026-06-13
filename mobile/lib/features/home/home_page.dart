import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/image_url_resolver.dart';
import '../../shared/widgets/drop_badge.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/fandom_chip.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';
import '../cart/data/cart_controller.dart';
import '../catalog/data/catalog_repository.dart';
import '../catalog/data/product_models.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final featuredProducts = ref.watch(featuredProductsProvider);

    return AppScaffold(
      title: 'Smart Funkos',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HeroSection(
            displayName: auth.isAuthenticated ? auth.displayName : null,
          ),
          const SizedBox(height: 22),
          featuredProducts.when(
            data: (products) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _FandomSection(),
                const SizedBox(height: 24),
                _HighlightsSection(products: products),
                const SizedBox(height: 24),
                _DropsSection(products: products),
                const SizedBox(height: 24),
                const _WishlistRankingTeaser(),
              ],
            ),
            loading: () => const _HighlightsLoading(),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar os destaques.',
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
          const _HowItWorksSection(),
          const SizedBox(height: 18),
          _FeatureCard(
            title: 'Smart Clube',
            subtitle: 'Pontos e benefícios para colecionadores Smart Funkos.',
            icon: Icons.workspace_premium_rounded,
            onTap: () => context.go('/clube'),
          ),
          _FeatureCard(
            title: 'Rifas Smart Funkos',
            subtitle: 'Campanhas especiais com experiência mobile preparada.',
            icon: Icons.confirmation_number_rounded,
            onTap: () => context.go('/rifas'),
          ),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({this.displayName});

  final String? displayName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.primary.withValues(alpha: 0.22),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (displayName != null) ...[
              Text(
                'Olá, $displayName',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              'Monte sua coleção SmartFunko',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w900,
                height: 1.05,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Descubra drops, pré-vendas e colecionáveis por fandom em uma experiência feita para colecionadores.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _HeroAction(
                  label: 'Ver catálogo',
                  icon: Icons.manage_search_rounded,
                  onTap: () => context.go('/catalogo'),
                ),
                _HeroAction(
                  label: 'Rifas',
                  icon: Icons.confirmation_number_rounded,
                  onTap: () => context.go('/rifas'),
                ),
                _HeroAction(
                  label: 'Meus pedidos',
                  icon: Icons.receipt_long_rounded,
                  onTap: () => context.go('/pedidos'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HighlightsSection extends StatelessWidget {
  const _HighlightsSection({required this.products});

  final List<ProductSummary> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Vitrine SmartFunko',
          subtitle:
              'Produtos reais do catálogo, com foco em descoberta rápida.',
          actionLabel: 'Ver todos',
          onAction: () => context.go('/catalogo'),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 218,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: products.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final product = products[index];
              return SizedBox(
                width: 170,
                child: _HighlightCard(product: product),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _FandomSection extends StatelessWidget {
  const _FandomSection();

  static const _fandoms = [
    'Marvel',
    'DC',
    'Anime',
    'Disney',
    'Games',
    'Star Wars',
    'Harry Potter',
    'Terror',
    'Música',
    'Esportes',
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(
          title: 'Shop by fandom',
          subtitle: 'Use os filtros para começar por universos que você curte.',
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final fandom in _fandoms) ...[
                FandomChip(
                  label: fandom,
                  icon: Icons.auto_awesome_rounded,
                  onTap: () =>
                      context.go('/catalogo?q=${Uri.encodeComponent(fandom)}'),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _DropsSection extends StatelessWidget {
  const _DropsSection({required this.products});

  final List<ProductSummary> products;

  @override
  Widget build(BuildContext context) {
    final drops = products
        .where(
          (product) =>
              product.special || product.status == ProductStatus.preorder,
        )
        .take(4)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(
          title: 'Drops limitados',
          subtitle: 'Itens especiais e pré-vendas aparecem aqui primeiro.',
        ),
        const SizedBox(height: 12),
        if (drops.isEmpty)
          const EmptyState(
            icon: Icons.bolt_rounded,
            title: 'Novos drops aparecem aqui',
            message:
                'Quando houver produtos especiais ou pré-vendas, a vitrine será atualizada.',
          )
        else
          Column(
            children: [
              for (final product in drops)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SmartCard(
                    onTap: () => context.go('/produto/${product.slug}'),
                    child: Row(
                      children: [
                        const DropBadge(label: 'Drop'),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            product.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded),
                      ],
                    ),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}

class _WishlistRankingTeaser extends StatelessWidget {
  const _WishlistRankingTeaser();

  @override
  Widget build(BuildContext context) {
    return SmartCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DropBadge(label: 'Roadmap', icon: Icons.favorite_rounded),
          const SizedBox(height: 12),
          Text(
            'Mais desejados',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            'Em breve: ranking dos colecionadores e wishlist mobile completa.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 14),
          PrimaryButton(
            label: 'Explorar catálogo',
            icon: Icons.manage_search_rounded,
            fullWidth: true,
            onPressed: () => context.go('/catalogo'),
          ),
        ],
      ),
    );
  }
}

class _HighlightCard extends ConsumerWidget {
  const _HighlightCard({required this.product});

  final ProductSummary product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return SmartCard(
      padding: const EdgeInsets.all(12),
      onTap: () => context.go('/produto/${product.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _HighlightImage(
                imageUrl: product.imageUrl,
                special: product.special,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            product.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            product.price.formatted,
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.secondary,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 36,
            child: FilledButton.icon(
              onPressed: product.isAvailable
                  ? () {
                      ref
                          .read(cartControllerProvider.notifier)
                          .addProduct(product);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '${product.name} adicionado ao carrinho.',
                          ),
                        ),
                      );
                    }
                  : null,
              icon: const Icon(Icons.add_shopping_cart_rounded, size: 16),
              label: const Text('Adicionar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _HighlightImage extends StatelessWidget {
  const _HighlightImage({required this.imageUrl, required this.special});

  final String? imageUrl;
  final bool special;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.primary.withValues(alpha: 0.1),
      child: Center(
        child: Icon(
          Icons.toys_rounded,
          color: special
              ? theme.colorScheme.secondary
              : theme.colorScheme.primary,
          size: 42,
        ),
      ),
    );

    if (imageUrl == null) {
      return fallback;
    }

    final resolvedUrl = resolveImageUrl(imageUrl);
    if (resolvedUrl.isEmpty) {
      return fallback;
    }

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: BoxFit.cover,
      memCacheWidth: 360,
      memCacheHeight: 360,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}

class _HighlightsLoading extends StatelessWidget {
  const _HighlightsLoading();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 26,
          width: 112,
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest.withValues(
              alpha: 0.28,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 3,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, __) => SmartCard(
              child: SizedBox(
                width: 130,
                child: Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HowItWorksSection extends StatelessWidget {
  const _HowItWorksSection();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Como funciona',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 12),
        const _StepCard(number: '1', title: 'Escolha seus colecionáveis'),
        const _StepCard(number: '2', title: 'Monte o pedido'),
        const _StepCard(number: '3', title: 'Acompanhe pela conta'),
      ],
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.number, required this.title});

  final String number;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SmartCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.primary.withValues(
                alpha: 0.16,
              ),
              child: Text(
                number,
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SmartCard(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    );
  }
}

class _HeroAction extends StatelessWidget {
  const _HeroAction({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: FilledButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label),
      ),
    );
  }
}
