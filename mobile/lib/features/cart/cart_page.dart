import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';

class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Carrinho',
      showBackButton: true,
      showCartAction: false,
      body: EmptyState(
        icon: Icons.shopping_bag_outlined,
        title: 'Carrinho vazio',
        message:
            'O carrinho local será ligado ao checkout assistido em uma sprint futura.',
        actionLabel: 'Ver catálogo',
        onAction: () => context.go('/catalogo'),
      ),
    );
  }
}
