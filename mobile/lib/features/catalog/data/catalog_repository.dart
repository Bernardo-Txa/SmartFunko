import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/cache/memory_cache.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../product/data/product_detail.dart';
import 'product_models.dart';
import 'supplier_models.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(
    apiClient: ref.watch(apiClientProvider),
    cache: ref.watch(memoryCacheProvider),
  ),
);

final catalogProductsProvider =
    FutureProvider.family<List<ProductSummary>, CatalogRequest>((ref, request) {
      return ref.watch(catalogRepositoryProvider).getProducts(request);
    });

final featuredProductsProvider = FutureProvider<List<ProductSummary>>((ref) {
  return ref.watch(catalogRepositoryProvider).getFeaturedProducts();
});

final catalogSuppliersProvider = FutureProvider<List<CatalogSupplierSummary>>((
  ref,
) {
  return ref.watch(catalogRepositoryProvider).getSuppliers();
});

final productDetailProvider = FutureProvider.family<ProductDetail, String>((
  ref,
  slug,
) {
  return ref.watch(catalogRepositoryProvider).getProductBySlug(slug);
});

class CatalogRepository {
  const CatalogRepository({
    required ApiClient apiClient,
    required MemoryCache cache,
  }) : _apiClient = apiClient,
       _cache = cache;

  final ApiClient _apiClient;
  final MemoryCache _cache;

  static const Duration _productsTtl = Duration(minutes: 3);
  static const Duration _productDetailTtl = Duration(minutes: 5);
  static const Duration _suppliersTtl = Duration(minutes: 15);

  Future<List<ProductSummary>> getProducts(
    CatalogRequest request, {
    bool forceRefresh = false,
  }) {
    return _cache.getOrLoad<List<ProductSummary>>(
      key: _productsCacheKey(request),
      debugLabel: 'GET /api/v1/public/products',
      ttl: _productsTtl,
      forceRefresh: forceRefresh,
      loader: () async {
        final filter = _filterForStatus(request.status);
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/public/products',
          queryParameters: {
            if (request.search != null && request.search!.trim().isNotEmpty)
              'q': request.search!.trim(),
            if (request.category != null && request.category!.trim().isNotEmpty)
              'category': request.category!.trim(),
            if (filter != null) 'filter': filter,
            'page': request.page,
            'pageSize': request.pageSize,
            if (request.sort != null && request.sort!.trim().isNotEmpty)
              'sort': request.sort!.trim(),
          },
        );

        return _readProductList(response.data);
      },
    );
  }

  Future<List<ProductSummary>> getFeaturedProducts() {
    return getProducts(
      const CatalogRequest(pageSize: 6, sort: 'specials_first'),
    );
  }

  Future<List<CatalogSupplierSummary>> getSuppliers({
    bool forceRefresh = false,
  }) {
    return _cache.getOrLoad<List<CatalogSupplierSummary>>(
      key: 'public:suppliers',
      debugLabel: 'GET /api/v1/public/suppliers',
      ttl: _suppliersTtl,
      forceRefresh: forceRefresh,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/public/suppliers',
        );

        return _readSupplierList(response.data);
      },
    );
  }

  Future<ProductDetail> getProductBySlug(String slug) async {
    try {
      return await _cache.getOrLoad<ProductDetail>(
        key: _productDetailCacheKey(slug),
        debugLabel: 'GET /api/v1/public/products/$slug',
        ttl: _productDetailTtl,
        loader: () async {
          final response = await _apiClient.get<Map<String, dynamic>>(
            '/api/v1/public/products/$slug',
          );
          final data = _readObject(response.data);

          if (data == null) {
            throw const ProductNotFoundException();
          }

          return ProductDetail.fromJson(data);
        },
      );
    } on ApiError catch (error) {
      if (error.statusCode == 404) {
        throw const ProductNotFoundException();
      }

      rethrow;
    }
  }

  void invalidateProducts(CatalogRequest request) {
    _cache.invalidate(_productsCacheKey(request));
  }

  void invalidateProductBySlug(String slug) {
    _cache.invalidate(_productDetailCacheKey(slug));
  }

  void invalidateSuppliers() {
    _cache.invalidate('public:suppliers');
  }

  String _productsCacheKey(CatalogRequest request) {
    return 'public:products:${request.cacheKey}';
  }

  String _productDetailCacheKey(String slug) {
    return 'public:product:${slug.trim()}';
  }

  List<ProductSummary> _readProductList(Map<String, dynamic>? body) {
    final rawData = body?['data'] ?? body?['products'] ?? body;

    if (rawData is List) {
      return rawData
          .whereType<Map<String, dynamic>>()
          .map(ProductSummary.fromJson)
          .toList();
    }

    if (rawData is Map<String, dynamic>) {
      final nested = rawData['data'] ?? rawData['items'] ?? rawData['products'];
      if (nested is List) {
        return nested
            .whereType<Map<String, dynamic>>()
            .map(ProductSummary.fromJson)
            .toList();
      }
    }

    throw const CatalogShapeException();
  }

  Map<String, dynamic>? _readObject(Map<String, dynamic>? body) {
    final rawData = body?['data'] ?? body?['product'] ?? body;
    if (rawData is Map<String, dynamic>) {
      return rawData;
    }

    return null;
  }

  List<CatalogSupplierSummary> _readSupplierList(Map<String, dynamic>? body) {
    final rawData = body?['data'] ?? body?['suppliers'] ?? body;

    if (rawData is List) {
      return rawData
          .whereType<Map<String, dynamic>>()
          .map(CatalogSupplierSummary.fromJson)
          .where((supplier) => supplier.slug.isNotEmpty)
          .toList();
    }

    if (rawData is Map<String, dynamic>) {
      final nested =
          rawData['data'] ?? rawData['items'] ?? rawData['suppliers'];
      if (nested is List) {
        return nested
            .whereType<Map<String, dynamic>>()
            .map(CatalogSupplierSummary.fromJson)
            .where((supplier) => supplier.slug.isNotEmpty)
            .toList();
      }
    }

    throw const CatalogShapeException();
  }

  String? _filterForStatus(String? status) {
    return switch (status?.trim()) {
      'available' => 'ready',
      'order_only' => 'order',
      'preorder' => 'preorder',
      'specials' => 'specials',
      'ready' => 'ready',
      'order' => 'order',
      _ => null,
    };
  }
}

class CatalogRequest {
  const CatalogRequest({
    this.search,
    this.category,
    this.status,
    this.page = 1,
    this.pageSize = 24,
    this.sort,
  });

  final String? search;
  final String? category;
  final String? status;
  final int page;
  final int pageSize;
  final String? sort;

  @override
  bool operator ==(Object other) {
    return other is CatalogRequest &&
        other.search == search &&
        other.category == category &&
        other.status == status &&
        other.page == page &&
        other.pageSize == pageSize &&
        other.sort == sort;
  }

  @override
  int get hashCode =>
      Object.hash(search, category, status, page, pageSize, sort);

  String get cacheKey {
    return [
      'q=${search?.trim() ?? ''}',
      'category=${category?.trim() ?? ''}',
      'status=${status?.trim() ?? ''}',
      'page=$page',
      'pageSize=$pageSize',
      'sort=${sort?.trim() ?? ''}',
    ].join('&');
  }
}

class CatalogShapeException implements Exception {
  const CatalogShapeException();

  @override
  String toString() => 'A API retornou um formato inesperado de catálogo.';
}

class ProductNotFoundException implements Exception {
  const ProductNotFoundException();

  @override
  String toString() => 'Produto não encontrado.';
}
