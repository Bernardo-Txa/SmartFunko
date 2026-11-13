import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/core/cache/memory_cache.dart';

void main() {
  test(
    'logout invalidation prevents an old account request from repopulating cache',
    () async {
      final cache = MemoryCache();
      final response = Completer<String>();
      final request = cache.getOrLoad<String>(
        key: 'user:a:orders-v2',
        debugLabel: 'orders',
        ttl: const Duration(minutes: 1),
        loader: () => response.future,
      );
      cache.invalidatePrefix('user:');
      response.complete('account-a');
      expect(await request, 'account-a');
      expect(cache.get<String>('user:a:orders-v2'), isNull);
    },
  );
}
