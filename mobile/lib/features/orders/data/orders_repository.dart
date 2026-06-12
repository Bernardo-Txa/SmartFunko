import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/cache/memory_cache.dart';
import '../../../core/network/api_client.dart';
import 'order_models.dart';

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(
    apiClient: ref.watch(apiClientProvider),
    cache: ref.watch(memoryCacheProvider),
  ),
);

final ordersProvider = FutureProvider<List<OrderSummary>>((ref) {
  final auth = ref.watch(authControllerProvider);
  if (auth.isLoading && !auth.isAuthenticated) {
    return const <OrderSummary>[];
  }
  if (!auth.isAuthenticated) {
    return const <OrderSummary>[];
  }

  return ref.watch(ordersRepositoryProvider).getOrders();
});

final orderDetailProvider = FutureProvider.family<OrderDetail, String>((
  ref,
  orderNumber,
) {
  final auth = ref.watch(authControllerProvider);
  if (!auth.isAuthenticated) {
    throw const OrdersUnauthenticatedException();
  }

  return ref.watch(ordersRepositoryProvider).getOrderByNumber(orderNumber);
});

class OrdersRepository {
  const OrdersRepository({
    required ApiClient apiClient,
    required MemoryCache cache,
  }) : _apiClient = apiClient,
       _cache = cache;

  final ApiClient _apiClient;
  final MemoryCache _cache;

  static const Duration _ordersTtl = Duration(seconds: 45);
  static const Duration _orderDetailTtl = Duration(seconds: 45);

  Future<List<OrderSummary>> getOrders({bool forceRefresh = false}) {
    final userId = _currentUserId;
    if (userId == null || userId.isEmpty) {
      return Future.value(const <OrderSummary>[]);
    }

    return _cache.getOrLoad<List<OrderSummary>>(
      key: _ordersCacheKey(userId),
      debugLabel: 'GET /api/v1/me/orders',
      ttl: _ordersTtl,
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/me/orders',
        );
        final rawData = response.data?['data'] ?? response.data;

        if (rawData is List) {
          return rawData
              .whereType<Map<String, dynamic>>()
              .map(OrderSummary.fromJson)
              .toList();
        }

        throw const OrdersShapeException();
      },
    );
  }

  Future<OrderDetail> getOrderByNumber(
    String orderNumber, {
    bool forceRefresh = false,
  }) {
    final userId = _currentUserId;
    if (userId == null || userId.isEmpty) {
      throw const OrdersUnauthenticatedException();
    }

    return _cache.getOrLoad<OrderDetail>(
      key: _orderDetailCacheKey(userId, orderNumber),
      debugLabel: 'GET /api/v1/me/orders/$orderNumber',
      ttl: _orderDetailTtl,
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/me/orders/$orderNumber',
        );
        final rawData = response.data?['data'] ?? response.data;

        if (rawData is Map<String, dynamic>) {
          return OrderDetail.fromJson(rawData);
        }

        throw const OrdersShapeException();
      },
    );
  }

  Future<CreateOrderResponse> createOrder(CreateOrderRequest request) async {
    if (kDebugMode) {
      debugPrint('[OrdersRepository] POST /api/v1/me/orders');
    }

    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/me/orders',
      data: request.toJson(),
    );

    if (kDebugMode) {
      final data = response.data;
      final keys = data == null ? '<null>' : data.keys.join(',');
      debugPrint('[OrdersRepository] response status=${response.statusCode}');
      debugPrint('[OrdersRepository] response data keys=$keys');
    }

    final rawData = response.data?['data'] ?? response.data;

    if (rawData is Map<String, dynamic>) {
      final parsed = CreateOrderResponse.fromJson(rawData);
      invalidateOrders();
      if (parsed.orderNumber.trim().isNotEmpty) {
        invalidateOrderByNumber(parsed.orderNumber);
      }
      return parsed;
    }

    throw const OrdersShapeException();
  }

  void invalidateOrders([String? userId]) {
    final resolvedUserId = userId ?? _currentUserId;
    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      _cache.invalidatePrefix('user:');
      return;
    }

    _cache.invalidate(_ordersCacheKey(resolvedUserId));
  }

  void invalidateOrderByNumber(String orderNumber, [String? userId]) {
    final resolvedUserId = userId ?? _currentUserId;
    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      return;
    }

    _cache.invalidate(_orderDetailCacheKey(resolvedUserId, orderNumber));
  }

  String _ordersCacheKey(String userId) {
    return 'user:$userId:orders';
  }

  String _orderDetailCacheKey(String userId, String orderNumber) {
    return 'user:$userId:order:${orderNumber.trim()}';
  }

  String? get _currentUserId => Supabase.instance.client.auth.currentUser?.id;

  bool get _tokenPresent {
    final token = Supabase.instance.client.auth.currentSession?.accessToken
        .trim();
    return token != null && token.isNotEmpty;
  }
}

class OrdersShapeException implements Exception {
  const OrdersShapeException();

  @override
  String toString() => 'A API retornou um formato inesperado de pedidos.';
}

class OrdersUnauthenticatedException implements Exception {
  const OrdersUnauthenticatedException();

  @override
  String toString() => 'Entre para ver seus pedidos.';
}
