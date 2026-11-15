import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/config/app_config.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/editorial_hero.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/list_skeleton.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/order_models.dart';
import 'data/orders_repository.dart';
import 'domain/order_grouping.dart';
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
        body: ListSkeleton(itemCount: 4, imageSize: 56),
      );
    }
    if (!auth.isAuthenticated) {
      return AppScaffold(
        title: 'Pedidos',
        showAppBar: false,
        body: Column(
          children: [
            const _OrdersHero(),
            const SizedBox(height: 18),
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
    final feed = ref.watch(ordersFeedProvider);
    return AppScaffold(
      title: 'Pedidos',
      showAppBar: false,
      onRefresh: () => ref.read(ordersFeedProvider.notifier).refresh(),
      body: _OrdersContent(
        key: ValueKey(auth.effectiveUser?.id),
        feed: feed,
        onRetry: () => ref.read(ordersFeedProvider.notifier).refresh(),
        onLoadMore: () => ref.read(ordersFeedProvider.notifier).loadMore(),
      ),
    );
  }
}

class _OrdersHero extends StatelessWidget {
  const _OrdersHero();
  @override
  Widget build(BuildContext context) => const EditorialHero(
    title: 'Meus pedidos',
    highlight: 'pedidos',
    subtitle: 'Acompanhe aprovação, pagamento e entrega por competência.',
    compact: true,
    layout: EditorialHeroLayout.leadingCentered,
    image: Icon(
      Icons.receipt_long_rounded,
      color: AppColors.brandYellow,
      size: 66,
    ),
  );
}

class _OrdersContent extends StatefulWidget {
  const _OrdersContent({
    required this.feed,
    required this.onRetry,
    required this.onLoadMore,
    super.key,
  });
  final OrdersFeedState feed;
  final Future<void> Function() onRetry;
  final Future<void> Function() onLoadMore;
  @override
  State<_OrdersContent> createState() => _OrdersContentState();
}

class _OrdersContentState extends State<_OrdersContent> {
  OrdersFilter _filter = OrdersFilter.all;
  OrderSelection _selection = const OrderSelection();
  final Map<String, bool> _expanded = {};

  @override
  Widget build(BuildContext context) {
    if (widget.feed.loading && widget.feed.items.isEmpty) {
      return const Column(
        children: [
          _OrdersHero(),
          SizedBox(height: 18),
          ListSkeleton(itemCount: 4, imageSize: 56),
        ],
      );
    }
    if (widget.feed.error != null && widget.feed.items.isEmpty) {
      return ErrorState(
        message: 'Não foi possível carregar seus pedidos.',
        onRetry: widget.onRetry,
      );
    }
    if (widget.feed.items.isEmpty) {
      return Column(
        children: [
          const _OrdersHero(),
          const SizedBox(height: 18),
          EmptyState(
            icon: Icons.receipt_long_outlined,
            title: 'Nenhum pedido ainda',
            message:
                'Quando você enviar um carrinho, seus pedidos aparecerão aqui.',
            actionLabel: 'Ver catálogo',
            onAction: () => context.go('/catalogo'),
          ),
        ],
      );
    }

    final groups = groupOrdersByCompetence(widget.feed.items, filter: _filter);
    final selectedCents = _selection.selectedCents(widget.feed.items);
    final selectedGroup = groups
        .where((group) => group.id == _selection.competenceId)
        .firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _OrdersHero(),
        const SizedBox(height: 16),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: OrdersFilter.values.map((filter) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  selected: filter == _filter,
                  selectedColor: AppColors.brandYellow,
                  backgroundColor: AppColors.surfaceIntermediate,
                  side: BorderSide(
                    color: filter == _filter
                        ? AppColors.brandYellow
                        : AppColors.border,
                  ),
                  showCheckmark: false,
                  label: Text(
                    filter.label,
                    style: TextStyle(
                      color: filter == _filter
                          ? AppColors.onAction
                          : AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  avatar: Icon(
                    _filterIcon(filter),
                    size: 18,
                    color: filter == _filter
                        ? AppColors.onAction
                        : AppColors.textSecondary,
                  ),
                  onSelected: (_) => setState(() {
                    _filter = filter;
                    _selection = const OrderSelection();
                  }),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 14),
        if (groups.isEmpty)
          const EmptyState(
            icon: Icons.filter_alt_off_rounded,
            title: 'Nenhum pedido neste filtro',
            message: 'Escolha outro filtro para ver suas competências.',
          )
        else
          for (final group in groups) ...[
            _CompetenceCard(
              group: group,
              expanded: _expanded[group.id] ?? group.payableOrders.isNotEmpty,
              selection: _selection,
              onToggleExpanded: () => setState(
                () => _expanded[group.id] =
                    !(_expanded[group.id] ?? group.payableOrders.isNotEmpty),
              ),
              onToggleGroup: () =>
                  setState(() => _selection = _selection.toggleGroup(group)),
              onToggleOrder: (order) =>
                  setState(() => _selection = _selection.toggleOrder(order)),
            ),
            const SizedBox(height: 12),
          ],
        if (widget.feed.hasMore)
          Center(
            child: PrimaryButton(
              label: widget.feed.loadingMore
                  ? 'Carregando...'
                  : 'Carregar mais',
              icon: Icons.expand_more_rounded,
              variant: PrimaryButtonVariant.outlined,
              onPressed: widget.feed.loadingMore ? null : widget.onLoadMore,
            ),
          ),
        if (_selection.orderIds.isNotEmpty) ...[
          const SizedBox(height: 14),
          _PaymentSummary(
            count: _selection.orderIds.length,
            competence: selectedGroup?.label ?? 'Competência',
            total: OrderMoney(selectedCents / 100).formatted,
          ),
        ],
      ],
    );
  }

  IconData _filterIcon(OrdersFilter filter) => switch (filter) {
    OrdersFilter.all => Icons.apps_rounded,
    OrdersFilter.approved => Icons.verified_outlined,
    OrdersFilter.unpaid => Icons.payments_outlined,
    OrdersFilter.inProgress => Icons.timelapse_rounded,
  };
}

class _CompetenceCard extends StatelessWidget {
  const _CompetenceCard({
    required this.group,
    required this.expanded,
    required this.selection,
    required this.onToggleExpanded,
    required this.onToggleGroup,
    required this.onToggleOrder,
  });
  final OrderCompetenceGroup group;
  final bool expanded;
  final OrderSelection selection;
  final VoidCallback onToggleExpanded, onToggleGroup;
  final ValueChanged<OrderSummary> onToggleOrder;

  @override
  Widget build(BuildContext context) {
    final payable = group.payableOrders;
    final selected = payable
        .where((order) => selection.orderIds.contains(order.id))
        .length;
    final totalCents = group.orders.fold(
      0,
      (sum, order) => sum + order.total.cents,
    );
    final pendingCents = payable.fold(
      0,
      (sum, order) => sum + order.total.cents,
    );
    final allSelected = payable.isNotEmpty && selected == payable.length;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Column(
        children: [
          Semantics(
            button: true,
            expanded: expanded,
            label: '${group.label}, ${group.orders.length} pedidos',
            child: InkWell(
              onTap: onToggleExpanded,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (payable.isNotEmpty)
                          Semantics(
                            label:
                                'Selecionar pedidos pagáveis de ${group.label}',
                            child: Checkbox(
                              value: allSelected,
                              tristate: selected > 0 && !allSelected,
                              onChanged: (_) => onToggleGroup(),
                            ),
                          ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                group.label,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w900),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_date(group.startsOn)} a ${_date(group.endsOn)}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                payable.isEmpty
                                    ? 'Nenhum pedido disponível para pagamento'
                                    : '$selected/${payable.length} selecionados para pagamento',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          expanded
                              ? Icons.expand_less_rounded
                              : Icons.expand_more_rounded,
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _GroupMetric(
                          label: 'Pedidos',
                          value: '${group.orders.length}',
                        ),
                        _GroupMetric(
                          label: 'Total',
                          value: OrderMoney(totalCents / 100).formatted,
                        ),
                        _GroupMetric(
                          label: 'Pendente',
                          value: OrderMoney(pendingCents / 100).formatted,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (expanded) ...[
            const Divider(height: 1, color: AppColors.border),
            for (final order in group.orders)
              _OrderCard(
                order: order,
                selected: selection.orderIds.contains(order.id),
                onToggle: () => onToggleOrder(order),
              ),
          ],
        ],
      ),
    );
  }
}

class _GroupMetric extends StatelessWidget {
  const _GroupMetric({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    ),
  );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.selected,
    required this.onToggle,
  });
  final OrderSummary order;
  final bool selected;
  final VoidCallback onToggle;
  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AppColors.border)),
    ),
    padding: const EdgeInsets.all(14),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (order.paymentEligible)
          Semantics(
            label: 'Selecionar pedido ${order.orderNumber}',
            child: Checkbox(value: selected, onChanged: (_) => onToggle()),
          )
        else
          const Padding(
            padding: EdgeInsets.all(12),
            child: Icon(
              Icons.receipt_long_outlined,
              color: AppColors.textSecondary,
            ),
          ),
        const SizedBox(width: 6),
        Expanded(
          child: InkWell(
            onTap: () => context.go('/pedidos/${order.orderNumber}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        order.orderNumber,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                    Text(
                      order.total.formatted,
                      style: const TextStyle(
                        color: AppColors.brandYellow,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    StatusBadge(
                      label: order.approvalStatus.label,
                      color: approvalStatusColor(order.approvalStatus),
                    ),
                    StatusBadge(
                      label: order.paymentStatus.label,
                      color: paymentStatusColor(order.paymentStatus),
                    ),
                    StatusBadge(
                      label: order.fulfillmentStatus.label,
                      color: fulfillmentStatusColor(order.fulfillmentStatus),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  order.items
                      .map((item) => '${item.quantity}x ${item.name}')
                      .join(', '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${DateFormatter.dayMonthYear(order.createdAt)} • ${order.itemsCount} item(ns)',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (order.tracking?.code?.isNotEmpty == true) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Rastreio: ${order.tracking!.code}',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _PaymentSummary extends StatelessWidget {
  const _PaymentSummary({
    required this.count,
    required this.competence,
    required this.total,
  });
  final int count;
  final String competence, total;
  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: AppColors.navigationSurface,
      border: Border.all(color: AppColors.border),
      borderRadius: BorderRadius.circular(AppRadius.lg),
    ),
    padding: const EdgeInsets.all(16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$count selecionado(s) • $competence',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          total,
          style: const TextStyle(
            color: AppColors.brandYellow,
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          label: AppConfig.mobilePaymentsEnabled
              ? 'Pagar selecionados'
              : 'Pagamento indisponível nesta versão',
          icon: Icons.lock_outline_rounded,
          fullWidth: true,
          onPressed: null,
        ),
      ],
    ),
  );
}

String _date(String value) {
  final parsed = DateTime.tryParse(value);
  return parsed == null ? value : DateFormatter.dayMonthYear(parsed);
}
