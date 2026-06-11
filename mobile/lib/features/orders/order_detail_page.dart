import 'package:flutter/material.dart';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/smart_card.dart';

class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({required this.orderNumber, super.key});

  final String orderNumber;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Pedido $orderNumber',
      showBackButton: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SmartCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Status',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Em preparação',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                Text('Detalhe placeholder para o pedido $orderNumber.'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
