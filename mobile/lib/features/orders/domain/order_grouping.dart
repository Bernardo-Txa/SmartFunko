import '../data/order_models.dart';

enum OrdersFilter { all, approved, unpaid, inProgress }

extension OrdersFilterLabel on OrdersFilter {
  String get label => switch (this) {
    OrdersFilter.all => 'Todos',
    OrdersFilter.approved => 'Aprovados',
    OrdersFilter.unpaid => 'Não pagos',
    OrdersFilter.inProgress => 'Em andamento',
  };
}

class OrderCompetenceGroup {
  const OrderCompetenceGroup({
    required this.id,
    required this.code,
    required this.label,
    required this.startsOn,
    required this.endsOn,
    required this.orders,
  });

  final String id;
  final String code;
  final String label;
  final String startsOn;
  final String endsOn;
  final List<OrderSummary> orders;

  List<OrderSummary> get payableOrders =>
      orders.where((order) => order.paymentEligible).toList(growable: false);
  int get totalCents => orders.fold(0, (sum, order) => sum + order.total.cents);
  int get pendingCents =>
      payableOrders.fold(0, (sum, order) => sum + order.total.cents);
}

List<OrderCompetenceGroup> groupOrdersByCompetence(
  Iterable<OrderSummary> orders, {
  OrdersFilter filter = OrdersFilter.all,
}) {
  final groups = <String, List<OrderSummary>>{};
  for (final order in orders.where(
    (item) => orderMatchesFilter(item, filter),
  )) {
    final competence = order.competence;
    final key = competence == null || competence.id.trim().isEmpty
        ? '__missing__'
        : competence.id;
    groups.putIfAbsent(key, () => []).add(order);
  }

  final result = groups.entries.map((entry) {
    final sorted = [...entry.value]..sort(_newestOrderFirst);
    final competence = sorted.first.competence;
    return OrderCompetenceGroup(
      id: competence?.id ?? '__missing__',
      code: competence?.code ?? '',
      label: competence?.label ?? 'Competência indisponível',
      startsOn: competence?.startsOn ?? '',
      endsOn: competence?.endsOn ?? '',
      orders: sorted,
    );
  }).toList();

  result.sort((a, b) {
    if (a.id == '__missing__') return 1;
    if (b.id == '__missing__') return -1;
    return b.code.compareTo(a.code);
  });
  return result;
}

bool orderMatchesFilter(OrderSummary order, OrdersFilter filter) =>
    switch (filter) {
      OrdersFilter.all => true,
      OrdersFilter.approved =>
        order.approvalStatus == OrderApprovalStatus.approved,
      OrdersFilter.unpaid => const {
        OrderPaymentStatus.unpaid,
        OrderPaymentStatus.checkoutCreated,
      }.contains(order.paymentStatus),
      OrdersFilter.inProgress => !const {
        OrderFulfillmentStatus.shipped,
        OrderFulfillmentStatus.cancelled,
      }.contains(order.fulfillmentStatus),
    };

int _newestOrderFirst(OrderSummary a, OrderSummary b) {
  final byDate = (b.createdAt ?? DateTime(0)).compareTo(
    a.createdAt ?? DateTime(0),
  );
  return byDate != 0 ? byDate : b.id.compareTo(a.id);
}

class OrderSelection {
  const OrderSelection({this.competenceId, this.orderIds = const {}});

  final String? competenceId;
  final Set<String> orderIds;

  OrderSelection toggleOrder(OrderSummary order) {
    if (!order.paymentEligible || order.competence == null) return this;
    if (competenceId != null && competenceId != order.competence!.id) {
      return OrderSelection(
        competenceId: order.competence!.id,
        orderIds: {order.id},
      );
    }
    final next = {...orderIds};
    next.contains(order.id) ? next.remove(order.id) : next.add(order.id);
    return OrderSelection(
      competenceId: next.isEmpty ? null : order.competence!.id,
      orderIds: next,
    );
  }

  OrderSelection toggleGroup(OrderCompetenceGroup group) {
    final payable = group.payableOrders.map((order) => order.id).toSet();
    if (payable.isEmpty) return this;
    final allSelected =
        competenceId == group.id && orderIds.containsAll(payable);
    return allSelected
        ? const OrderSelection()
        : OrderSelection(competenceId: group.id, orderIds: payable);
  }

  int selectedCents(Iterable<OrderSummary> orders) => orders
      .where((order) => orderIds.contains(order.id))
      .fold(0, (sum, order) => sum + order.total.cents);
}
