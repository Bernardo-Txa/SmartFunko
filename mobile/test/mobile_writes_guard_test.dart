import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/core/config/app_config.dart';

void main() {
  test('order creation and payments are independently disabled by default', () {
    expect(AppConfig.mobileOrderCreationEnabled, isFalse);
    expect(AppConfig.mobilePaymentsEnabled, isFalse);
  });

  test('order and payment methods enforce their own central guards', () async {
    final source = await File(
      'lib/features/orders/data/orders_repository.dart',
    ).readAsString();

    expect(
      RegExp(r'_requireOrderCreationEnabled\(\);').allMatches(source).length,
      1,
    );
    expect(
      RegExp(r'_requirePaymentsEnabled\(\);').allMatches(source).length,
      2,
    );
  });

  test('all four feature combinations remain explicit', () {
    for (final orderCreation in [false, true]) {
      for (final payments in [false, true]) {
        final flags = MobileFeatureFlags(
          orderCreation: orderCreation,
          payments: payments,
        );
        expect(flags.canCreateOrder, orderCreation);
        expect(flags.canPay, payments);
      }
    }
  });

  test('order creation never enables payments implicitly', () {
    const flags = MobileFeatureFlags(orderCreation: true, payments: false);
    expect(flags.canCreateOrder, isTrue);
    expect(flags.canPay, isFalse);
  });
}
