import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('MVP navigation keeps only supported destinations', () async {
    final router = await File('lib/app/router.dart').readAsString();

    for (final route in <String>[
      "path: '/'",
      "path: '/catalogo'",
      "path: '/carrinho'",
      "path: '/pedidos'",
      "path: '/perfil'",
    ]) {
      expect(router, contains(route));
    }

    for (final unsupported in <String>[
      "path: '/wishlist'",
      "path: '/rifas'",
      "path: '/minhas-rifas'",
      "path: '/clube'",
      "path: '/popflix'",
    ]) {
      expect(router, isNot(contains(unsupported)));
    }
  });
}
