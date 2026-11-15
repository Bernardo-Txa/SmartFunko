import 'package:flutter/material.dart';

class AppColors {
  const AppColors._();

  static const Color brandNavy = Color(0xFF141C33);
  static const Color brandSky = Color(0xFF2B4267);
  static const Color brandYellow = Color(0xFFFFC20D);

  static const Color surfacePrimary = Color(0xFF2B4267);
  static const Color surfaceElevated = Color(0xFF334F78);
  static const Color surfaceIntermediate = Color(0xFF1E2C49);
  static const Color navigationSurface = Color(0xFF17213A);
  static const Color border = Color(0xFF405D86);

  // The alternate palette remains branded blue as well. These aliases are
  // intentionally non-white so a future theme switch cannot reintroduce the
  // previous generic white appearance.
  static const Color lightBackground = brandNavy;
  static const Color lightSurface = surfacePrimary;
  static const Color lightSurfaceElevated = surfaceElevated;
  static const Color lightBorder = border;
  static const Color lightTextPrimary = Color(0xFFF2F5FA);
  static const Color lightTextSecondary = Color(0xFFBAC5D6);

  static const Color darkBackground = brandNavy;
  static const Color darkBackgroundAlt = surfaceIntermediate;
  static const Color darkSurface = surfacePrimary;
  static const Color darkSurfaceElevated = surfaceElevated;
  static const Color darkSurfaceHighest = Color(0xFF263957);
  static const Color darkBorder = border;
  static const Color darkTextPrimary = Color(0xFFF2F5FA);
  static const Color darkTextSecondary = Color(0xFFBAC5D6);
  static const Color disabled = Color(0xFF7F8DA5);
  static const Color imageSurface = Color(0xFFDCE5EE);
  static const Color imageSurfaceStrong = Color(0xFFCBD7E3);

  // Legacy aliases used by intentionally dark promotional surfaces.
  static const Color textPrimary = darkTextPrimary;
  static const Color textSecondary = darkTextSecondary;

  static const Color primary = brandYellow;
  static const Color primarySoft = darkTextSecondary;
  static const Color accent = brandYellow;
  static const Color success = Color(0xFF28A66A);
  static const Color warning = Color(0xFFE8892E);
  static const Color danger = Color(0xFFD64545);
  static const Color info = Color(0xFF3D7FC4);
  static const Color onAction = brandNavy;
}
