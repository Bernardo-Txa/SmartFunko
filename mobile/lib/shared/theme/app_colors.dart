import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color brandNavy = Color(0xFF141C33);
  static const Color brandSky = Color(0xFF96B3D1);
  static const Color brandYellow = Color(0xFFFFC20D);

  // The alternate palette remains branded blue as well. These aliases are
  // intentionally non-white so a future theme switch cannot reintroduce the
  // previous generic white appearance.
  static const Color lightBackground = brandNavy;
  static const Color lightSurface = brandSky;
  static const Color lightSurfaceElevated = Color(0xFFD8E5F2);
  static const Color lightBorder = Color(0xFFD5DFEA);
  static const Color lightTextPrimary = brandNavy;
  static const Color lightTextSecondary = Color(0xFF52627A);

  static const Color darkBackground = brandNavy;
  static const Color darkBackgroundAlt = Color(0xFF10182C);
  static const Color darkSurface = Color(0xFF18223A);
  static const Color darkSurfaceElevated = Color(0xFF1D2843);
  static const Color darkSurfaceHighest = Color(0xFF263451);
  static const Color darkBorder = Color(0xFF2B3956);
  static const Color darkTextPrimary = Color(0xFFEEF4FC);
  static const Color darkTextSecondary = Color(0xFFB8C7DB);
  static const Color disabled = Color(0xFF74849C);
  static const Color imageSurface = Color(0xFFD8E5F2);
  static const Color imageSurfaceStrong = Color(0xFFC8D9EA);

  // Legacy aliases used by intentionally dark promotional surfaces.
  static const Color textPrimary = darkTextPrimary;
  static const Color textSecondary = darkTextSecondary;

  static const Color primary = brandYellow;
  static const Color primarySoft = brandSky;
  static const Color accent = brandYellow;
  static const Color success = Color(0xFF28A66A);
  static const Color warning = Color(0xFFE8892E);
  static const Color danger = Color(0xFFD64545);
  static const Color info = Color(0xFF3D7FC4);
  static const Color onAction = brandNavy;
}
