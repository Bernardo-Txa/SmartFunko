import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import 'smart_card.dart';

class SmartSkeleton extends StatefulWidget {
  const SmartSkeleton({
    required this.child,
    this.baseColor,
    this.highlightColor,
    super.key,
  });

  final Widget child;
  final Color? baseColor;
  final Color? highlightColor;

  @override
  State<SmartSkeleton> createState() => _SmartSkeletonState();
}

class _SmartSkeletonState extends State<SmartSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1300),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base =
        widget.baseColor ?? AppColors.darkSurfaceHighest.withValues(alpha: 0.5);
    final highlight =
        widget.highlightColor ?? AppColors.primary.withValues(alpha: 0.14);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final alignment = Alignment.lerp(
          Alignment.centerLeft,
          Alignment.centerRight,
          _controller.value,
        )!;

        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [base, highlight, base],
              stops: const [0.22, 0.5, 0.78],
              transform: _SlidingGradientTransform(alignment.x),
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SmartSkeleton(
      child: SmartCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              flex: 5,
              child: SkeletonBox(
                width: double.infinity,
                height: double.infinity,
              ),
            ),
            const SizedBox(height: 12),
            const SkeletonBox(width: 92, height: 24, radius: AppRadius.pill),
            const SizedBox(height: 12),
            const SkeletonBox(width: double.infinity, height: 18),
            const SizedBox(height: 8),
            const SkeletonBox(width: 130, height: 14),
            const SizedBox(height: 12),
            const SkeletonBox(width: 96, height: 20),
            const Spacer(),
            SkeletonBox(
              width: double.infinity,
              height: 52,
              radius: AppRadius.md,
              color: AppColors.primary.withValues(alpha: 0.22),
            ),
          ],
        ),
      ),
    );
  }
}

class OrderCardSkeleton extends StatelessWidget {
  const OrderCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ListCardSkeleton(imageSize: 56);
  }
}

class RaffleCardSkeleton extends StatelessWidget {
  const RaffleCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ListCardSkeleton(imageSize: 92);
  }
}

class HomeShortcutSkeleton extends StatelessWidget {
  const HomeShortcutSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const SmartSkeleton(
      child: SmartCard(
        child: SizedBox(
          height: 112,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 38, height: 38, radius: AppRadius.sm),
              Spacer(),
              SkeletonBox(width: 100, height: 16),
              SizedBox(height: 8),
              SkeletonBox(width: 132, height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _ListCardSkeleton extends StatelessWidget {
  const _ListCardSkeleton({required this.imageSize});

  final double imageSize;

  @override
  Widget build(BuildContext context) {
    return SmartSkeleton(
      child: SmartCard(
        child: Row(
          children: [
            SkeletonBox(width: imageSize, height: imageSize, radius: 12),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: double.infinity, height: 16),
                  SizedBox(height: 10),
                  SkeletonBox(width: 140, height: 12),
                  SizedBox(height: 12),
                  SkeletonBox(width: 96, height: 18),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    required this.width,
    required this.height,
    this.radius = 8,
    this.color,
    super.key,
  });

  final double width;
  final double height;
  final double radius;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? AppColors.darkSurfaceHighest.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  const _SlidingGradientTransform(this.offset);

  final double offset;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * offset, 0, 0);
  }
}
