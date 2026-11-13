import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/features/orders/data/order_models.dart';

void main() {
  test('parses independent V2 statuses and payment eligibility', () {
    final order = OrderSummary.fromJson({
      'id': 'order-1',
      'orderNumber': 'SFV2-1',
      'orderDate': '2026-11-12',
      'createdAt': '2026-11-12T12:00:00Z',
      'approvalStatus': 'aprovado',
      'paymentStatus': 'nao_pago',
      'fulfillmentStatus': 'aguardando_fechamento',
      'paymentEligible': true,
      'total': 129.90,
      'items': [
        {
          'id': 'item-1',
          'name': 'Funko',
          'quantity': 2,
          'unitPrice': 64.95,
          'totalPrice': 129.90,
        },
      ],
    });
    expect(order.approvalStatus, OrderApprovalStatus.approved);
    expect(order.paymentStatus, OrderPaymentStatus.unpaid);
    expect(order.fulfillmentStatus, OrderFulfillmentStatus.awaitingClosing);
    expect(order.paymentEligible, isTrue);
    expect(order.itemsCount, 2);
  });

  test('parses payment session returned by backend', () {
    final session = PaymentSession.fromJson({
      'id': 'session-1',
      'status': 'paid',
      'amount': 129.90,
      'paymentLinkUrl': 'https://example.test/pay',
      'orderIds': ['order-1'],
    });
    expect(session.isPaid, isTrue);
    expect(session.orderIds, ['order-1']);
  });

  test('unknown V2 statuses stay visibly unknown', () {
    final order = OrderSummary.fromJson({
      'id': 'order-2',
      'orderNumber': 'SFV2-2',
      'orderDate': '2026-11-12',
      'createdAt': '2026-11-12T12:00:00Z',
      'approvalStatus': 'future_approval',
      'paymentStatus': 'future_payment',
      'fulfillmentStatus': 'future_operation',
      'paymentEligible': false,
      'total': 1,
      'items': <Object>[],
    });
    expect(order.approvalStatus, OrderApprovalStatus.unknown);
    expect(order.paymentStatus, OrderPaymentStatus.unknown);
    expect(order.fulfillmentStatus, OrderFulfillmentStatus.unknown);
  });

  test('pending InfinitePay session never reports payment as confirmed', () {
    final session = PaymentSession.fromJson({
      'id': 'session-pending',
      'status': 'pending',
      'amount': 10,
    });
    expect(session.isPaid, isFalse);
  });

  test(
    'missing required contract fields fail instead of using empty defaults',
    () {
      expect(
        () => OrderSummary.fromJson({'id': 'order-3'}),
        throwsFormatException,
      );
    },
  );
}
