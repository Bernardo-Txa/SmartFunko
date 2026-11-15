import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
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

final ordersFeedProvider =
    StateNotifierProvider.autoDispose<OrdersFeedController, OrdersFeedState>((
      ref,
    ) {
      final auth = ref.watch(authControllerProvider);
      return OrdersFeedController(
        repository: ref.watch(ordersRepositoryProvider),
        userId: auth.effectiveUser?.id,
      );
    });
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

  Future<OrdersPageData> getOrdersPage({String? cursor, int limit = 50}) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return const OrdersPageData(items: []);
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/mobile/orders-v2',
      queryParameters: {'limit': limit, 'cursor': ?cursor},
    );
    final data = response.data?['data'];
    if (data is! Map<String, dynamic> || data['items'] is! List) {
      throw const OrdersShapeException();
    }
    return OrdersPageData(
      items: (data['items'] as List)
          .whereType<Map<String, dynamic>>()
          .map(OrderSummary.fromJson)
          .toList(),
      nextCursor: data['nextCursor'] as String?,
    );
  }

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

class OrdersPageData {
  const OrdersPageData({required this.items, this.nextCursor});
  final List<OrderSummary> items;
  final String? nextCursor;
}

class OrdersFeedState {
  const OrdersFeedState({
    this.items = const [],
    this.nextCursor,
    this.loading = false,
    this.loadingMore = false,
    this.error,
  });
  final List<OrderSummary> items;
  final String? nextCursor;
  final bool loading, loadingMore;
  final Object? error;
  bool get hasMore => nextCursor != null;

  OrdersFeedState copyWith({
    List<OrderSummary>? items,
    String? nextCursor,
    bool clearCursor = false,
    bool? loading,
    bool? loadingMore,
    Object? error,
    bool clearError = false,
  }) => OrdersFeedState(
    items: items ?? this.items,
    nextCursor: clearCursor ? null : nextCursor ?? this.nextCursor,
    loading: loading ?? this.loading,
    loadingMore: loadingMore ?? this.loadingMore,
    error: clearError ? null : error ?? this.error,
  );
}

class OrdersFeedController extends StateNotifier<OrdersFeedState> {
  OrdersFeedController({required this.repository, required this.userId})
    : super(const OrdersFeedState()) {
    if (userId != null) unawaited(refresh());
  }

  final OrdersRepository repository;
  final String? userId;

  Future<void> refresh() async {
    if (userId == null) return;
    state = state.copyWith(loading: true, clearError: true, clearCursor: true);
    try {
      final page = await repository.getOrdersPage();
      state = OrdersFeedState(items: page.items, nextCursor: page.nextCursor);
    } catch (error) {
      state = state.copyWith(loading: false, error: error);
    }
  }

  Future<void> loadMore() async {
    final cursor = state.nextCursor;
    if (cursor == null || state.loading || state.loadingMore) return;
    state = state.copyWith(loadingMore: true, clearError: true);
    try {
      final page = await repository.getOrdersPage(cursor: cursor);
      state = state.copyWith(
        items: appendUniqueById(state.items, page.items, (order) => order.id),
        nextCursor: page.nextCursor,
        clearCursor: page.nextCursor == null,
        loadingMore: false,
      );
    } catch (error) {
      state = state.copyWith(loadingMore: false, error: error);
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
