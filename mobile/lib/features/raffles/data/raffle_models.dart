import '../../../core/utils/currency_formatter.dart';

class RafflePrice {
  const RafflePrice(this.value);

  final double value;

  factory RafflePrice.fromJson(Object? value) {
    if (value is num) {
      return RafflePrice(value.toDouble());
    }
    if (value is String) {
      return RafflePrice(double.tryParse(value.replaceAll(',', '.')) ?? 0);
    }
    return const RafflePrice(0);
  }

  String get formatted => CurrencyFormatter.brl(value);
}

class RaffleStats {
  const RaffleStats({
    required this.available,
    required this.pending,
    required this.sold,
    required this.total,
  });

  final int available;
  final int pending;
  final int sold;
  final int total;

  factory RaffleStats.fromJson(Object? value, {int fallbackTotal = 0}) {
    if (value is! Map<String, dynamic>) {
      return RaffleStats(
        available: 0,
        pending: 0,
        sold: 0,
        total: fallbackTotal,
      );
    }

    return RaffleStats(
      available: _readInt(value['available']),
      pending: _readInt(value['pending']),
      sold: _readInt(value['sold']),
      total: _readInt(value['total']),
    );
  }
}

class RaffleSummary {
  const RaffleSummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.description,
    required this.status,
    required this.pricePerNumber,
    required this.totalNumbers,
    required this.soldNumbers,
    required this.availableNumbers,
    this.imageUrl,
    this.drawDate,
  });

  final String id;
  final String slug;
  final String title;
  final String description;
  final String status;
  final RafflePrice pricePerNumber;
  final int totalNumbers;
  final int soldNumbers;
  final int availableNumbers;
  final String? imageUrl;
  final DateTime? drawDate;

  factory RaffleSummary.fromJson(Map<String, dynamic> json) {
    final totalNumbers = _readInt(
      json['total_numbers'] ?? json['totalNumbers'],
    );
    final stats = RaffleStats.fromJson(
      json['stats'],
      fallbackTotal: totalNumbers,
    );

    return RaffleSummary(
      id: _readString(json, ['id']),
      slug: _readString(json, ['slug']),
      title: _readString(json, ['title'], fallback: 'Rifa Smart Funkos'),
      description: _readString(json, [
        'description',
        'prize_description',
      ], fallback: 'Campanha experimental Smart Funkos.'),
      status: _readString(json, ['status'], fallback: 'open'),
      pricePerNumber: RafflePrice.fromJson(
        json['price_per_number'] ?? json['pricePerNumber'],
      ),
      totalNumbers: stats.total > 0 ? stats.total : totalNumbers,
      soldNumbers: stats.sold,
      availableNumbers: stats.available,
      imageUrl: _readNullableString(json, [
        'prize_image_url',
        'imageUrl',
        'image_url',
      ]),
      drawDate: DateTime.tryParse(_readString(json, ['draw_at', 'drawDate'])),
    );
  }
}

class RaffleDetail extends RaffleSummary {
  const RaffleDetail({
    required super.id,
    required super.slug,
    required super.title,
    required super.description,
    required super.status,
    required super.pricePerNumber,
    required super.totalNumbers,
    required super.soldNumbers,
    required super.availableNumbers,
    required this.numbers,
    super.imageUrl,
    super.drawDate,
    this.rules,
    this.prizeTitle,
    this.maxNumbersPerCustomer,
  });

  final List<RaffleNumber> numbers;
  final String? rules;
  final String? prizeTitle;
  final int? maxNumbersPerCustomer;

  factory RaffleDetail.fromJson({
    required Map<String, dynamic> campaign,
    required List<Map<String, dynamic>> numbers,
  }) {
    final summary = RaffleSummary.fromJson(campaign);

    return RaffleDetail(
      id: summary.id,
      slug: summary.slug,
      title: summary.title,
      description: summary.description,
      status: summary.status,
      pricePerNumber: summary.pricePerNumber,
      totalNumbers: summary.totalNumbers,
      soldNumbers: summary.soldNumbers,
      availableNumbers: summary.availableNumbers,
      imageUrl: summary.imageUrl,
      drawDate: summary.drawDate,
      numbers: numbers.map(RaffleNumber.fromJson).toList(),
      rules: _readNullableString(campaign, ['rules']),
      prizeTitle: _readNullableString(campaign, ['prize_title', 'prizeTitle']),
      maxNumbersPerCustomer: _readNullableInt(
        campaign['max_numbers_per_customer'],
      ),
    );
  }
}

class RaffleNumber {
  const RaffleNumber({
    required this.number,
    required this.label,
    required this.status,
  });

  final int number;
  final String label;
  final String status;

  bool get selectable => status == 'available';
  bool get reserved => status == 'pending_payment' || status == 'reserved';
  bool get sold => status == 'sold' || status == 'winner';

  factory RaffleNumber.fromJson(Map<String, dynamic> json) {
    return RaffleNumber(
      number: _readInt(json['number']),
      label: _readString(json, [
        'label',
      ], fallback: '${_readInt(json['number'])}'),
      status: _readString(json, ['status'], fallback: 'available'),
    );
  }
}

class RaffleEntry {
  const RaffleEntry({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.total,
    required this.numbers,
    required this.createdAt,
    this.title,
    this.paymentUrl,
    this.reservedUntil,
  });

  final String id;
  final String orderNumber;
  final String status;
  final RafflePrice total;
  final List<String> numbers;
  final DateTime? createdAt;
  final String? title;
  final String? paymentUrl;
  final DateTime? reservedUntil;

  factory RaffleEntry.fromJson(Map<String, dynamic> json) {
    final rawNumbers = json['raffle_numbers'];
    final numbers = rawNumbers is List
        ? rawNumbers
              .whereType<Map<String, dynamic>>()
              .map(
                (item) => _readString(item, [
                  'label',
                ], fallback: '${_readInt(item['number'])}'),
              )
              .where((label) => label.isNotEmpty)
              .toList()
        : <String>[];
    final campaign = json['raffle_campaigns'];

    return RaffleEntry(
      id: _readString(json, ['id']),
      orderNumber: _readString(json, ['order_number', 'orderNumber']),
      status: _readString(json, ['status'], fallback: 'pending_payment'),
      total: RafflePrice.fromJson(json['total_amount'] ?? json['totalAmount']),
      numbers: numbers,
      createdAt: DateTime.tryParse(
        _readString(json, ['created_at', 'createdAt']),
      ),
      title: campaign is Map<String, dynamic>
          ? _readNullableString(campaign, ['title'])
          : null,
      paymentUrl: _readNullableString(json, [
        'payment_link_url',
        'paymentLinkUrl',
      ]),
      reservedUntil: DateTime.tryParse(
        _readString(json, ['reserved_until', 'reservedUntil']),
      ),
    );
  }
}

class CreateRaffleEntryRequest {
  const CreateRaffleEntryRequest({required this.numbers});

  final List<int> numbers;

  Map<String, dynamic> toJson() => {'numbers': numbers};
}

class CreateRaffleEntryResponse {
  const CreateRaffleEntryResponse({
    required this.entryId,
    required this.orderNumber,
    required this.status,
    required this.numbers,
    required this.total,
    required this.message,
    this.paymentUrl,
  });

  final String entryId;
  final String orderNumber;
  final String status;
  final List<String> numbers;
  final RafflePrice total;
  final String message;
  final String? paymentUrl;

  factory CreateRaffleEntryResponse.fromJson(Map<String, dynamic> json) {
    final rawNumbers = json['numbers'];

    return CreateRaffleEntryResponse(
      entryId: _readString(json, ['orderId', 'entryId', 'id']),
      orderNumber: _readString(json, ['orderNumber', 'order_number']),
      status: _readString(json, [
        'paymentStatus',
        'status',
      ], fallback: 'pending'),
      numbers: rawNumbers is List
          ? rawNumbers.map((item) => item.toString()).toList()
          : const [],
      total: RafflePrice.fromJson(json['totalAmount'] ?? json['total']),
      message: 'Números reservados com sucesso.',
      paymentUrl: _readNullableString(json, [
        'paymentLinkUrl',
        'payment_link_url',
      ]),
    );
  }
}

int _readInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

int? _readNullableInt(Object? value) {
  final parsed = _readInt(value);
  return parsed > 0 ? parsed : null;
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
    if (value == null) continue;
    final text = value.toString().trim();
    if (text.isNotEmpty) return text;
  }
  return null;
}
