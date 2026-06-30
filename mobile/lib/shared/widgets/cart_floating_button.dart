import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/cart/data/cart_controller.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

class CartFloatingButton extends ConsumerWidget {
  const CartFloatingButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quantity = ref.watch(
      cartControllerProvider.select((cart) => cart.totalQuantity),
    );

    if (quantity <= 0) {
      return const SizedBox.shrink();
    }

    return FloatingActionButton(
      heroTag: 'cart-floating-button',
      tooltip: 'Ver carrinho',
      backgroundColor: AppColors.primary,
      foregroundColor: const Color(0xFF041018),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      onPressed: () => context.go('/carrinho'),
      child: Badge.count(
        count: quantity,
        backgroundColor: AppColors.accent,
        textColor: const Color(0xFF041018),
        child: const Icon(Icons.shopping_bag_outlined),
      ),
    );
  }
}
