import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/data/product_models.dart';
import 'cart_item.dart';

final cartControllerProvider = StateNotifierProvider<CartController, CartState>(
  (ref) => CartController(),
);

class CartState {
  const CartState({this.items = const []});

  final List<CartItem> items;

  int get totalQuantity =>
      items.fold(0, (total, item) => total + item.quantity);

  double get estimatedTotal {
    return items.fold(0, (total, item) => total + item.subtotal);
  }

  bool get isEmpty => items.isEmpty;

  CartState copyWith({List<CartItem>? items}) {
    return CartState(items: items ?? this.items);
  }
}

class CartController extends StateNotifier<CartState> {
  CartController() : super(const CartState());

  void addProduct(ProductSummary product) {
    final index = state.items.indexWhere(
      (item) => item.productId == product.id,
    );

    if (index == -1) {
      state = state.copyWith(
        items: [...state.items, CartItem.fromProduct(product)],
      );
      return;
    }

    final items = [...state.items];
    items[index] = items[index].copyWith(quantity: items[index].quantity + 1);
    state = state.copyWith(items: items);
  }

  void removeItem(String productId) {
    state = state.copyWith(
      items: state.items.where((item) => item.productId != productId).toList(),
    );
  }

  void increase(String productId) {
    _changeQuantity(productId, 1);
  }

  void decrease(String productId) {
    _changeQuantity(productId, -1);
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    state = state.copyWith(
      items: [
        for (final item in state.items)
          if (item.productId == productId)
            item.copyWith(quantity: quantity)
          else
            item,
      ],
    );
  }

  void clear() {
    state = const CartState();
  }

  Future<void> startCheckout() async {
    // Sprint 0.3: connect this stub to the assisted order endpoint.
  }

  void _changeQuantity(String productId, int delta) {
    CartItem? item;
    for (final entry in state.items) {
      if (entry.productId == productId) {
        item = entry;
        break;
      }
    }

    if (item == null) {
      return;
    }

    setQuantity(productId, item.quantity + delta);
  }
}
