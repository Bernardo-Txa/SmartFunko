import 'package:flutter/material.dart';

import '../../shared/branding/smart_funko_brand.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/smart_progress.dart';

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: SafeArea(
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 240),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return Opacity(
                opacity: value,
                child: Transform.translate(
                  offset: Offset(0, 8 * (1 - value)),
                  child: child,
                ),
              );
            },
            child: const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SmartFunkoLogo(
                  variant: SmartFunkoLogoVariant.horizontalWhite,
                  width: 220,
                ),
                SizedBox(height: 28),
                SmartSpinner(size: 28, strokeWidth: 2.5),
                SizedBox(height: 14),
                Text(
                  'Preparando sua coleção',
                  style: TextStyle(
                    color: AppColors.darkTextSecondary,
                    fontWeight: FontWeight.w600,
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
