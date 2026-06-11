import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../catalog/data/product_models.dart';

class ProductImageGallery extends StatefulWidget {
  const ProductImageGallery({required this.images, super.key});

  final List<ProductImage> images;

  @override
  State<ProductImageGallery> createState() => _ProductImageGalleryState();
}

class _ProductImageGalleryState extends State<ProductImageGallery> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedImage = widget.images.isEmpty
        ? null
        : widget.images[_selectedIndex];

    return Column(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: _ImageFrame(image: selectedImage),
          ),
        ),
        if (widget.images.length > 1) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 76,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: widget.images.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final image = widget.images[index];
                final isSelected = index == _selectedIndex;

                return InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => setState(() => _selectedIndex = index),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.outlineVariant.withValues(
                                alpha: 0.5,
                              ),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(9),
                      child: SizedBox(
                        width: 76,
                        child: _ImageFrame(image: image, iconSize: 28),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _ImageFrame extends StatelessWidget {
  const _ImageFrame({required this.image, this.iconSize = 72});

  final ProductImage? image;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.primary.withValues(alpha: 0.1),
      child: Icon(
        Icons.toys_rounded,
        color: theme.colorScheme.primary,
        size: iconSize,
      ),
    );

    if (image == null || image!.url.isEmpty) {
      return fallback;
    }

    return CachedNetworkImage(
      imageUrl: image!.url,
      fit: BoxFit.cover,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}
