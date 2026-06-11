import '../../../core/utils/currency_formatter.dart';

enum ProductStatus {
  available,
  orderOnly,
  preorder,
  soldOut,
  unknown;

  static ProductStatus fromJson(Object? value) {
    return switch (value?.toString()) {
      'available' => ProductStatus.available,
      'order_only' => ProductStatus.orderOnly,
      'preorder' => ProductStatus.preorder,
      'sold_out' => ProductStatus.soldOut,
      _ => ProductStatus.unknown,
    };
  }

  String get label {
    return switch (this) {
      ProductStatus.available => 'Pronta-entrega',
      ProductStatus.orderOnly => 'Encomenda',
      ProductStatus.preorder => 'Pré-venda',
      ProductStatus.soldOut => 'Esgotado',
      ProductStatus.unknown => 'Sob consulta',
    };
  }

  bool get isAvailable => this != ProductStatus.soldOut;
}

class ProductPrice {
  const ProductPrice(this.value);

  final double value;

  factory ProductPrice.fromJson(Object? value) {
    if (value is num) {
      return ProductPrice(value.toDouble());
    }

    if (value is String) {
      return ProductPrice(double.tryParse(value.replaceAll(',', '.')) ?? 0);
    }

    return const ProductPrice(0);
  }

  String get formatted =>
      value > 0 ? CurrencyFormatter.brl(value) : 'Sob consulta';
}

class ProductImage {
  const ProductImage({required this.url, this.alt});

  final String url;
  final String? alt;

  factory ProductImage.fromJson(Object? value, {String? fallbackAlt}) {
    if (value is String) {
      return ProductImage(url: value, alt: fallbackAlt);
    }

    if (value is Map<String, dynamic>) {
      return ProductImage(
        url: _readString(value, ['url', 'imageUrl', 'image_url']),
        alt: _readNullableString(value, ['alt', 'imageAlt']) ?? fallbackAlt,
      );
    }

    return ProductImage(url: '', alt: fallbackAlt);
  }
}

class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.price,
    required this.status,
    this.imageUrl,
    this.category,
    this.special = false,
    this.supplierName,
    this.isAvailable = true,
    this.source,
    this.badges = const [],
  });

  final String id;
  final String slug;
  final String name;
  final ProductPrice price;
  final String? imageUrl;
  final ProductStatus status;
  final String? category;
  final bool special;
  final String? supplierName;
  final bool isAvailable;
  final String? source;
  final List<String> badges;

  factory ProductSummary.fromJson(Map<String, dynamic> json) {
    final status = ProductStatus.fromJson(
      _readNullableString(json, ['status']),
    );
    final imageUrl = _firstImageUrl(json);
    final tags = _readStringList(json['specialTags'] ?? json['special_tags']);
    final specialLabel = _readNullableString(json, [
      'specialLabel',
      'special_label',
    ]);
    final type = _readNullableString(json, ['type']);
    final category = _readNullableString(json, ['category', 'categoryName']);
    final supplierName = _readNullableString(json, [
      'supplierName',
      'supplier_name',
    ]);
    final source = _readNullableString(json, ['source']);
    final badges = [
      status.label,
      if (specialLabel != null) specialLabel,
      if (type != null && type != 'Comum') type,
      ...tags.take(2),
    ];

    return ProductSummary(
      id: _readString(json, ['id']),
      slug: _readString(json, ['slug']),
      name: _readString(json, ['name'], fallback: 'Produto Smart Funkos'),
      price: ProductPrice.fromJson(
        json['price'] ?? json['salePrice'] ?? json['sale_price'],
      ),
      imageUrl: imageUrl.isEmpty ? null : imageUrl,
      status: status,
      category: category,
      special:
          _readBool(json, ['isSpecial', 'special']) ||
          specialLabel != null ||
          tags.isNotEmpty ||
          (type != null && type != 'Comum'),
      supplierName: supplierName,
      isAvailable:
          _readNullableBool(json, ['isAvailable', 'available']) ??
          status.isAvailable,
      source: source,
      badges: badges.toSet().where((badge) => badge.trim().isNotEmpty).toList(),
    );
  }
}

String _firstImageUrl(Map<String, dynamic> json) {
  final direct = _readNullableString(json, [
    'imageUrl',
    'image_url',
    'mainImageUrl',
    'main_image_url',
  ]);
  if (direct != null && direct.isNotEmpty) {
    return direct;
  }

  final images = json['images'];
  if (images is List) {
    for (final image in images) {
      final parsed = ProductImage.fromJson(
        image,
        fallbackAlt: _readNullableString(json, ['name']),
      );
      if (parsed.url.isNotEmpty) {
        return parsed.url;
      }
    }
  }

  return '';
}

List<String> _readStringList(Object? value) {
  if (value is List) {
    return value
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  if (value is String) {
    return value
        .split(RegExp(r'[,|]'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  return const [];
}

bool _readBool(Map<String, dynamic> json, List<String> keys) {
  return _readNullableBool(json, keys) ?? false;
}

bool? _readNullableBool(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value is bool) {
      return value;
    }
  }

  return null;
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
