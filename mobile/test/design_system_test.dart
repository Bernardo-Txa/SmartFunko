import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/app/theme.dart';
import 'package:smart_funkos/shared/theme/app_colors.dart';
import 'package:smart_funkos/shared/theme/app_sizes.dart';
import 'package:smart_funkos/shared/widgets/primary_button.dart';
import 'package:smart_funkos/features/catalog/data/product_models.dart';
import 'package:smart_funkos/features/catalog/widgets/product_card.dart';

void main() {
  test('brand action colors keep navy text on yellow', () {
    expect(AppColors.brandYellow, const Color(0xFFFFC20D));
    expect(AppColors.onAction, AppColors.brandNavy);
    expect(SmartFunkosTheme.dark.scaffoldBackgroundColor, AppColors.brandNavy);
    expect(
      SmartFunkosTheme.dark.navigationBarTheme.backgroundColor,
      isNot(AppColors.lightSurface),
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
