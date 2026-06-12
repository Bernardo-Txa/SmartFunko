import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/api_error.dart';
import '../../core/utils/currency_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';
import '../cart/data/cart_controller.dart';
import '../orders/data/order_models.dart';
import '../orders/data/orders_repository.dart';

class CheckoutReviewPage extends ConsumerStatefulWidget {
  const CheckoutReviewPage({super.key});

  @override
  ConsumerState<CheckoutReviewPage> createState() => _CheckoutReviewPageState();
}

class _CheckoutReviewPageState extends ConsumerState<CheckoutReviewPage> {
  final _notesController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final cart = ref.watch(cartControllerProvider);
    final theme = Theme.of(context);
    final error = _error;

    if (auth.isLoading) {
      return const AppScaffold(
        title: 'Revisar pedido',
        showBackButton: true,
        body: LoadingState(message: 'Verificando sua sessão...'),
      );
    }

    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Revisar pedido',
        showBackButton: true,
        body: EmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'Entre para continuar.',
          message: 'Entre para finalizar seu pedido.',
          actionLabel: 'Entrar',
          onAction: () => context.go('/login?redirect=/checkout'),
        ),
      );
    }

    if (cart.isEmpty) {
      return AppScaffold(
        title: 'Revisar pedido',
        showBackButton: true,
        body: EmptyState(
          icon: Icons.shopping_bag_outlined,
          title: 'Carrinho vazio',
          message: 'Adicione produtos antes de finalizar o pedido.',
          actionLabel: 'Ver catálogo',
          onAction: () => context.go('/catalogo'),
        ),
      );
    }

    return AppScaffold(
      title: 'Revisar pedido',
      showBackButton: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SmartCard(
            child: Row(
              children: [
                Icon(
                  Icons.manage_search_rounded,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'O pedido será enviado para análise da equipe Smart Funkos.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Itens',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          for (final item in cart.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SmartCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${item.quantity} x ${item.price.formatted}',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      CurrencyFormatter.brl(item.subtotal),
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.secondary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Observações',
              hintText: 'Preferências, dúvidas ou instruções para a equipe',
              prefixIcon: Icon(Icons.notes_rounded),
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(
              error,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.error,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 16),
          SmartCard(
            child: Row(
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
                  label: CurrencyFormatter.brl(cart.estimatedTotal),
                  subtitle: 'A confirmar',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Enviar pedido',
            icon: Icons.send_rounded,
            isLoading: _isSubmitting,
            fullWidth: true,
            onPressed: cart.isEmpty ? null : _submit,
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final cart = ref.read(cartControllerProvider);
    final auth = await ref.read(authControllerProvider.notifier).syncSession();
    final session = auth.effectiveSession;
    final token = session?.accessToken.trim();
    final tokenPresent = token != null && token.isNotEmpty;

    if (kDebugMode) {
      debugPrint('[Checkout] button pressed');
      debugPrint('[Checkout] cartItemsCount=${cart.items.length}');
      debugPrint('[Checkout] authSessionPresent=${session != null}');
      debugPrint('[Checkout] tokenPresent=$tokenPresent');
    }

    if (!auth.isAuthenticated || !tokenPresent) {
      if (!mounted) {
        return;
      }
      context.go('/login?redirect=/checkout');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final orderItems = <CreateOrderItem>[];

      for (final item in cart.items) {
        final variantId = item.variantId?.trim();
        if (variantId == null || variantId.isEmpty || item.quantity <= 0) {
          if (mounted) {
            setState(() {
              _error =
                  'Não foi possível finalizar este carrinho. Revise os itens e tente novamente.';
            });
          }
          return;
        }

        orderItems.add(
          CreateOrderItem(variantId: variantId, quantity: item.quantity),
        );
      }

      if (orderItems.isEmpty) {
        if (mounted) {
          setState(() {
            _error = 'Adicione produtos antes de finalizar o pedido.';
          });
        }
        return;
      }

      final request = CreateOrderRequest(
        notes: _notesController.text,
        items: orderItems,
      );
      final response = await ref
          .read(ordersRepositoryProvider)
          .createOrder(request);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pedido enviado para análise.')),
      );

      final orderNumber = response.orderNumber.trim();
      ref.invalidate(ordersProvider);
      context.go(orderNumber.isEmpty ? '/pedidos' : '/pedidos/$orderNumber');
      ref.read(cartControllerProvider.notifier).clearAfterOrderCreated();

      if (kDebugMode) {
        debugPrint(
          '[Checkout] order created success orderNumber=${orderNumber.isEmpty ? 'null' : orderNumber}',
        );
      }
    } catch (error) {
      final sessionExpired = error is ApiError && error.statusCode == 401;
      if (kDebugMode) {
        final statusCode = error is ApiError ? error.statusCode : null;
        debugPrint(
          '[Checkout] create order failed status=$statusCode message=$error',
        );
      }
      setState(() {
        if (sessionExpired) {
          _error = 'Sua sessão expirou. Entre novamente para continuar.';
        } else if (error is ApiError && error.statusCode == 400) {
          _error = error.message;
        } else if (error is ApiError && error.statusCode == 500) {
          _error = 'Não foi possível criar o pedido agora.';
        } else {
          _error = error.toString();
        }
      });
      if (sessionExpired) {
        await ref.read(authControllerProvider.notifier).signOut();
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}
