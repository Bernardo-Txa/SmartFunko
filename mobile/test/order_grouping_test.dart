import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/features/orders/data/order_models.dart';
import 'package:smart_funkos/features/orders/data/orders_repository.dart';
import 'package:smart_funkos/features/orders/domain/order_grouping.dart';

void main() {
  const newest = OrderCompetence(
    id: 'competence-b',
    code: '2026-11',
    label: 'Novembro 2026',
    startsOn: '2026-11-01',
    endsOn: '2026-11-30',
  );
  const oldest = OrderCompetence(
    id: 'competence-a',
    code: '2026-10',
    label: 'Outubro 2026',
    startsOn: '2026-10-01',
    endsOn: '2026-10-31',
  );

  test('groups two competencies by backend code newest first', () {
    final groups = groupOrdersByCompetence([
      order('old', competence: oldest, createdAt: '2026-10-10'),
      order('new', competence: newest, createdAt: '2026-11-10'),
    ]);
    expect(groups.map((group) => group.id), ['competence-b', 'competence-a']);
  });

  test(
    'merges the same competence from different pages without duplicates',
    () {
      final first = [order('1', competence: newest, createdAt: '2026-11-01')];
      final merged = appendUniqueById(first, [
        order('1', competence: newest, createdAt: '2026-11-01'),
        order('2', competence: newest, createdAt: '2026-11-02'),
      ], (item) => item.id);
      final groups = groupOrdersByCompetence(merged);
      expect(groups, hasLength(1));
      expect(groups.single.orders.map((item) => item.id), ['2', '1']);
    },
  );

  test('group without payable orders cannot be selected', () {
    final group = groupOrdersByCompetence([
      order('paid', competence: newest, paymentEligible: false),
    ]).single;
    expect(const OrderSelection().toggleGroup(group).orderIds, isEmpty);
  });

  test('supports partial selection, select all and deselect all', () {
    final first = order('1', competence: newest);
    final second = order('2', competence: newest);
    final group = groupOrdersByCompetence([first, second]).single;
    final partial = const OrderSelection().toggleOrder(first);
    expect(partial.orderIds, {'1'});
    final all = partial.toggleGroup(group);
    expect(all.orderIds, {'1', '2'});
    expect(all.toggleGroup(group).orderIds, isEmpty);
  });

  test('switching competence clears the previous selection', () {
    final first = order('1', competence: oldest);
    final second = order('2', competence: newest);
    final selection = const OrderSelection()
        .toggleOrder(first)
        .toggleOrder(second);
    expect(selection.competenceId, newest.id);
    expect(selection.orderIds, {'2'});
  });

  test('paid order has no selection and cents keep monetary precision', () {
    final paid = order(
      'paid',
      competence: newest,
      paymentEligible: false,
      total: 10.10,
    );
    final payable = order('open', competence: newest, total: 20.20);
    final selection = const OrderSelection()
        .toggleOrder(paid)
        .toggleOrder(payable);
    expect(selection.orderIds, {'open'});
    expect(selection.selectedCents([paid, payable]), 2020);
  });

  test('filters remove empty groups and use explicit V2 states', () {
    final approved = order('approved', competence: newest);
    final paid = order(
      'paid',
      competence: oldest,
      paymentStatus: OrderPaymentStatus.paid,
      fulfillmentStatus: OrderFulfillmentStatus.shipped,
      paymentEligible: false,
    );
    expect(
      groupOrdersByCompetence([
        approved,
        paid,
      ], filter: OrdersFilter.unpaid).single.id,
      newest.id,
    );
    expect(
      groupOrdersByCompetence([
        approved,
        paid,
      ], filter: OrdersFilter.inProgress).single.id,
      newest.id,
    );
  });

  test('unknown status and invalid competence stay visible safely', () {
    final unknown = order(
      'unknown',
      competence: newest,
      approvalStatus: OrderApprovalStatus.unknown,
    );
    final invalid = order('invalid', competence: null);
    final groups = groupOrdersByCompetence([unknown, invalid]);
    expect(groups, hasLength(2));
    expect(groups.last.label, 'Competência indisponível');
    expect(
      groups.expand((group) => group.orders).map((item) => item.id),
      containsAll(['unknown', 'invalid']),
    );
  });

  test('many orders remain stable and logout starts with empty selection', () {
    final many = List.generate(
      500,
      (index) => order(
        '$index',
        competence: newest,
        createdAt: '2026-11-${(index % 28 + 1).toString().padLeft(2, '0')}',
      ),
    );
    expect(groupOrdersByCompetence(many).single.orders, hasLength(500));
    expect(const OrderSelection().orderIds, isEmpty);
  });
}

OrderSummary order(
  String id, {
  required OrderCompetence? competence,
  String createdAt = '2026-11-01',
  bool paymentEligible = true,
  double total = 10,
  OrderApprovalStatus approvalStatus = OrderApprovalStatus.approved,
  OrderPaymentStatus paymentStatus = OrderPaymentStatus.unpaid,
  OrderFulfillmentStatus fulfillmentStatus =
      OrderFulfillmentStatus.awaitingClosing,
}) => OrderSummary(
  id: id,
  orderNumber: 'SFV2-$id',
  orderDate: createdAt,
  approvalStatus: approvalStatus,
  paymentStatus: paymentStatus,
  fulfillmentStatus: fulfillmentStatus,
  createdAt: DateTime.parse(createdAt),
  total: OrderMoney(total),
  items: [
    OrderItem(
      id: 'item-$id',
      name: 'Produto $id',
      quantity: 1,
      unitPrice: OrderMoney(total),
      totalPrice: OrderMoney(total),
    ),
  ],
  paymentEligible: paymentEligible,
  competence: competence,
);
