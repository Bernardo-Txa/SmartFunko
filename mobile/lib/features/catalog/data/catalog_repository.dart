import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../product/data/product_detail.dart';
import 'product_models.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(ref.watch(apiClientProvider)),
);

final catalogProductsProvider = FutureProvider.autoDispose
    .family<List<ProductSummary>, CatalogRequest>((ref, request) {
      return ref
          .watch(catalogRepositoryProvider)
          .getProducts(
            search: request.search,
            category: request.category,
            status: request.status,
            page: request.page,
            pageSize: request.pageSize,
            sort: request.sort,
          );
    });

final featuredProductsProvider =
    FutureProvider.autoDispose<List<ProductSummary>>((ref) {
      return ref.watch(catalogRepositoryProvider).getFeaturedProducts();
    });

final productDetailProvider = FutureProvider.autoDispose
    .family<ProductDetail, String>((ref, slug) {
      return ref.watch(catalogRepositoryProvider).getProductBySlug(slug);
    });

class CatalogRepository {
  const CatalogRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<ProductSummary>> getProducts({
    String? search,
    String? category,
    String? status,
    int page = 1,
    int pageSize = 24,
    String? sort,
  }) async {
    final filter = _filterForStatus(status);
    final response = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/public/products',
      queryParameters: {
        if (search != null && search.trim().isNotEmpty) 'q': search.trim(),
        if (category != null && category.trim().isNotEmpty)
          'category': category.trim(),
        if (filter != null) 'filter': filter,
        'page': page,
        'pageSize': pageSize,
        if (sort != null && sort.trim().isNotEmpty) 'sort': sort.trim(),
      },
    );

    return _readProductList(response.data);
  }

  Future<List<ProductSummary>> getFeaturedProducts() {
    return getProducts(pageSize: 6, sort: 'specials_first');
  }

  Future<ProductDetail> getProductBySlug(String slug) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/api/v1/public/products/$slug',
      );
      final data = _readObject(response.data);

      if (data == null) {
        throw const ProductNotFoundException();
      }

      return ProductDetail.fromJson(data);
    } on ApiError catch (error) {
      if (error.statusCode == 404) {
        throw const ProductNotFoundException();
      }

      rethrow;
    }
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
