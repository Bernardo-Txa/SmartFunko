import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/core/config/app_config.dart';

void main() {
  test('production writes are opt-in and disabled by default', () {
    expect(AppConfig.mobileWritesEnabled, isFalse);
  });

  test('all mobile write methods enforce the central guard', () async {
    final source = await File(
      'lib/features/orders/data/orders_repository.dart',
    ).readAsString();

    expect(
      RegExp(r'_requireMobileWritesEnabled\(\);').allMatches(source).length,
      3,
    );
  });
}
