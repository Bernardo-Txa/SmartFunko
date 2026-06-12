import 'package:flutter/foundation.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/image_url_resolver.dart';
import '../../core/utils/currency_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';
import 'data/cart_controller.dart';
import 'data/cart_item.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);

    return AppScaffold(
      title: 'Carrinho',
      showBackButton: true,
      showCartAction: false,
      body: cart.isEmpty
          ? EmptyState(
              icon: Icons.shopping_bag_outlined,
              title: 'Carrinho vazio',
              message:
                  'Adicione colecionáveis do catálogo para montar seu pedido.',
              actionLabel: 'Ver catálogo',
              onAction: () => context.go('/catalogo'),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${cart.totalQuantity} item(ns) no carrinho',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 14),
                for (final item in cart.items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _CartItemTile(item: item),
                  ),
                const SizedBox(height: 8),
                _CartSummary(total: cart.estimatedTotal),
              ],
            ),
    );
  }
}

class _CartItemTile extends ConsumerWidget {
  const _CartItemTile({required this.item});

  final CartItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final controller = ref.read(cartControllerProvider.notifier);

    return SmartCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              height: 82,
              width: 82,
              child: _CartImage(imageUrl: item.imageUrl),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.status?.label ?? item.category ?? 'Smart Funkos',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.price.formatted,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _QuantityButton(
                      icon: Icons.remove_rounded,
                      onPressed: () => controller.decrease(item.productId),
                    ),
                    SizedBox(
                      width: 42,
                      child: Text(
                        '${item.quantity}',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    _QuantityButton(
                      icon: Icons.add_rounded,
                      onPressed: () => controller.increase(item.productId),
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Remover',
                      onPressed: () => controller.removeItem(item.productId),
                      icon: const Icon(Icons.delete_outline_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Subtotal ${CurrencyFormatter.brl(item.subtotal)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CartSummary extends ConsumerWidget {
  const _CartSummary({required this.total});

  final double total;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final controller = ref.read(cartControllerProvider.notifier);
    final cart = ref.watch(cartControllerProvider);

    return SmartCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Total estimado',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              PriceTag(
                label: CurrencyFormatter.brl(total),
                subtitle: 'A confirmar',
              ),
            ],
          ),
          const SizedBox(height: 14),
          PrimaryButton(
            label: 'Finalizar pedido',
            icon: Icons.send_rounded,
            fullWidth: true,
            onPressed: cart.isEmpty
                ? null
                : () async {
                    final authState = await ref
                        .read(authControllerProvider.notifier)
                        .syncSession();
                    final session = authState.effectiveSession;
                    final token = session?.accessToken.trim();
                    final tokenPresent = token != null && token.isNotEmpty;

                    if (kDebugMode) {
                      debugPrint('[Checkout] button pressed');
                      debugPrint(
                        '[Checkout] cartItemsCount=${cart.items.length}',
                      );
                      debugPrint(
                        '[Checkout] authSessionPresent=${session != null}',
                      );
                      debugPrint('[Checkout] tokenPresent=$tokenPresent');
                    }

                    if (!context.mounted) {
                      return;
                    }

                    if (!authState.isAuthenticated || !tokenPresent) {
                      context.go('/login?redirect=/checkout');
                      return;
                    }

                    context.go('/checkout');
                  },
          ),
          const SizedBox(height: 10),
          PrimaryButton(
            label: 'Continuar comprando',
            icon: Icons.manage_search_rounded,
            variant: PrimaryButtonVariant.outlined,
            fullWidth: true,
            onPressed: () => context.go('/catalogo'),
          ),
          const SizedBox(height: 10),
          TextButton.icon(
            onPressed: controller.clear,
            icon: const Icon(Icons.delete_sweep_outlined),
            label: const Text('Limpar carrinho'),
          ),
        ],
      ),
    );
  }
}

class _CartImage extends StatelessWidget {
  const _CartImage({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallback = ColoredBox(
      color: theme.colorScheme.primary.withValues(alpha: 0.1),
      child: Icon(
        Icons.toys_rounded,
        color: theme.colorScheme.primary,
        size: 34,
      ),
    );

    if (imageUrl == null) {
      return fallback;
    }

    final resolvedUrl = resolveImageUrl(imageUrl);
    if (resolvedUrl.isEmpty) {
      return fallback;
    }

    return CachedNetworkImage(
      imageUrl: resolvedUrl,
      fit: BoxFit.cover,
      placeholder: (context, url) => fallback,
      errorWidget: (context, url, error) => fallback,
    );
  }
}

class _QuantityButton extends StatelessWidget {
  const _QuantityButton({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 34,
      child: IconButton.filledTonal(
        padding: EdgeInsets.zero,
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
      ),
    );
  }
}
