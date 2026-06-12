import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/order_models.dart';
import 'data/orders_repository.dart';
import 'domain/order_status_mapper.dart';

class OrdersPage extends ConsumerWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (auth.isLoading) {
      return const AppScaffold(
        title: 'Pedidos',
        body: LoadingState(message: 'Verificando sua sessão...'),
      );
    }

    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Pedidos',
        body: Column(
          children: [
            const EmptyState(
              icon: Icons.lock_outline_rounded,
              title: 'Entre para continuar.',
              message: 'Entre para ver seus pedidos.',
            ),
            const SizedBox(height: 18),
            PrimaryButton(
              label: 'Entrar',
              icon: Icons.login_rounded,
              onPressed: () => context.go('/login?from=/pedidos'),
            ),
          ],
        ),
      );
    }

    final orders = ref.watch(ordersProvider);

    return AppScaffold(
      title: 'Pedidos',
      onRefresh: () async => ref.invalidate(ordersProvider),
      body: orders.when(
        data: (items) => _OrdersContent(orders: items),
        loading: () =>
            const LoadingState(message: 'Carregando seus pedidos...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar seus pedidos.',
          onRetry: () => ref.invalidate(ordersProvider),
        ),
      ),
    );
  }
}

class _OrdersContent extends StatelessWidget {
  const _OrdersContent({required this.orders});

  final List<OrderSummary> orders;

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'Nenhum pedido ainda',
        message: 'Você ainda não tem pedidos.',
        actionLabel: 'Ver catálogo',
        onAction: () => context.go('/catalogo'),
      );
    }

    return Column(
      children: [
        for (final order in orders)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OrderCard(order: order),
          ),
      ],
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final OrderSummary order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = mapOrderStatus(
      context,
      status: order.status,
      reviewStatus: order.reviewStatus,
    );

    return SmartCard(
      onTap: () => context.go('/pedidos/${order.orderNumber}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(status.icon, color: status.color),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  order.orderNumber,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusBadge(
                label: status.label,
                icon: status.icon,
                color: status.color,
              ),
              StatusBadge(
                label: DateFormatter.dayMonthYear(order.createdAt),
                icon: Icons.calendar_today_rounded,
              ),
              StatusBadge(
                label: '${order.itemsCount} item(ns)',
                icon: Icons.inventory_2_outlined,
              ),
            ],
          ),
          const SizedBox(height: 12),
          PriceTag(label: order.total.formatted, subtitle: 'Total'),
        ],
      ),
    );
  }
}
