import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/config/app_config.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';
import '../cart/data/cart_controller.dart';
import '../catalog/data/catalog_repository.dart';
import 'data/product_detail.dart';
import 'widgets/product_badges.dart';
import 'widgets/product_image_gallery.dart';
import 'widgets/product_price_block.dart';

class ProductDetailPage extends ConsumerWidget {
  const ProductDetailPage({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productDetailProvider(slug));

    return AppScaffold(
      title: 'Produto',
      showBackButton: true,
      body: product.when(
        data: (item) => _ProductDetailContent(product: item),
        loading: () => const LoadingState(message: 'Carregando produto...'),
        error: (error, stackTrace) {
          final notFound = error is ProductNotFoundException;
          return ErrorState(
            message: notFound
                ? 'Produto não encontrado.'
                : 'Não foi possível carregar este produto.',
            onRetry: () => ref.invalidate(productDetailProvider(slug)),
          );
        },
      ),
    );
  }
}

class _ProductDetailContent extends ConsumerWidget {
  const _ProductDetailContent({required this.product});

  final ProductDetail product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final shareUrl = '${AppConfig.apiBaseUrl}/produto/${product.slug}';

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 720;
        final gallery = ProductImageGallery(images: product.images);
        final details = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              product.name,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              [
                if (product.supplierName != null) product.supplierName,
                if (product.category != null) product.category,
                if (product.subcategory != null) product.subcategory,
              ].join(' • ').ifEmpty('Smart Funkos'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 14),
            ProductBadges(badges: product.badges),
            const SizedBox(height: 16),
            ProductPriceBlock(price: product.price, status: product.status),
            const SizedBox(height: 16),
            SmartCard(
              child: Text(
                product.description,
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
              ),
            ),
            const SizedBox(height: 18),
            PrimaryButton(
              label: 'Adicionar ao carrinho',
              icon: Icons.add_shopping_cart_rounded,
              fullWidth: true,
              onPressed: product.status.isAvailable
                  ? () {
                      ref
                          .read(cartControllerProvider.notifier)
                          .addProduct(product.toSummary());
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '${product.name} adicionado ao carrinho.',
                          ),
                          action: SnackBarAction(
                            label: 'Ver',
                            onPressed: () => context.go('/carrinho'),
                          ),
                        ),
                      );
                    }
                  : null,
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'Compartilhar',
              icon: Icons.ios_share_rounded,
              variant: PrimaryButtonVariant.outlined,
              fullWidth: true,
              onPressed: () =>
                  Share.share('Veja este produto na Smart Funkos: $shareUrl'),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'Continuar compra',
              icon: Icons.shopping_bag_rounded,
              variant: PrimaryButtonVariant.outlined,
              fullWidth: true,
              onPressed: () => context.go('/carrinho'),
            ),
          ],
        );

        if (!wide) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [gallery, const SizedBox(height: 18), details],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: gallery),
            const SizedBox(width: 24),
            Expanded(child: details),
          ],
        );
      },
    );
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
