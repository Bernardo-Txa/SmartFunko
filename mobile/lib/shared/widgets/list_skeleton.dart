import 'package:flutter/material.dart';

import 'smart_card.dart';

class ListSkeleton extends StatelessWidget {
  const ListSkeleton({this.itemCount = 4, this.imageSize = 72, super.key});

  final int itemCount;
  final double imageSize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.28,
    );

    return Column(
      children: [
        for (var index = 0; index < itemCount; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: SmartCard(
              child: Row(
                children: [
                  _SkeletonBox(
                    color: color,
                    height: imageSize,
                    width: imageSize,
                    radius: 12,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _SkeletonBox(color: color, height: 16, width: 180),
                        const SizedBox(height: 10),
                        _SkeletonBox(color: color, height: 12, width: 120),
                        const SizedBox(height: 12),
                        _SkeletonBox(color: color, height: 18, width: 92),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({
    required this.color,
    required this.height,
    required this.width,
    this.radius = 8,
  });

  final Color color;
  final double height;
  final double width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
