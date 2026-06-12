import 'package:flutter/material.dart';

class AppTextStyles {
  const AppTextStyles._();

  static TextTheme build(ColorScheme scheme) {
    return TextTheme(
      headlineLarge: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w900,
      ),
      headlineMedium: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w900,
      ),
      headlineSmall: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w900,
      ),
      titleLarge: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w900,
      ),
      titleMedium: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w800,
      ),
      titleSmall: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w800,
      ),
      bodyLarge: TextStyle(color: scheme.onSurface),
      bodyMedium: TextStyle(color: scheme.onSurface),
      bodySmall: TextStyle(color: scheme.onSurfaceVariant),
      labelLarge: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w800,
      ),
      labelMedium: TextStyle(
        color: scheme.onSurfaceVariant,
        fontWeight: FontWeight.w700,
      ),
      labelSmall: TextStyle(
        color: scheme.onSurfaceVariant,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
