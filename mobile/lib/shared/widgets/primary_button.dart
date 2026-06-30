import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import 'pressable_scale.dart';
import 'smart_progress.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.variant = PrimaryButtonVariant.filled,
    this.fullWidth = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final PrimaryButtonVariant variant;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = isLoading ? null : onPressed;
    final child = AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: isLoading
          ? const SizedBox(
              key: ValueKey('loading'),
              height: 20,
              width: 20,
              child: SmartSpinner(size: 20, strokeWidth: 2.2),
            )
          : Row(
              key: const ValueKey('content'),
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
              ],
            ),
    );

    final button = SizedBox(
      height: 52,
      child: switch (variant) {
        PrimaryButtonVariant.outlined => OutlinedButton(
          onPressed: effectiveOnPressed,
          child: child,
        ),
        PrimaryButtonVariant.filled => FilledButton(
          onPressed: effectiveOnPressed,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: const Color(0xFF041018),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
          ),
          child: child,
        ),
      },
    );

    final scaledButton = PressableScale(
      enabled: effectiveOnPressed != null,
      child: button,
    );

    if (!fullWidth) {
      return scaledButton;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (!constraints.hasBoundedWidth) {
          return scaledButton;
        }

        return SizedBox(width: double.infinity, child: scaledButton);
      },
    );
  }
}

enum PrimaryButtonVariant { filled, outlined }
