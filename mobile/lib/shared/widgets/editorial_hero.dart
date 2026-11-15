import 'package:flutter/material.dart';

import '../branding/smart_funko_brand.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

enum EditorialHeroAlignment { start, center }

enum EditorialHeroLayout { asymmetric, leadingCentered }

class EditorialHero extends StatelessWidget {
  const EditorialHero({
    required this.title,
    required this.highlight,
    required this.subtitle,
    this.eyebrow,
    this.image,
    this.actions = const [],
    this.alignment = EditorialHeroAlignment.start,
    this.layout = EditorialHeroLayout.asymmetric,
    this.showLogo = true,
    this.compact = false,
    super.key,
  });

  final String title;
  final String highlight;
  final String subtitle;
  final String? eyebrow;
  final Widget? image;
  final List<Widget> actions;
  final EditorialHeroAlignment alignment;
  final EditorialHeroLayout layout;
  final bool showLogo;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final centered = alignment == EditorialHeroAlignment.center;
    final textAlign = centered ? TextAlign.center : TextAlign.start;
    final crossAxisAlignment = centered
        ? CrossAxisAlignment.center
        : CrossAxisAlignment.start;

    return Semantics(
      container: true,
      header: true,
      child: RepaintBoundary(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          child: Container(
            width: double.infinity,
            constraints: layout == EditorialHeroLayout.asymmetric
                ? BoxConstraints(minHeight: compact ? 154 : 220)
                : const BoxConstraints(),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.surfaceElevated,
                  AppColors.surfaceIntermediate,
                ],
              ),
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: Stack(
              children: [
                const Positioned.fill(
                  child: ExcludeSemantics(
                    child: CustomPaint(painter: _HeroPainter()),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.all(compact ? 18 : 20),
                  child: layout == EditorialHeroLayout.leadingCentered
                      ? _LeadingCenteredHeroContent(
                          title: title,
                          highlight: highlight,
                          subtitle: subtitle,
                          image: image,
                          compact: compact,
                        )
                      : Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              flex: 7,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: crossAxisAlignment,
                                children: [
                                  if (showLogo) ...[
                                    const SmartFunkoLogo(
                                      variant:
                                          SmartFunkoLogoVariant.horizontalWhite,
                                      width: 142,
                                    ),
                                    SizedBox(height: compact ? 12 : 16),
                                  ],
                                  if (eyebrow?.trim().isNotEmpty == true) ...[
                                    Text(
                                      eyebrow!,
                                      textAlign: textAlign,
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                  ],
                                  Text.rich(
                                    TextSpan(
                                      style: TextStyle(
                                        color: AppColors.textPrimary,
                                        fontSize: compact ? 23 : 28,
                                        height: 1.04,
                                        fontWeight: FontWeight.w900,
                                      ),
                                      children: _titleSpans(title, highlight),
                                    ),
                                    textAlign: textAlign,
                                    maxLines: compact ? 2 : 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 9),
                                  Text(
                                    subtitle,
                                    textAlign: textAlign,
                                    maxLines: compact ? 2 : 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                      height: 1.38,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (actions.isNotEmpty) ...[
                                    const SizedBox(height: 16),
                                    Wrap(
                                      spacing: 10,
                                      runSpacing: 10,
                                      children: actions,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (image != null) ...[
                              const SizedBox(width: 10),
                              Flexible(
                                flex: 3,
                                child: ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxHeight: compact ? 112 : 178,
                                    maxWidth: compact ? 104 : 150,
                                  ),
                                  child: image,
                                ),
                              ),
                            ],
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<InlineSpan> _titleSpans(String value, String highlighted) {
    final index = value.toLowerCase().indexOf(highlighted.toLowerCase());
    if (index < 0 || highlighted.isEmpty) return [TextSpan(text: value)];
    return [
      TextSpan(text: value.substring(0, index)),
      TextSpan(
        text: value.substring(index, index + highlighted.length),
        style: const TextStyle(color: AppColors.brandYellow),
      ),
      TextSpan(text: value.substring(index + highlighted.length)),
    ];
  }
}

class _LeadingCenteredHeroContent extends StatelessWidget {
  const _LeadingCenteredHeroContent({
    required this.title,
    required this.highlight,
    required this.subtitle,
    required this.image,
    required this.compact,
  });

  final String title;
  final String highlight;
  final String subtitle;
  final Widget? image;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: compact ? 82 : 96,
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: compact ? 72 : 84,
                maxHeight: compact ? 72 : 84,
              ),
              child: image,
            ),
          ),
        ),
        SizedBox(width: compact ? 14 : 18),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: compact ? 23 : 28,
                    height: 1.08,
                    fontWeight: FontWeight.w900,
                  ),
                  children: _highlightedTitleSpans(title, highlight),
                ),
                textAlign: TextAlign.start,
              ),
              const SizedBox(height: 9),
              Text(
                subtitle,
                textAlign: TextAlign.start,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.38,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

List<InlineSpan> _highlightedTitleSpans(String value, String highlighted) {
  final index = value.toLowerCase().indexOf(highlighted.toLowerCase());
  if (index < 0 || highlighted.isEmpty) return [TextSpan(text: value)];
  return [
    TextSpan(text: value.substring(0, index)),
    TextSpan(
      text: value.substring(index, index + highlighted.length),
      style: const TextStyle(color: AppColors.brandYellow),
    ),
    TextSpan(text: value.substring(index + highlighted.length)),
  ];
}

class _HeroPainter extends CustomPainter {
  const _HeroPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final blue = Paint()..color = AppColors.border.withValues(alpha: 0.24);
    final yellow = Paint()
      ..color = AppColors.brandYellow.withValues(alpha: 0.12);
    canvas.drawCircle(
      Offset(size.width * 0.94, size.height * 0.08),
      size.width * 0.28,
      blue,
    );
    canvas.drawCircle(
      Offset(size.width * 0.82, size.height * 1.08),
      size.width * 0.24,
      yellow,
    );
    canvas.drawCircle(
      Offset(size.width * 0.08, size.height * 1.12),
      size.width * 0.18,
      blue,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
