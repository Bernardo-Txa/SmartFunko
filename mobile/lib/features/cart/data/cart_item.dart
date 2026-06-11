import '../../catalog/data/product_models.dart';

class CartItem {
  const CartItem({
    required this.productId,
    required this.slug,
    required this.name,
    required this.price,
    required this.quantity,
    this.variantId,
    this.imageUrl,
    this.status,
    this.category,
  });

  final String productId;
  final String slug;
  final String name;
  final ProductPrice price;
  final int quantity;
  final String? variantId;
  final String? imageUrl;
  final ProductStatus? status;
  final String? category;

  double get subtotal => price.value * quantity;

  CartItem copyWith({int? quantity}) {
    return CartItem(
      productId: productId,
      slug: slug,
      name: name,
      price: price,
      quantity: quantity ?? this.quantity,
      variantId: variantId,
      imageUrl: imageUrl,
      status: status,
      category: category,
    );
  }

  factory CartItem.fromProduct(ProductSummary product, {int quantity = 1}) {
    return CartItem(
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      quantity: quantity,
      variantId: product.variantId,
      imageUrl: product.imageUrl,
      status: product.status,
      category: product.category,
    );
  }
}
