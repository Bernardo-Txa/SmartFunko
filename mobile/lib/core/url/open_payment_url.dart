import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../shared/widgets/primary_button.dart';

bool _openingPaymentUrl = false;

Future<void> openPaymentUrl(BuildContext context, String url) async {
  if (_openingPaymentUrl) {
    return;
  }

  final uri = Uri.tryParse(url);
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    _showError(context, 'Não foi possível abrir o pagamento.');
    return;
  }

  _openingPaymentUrl = true;

  try {
    final proceed = await showModalBottomSheet<bool>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Pagamento seguro',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                'Você será direcionado para concluir o pagamento. Depois, volte ao app para acompanhar o status.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Continuar para pagamento',
                icon: Icons.open_in_new_rounded,
                fullWidth: true,
                onPressed: () => Navigator.of(context).pop(true),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancelar'),
              ),
            ],
          ),
        );
      },
    );

    if (proceed != true || !context.mounted) {
      return;
    }

    final modes = kIsWeb
        ? const [LaunchMode.externalApplication]
        : const [LaunchMode.inAppBrowserView, LaunchMode.externalApplication];

    for (final mode in modes) {
      try {
        if (await launchUrl(uri, mode: mode)) {
          return;
        }
      } catch (_) {
        // Try next fallback.
      }
    }

    if (context.mounted) {
      _showError(context, 'Não foi possível abrir o pagamento agora.');
    }
  } finally {
    _openingPaymentUrl = false;
  }
}

void _showError(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
