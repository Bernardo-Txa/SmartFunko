import 'package:flutter/material.dart';

class AppTextStyles {
  const AppTextStyles._();

  static TextTheme build(ColorScheme scheme) {
    return TextTheme(
      displayLarge: TextStyle(
        color: scheme.onSurface,
        fontSize: 40,
        height: 1.08,
        fontWeight: FontWeight.w800,
        letterSpacing: -1.2,
      ),
      displayMedium: TextStyle(
        color: scheme.onSurface,
        fontSize: 34,
        height: 1.1,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
      ),
      headlineLarge: TextStyle(
        color: scheme.onSurface,
        fontSize: 28,
        height: 1.15,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
      headlineMedium: TextStyle(
        color: scheme.onSurface,
        fontSize: 24,
        height: 1.2,
        fontWeight: FontWeight.w800,
      ),
      headlineSmall: TextStyle(
        color: scheme.onSurface,
        fontSize: 21,
        height: 1.2,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: TextStyle(
        color: scheme.onSurface,
        fontSize: 20,
        height: 1.25,
        fontWeight: FontWeight.w700,
      ),
      titleMedium: TextStyle(
        color: scheme.onSurface,
        fontSize: 17,
        height: 1.3,
        fontWeight: FontWeight.w700,
      ),
      titleSmall: TextStyle(
        color: scheme.onSurface,
        fontSize: 15,
        height: 1.3,
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: TextStyle(color: scheme.onSurface, fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(
        color: scheme.onSurface,
        fontSize: 14,
        height: 1.45,
      ),
      bodySmall: TextStyle(
        color: scheme.onSurfaceVariant,
        fontSize: 12,
        height: 1.4,
      ),
      labelLarge: TextStyle(
        color: scheme.onSurface,
        fontSize: 15,
        height: 1.2,
        fontWeight: FontWeight.w700,
      ),
      labelMedium: TextStyle(
        color: scheme.onSurfaceVariant,
        fontSize: 12,
        height: 1.2,
        fontWeight: FontWeight.w600,
      ),
      labelSmall: TextStyle(
        color: scheme.onSurfaceVariant,
        fontSize: 11,
        height: 1.2,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
