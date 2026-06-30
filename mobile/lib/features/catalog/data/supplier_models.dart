class CatalogSupplierSummary {
  const CatalogSupplierSummary({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.logoUrl,
  });

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? logoUrl;

  factory CatalogSupplierSummary.fromJson(Map<String, dynamic> json) {
    return CatalogSupplierSummary(
      id: _readString(json, ['id']),
      name: _readString(json, ['name'], fallback: 'Fornecedor Smart Funkos'),
      slug: _readString(json, ['slug']),
      description: _readNullableString(json, ['description']),
      logoUrl: _readNullableString(json, ['logoUrl', 'logo_url']),
    );
  }
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
