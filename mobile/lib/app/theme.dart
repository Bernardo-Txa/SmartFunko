import 'package:flutter/material.dart';

class SmartFunkosTheme {
  const SmartFunkosTheme._();

  static const Color _darkBackground = Color(0xFF020617);
  static const Color _darkSurface = Color(0xFF071124);
  static const Color _cyan = Color(0xFF22D3EE);
  static const Color _yellow = Color(0xFFFACC15);
  static const Color _green = Color(0xFF25D366);

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: _cyan,
      brightness: Brightness.dark,
      primary: _cyan,
      secondary: _yellow,
      tertiary: _green,
      surface: _darkSurface,
    );

    return _base(scheme).copyWith(
      scaffoldBackgroundColor: _darkBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: _darkBackground,
        foregroundColor: Color(0xFFE2E8F0),
        centerTitle: false,
        elevation: 0,
      ),
      cardColor: _darkSurface,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF030816),
        indicatorColor: _cyan.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            color: states.contains(WidgetState.selected)
                ? _cyan
                : const Color(0xFF94A3B8),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF0891B2),
      brightness: Brightness.light,
      primary: const Color(0xFF0891B2),
      secondary: const Color(0xFFCA8A04),
      tertiary: const Color(0xFF16A34A),
      surface: const Color(0xFFFFFFFF),
    );

    return _base(scheme).copyWith(
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFF8FAFC),
        foregroundColor: Color(0xFF0F172A),
        centerTitle: false,
        elevation: 0,
      ),
      cardColor: Colors.white,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFF0891B2).withValues(alpha: 0.12),
      ),
    );
  }

  static ThemeData _base(ColorScheme scheme) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      visualDensity: VisualDensity.standard,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: scheme.outlineVariant.withValues(alpha: 0.55),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
