import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/url/open_payment_url.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/branding/smart_funko_brand.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/order_models.dart';
import 'data/orders_repository.dart';

class OrderDetailPage extends ConsumerWidget {
  const OrderDetailPage({required this.orderNumber, super.key});

  final String orderNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderDetailProvider(orderNumber));

    return AppScaffold(
      title: 'Pedido $orderNumber',
      showBackButton: true,
      showSearch: false,
      showDrawerButton: false,
      showProfileAction: false,
      showCartAction: false,
      body: order.when(
        data: (item) => _OrderDetailContent(order: item),
        loading: () => const LoadingState(message: 'Carregando pedido...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar este pedido.',
          onRetry: () {
            ref
                .read(ordersRepositoryProvider)
                .invalidateOrderByNumber(orderNumber);
            ref.invalidate(orderDetailProvider(orderNumber));
          },
        ),
      ),
    );
  }
}

class _OrderDetailContent extends ConsumerWidget {
  const _OrderDetailContent({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final reviewMessage = order.rejectedReason ?? order.reviewNotes;
    final customerName = order.customerName;
    final notes = order.notes;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SmartCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.receipt_long_rounded,
                    color: theme.colorScheme.primary,
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Status do pedido',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
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
                  ),
                  StatusBadge(
                    label: order.paymentStatus.label,
                    icon: Icons.payments_outlined,
                  ),
                  StatusBadge(
                    label: order.fulfillmentStatus.label,
                    icon: Icons.local_shipping_outlined,
                  ),
                ],
              ),
              if (reviewMessage != null) ...[
                const SizedBox(height: 10),
                Text(reviewMessage),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        SmartCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DetailRow(label: 'Número', value: order.orderNumber),
              _DetailRow(
                label: 'Criado em',
                value: DateFormatter.dayMonthYearHour(order.createdAt),
              ),
              if (customerName != null)
                _DetailRow(label: 'Cliente', value: customerName),
              if (notes != null) _DetailRow(label: 'Observações', value: notes),
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
        for (final item in order.items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _OrderItemTile(item: item),
          ),
        const SizedBox(height: 8),
        SmartCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Total',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              PriceTag(
                label: order.total.formatted,
                subtitle: 'Valor do pedido',
              ),
            ],
          ),
        ),
        if (order.paymentEligible) ...[
          const SizedBox(height: 16),
          _PaymentAction(order: order),
        ],
      ],
    );
  }
}

class _PaymentAction extends ConsumerStatefulWidget {
  const _PaymentAction({required this.order});
  final OrderDetail order;
  @override
  ConsumerState<_PaymentAction> createState() => _PaymentActionState();
}

class _PaymentActionState extends ConsumerState<_PaymentAction>
    with WidgetsBindingObserver {
  PaymentSession? _session;
  bool _busy = false;
  bool _waitingForReturn = false;
  String? _error;
  String? _paymentIdempotencyKey;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _waitingForReturn &&
        _session != null) {
      _waitingForReturn = false;
      _sync();
    }
  }

  Future<void> _pay() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = ref.read(ordersRepositoryProvider);
      _paymentIdempotencyKey ??= repository.newIdempotencyKey('payment');
      final session =
          _session ??
          await repository.createPaymentSession([
            widget.order.id,
          ], idempotencyKey: _paymentIdempotencyKey!);
      final url = session.paymentLinkUrl;
      if (url == null || url.isEmpty) {
        throw StateError('Link de pagamento indisponível.');
      }
      _session = session;
      _waitingForReturn = true;
      if (mounted) await openPaymentUrl(context, url);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Não foi possível abrir o pagamento.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sync() async {
    final session = _session;
    if (session == null || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(ordersRepositoryProvider).syncPaymentSession(session.id);
      ref.invalidate(ordersProvider);
      ref.invalidate(orderDetailProvider(widget.order.orderNumber));
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Pagamento ainda não confirmado. Tente atualizar.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      PrimaryButton(
        label: 'Pagar com InfinitePay',
        icon: Icons.open_in_new_rounded,
        fullWidth: true,
        isLoading: _busy,
        onPressed: _pay,
      ),
      if (_session != null)
        TextButton.icon(
          onPressed: _busy ? null : _sync,
          icon: const Icon(Icons.sync_rounded),
          label: const Text('Sincronizar pagamento'),
        ),
      if (_error != null)
        Text(
          _error!,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
    ],
  );
}

class _OrderItemTile extends StatelessWidget {
  const _OrderItemTile({required this.item});

  final OrderItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SmartCard(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            height: 54,
            width: 54,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: SmartFunkoLogo(
                variant: SmartFunkoLogoVariant.square,
                width: 34,
                height: 34,
                excludeFromSemantics: true,
              ),
            ),
          ),
          const SizedBox(width: 12),
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
                  '${item.quantity} x ${item.unitPrice.formatted}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Text(
            item.totalPrice.formatted,
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.secondary,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 104,
            child: Text(
              label,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
