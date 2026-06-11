import '../../catalog/data/product_models.dart';

class ProductDetail {
  const ProductDetail({
    required this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.price,
    required this.images,
    required this.status,
    this.category,
    this.subcategory,
    this.special = false,
    this.supplierName,
    this.variantId,
    this.badges = const [],
    this.source,
  });

  final String id;
  final String slug;
  final String name;
  final String description;
  final ProductPrice price;
  final List<ProductImage> images;
  final ProductStatus status;
  final String? category;
  final String? subcategory;
  final bool special;
  final String? supplierName;
  final String? variantId;
  final List<String> badges;
  final String? source;

  factory ProductDetail.fromJson(Map<String, dynamic> json) {
    final summary = ProductSummary.fromJson(json);
    final images = _readImages(json, summary.imageUrl);
    final description = _readString(json, [
      'description',
    ], fallback: 'Produto Smart Funkos com atendimento assistido.');
    final subcategory = _readNullableString(json, [
      'subcategory',
      'subcategoryName',
    ]);

    return ProductDetail(
      id: summary.id,
      slug: summary.slug,
      name: summary.name,
      description: description,
      price: summary.price,
      images: images,
      status: summary.status,
      category: summary.category,
      subcategory: subcategory,
      special: summary.special,
      supplierName: summary.supplierName,
      variantId: summary.variantId,
      badges: summary.badges,
      source: summary.source,
    );
  }

  ProductSummary toSummary() {
    return ProductSummary(
      id: id,
      slug: slug,
      name: name,
      price: price,
      imageUrl: images.isEmpty ? null : images.first.url,
      status: status,
      category: category,
      special: special,
      supplierName: supplierName,
      variantId: variantId,
      isAvailable: status.isAvailable,
      source: source,
      badges: badges,
    );
  }
}

List<ProductImage> _readImages(Map<String, dynamic> json, String? fallbackUrl) {
  final images = <ProductImage>[];
  final rawImages = json['images'];
  final alt = _readNullableString(json, ['imageAlt', 'name']);

  if (rawImages is List) {
    for (final image in rawImages) {
      final parsed = ProductImage.fromJson(image, fallbackAlt: alt);
      if (parsed.url.isNotEmpty &&
          !images.any((entry) => entry.url == parsed.url)) {
        images.add(parsed);
      }
    }
  }

  if (images.isEmpty && fallbackUrl != null && fallbackUrl.isNotEmpty) {
    images.add(ProductImage(url: fallbackUrl, alt: alt));
  }

  return images;
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  return _readNullableString(json, keys) ?? fallback;
}

String? _readNullableString(Map<String, dynamic> json, List<String> keys) {
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
