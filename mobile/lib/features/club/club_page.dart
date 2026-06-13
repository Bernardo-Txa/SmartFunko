import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/primary_button.dart';

class ClubPage extends StatelessWidget {
  const ClubPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Clube',
      body: Column(
        children: [
          const EmptyState(
            icon: Icons.workspace_premium_outlined,
            title: 'Clube indisponível no mobile',
            message:
                'Esta área foi removida da navegação enquanto não houver fluxo real de ponta a ponta.',
          ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: 'Voltar ao perfil',
            icon: Icons.person_rounded,
            fullWidth: true,
            onPressed: () => context.go('/perfil'),
          ),
        ],
      ),
    );
  }
}
