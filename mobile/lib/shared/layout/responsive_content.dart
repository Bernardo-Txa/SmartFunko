import 'package:flutter/material.dart';

import '../theme/app_breakpoints.dart';

double responsiveMaxWidth(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= AppBreakpoints.desktop) return 760;
  if (width >= 900) return 720;
  if (width >= AppBreakpoints.tablet) return 680;
  return width;
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
