import '../../../core/utils/currency_formatter.dart';

class OrderMoney {
  const OrderMoney(this.value);

  final double value;

  factory OrderMoney.fromJson(Object? value) {
    if (value is num) {
      return OrderMoney(value.toDouble());
    }

    if (value is String) {
      return OrderMoney(double.tryParse(value.replaceAll(',', '.')) ?? 0);
    }

    return const OrderMoney(0);
  }

  String get formatted => CurrencyFormatter.brl(value);
}

class OrderItem {
  const OrderItem({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.status,
    this.sku,
    this.imageUrl,
  });

  final String name;
  final int quantity;
  final OrderMoney unitPrice;
  final OrderMoney totalPrice;
  final String status;
  final String? sku;
  final String? imageUrl;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      name: _readString(json, ['name', 'productName'], fallback: 'Produto'),
      quantity: _readInt(json['quantity']),
      unitPrice: OrderMoney.fromJson(json['unitPrice'] ?? json['unit_price']),
      totalPrice: OrderMoney.fromJson(
        json['totalPrice'] ?? json['total_price'],
      ),
      status: _readString(json, ['status'], fallback: 'requested'),
      sku: _readNullableString(json, ['sku']),
      imageUrl: _readNullableString(json, ['imageUrl', 'image_url']),
    );
  }
}

class OrderSummary {
  const OrderSummary({
    required this.orderNumber,
    required this.status,
    required this.reviewStatus,
    required this.createdAt,
    required this.total,
    required this.itemsCount,
    this.paymentStatus,
  });

  final String orderNumber;
  final String status;
  final String reviewStatus;
  final DateTime? createdAt;
  final OrderMoney total;
  final int itemsCount;
  final String? paymentStatus;

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final items = _readItems(json['items']);
    final payments = json['payments'];
    String? paymentStatus;

    if (payments is List && payments.isNotEmpty) {
      final first = payments.first;
      if (first is Map<String, dynamic>) {
        paymentStatus = _readNullableString(first, ['status']);
      }
    }

    return OrderSummary(
      orderNumber: _readString(json, ['orderNumber', 'order_number']),
      status: _readString(json, ['status'], fallback: 'draft'),
      reviewStatus: _readString(json, [
        'reviewStatus',
        'review_status',
      ], fallback: _readString(json, ['status'], fallback: 'draft')),
      createdAt: DateTime.tryParse(
        _readString(json, ['createdAt', 'created_at']),
      ),
      total: OrderMoney.fromJson(json['total']),
      itemsCount: items.fold<int>(0, (total, item) => total + item.quantity),
      paymentStatus: paymentStatus,
    );
  }
}

class OrderDetail {
  const OrderDetail({
    required this.orderNumber,
    required this.status,
    required this.reviewStatus,
    required this.createdAt,
    required this.total,
    required this.items,
    this.customerName,
    this.notes,
    this.paymentStatus,
    this.paymentUrl,
    this.rejectedReason,
    this.reviewNotes,
  });

  final String orderNumber;
  final String status;
  final String reviewStatus;
  final DateTime? createdAt;
  final OrderMoney total;
  final List<OrderItem> items;
  final String? customerName;
  final String? notes;
  final String? paymentStatus;
  final String? paymentUrl;
  final String? rejectedReason;
  final String? reviewNotes;

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final payments = json['payments'];
    String? paymentStatus;

    if (payments is List && payments.isNotEmpty) {
      final first = payments.first;
      if (first is Map<String, dynamic>) {
        paymentStatus = _readNullableString(first, ['status']);
      }
    }

    return OrderDetail(
      orderNumber: _readString(json, ['orderNumber', 'order_number']),
      status: _readString(json, ['status'], fallback: 'draft'),
      reviewStatus: _readString(json, [
        'reviewStatus',
        'review_status',
      ], fallback: _readString(json, ['status'], fallback: 'draft')),
      createdAt: DateTime.tryParse(
        _readString(json, ['createdAt', 'created_at']),
      ),
      total: OrderMoney.fromJson(json['total']),
      items: _readItems(json['items']),
      customerName: _readNullableString(json, [
        'customerName',
        'customer_name',
      ]),
      notes: _readNullableString(json, ['notes']),
      paymentStatus: paymentStatus,
      paymentUrl: _readNullableString(json, ['paymentLinkUrl', 'paymentUrl']),
      rejectedReason: _readNullableString(json, ['rejectedReason']),
      reviewNotes: _readNullableString(json, ['reviewNotes']),
    );
  }
}

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
  const CreateOrderRequest({required this.items, this.notes});

  final List<CreateOrderItem> items;
  final String? notes;

  Map<String, dynamic> toJson() {
    final trimmedNotes = notes?.trim();

    return {
      'items': items.map((item) => item.toJson()).toList(),
      if (trimmedNotes != null && trimmedNotes.isNotEmpty)
        'notes': trimmedNotes,
    };
  }
}

class CreateOrderResponse {
  const CreateOrderResponse({
    required this.orderNumber,
    required this.status,
    required this.reviewStatus,
    required this.message,
  });

  final String orderNumber;
  final String status;
  final String reviewStatus;
  final String message;

  factory CreateOrderResponse.fromJson(Map<String, dynamic> json) {
    return CreateOrderResponse(
      orderNumber: _readString(json, ['orderNumber', 'order_number']),
      status: _readString(json, ['status'], fallback: 'draft'),
      reviewStatus: _readString(json, [
        'reviewStatus',
        'review_status',
      ], fallback: 'under_review'),
      message: _readString(json, [
        'message',
      ], fallback: 'Pedido enviado para análise.'),
    );
  }
}

List<OrderItem> _readItems(Object? value) {
  if (value is List) {
    return value
        .whereType<Map<String, dynamic>>()
        .map(OrderItem.fromJson)
        .toList();
  }

  return const [];
}

int _readInt(Object? value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  if (value is String) {
    return int.tryParse(value) ?? 0;
  }

  return 0;
}

String _readString(
  Map<String, dynamic> json,
  List<String> keys, {
  String fallback = '',
}) {
  return _readNullableString(json, keys) ?? fallback;
}

String? _readNullableString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value == null) {
      continue;
    }

    final text = value.toString().trim();
    if (text.isNotEmpty) {
      return text;
    }
  }

  return null;
}
