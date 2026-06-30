import 'package:flutter/material.dart';

import '../../shared/theme/app_colors.dart';
import '../../shared/branding/smart_funko_brand.dart';
import '../../shared/widgets/loading_state.dart';

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SmartFunkoLogo(
                variant: SmartFunkoLogoVariant.horizontalWhite,
                width: 228,
              ),
              const SizedBox(height: 24),
              const LoadingState(message: 'Preparando sua coleção...'),
            ],
          ),
        ),
      ),
    );
  }
}
