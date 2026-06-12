import 'package:flutter/material.dart';

class RaffleStatusPresentation {
  const RaffleStatusPresentation({
    required this.label,
    required this.icon,
    required this.color,
  });

  final String label;
  final IconData icon;
  final Color color;
}

RaffleStatusPresentation mapRaffleStatus(BuildContext context, String status) {
  final scheme = Theme.of(context).colorScheme;
  final normalized = status.trim().toLowerCase();

  return switch (normalized) {
    'pending_payment' => RaffleStatusPresentation(
      label: 'Aguardando pagamento',
      icon: Icons.payments_rounded,
      color: scheme.secondary,
    ),
    'paid' => RaffleStatusPresentation(
      label: 'Pago',
      icon: Icons.verified_rounded,
      color: scheme.tertiary,
    ),
    'cancelled' => RaffleStatusPresentation(
      label: 'Cancelado',
      icon: Icons.cancel_rounded,
      color: scheme.error,
    ),
    'reserved' => RaffleStatusPresentation(
      label: 'Reservado',
      icon: Icons.lock_rounded,
      color: scheme.primary,
    ),
    'expired' => RaffleStatusPresentation(
      label: 'Expirado',
      icon: Icons.schedule_rounded,
      color: scheme.outline,
    ),
    'open' || 'available' => RaffleStatusPresentation(
      label: 'Aberta',
      icon: Icons.local_activity_rounded,
      color: scheme.primary,
    ),
    _ => RaffleStatusPresentation(
      label: normalized.isEmpty ? 'Rifa' : normalized,
      icon: Icons.local_activity_rounded,
      color: scheme.primary,
    ),
  };
}
