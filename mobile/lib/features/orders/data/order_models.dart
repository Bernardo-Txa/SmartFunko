import '../../../core/utils/currency_formatter.dart';

class OrderMoney {
  const OrderMoney(this.value);
  final double value;
  factory OrderMoney.fromJson(Object? value) {
    final parsed = value is num ? value.toDouble() : double.tryParse('$value');
    if (parsed == null || !parsed.isFinite || parsed < 0) {
      throw const FormatException('Valor monetário inválido no contrato V2.');
    }
    return OrderMoney(parsed);
  }
  String get formatted => CurrencyFormatter.brl(value);
}

enum OrderApprovalStatus { awaitingApproval, approved, rejected, unknown }

enum OrderPaymentStatus {
  unpaid,
  checkoutCreated,
  paid,
  refundPending,
  refunded,
  cancelled,
  unknown,
}

enum OrderFulfillmentStatus {
  awaitingClosing,
  requested,
  received,
  shipped,
  cancelled,
  unknown,
}

extension OrderApprovalStatusLabel on OrderApprovalStatus {
  String get label => switch (this) {
    OrderApprovalStatus.awaitingApproval => 'Aguardando aprovação',
    OrderApprovalStatus.approved => 'Aprovado',
    OrderApprovalStatus.rejected => 'Recusado',
    OrderApprovalStatus.unknown => 'Status de aprovação desconhecido',
  };
}

extension OrderPaymentStatusLabel on OrderPaymentStatus {
  String get label => switch (this) {
    OrderPaymentStatus.unpaid => 'Não pago',
    OrderPaymentStatus.checkoutCreated => 'Checkout gerado',
    OrderPaymentStatus.paid => 'Pago',
    OrderPaymentStatus.refundPending => 'Reembolso pendente',
    OrderPaymentStatus.refunded => 'Reembolsado',
    OrderPaymentStatus.cancelled => 'Pagamento cancelado',
    OrderPaymentStatus.unknown => 'Status de pagamento desconhecido',
  };
}

extension OrderFulfillmentStatusLabel on OrderFulfillmentStatus {
  String get label => switch (this) {
    OrderFulfillmentStatus.awaitingClosing => 'Aguardando fechamento',
    OrderFulfillmentStatus.requested => 'Solicitado',
    OrderFulfillmentStatus.received => 'Recebido',
    OrderFulfillmentStatus.shipped => 'Enviado',
    OrderFulfillmentStatus.cancelled => 'Operação cancelada',
    OrderFulfillmentStatus.unknown => 'Status operacional desconhecido',
  };
}

OrderApprovalStatus _approval(Object? v) => switch ('$v') {
  'aguardando_aprovacao' => OrderApprovalStatus.awaitingApproval,
  'aprovado' => OrderApprovalStatus.approved,
  'recusado' => OrderApprovalStatus.rejected,
  _ => OrderApprovalStatus.unknown,
};
OrderPaymentStatus _payment(Object? v) => switch ('$v') {
  'nao_pago' => OrderPaymentStatus.unpaid,
  'checkout_gerado' => OrderPaymentStatus.checkoutCreated,
  'pago' => OrderPaymentStatus.paid,
  'reembolso_pendente' => OrderPaymentStatus.refundPending,
  'reembolsado' => OrderPaymentStatus.refunded,
  'cancelado' => OrderPaymentStatus.cancelled,
  _ => OrderPaymentStatus.unknown,
};
OrderFulfillmentStatus _fulfillment(Object? v) => switch ('$v') {
  'aguardando_fechamento' => OrderFulfillmentStatus.awaitingClosing,
  'solicitado' => OrderFulfillmentStatus.requested,
  'recebido' => OrderFulfillmentStatus.received,
  'enviado' => OrderFulfillmentStatus.shipped,
  'cancelado' => OrderFulfillmentStatus.cancelled,
  _ => OrderFulfillmentStatus.unknown,
};

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('Campo obrigatório ausente no contrato V2: $key');
  }
  return value.trim();
}

int _requiredPositiveInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! num || value.toInt() <= 0) {
    throw FormatException('Campo numérico inválido no contrato V2: $key');
  }
  return value.toInt();
}

DateTime _requiredDateTime(Map<String, dynamic> json, String key) {
  final parsed = DateTime.tryParse(_requiredString(json, key));
  if (parsed == null) {
    throw FormatException('Data inválida no contrato V2: $key');
  }
  return parsed;
}

class OrderCompetence {
  const OrderCompetence({
    required this.id,
    required this.code,
    required this.label,
    required this.startsOn,
    required this.endsOn,
  });
  final String id, code, label, startsOn, endsOn;
  factory OrderCompetence.fromJson(Map<String, dynamic> j) => OrderCompetence(
    id: _requiredString(j, 'id'),
    code: _requiredString(j, 'code'),
    label: _requiredString(j, 'label'),
    startsOn: _requiredString(j, 'startsOn'),
    endsOn: _requiredString(j, 'endsOn'),
  );
}

class OrderItem {
  const OrderItem({
    required this.id,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.sku,
  });
  final String id, name;
  final int quantity;
  final OrderMoney unitPrice, totalPrice;
  final String? sku;
  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
    id: _requiredString(j, 'id'),
    name: _requiredString(j, 'name'),
    quantity: _requiredPositiveInt(j, 'quantity'),
    unitPrice: OrderMoney.fromJson(j['unitPrice']),
    totalPrice: OrderMoney.fromJson(j['totalPrice']),
    sku: j['sku'] as String?,
  );
}

class PaymentSession {
  const PaymentSession({
    required this.id,
    required this.status,
    required this.amount,
    this.checkoutNumber = '',
    this.paymentLinkUrl,
    this.paidAt,
    this.expiresAt,
    this.orderIds = const [],
  });
  final String id, status, checkoutNumber;
  final OrderMoney amount;
  final String? paymentLinkUrl, paidAt, expiresAt;
  final List<String> orderIds;
  bool get isPaid => status == 'paid';
  factory PaymentSession.fromJson(Map<String, dynamic> j) => PaymentSession(
    id: _requiredString(j, 'id'),
    status: _requiredString(j, 'status'),
    checkoutNumber: j['checkoutNumber'] is String
        ? (j['checkoutNumber'] as String).trim()
        : '',
    amount: OrderMoney.fromJson(j['amount']),
    paymentLinkUrl: j['paymentLinkUrl'] as String?,
    paidAt: j['paidAt'] as String?,
    expiresAt: j['expiresAt'] as String?,
    orderIds: (j['orderIds'] as List? ?? const []).map((e) => '$e').toList(),
  );
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.orderDate,
    required this.approvalStatus,
    required this.paymentStatus,
    required this.fulfillmentStatus,
    required this.createdAt,
    required this.total,
    required this.items,
    required this.paymentEligible,
    this.competence,
    this.paymentSessions = const [],
  });
  final String id, orderNumber, orderDate;
  final OrderApprovalStatus approvalStatus;
  final OrderPaymentStatus paymentStatus;
  final OrderFulfillmentStatus fulfillmentStatus;
  final DateTime? createdAt;
  final OrderMoney total;
  final List<OrderItem> items;
  final bool paymentEligible;
  final OrderCompetence? competence;
  final List<PaymentSession> paymentSessions;
  int get itemsCount => items.fold(0, (sum, item) => sum + item.quantity);
  String get status => fulfillmentStatus.name;
  String get reviewStatus => approvalStatus.name;
  String? get paymentUrl => paymentSessions
      .where((session) => session.paymentLinkUrl != null)
      .lastOrNull
      ?.paymentLinkUrl;
  String? get rejectedReason => approvalStatus == OrderApprovalStatus.rejected
      ? 'Pedido recusado.'
      : null;
  String? get reviewNotes => null;
  String? get customerName => null;
  String? get notes => null;
  factory OrderSummary.fromJson(Map<String, dynamic> j) => OrderSummary(
    id: _requiredString(j, 'id'),
    orderNumber: _requiredString(j, 'orderNumber'),
    orderDate: _requiredString(j, 'orderDate'),
    approvalStatus: _approval(j['approvalStatus']),
    paymentStatus: _payment(j['paymentStatus']),
    fulfillmentStatus: _fulfillment(j['fulfillmentStatus']),
    createdAt: _requiredDateTime(j, 'createdAt'),
    total: OrderMoney.fromJson(j['total']),
    paymentEligible: j['paymentEligible'] is bool
        ? j['paymentEligible'] as bool
        : throw const FormatException(
            'Campo obrigatório inválido: paymentEligible',
          ),
    items:
        (j['items'] is List
                ? j['items'] as List
                : throw const FormatException(
                    'Campo obrigatório inválido: items',
                  ))
            .whereType<Map<String, dynamic>>()
            .map(OrderItem.fromJson)
            .toList(),
    competence: j['competence'] is Map<String, dynamic>
        ? OrderCompetence.fromJson(j['competence'] as Map<String, dynamic>)
        : null,
    paymentSessions: (j['paymentSessions'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(PaymentSession.fromJson)
        .toList(),
  );
}

typedef OrderDetail = OrderSummary;

class CreateOrderItem {
  const CreateOrderItem({required this.variantId, required this.quantity});
  final String variantId;
  final int quantity;
  Map<String, dynamic> toJson() => {
    'variantId': variantId,
    'quantity': quantity,
  };
}

class CreateOrderRequest {
  const CreateOrderRequest({required this.items, this.notes, this.couponCode});
  final List<CreateOrderItem> items;
  final String? notes, couponCode;
  Map<String, dynamic> toJson() => {
    'items': items.map((i) => i.toJson()).toList(),
    if (notes?.trim().isNotEmpty == true) 'notes': notes!.trim(),
    if (couponCode?.trim().isNotEmpty == true) 'couponCode': couponCode!.trim(),
  };
}
