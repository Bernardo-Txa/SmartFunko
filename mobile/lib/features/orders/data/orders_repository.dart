import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/network/api_client.dart';
import 'order_models.dart';

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(ref.watch(apiClientProvider)),
);

final ordersProvider = FutureProvider.autoDispose<List<OrderSummary>>((ref) {
  final auth = ref.watch(authControllerProvider);
  if (auth.isLoading && !auth.isAuthenticated) {
    return const <OrderSummary>[];
  }
  if (!auth.isAuthenticated) {
    return const <OrderSummary>[];
  }

  return ref.watch(ordersRepositoryProvider).getOrders();
});

final orderDetailProvider = FutureProvider.autoDispose
    .family<OrderDetail, String>((ref, orderNumber) {
      final auth = ref.watch(authControllerProvider);
      if (!auth.isAuthenticated) {
        throw const OrdersUnauthenticatedException();
      }

      return ref.watch(ordersRepositoryProvider).getOrderByNumber(orderNumber);
    });

class OrdersRepository {
  const OrdersRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<OrderSummary>> getOrders() async {
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
  }

  Future<OrderDetail> getOrderByNumber(String orderNumber) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/me/orders/$orderNumber',
    );
    final rawData = response.data?['data'] ?? response.data;

    if (rawData is Map<String, dynamic>) {
      return OrderDetail.fromJson(rawData);
    }

    throw const OrdersShapeException();
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
      return CreateOrderResponse.fromJson(rawData);
    }

    throw const OrdersShapeException();
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
