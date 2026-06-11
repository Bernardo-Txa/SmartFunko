import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    return AppScaffold(
      title: 'Perfil',
      body: auth.isAuthenticated && user != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SmartCard(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        child: Text(
                          (user.email ?? 'S').substring(0, 1).toUpperCase(),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.displayName,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            Text(user.email ?? 'E-mail não informado'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: 'Sair',
                  icon: Icons.logout_rounded,
                  variant: PrimaryButtonVariant.outlined,
                  onPressed: () async {
                    await ref.read(authControllerProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                ),
              ],
            )
          : Column(
              children: [
                const EmptyState(
                  icon: Icons.person_outline_rounded,
                  title: 'Você está como visitante',
                  message:
                      'Entre para ver perfil, pedidos e Clube Smart Funkos.',
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: 'Entrar',
                  icon: Icons.login_rounded,
                  onPressed: () => context.go('/login'),
                ),
              ],
            ),
    );
  }
}
