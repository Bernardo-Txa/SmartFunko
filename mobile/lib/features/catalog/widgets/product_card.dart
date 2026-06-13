import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/network/image_url_resolver.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_shadows.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/price_tag.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/product_models.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    required this.product,
    required this.onDetails,
    required this.onAddToCart,
    this.isWishlisted = false,
    this.isWishlistUpdating = false,
    this.onToggleWishlist,
    super.key,
  });

  final ProductSummary product;
  final VoidCallback onDetails;
  final VoidCallback onAddToCart;
  final bool isWishlisted;
  final bool isWishlistUpdating;
  final VoidCallback? onToggleWishlist;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onDetails,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: product.special
                  ? colorScheme.secondary.withValues(alpha: 0.38)
                  : AppColors.primary.withValues(alpha: 0.10),
            ),
            boxShadow: AppShadows.card,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _ProductImage(
                        imageUrl: product.imageUrl,
                        special: product.special,
                      ),
                      if (onToggleWishlist != null)
                        Positioned(
                          top: 10,
                          right: 10,
                          child: _WishlistIconButton(
                            isWishlisted: isWishlisted,
                            isLoading: isWishlistUpdating,
                            onPressed: onToggleWishlist,
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            StatusBadge(label: product.status.label),
                            if (product.special)
                              StatusBadge(
                                label: 'Especial',
                                icon: Icons.star_rounded,
                                color: colorScheme.secondary,
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          product.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            height: 1.18,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          product.supplierName ??
                              product.category ??
                              'Smart Funkos',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const Spacer(),
                        PriceTag(
                          label: product.price.formatted,
                          subtitle: 'Preço',
                        ),
                        const SizedBox(height: 12),
                        PrimaryButton(
                          label: 'Adicionar',
                          icon: Icons.add_shopping_cart_rounded,
                          fullWidth: true,
                          onPressed: product.isAvailable ? onAddToCart : null,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WishlistIconButton extends StatelessWidget {
  const _WishlistIconButton({
    required this.isWishlisted,
    required this.isLoading,
    required this.onPressed,
  });

  final bool isWishlisted;
  final bool isLoading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = isWishlisted
        ? theme.colorScheme.error
        : theme.colorScheme.onSurface;

    return Material(
      color: theme.cardColor.withValues(alpha: 0.92),
      shape: const CircleBorder(),
      elevation: 4,
      child: SizedBox.square(
        dimension: 42,
        child: IconButton(
          tooltip: isWishlisted
              ? 'Remover dos favoritos'
              : 'Salvar nos favoritos',
          onPressed: isLoading ? null : onPressed,
          icon: isLoading
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(
                  isWishlisted
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: color,
                ),
        ),
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.imageUrl, required this.special});

  final String? imageUrl;
  final bool special;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colorScheme.primary.withValues(alpha: special ? 0.20 : 0.12),
            colorScheme.secondary.withValues(alpha: special ? 0.16 : 0.05),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.toys_rounded,
          color: special ? colorScheme.secondary : colorScheme.primary,
          size: 52,
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
      memCacheWidth: 420,
      memCacheHeight: 520,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}
