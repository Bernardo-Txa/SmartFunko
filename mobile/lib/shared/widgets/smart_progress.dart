import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class SmartSpinner extends StatefulWidget {
  const SmartSpinner({this.size = 28, this.strokeWidth = 3, super.key});

  final double size;
  final double strokeWidth;

  @override
  State<SmartSpinner> createState() => _SmartSpinnerState();
}

class _SmartSpinnerState extends State<SmartSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.rotate(
            angle: _controller.value * math.pi * 2,
            child: CustomPaint(
              painter: _SmartSpinnerPainter(strokeWidth: widget.strokeWidth),
            ),
          );
        },
      ),
    );
  }
}

class _SmartSpinnerPainter extends CustomPainter {
  const _SmartSpinnerPainter({required this.strokeWidth});

  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final background = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.14)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    final foreground = Paint()
      ..shader = const SweepGradient(
        colors: [AppColors.primary, AppColors.accent, AppColors.primary],
      ).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final inset = strokeWidth / 2;
    final arcRect = Rect.fromLTWH(
      inset,
      inset,
      size.width - strokeWidth,
      size.height - strokeWidth,
    );

    canvas.drawArc(arcRect, 0, math.pi * 2, false, background);
    canvas.drawArc(arcRect, -math.pi / 2, math.pi * 1.35, false, foreground);
  }

  @override
  bool shouldRepaint(covariant _SmartSpinnerPainter oldDelegate) {
    return oldDelegate.strokeWidth != strokeWidth;
  }
}
