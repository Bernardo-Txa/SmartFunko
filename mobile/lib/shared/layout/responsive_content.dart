import 'package:flutter/material.dart';

double responsiveMaxWidth(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= 1240) return 760;
  if (width >= 900) return 720;
  if (width >= 720) return 680;
  return double.infinity;
}

class ResponsiveContent extends StatelessWidget {
  const ResponsiveContent({required this.child, super.key, this.maxWidth});

  final Widget child;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final effectiveMaxWidth = maxWidth ?? responsiveMaxWidth(context);

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: effectiveMaxWidth),
        child: child,
      ),
    );
  }
}
