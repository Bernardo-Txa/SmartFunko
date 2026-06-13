import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/network/image_url_resolver.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/loading_state.dart';
import '../../../shared/widgets/price_tag.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/smart_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../application/wishlist_controller.dart';
import '../domain/wishlist_item.dart';

class WishlistPage extends ConsumerStatefulWidget {
  const WishlistPage({super.key});

  @override
  ConsumerState<WishlistPage> createState() => _WishlistPageState();
}

class _WishlistPageState extends ConsumerState<WishlistPage> {
  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>.microtask(
        () => ref.read(wishlistControllerProvider.notifier).getWishlist(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final wishlist = ref.watch(wishlistControllerProvider);

    return AppScaffold(
      title: 'Minha wishlist',
      showBackButton: true,
      showDrawerButton: false,
      onRefresh: auth.isAuthenticated
          ? () => ref.read(wishlistControllerProvider.notifier).refresh()
          : null,
      body: auth.isLoading
          ? const LoadingState(message: 'Verificando sua sessão...')
          : !auth.isAuthenticated
          ? _WishlistLoginState(
              onLogin: () => context.go('/login?from=/wishlist'),
            )
          : _WishlistContent(state: wishlist),
    );
  }
}

class _WishlistLoginState extends StatelessWidget {
  const _WishlistLoginState({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const EmptyState(
          icon: Icons.favorite_border_rounded,
          title: 'Entre para salvar favoritos.',
          message: 'Sua wishlist fica vinculada à sua conta.',
        ),
        const SizedBox(height: 18),
        PrimaryButton(
          label: 'Entrar',
          icon: Icons.login_rounded,
          fullWidth: true,
          onPressed: onLogin,
        ),
      ],
    );
  }
}

class _WishlistContent extends ConsumerWidget {
  const _WishlistContent({required this.state});

  final WishlistState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!state.itemsLoaded && state.isLoadingItems) {
      return const LoadingState(message: 'Carregando wishlist...');
    }

    if (state.errorMessage != null && !state.itemsLoaded) {
      return ErrorState(
        message: 'Não foi possível carregar a wishlist.',
        onRetry: () => ref
            .read(wishlistControllerProvider.notifier)
            .getWishlist(forceRefresh: true),
      );
    }

    if (state.items.isEmpty) {
      return const EmptyState(
        icon: Icons.favorite_border_rounded,
        title: 'Sua wishlist está vazia.',
        message: 'Salve produtos pelo catálogo para encontrar aqui depois.',
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 760 ? 2 : 1;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: state.items.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: columns == 1 ? 1.38 : 1.12,
          ),
          itemBuilder: (context, index) {
            final item = state.items[index];
            return _WishlistProductCard(item: item);
          },
        );
      },
    );
  }
}

class _WishlistProductCard extends ConsumerWidget {
  const _WishlistProductCard({required this.item});

  final WishlistItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = item.product;
    final isUpdating = ref.watch(
      wishlistControllerProvider.select(
        (state) => state.isUpdating(item.productId),
      ),
    );

    return SmartCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 126,
              child: _WishlistImage(imageUrl: product?.imageUrl),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (product != null) ...[
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          StatusBadge(label: product.status.label),
                          if (product.special)
                            const StatusBadge(
                              label: 'Especial',
                              icon: Icons.star_rounded,
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        product.category ?? 'Smart Funkos',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const Spacer(),
                      PriceTag(
                        label: product.price.formatted,
                        subtitle: 'Preço',
                      ),
                    ] else ...[
                      Text(
                        'Produto indisponível',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Este produto não está mais disponível no catálogo.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const Spacer(),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: PrimaryButton(
                            label: 'Ver produto',
                            icon: Icons.open_in_new_rounded,
                            variant: PrimaryButtonVariant.outlined,
                            onPressed: product == null
                                ? null
                                : () => context.go('/produto/${product.slug}'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 52,
                          width: 52,
                          child: OutlinedButton(
                            onPressed: isUpdating
                                ? null
                                : () => _remove(context, ref),
                            child: isUpdating
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.delete_outline_rounded),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _remove(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(wishlistControllerProvider.notifier)
          .remove(item.productId);
      if (!context.mounted) {
        return;
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('Removido da wishlist.')),
      );
    } catch (_) {
      if (!context.mounted) {
        return;
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('Não foi possível atualizar a wishlist.')),
      );
    }
  }
}

class _WishlistImage extends StatelessWidget {
  const _WishlistImage({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.10),
      ),
      child: Center(
        child: Icon(
          Icons.toys_rounded,
          color: Theme.of(context).colorScheme.primary,
          size: 44,
        ),
      ),
    );

    final resolvedUrl = resolveImageUrl(imageUrl);
    if (resolvedUrl.isEmpty) {
      return fallback;
    }

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: BoxFit.cover,
      memCacheWidth: 360,
      memCacheHeight: 420,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}
