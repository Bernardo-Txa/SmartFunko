import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/network/image_url_resolver.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_shadows.dart';
import '../../../shared/widgets/pressable_scale.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/smart_progress.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/product_models.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    required this.product,
    required this.onDetails,
    required this.onAddToCart,
    this.onConsult,
    this.isWishlisted = false,
    this.isWishlistUpdating = false,
    this.onToggleWishlist,
    super.key,
  });

  final ProductSummary product;
  final VoidCallback onDetails;
  final VoidCallback onAddToCart;
  final VoidCallback? onConsult;
  final bool isWishlisted;
  final bool isWishlistUpdating;
  final VoidCallback? onToggleWishlist;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borderColor = product.special
        ? AppColors.brandYellow
        : AppColors.brandNavy.withValues(alpha: 0.20);

    return PressableScale(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: onDetails,
          splashColor: AppColors.primary.withValues(alpha: 0.06),
          highlightColor: AppColors.primary.withValues(alpha: 0.04),
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.brandSky,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: borderColor),
              boxShadow: AppShadows.card,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: AspectRatio(
                      // Keep enough vertical room for two-line product names and
                      // the accessible CTA at the widest two-column phone size.
                      aspectRatio: 1.16,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                            child: _ProductImage(imageUrl: product.imageUrl),
                          ),
                          Positioned(
                            left: 8,
                            top: 8,
                            child: StatusBadge(label: product.status.label),
                          ),
                          if (onToggleWishlist != null)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: _WishlistIconButton(
                                isWishlisted: isWishlisted,
                                isLoading: isWishlistUpdating,
                                onPressed: onToggleWishlist,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (product.special) ...[
                            const _InlinePill(
                              label: 'Special',
                              icon: Icons.star_rounded,
                            ),
                            const SizedBox(height: 8),
                          ],
                          Text(
                            product.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: AppColors.lightTextPrimary,
                              fontWeight: FontWeight.w700,
                              height: 1.15,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            product.supplierName ??
                                product.category ??
                                'SmartFunko',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 9),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: AppColors.brandYellow,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 5,
                              ),
                              child: Text(
                                product.price.formatted,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: AppColors.brandNavy,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                          const Spacer(),
                          PrimaryButton(
                            label: product.canAddToCart
                                ? 'Adicionar'
                                : 'Tenho interesse',
                            icon: product.canAddToCart
                                ? Icons.add_shopping_cart_rounded
                                : Icons.open_in_new_rounded,
                            fullWidth: true,
                            onPressed: product.canAddToCart
                                ? onAddToCart
                                : onConsult,
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
    final color = isWishlisted ? AppColors.danger : AppColors.brandNavy;

    return Material(
      color: AppColors.imageSurface.withValues(alpha: 0.96),
      shape: const CircleBorder(),
      elevation: 4,
      child: SizedBox.square(
        dimension: 38,
        child: IconButton(
          tooltip: isWishlisted
              ? 'Remover dos favoritos'
              : 'Salvar nos favoritos',
          onPressed: isLoading ? null : onPressed,
          icon: isLoading
              ? const SizedBox.square(
                  dimension: 18,
                  child: SmartSpinner(size: 18, strokeWidth: 2),
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
  const _ProductImage({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final fallback = DecoratedBox(
      decoration: const BoxDecoration(color: AppColors.imageSurface),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.image_outlined, color: AppColors.brandSky, size: 32),
            SizedBox(height: 8),
            Text(
              'Imagem em breve',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.lightTextSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
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

    return ColoredBox(
      color: AppColors.imageSurface,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: CachedNetworkImage(
          imageUrl: resolvedUrl,
          fit: BoxFit.contain,
          memCacheWidth: 420,
          memCacheHeight: 520,
          placeholder: (context, url) => fallback,
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }
}

class _InlinePill extends StatelessWidget {
  const _InlinePill({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.brandYellow.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: AppColors.brandYellow),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.brandNavy, size: 13),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.brandNavy,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
