import '../../catalog/data/product_models.dart';

class WishlistItem {
  const WishlistItem({
    required this.id,
    required this.productId,
    required this.createdAt,
    this.product,
  });

  final String id;
  final String productId;
  final DateTime? createdAt;
  final ProductSummary? product;

  factory WishlistItem.fromJson(Map<String, dynamic> json) {
    final productJson = _readObject(json['product'] ?? json['products']);
    final normalizedProduct = productJson == null
        ? null
        : {
            ...productJson,
            if (!productJson.containsKey('price'))
              'price':
                  productJson['currentPrice'] ?? productJson['current_price'],
            if (!productJson.containsKey('imageUrl'))
              'imageUrl':
                  productJson['imageUrl'] ?? productJson['main_image_url'],
          };
    final product = normalizedProduct == null
        ? null
        : ProductSummary.fromJson(normalizedProduct);
    final productId =
        _readString(json, ['productId', 'product_id']) ?? product?.id ?? '';

    return WishlistItem(
      id: _readString(json, ['id']) ?? '',
      productId: productId,
      createdAt: DateTime.tryParse(
        _readString(json, ['createdAt', 'created_at']) ?? '',
      ),
      product: product,
    );
  }
}

Map<String, dynamic>? _readObject(Object? value) {
  if (value is Map<String, dynamic>) {
    return value;
  }

  if (value is List && value.isNotEmpty) {
    final first = value.first;
    if (first is Map<String, dynamic>) {
      return first;
    }
  }

  return null;
}

String? _readString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) {
      continue;
    }

    final text = value.toString().trim();
    if (text.isNotEmpty) {
      return text;
    }
  }

  return null;
}
