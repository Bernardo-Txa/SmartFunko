import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/cache/memory_cache.dart';
import '../../../core/network/api_client.dart';
import '../domain/wishlist_item.dart';

final wishlistRepositoryProvider = Provider<WishlistRepository>(
  (ref) => WishlistRepository(
    apiClient: ref.watch(apiClientProvider),
    cache: ref.watch(memoryCacheProvider),
  ),
);

class WishlistRepository {
  const WishlistRepository({
    required ApiClient apiClient,
    required MemoryCache cache,
  }) : _apiClient = apiClient,
       _cache = cache;

  final ApiClient _apiClient;
  final MemoryCache _cache;

  static const Duration _idsTtl = Duration(minutes: 2);
  static const Duration _itemsTtl = Duration(seconds: 45);

  Future<List<WishlistItem>> getWishlist({bool forceRefresh = false}) {
    final userId = _currentUserId;
    if (userId == null || userId.isEmpty) {
      return Future.value(const <WishlistItem>[]);
    }

    return _cache.getOrLoad<List<WishlistItem>>(
      key: _itemsCacheKey(userId),
      debugLabel: 'GET /api/v1/me/wishlist',
      ttl: _itemsTtl,
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/me/wishlist',
        );
        final rawData = response.data?['data'] ?? response.data;

        if (rawData is List) {
          return rawData
              .whereType<Map<String, dynamic>>()
              .map(WishlistItem.fromJson)
              .where((item) => item.productId.isNotEmpty)
              .toList();
        }

        throw const WishlistShapeException();
      },
    );
  }

  Future<Set<String>> getWishlistIds({bool forceRefresh = false}) {
    final userId = _currentUserId;
    if (userId == null || userId.isEmpty) {
      return Future.value(const <String>{});
    }

    return _cache.getOrLoad<Set<String>>(
      key: _idsCacheKey(userId),
      debugLabel: 'GET /api/v1/me/wishlist/ids',
      ttl: _idsTtl,
      forceRefresh: forceRefresh,
      tokenPresent: _tokenPresent,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/me/wishlist/ids',
        );
        final rawData = response.data?['data'] ?? response.data;
        return _readIds(rawData);
      },
    );
  }

  Future<void> add(String productId) async {
    await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/me/wishlist',
      data: {'productId': productId},
    );
    invalidate();
  }

  Future<void> remove(String productId) async {
    await _apiClient.delete<void>('/api/v1/me/wishlist/$productId');
    invalidate();
  }

  Future<void> refresh() async {
    await Future.wait([
      getWishlist(forceRefresh: true),
      getWishlistIds(forceRefresh: true),
    ]);
  }

  void invalidate([String? userId]) {
    final resolvedUserId = userId ?? _currentUserId;
    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      return;
    }

    _cache.invalidate(_idsCacheKey(resolvedUserId));
    _cache.invalidate(_itemsCacheKey(resolvedUserId));
  }

  Set<String> _readIds(Object? rawData) {
    if (rawData is Map<String, dynamic>) {
      final productIds = rawData['productIds'] ?? rawData['product_ids'];
      if (productIds is List) {
        return productIds
            .map((item) => item.toString().trim())
            .where((item) => item.isNotEmpty)
            .toSet();
      }

      final items = rawData['items'];
      if (items is List) {
        return items
            .whereType<Map<String, dynamic>>()
            .map(
              (item) => (item['productId'] ?? item['product_id'] ?? '')
                  .toString()
                  .trim(),
            )
            .where((item) => item.isNotEmpty)
            .toSet();
      }
    }

    if (rawData is List) {
      return rawData
          .map((item) {
            if (item is Map<String, dynamic>) {
              return (item['productId'] ?? item['product_id'] ?? '')
                  .toString()
                  .trim();
            }

            return item.toString().trim();
          })
          .where((item) => item.isNotEmpty)
          .toSet();
    }

    throw const WishlistShapeException();
  }

  String _idsCacheKey(String userId) {
    return 'user:$userId:wishlist:ids';
  }

  String _itemsCacheKey(String userId) {
    return 'user:$userId:wishlist:items';
  }

  String? get _currentUserId => Supabase.instance.client.auth.currentUser?.id;

  bool get _tokenPresent {
    final token = Supabase.instance.client.auth.currentSession?.accessToken
        .trim();
    return token != null && token.isNotEmpty;
  }
}

class WishlistShapeException implements Exception {
  const WishlistShapeException();

  @override
  String toString() => 'A API retornou um formato inesperado de wishlist.';
}
