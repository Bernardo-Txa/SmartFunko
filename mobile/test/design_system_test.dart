import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/app/theme.dart';
import 'package:smart_funkos/shared/theme/app_colors.dart';
import 'package:smart_funkos/shared/theme/app_sizes.dart';
import 'package:smart_funkos/shared/widgets/primary_button.dart';
import 'package:smart_funkos/shared/widgets/editorial_hero.dart';
import 'package:smart_funkos/features/catalog/data/product_models.dart';
import 'package:smart_funkos/features/catalog/widgets/product_card.dart';

void main() {
  test('official palette exposes the expected semantic tokens', () {
    expect(AppColors.brandNavy, const Color(0xFF141C33));
    expect(AppColors.surfacePrimary, const Color(0xFF2B4267));
    expect(AppColors.surfaceElevated, const Color(0xFF334F78));
    expect(AppColors.surfaceIntermediate, const Color(0xFF1E2C49));
    expect(AppColors.navigationSurface, const Color(0xFF17213A));
    expect(AppColors.border, const Color(0xFF405D86));
    expect(AppColors.brandYellow, const Color(0xFFFFC20D));
    expect(AppColors.textPrimary, const Color(0xFFF2F5FA));
    expect(AppColors.textSecondary, const Color(0xFFBAC5D6));
    expect(AppColors.disabled, const Color(0xFF7F8DA5));
    expect(AppColors.imageSurface, const Color(0xFFDCE5EE));
    expect(AppColors.onAction, AppColors.brandNavy);
    expect(AppColors.brandSky, isNot(const Color(0xFF96B3D1)));
    expect(SmartFunkosTheme.dark.scaffoldBackgroundColor, AppColors.brandNavy);
    expect(
      SmartFunkosTheme.dark.navigationBarTheme.backgroundColor?.toARGB32(),
      AppColors.navigationSurface.withValues(alpha: 0.98).toARGB32(),
    );
  });

  test('official text and action pairs meet WCAG AA contrast', () {
    expect(
      _contrast(AppColors.textPrimary, AppColors.brandNavy),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.textPrimary, AppColors.surfacePrimary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.textSecondary, AppColors.surfacePrimary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.disabled, AppColors.brandNavy),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.onAction, AppColors.brandYellow),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.textSecondary, AppColors.surfaceIntermediate),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(AppColors.textPrimary, AppColors.navigationSurface),
      greaterThanOrEqualTo(4.5),
    );
  });

  testWidgets('primary button provides a minimum accessible touch target', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: SmartFunkosTheme.dark,
        home: Scaffold(
          body: Center(
            child: PrimaryButton(label: 'Continuar', onPressed: () {}),
          ),
        ),
      ),
    );

    final size = tester.getSize(find.byType(FilledButton));
    expect(size.height, greaterThanOrEqualTo(AppSizes.minimumTouchTarget));
    expect(
      SmartFunkosTheme.dark.filledButtonTheme.style?.backgroundColor?.resolve(
        <WidgetState>{},
      ),
      AppColors.brandYellow,
    );
  });

  testWidgets('press feedback respects reduced motion', (tester) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          theme: SmartFunkosTheme.dark,
          home: Scaffold(
            body: PrimaryButton(label: 'Continuar', onPressed: () {}),
          ),
        ),
      ),
    );

    await tester.press(find.byType(FilledButton));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  for (final width in <double>[360, 390, 430]) {
    testWidgets(
      'leading hero centers its icon against multiline text at ${width.toInt()}px',
      (tester) async {
        tester.view.physicalSize = Size(width, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          MaterialApp(
            theme: SmartFunkosTheme.dark,
            home: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(1.35)),
              child: const Scaffold(
                body: Padding(
                  padding: EdgeInsets.all(16),
                  child: EditorialHero(
                    title: 'Catálogo único com título longo',
                    highlight: 'único',
                    subtitle:
                        'Subtítulo ampliado que pode ocupar mais de uma linha.',
                    compact: true,
                    layout: EditorialHeroLayout.leadingCentered,
                    image: Icon(
                      Icons.storefront_rounded,
                      key: Key('leading-icon'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pump();

        final iconCenter = tester
            .getCenter(find.byKey(const Key('leading-icon')))
            .dy;
        final titleRect = tester.getRect(
          find.text('Catálogo único com título longo'),
        );
        final subtitleRect = tester.getRect(
          find.text('Subtítulo ampliado que pode ocupar mais de uma linha.'),
        );
        final textCenter = (titleRect.top + subtitleRect.bottom) / 2;
        expect((iconCenter - textCenter).abs(), lessThan(1));
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('editorial hero remains responsive at ${width.toInt()}px', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: SmartFunkosTheme.dark,
          home: const Scaffold(
            body: Padding(
              padding: EdgeInsets.all(16),
              child: EditorialHero(
                title: 'Sua coleção começa aqui',
                highlight: 'coleção',
                subtitle: 'Uma descrição real com leitura confortável.',
                compact: true,
                image: Icon(Icons.inventory_2_outlined, size: 64),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.textContaining('coleção'), findsOneWidget);
    });

    testWidgets('product card handles long names at ${width.toInt()}px', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const product = ProductSummary(
        id: 'product-id',
        slug: 'produto-longo',
        name: 'Funko Pop com um nome muito longo para validar responsividade',
        price: ProductPrice(123456.78),
        status: ProductStatus.available,
        special: true,
        supplierName: 'Fornecedor com nome extenso',
        variantId: 'variant-id',
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: SmartFunkosTheme.dark,
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: (width - 52) / 2,
                height: 368,
                child: ProductCard(
                  product: product,
                  onDetails: () {},
                  onAddToCart: () {},
                ),
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Adicionar'), findsOneWidget);
    });
  }
}

double _contrast(Color foreground, Color background) {
  final lighter = _luminance(foreground);
  final darker = _luminance(background);
  final high = lighter > darker ? lighter : darker;
  final low = lighter > darker ? darker : lighter;
  return (high + 0.05) / (low + 0.05);
}

double _luminance(Color color) => color.computeLuminance();
