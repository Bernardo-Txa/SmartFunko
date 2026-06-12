import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/api_error.dart';
import '../../core/utils/currency_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/loading_state.dart';
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
          onAction: () => context.go('/login?from=/checkout'),
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
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
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
                Text(
                  CurrencyFormatter.brl(cart.estimatedTotal),
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Enviar pedido',
            icon: Icons.send_rounded,
            isLoading: _isSubmitting,
            onPressed: cart.canCheckout ? _submit : null,
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final auth = await ref.read(authControllerProvider.notifier).syncSession();
    if (!auth.isAuthenticated) {
      if (!mounted) {
        return;
      }
      context.go('/login?from=/checkout');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final cart = ref.read(cartControllerProvider);
      final request = CreateOrderRequest(
        notes: _notesController.text,
        items: [
          for (final item in cart.items)
            CreateOrderItem(
              variantId: item.variantId!,
              quantity: item.quantity,
            ),
        ],
      );
      final response = await ref
          .read(ordersRepositoryProvider)
          .createOrder(request);

      ref.read(cartControllerProvider.notifier).clearAfterOrderCreated();
      ref.invalidate(ordersProvider);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(response.message)));
      context.go('/pedidos/${response.orderNumber}');
    } catch (error) {
      final sessionExpired = error is ApiError && error.statusCode == 401;
      setState(() {
        if (sessionExpired) {
          _error = 'Sua sessão expirou. Entre novamente para continuar.';
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
