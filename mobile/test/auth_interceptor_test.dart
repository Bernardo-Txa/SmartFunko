import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/core/network/auth_interceptor.dart';

void main() {
  test('mobile V2 endpoints require an authenticated token', () {
    expect(requiresApiAuthentication('/api/v1/mobile/orders-v2'), isTrue);
    expect(
      requiresApiAuthentication('/api/v1/mobile/orders-v2/payment-sessions'),
      isTrue,
    );
    expect(requiresApiAuthentication('/api/v1/public/products'), isFalse);
  });
}
