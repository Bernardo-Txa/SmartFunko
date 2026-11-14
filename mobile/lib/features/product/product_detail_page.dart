import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../shared/theme/app_colors.dart';
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
      showDrawerButton: false,
      body: product.when(
        data: (item) => _ProductDetailContent(product: item),
        loading: () => const LoadingState(message: 'Carregando produto...'),
        error: (error, stackTrace) {
          final notFound = error is ProductNotFoundException;
          return ErrorState(
            message: notFound
                ? 'Produto não encontrado.'
                : 'Não foi possível carregar este produto.',
            onRetry: () {
              ref.read(catalogRepositoryProvider).invalidateProductBySlug(slug);
              ref.invalidate(productDetailProvider(slug));
            },
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
    final shareUrl =
        '${AppConfig.normalizedApiBaseUrl}/produto/${product.slug}';

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
            _ProductFacts(product: product),
            const SizedBox(height: 16),
            SmartCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Descrição',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.description,
                    style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            PrimaryButton(
              label: product.canAddToCart
                  ? 'Adicionar ao carrinho'
                  : 'Tenho interesse',
              icon: product.canAddToCart
                  ? Icons.add_shopping_cart_rounded
                  : Icons.open_in_new_rounded,
              fullWidth: true,
              onPressed: product.canAddToCart
                  ? () {
                      ref
                          .read(cartControllerProvider.notifier)
                          .addProduct(product.toSummary());
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text(
                            'Produto adicionado ao carrinho.',
                          ),
                          action: SnackBarAction(
                            label: 'Ver carrinho',
                            onPressed: () => context.go('/carrinho'),
                          ),
                        ),
                      );
                    }
                  : () => _openProductOnWeb(context),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'Compartilhar',
              icon: Icons.ios_share_rounded,
              variant: PrimaryButtonVariant.outlined,
              fullWidth: true,
              onPressed: () => SharePlus.instance.share(
                ShareParams(
                  text: 'Veja este produto na Smart Funkos: $shareUrl',
                ),
              ),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'Voltar ao catálogo',
              icon: Icons.arrow_back_rounded,
              variant: PrimaryButtonVariant.outlined,
              fullWidth: true,
              onPressed: () => context.go('/catalogo'),
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

  Future<void> _openProductOnWeb(BuildContext context) async {
    final url = '${AppConfig.normalizedApiBaseUrl}/produto/${product.slug}';
    final uri = Uri.tryParse(url);

    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o produto.')),
      );
      return;
    }

    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível abrir o produto.')),
        );
      }
    } catch (_) {
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o produto.')),
      );
    }
  }
}

class _ProductFacts extends StatelessWidget {
  const _ProductFacts({required this.product});

  final ProductDetail product;

  @override
  Widget build(BuildContext context) {
    final facts = [
      _ProductFact(label: 'Status', value: product.status.label),
      if (product.sku != null) _ProductFact(label: 'SKU', value: product.sku!),
      if (product.code != null)
        _ProductFact(label: 'Código', value: product.code!),
      if (product.funkoNumber != null)
        _ProductFact(label: 'Número', value: '#${product.funkoNumber}'),
      if (product.source != null)
        _ProductFact(label: 'Origem', value: product.source!),
    ];

    if (facts.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);

    return SmartCard(
      tone: SmartCardTone.sky,
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final fact in facts)
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 128),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    fact.label,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: AppColors.brandNavy.withValues(alpha: 0.70),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    fact.value,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.brandNavy,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ProductFact {
  const _ProductFact({required this.label, required this.value});

  final String label;
  final String value;
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}
