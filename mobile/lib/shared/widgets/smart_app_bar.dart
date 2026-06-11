import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../features/cart/data/cart_controller.dart';

class SmartAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const SmartAppBar({
    required this.title,
    this.showBackButton = false,
    this.showCartAction = true,
    this.showProfileAction = true,
    super.key,
  });

  final String title;
  final bool showBackButton;
  final bool showCartAction;
  final bool showProfileAction;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final cartQuantity = ref.watch(
      cartControllerProvider.select((cart) => cart.totalQuantity),
    );

    return AppBar(
      leading: showBackButton
          ? IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: 'Voltar',
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/');
                }
              },
            )
          : null,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
      actions: [
        if (showCartAction)
          IconButton(
            icon: cartQuantity > 0
                ? Badge.count(
                    count: cartQuantity,
                    child: const Icon(Icons.shopping_bag_outlined),
                  )
                : const Icon(Icons.shopping_bag_outlined),
            tooltip: 'Carrinho',
            onPressed: () => context.go('/carrinho'),
          ),
        if (showProfileAction)
          IconButton(
            icon: Icon(
              auth.isAuthenticated ? Icons.person_rounded : Icons.login_rounded,
            ),
            tooltip: auth.isAuthenticated ? 'Perfil' : 'Entrar',
            onPressed: () =>
                context.go(auth.isAuthenticated ? '/perfil' : '/login'),
          ),
      ],
    );
  }
}
