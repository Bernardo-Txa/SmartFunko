import 'package:flutter/material.dart';

class OrderStatusPresentation {
  const OrderStatusPresentation({
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
  });

  final String label;
  final String description;
  final IconData icon;
  final Color color;
}

OrderStatusPresentation mapOrderStatus(
  BuildContext context, {
  required String status,
  required String reviewStatus,
}) {
  final scheme = Theme.of(context).colorScheme;
  final normalized = reviewStatus.isNotEmpty ? reviewStatus : status;

  return switch (normalized) {
    'under_review' => OrderStatusPresentation(
      label: 'Em análise',
      description: 'Nossa equipe vai revisar e aprovar seu pedido.',
      icon: Icons.manage_search_rounded,
      color: scheme.primary,
    ),
    'approved_for_payment' ||
    'awaiting_payment' ||
    'pending_payment' => OrderStatusPresentation(
      label: 'Aguardando pagamento',
      description:
          'Pedido aprovado. Aguarde ou abra o link de pagamento quando disponível.',
      icon: Icons.payments_rounded,
      color: scheme.secondary,
    ),
    'paid' => OrderStatusPresentation(
      label: 'Pago',
      description: 'Pagamento confirmado. Vamos seguir com a preparação.',
      icon: Icons.verified_rounded,
      color: scheme.tertiary,
    ),
    'rejected' => OrderStatusPresentation(
      label: 'Recusado',
      description: 'O pedido não foi aprovado pela equipe Smart Funkos.',
      icon: Icons.cancel_rounded,
      color: scheme.error,
    ),
    'cancelled' => OrderStatusPresentation(
      label: 'Cancelado',
      description: 'Este pedido foi cancelado.',
      icon: Icons.block_rounded,
      color: scheme.error,
    ),
    'refunded' => OrderStatusPresentation(
      label: 'Estornado',
      description: 'Pagamento estornado.',
      icon: Icons.replay_rounded,
      color: scheme.error,
    ),
    _ => OrderStatusPresentation(
      label: 'Em andamento',
      description: 'Acompanhe as próximas atualizações do pedido.',
      icon: Icons.receipt_long_rounded,
      color: scheme.primary,
    ),
  };
}
