import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/cache/memory_cache.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import 'order_models.dart';

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(
    apiClient: ref.watch(apiClientProvider),
    cache: ref.watch(memoryCacheProvider),
  ),
);
final ordersProvider = FutureProvider<List<OrderSummary>>(
  (ref) => ref.watch(ordersRepositoryProvider).getOrders(),
);
final orderDetailProvider = FutureProvider.family<OrderDetail, String>((
  ref,
  identifier,
) {
  if (!ref.watch(authControllerProvider).isAuthenticated) {
    throw const OrdersUnauthenticatedException();
  }
  return ref.watch(ordersRepositoryProvider).getOrder(identifier);
});

List<T> appendUniqueById<T>(
  List<T> current,
  Iterable<T> next,
  String Function(T) idOf,
) {
  final seen = current.map(idOf).toSet();
  return [...current, ...next.where((item) => seen.add(idOf(item)))];
}

class OrdersRepository {
  const OrdersRepository({
    required ApiClient apiClient,
    required MemoryCache cache,
  }) : _apiClient = apiClient,
       _cache = cache;
  final ApiClient _apiClient;
  final MemoryCache _cache;

  Future<List<OrderSummary>> getOrders({bool forceRefresh = false}) {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return Future.value(const []);
    return _cache.getOrLoad<List<OrderSummary>>(
      key: 'user:$userId:orders-v2',
      debugLabel: 'GET mobile orders-v2',
      ttl: const Duration(seconds: 30),
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final orders = <OrderSummary>[];
        String? cursor;
        do {
          final response = await _apiClient.get<Map<String, dynamic>>(
            '/api/v1/mobile/orders-v2',
            queryParameters: {'limit': 50, 'cursor': ?cursor},
          );
          final data = response.data?['data'];
          if (data is! Map<String, dynamic> || data['items'] is! List) {
            throw const OrdersShapeException();
          }
          final page = (data['items'] as List)
              .whereType<Map<String, dynamic>>()
              .map(OrderSummary.fromJson);
          final merged = appendUniqueById(orders, page, (order) => order.id);
          orders
            ..clear()
            ..addAll(merged);
          cursor = data['nextCursor'] as String?;
        } while (cursor != null && orders.length < 1000);
        return orders;
      },
    );
  }

  Future<OrderDetail> getOrder(
    String identifier, {
    bool forceRefresh = false,
  }) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) throw const OrdersUnauthenticatedException();
    return _cache.getOrLoad<OrderDetail>(
      key: 'user:$userId:order-v2:$identifier',
      debugLabel: 'GET mobile order-v2',
      ttl: const Duration(seconds: 30),
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/mobile/orders-v2/${Uri.encodeComponent(identifier)}',
        );
        final data = response.data?['data'];
        if (data is! Map<String, dynamic>) throw const OrdersShapeException();
        return OrderSummary.fromJson(data);
      },
    );
  }

  Future<OrderDetail> createOrder(
    CreateOrderRequest request, {
    required String idempotencyKey,
  }) async {
    _requireMobileWritesEnabled();
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/mobile/orders-v2',
      data: request.toJson(),
      options: Options(headers: {'Idempotency-Key': idempotencyKey}),
    );
    final data = response.data?['data'];
    if (data is! Map<String, dynamic>) throw const OrdersShapeException();
    final order = OrderSummary.fromJson(data);
    invalidateOrders();
    return order;
  }

  Future<PaymentSession> createPaymentSession(
    List<String> orderIds, {
    required String idempotencyKey,
  }) async {
    _requireMobileWritesEnabled();
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/mobile/orders-v2/payment-sessions',
      data: {'orderIds': orderIds},
      options: Options(headers: {'Idempotency-Key': idempotencyKey}),
    );
    final data = response.data?['data'];
    if (data is! Map<String, dynamic>) throw const OrdersShapeException();
    invalidateOrders();
    return PaymentSession.fromJson(data);
  }

  Future<bool> syncPaymentSession(String id) async {
    _requireMobileWritesEnabled();
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/mobile/orders-v2/payment-sessions/${Uri.encodeComponent(id)}/sync',
    );
    invalidateOrders();
    return response.data?['data']?['paid'] == true;
  }

  String newIdempotencyKey(String scope) =>
      '$scope-${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';
  void invalidateOrders([String? _]) => _cache.invalidatePrefix('user:');
  void invalidateOrderByNumber(String identifier, [String? userId]) =>
      _cache.invalidatePrefix('user:');
  bool get _tokenPresent =>
      Supabase.instance.client.auth.currentSession?.accessToken
          .trim()
          .isNotEmpty ??
      false;

  void _requireMobileWritesEnabled() {
    if (!AppConfig.mobileWritesEnabled) {
      throw const MobileWritesDisabledException();
    }
  }
}

class MobileWritesDisabledException implements Exception {
  const MobileWritesDisabledException();

  @override
  String toString() => 'Operações de escrita estão desativadas neste build.';
}

class OrdersShapeException implements Exception {
  const OrdersShapeException();
}

class OrdersUnauthenticatedException implements Exception {
  const OrdersUnauthenticatedException();
}
