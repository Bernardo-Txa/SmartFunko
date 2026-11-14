import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/list_skeleton.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/order_models.dart';
import 'data/orders_repository.dart';
import 'order_status_presentation.dart';

class OrdersPage extends ConsumerWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    if (auth.isLoading) {
      return const AppScaffold(
        title: 'Pedidos',
        showAppBar: false,
        body: LoadingState(message: 'Verificando sua sessão...'),
      );
    }

    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Pedidos',
        showAppBar: false,
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
              fullWidth: true,
              onPressed: () => context.go('/login?from=/pedidos'),
            ),
          ],
        ),
      );
    }

    final orders = ref.watch(ordersProvider);

    return AppScaffold(
      title: 'Pedidos',
      showAppBar: false,
      onRefresh: () async {
        ref.read(ordersRepositoryProvider).invalidateOrders();
        ref.invalidate(ordersProvider);
      },
      body: orders.when(
        data: (items) => _OrdersContent(orders: items),
        loading: () => const ListSkeleton(itemCount: 4, imageSize: 56),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar seus pedidos.',
          onRetry: () {
            ref.read(ordersRepositoryProvider).invalidateOrders();
            ref.invalidate(ordersProvider);
          },
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
        message:
            'Quando você enviar um carrinho, seus pedidos aparecerão aqui.',
        actionLabel: 'Ver catálogo',
        onAction: () => context.go('/catalogo'),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(
          title: 'Meus pedidos',
          subtitle: 'Acompanhe aprovação, pagamento e entrega separadamente.',
        ),
        const SizedBox(height: 16),
        for (var index = 0; index < orders.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OrderCard(
              order: orders[index],
              tone: index.isOdd ? SmartCardTone.sky : SmartCardTone.elevated,
            ),
          ),
      ],
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.tone});

  final OrderSummary order;
  final SmartCardTone tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final onCard = tone == SmartCardTone.sky
        ? AppColors.brandNavy
        : theme.colorScheme.onSurface;

    return SmartCard(
      tone: tone,
      onTap: () => context.go('/pedidos/${order.orderNumber}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.receipt_long_rounded,
                color: tone == SmartCardTone.sky
                    ? AppColors.brandNavy
                    : AppColors.brandYellow,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  order.orderNumber,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: onCard,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: onCard),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusBadge(
                label: order.approvalStatus.label,
                icon: Icons.fact_check_outlined,
                color: approvalStatusColor(order.approvalStatus),
              ),
              StatusBadge(
                label: order.paymentStatus.label,
                icon: Icons.payments_outlined,
                color: paymentStatusColor(order.paymentStatus),
              ),
              StatusBadge(
                label: order.fulfillmentStatus.label,
                icon: Icons.local_shipping_outlined,
                color: fulfillmentStatusColor(order.fulfillmentStatus),
              ),
              StatusBadge(
                label: DateFormatter.dayMonthYear(order.createdAt),
                icon: Icons.calendar_today_rounded,
              ),
              StatusBadge(
                label: '${order.itemsCount} item(ns)',
                icon: Icons.inventory_2_outlined,
              ),
              if (order.paymentEligible)
                const StatusBadge(
                  label: 'Pagamento disponível',
                  icon: Icons.bolt_rounded,
                  color: AppColors.brandYellow,
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
