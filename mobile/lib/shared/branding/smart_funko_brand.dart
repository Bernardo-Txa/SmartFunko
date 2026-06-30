import 'package:flutter/material.dart';

class SmartFunkoBrandAssets {
  const SmartFunkoBrandAssets._();

  static const logoHorizontalWhite =
      'assets/branding/logo_horizontal_white.png';
  static const logoSquare = 'assets/branding/logo_square.png';
  static const logoDark = 'assets/branding/logo_dark.png';
}

enum SmartFunkoLogoVariant { horizontalWhite, square, dark }

class SmartFunkoLogo extends StatelessWidget {
  const SmartFunkoLogo({
    this.variant,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.center,
    this.semanticLabel = 'SmartFunko',
    this.excludeFromSemantics = false,
    super.key,
  });

  final SmartFunkoLogoVariant? variant;
  final double? width;
  final double? height;
  final BoxFit fit;
  final AlignmentGeometry alignment;
  final String semanticLabel;
  final bool excludeFromSemantics;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      _assetFor(context),
      width: width,
      height: height,
      fit: fit,
      alignment: alignment,
      semanticLabel: excludeFromSemantics ? null : semanticLabel,
      excludeFromSemantics: excludeFromSemantics,
    );
  }

  String _assetFor(BuildContext context) {
    final resolvedVariant =
        variant ??
        (Theme.of(context).brightness == Brightness.dark
            ? SmartFunkoLogoVariant.horizontalWhite
            : SmartFunkoLogoVariant.dark);

    return switch (resolvedVariant) {
      SmartFunkoLogoVariant.horizontalWhite =>
        SmartFunkoBrandAssets.logoHorizontalWhite,
      SmartFunkoLogoVariant.square => SmartFunkoBrandAssets.logoSquare,
      SmartFunkoLogoVariant.dark => SmartFunkoBrandAssets.logoDark,
    };
  }
}
