import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/url/open_payment_url.dart';
import '../../core/utils/date_formatter.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/loading_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/price_tag.dart';
import '../../shared/widgets/smart_card.dart';
import '../../shared/widgets/status_badge.dart';
import 'data/order_models.dart';
import 'data/orders_repository.dart';
import 'domain/order_status_mapper.dart';

class OrderDetailPage extends ConsumerWidget {
  const OrderDetailPage({required this.orderNumber, super.key});

  final String orderNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderDetailProvider(orderNumber));

    return AppScaffold(
      title: 'Pedido $orderNumber',
      showBackButton: true,
      body: order.when(
        data: (item) => _OrderDetailContent(order: item),
        loading: () => const LoadingState(message: 'Carregando pedido...'),
        error: (error, stackTrace) => ErrorState(
          message: 'Não foi possível carregar este pedido.',
          onRetry: () => ref.invalidate(orderDetailProvider(orderNumber)),
        ),
      ),
    );
  }
}

class _OrderDetailContent extends StatelessWidget {
  const _OrderDetailContent({required this.order});

  final OrderDetail order;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = mapOrderStatus(
      context,
      status: order.status,
      reviewStatus: order.reviewStatus,
    );
    final reviewMessage = order.rejectedReason ?? order.reviewNotes;
    final customerName = order.customerName;
    final notes = order.notes;
    final paymentUrl = order.paymentUrl;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SmartCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(status.icon, color: status.color, size: 32),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      status.label,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              StatusBadge(
                label: status.label,
                icon: status.icon,
                color: status.color,
              ),
              const SizedBox(height: 10),
              Text(
                status.description,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
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
        if (paymentUrl != null) ...[
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Abrir pagamento',
            icon: Icons.open_in_new_rounded,
            fullWidth: true,
            onPressed: () => openPaymentUrl(context, paymentUrl),
          ),
        ],
      ],
    );
  }
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
            child: Icon(Icons.toys_rounded, color: theme.colorScheme.primary),
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
