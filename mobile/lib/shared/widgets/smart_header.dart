import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../features/cart/data/cart_controller.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_shadows.dart';

class SmartHeader extends ConsumerWidget implements PreferredSizeWidget {
  const SmartHeader({
    required this.title,
    this.subtitle,
    this.showBackButton = false,
    this.showSearch = false,
    this.showDrawerButton = true,
    this.showCartAction = true,
    this.showProfileAction = true,
    this.actions = const [],
    super.key,
  });

  final String title;
  final String? subtitle;
  final bool showBackButton;
  final bool showSearch;
  final bool showDrawerButton;
  final bool showCartAction;
  final bool showProfileAction;
  final List<Widget> actions;

  @override
  Size get preferredSize => Size.fromHeight(subtitle == null ? 88 : 104);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final auth = ref.watch(authControllerProvider);
    final cartQuantity = ref.watch(
      cartControllerProvider.select((cart) => cart.totalQuantity),
    );
    final normalizedTitle = title.trim().toLowerCase();
    final showBrand =
        !normalizedTitle.contains('smart funkos') &&
        !normalizedTitle.contains('smartfunkos');

    return SafeArea(
      bottom: false,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: theme.brightness == Brightness.dark
                ? [
                    AppColors.darkSurfaceElevated.withValues(alpha: 0.98),
                    AppColors.darkSurface.withValues(alpha: 0.98),
                  ]
                : [
                    colorScheme.surface.withValues(alpha: 0.98),
                    colorScheme.surfaceContainerHighest.withValues(alpha: 0.92),
                  ],
          ),
          border: Border(
            bottom: BorderSide(
              color: AppColors.primary.withValues(alpha: 0.12),
            ),
          ),
          boxShadow: AppShadows.card,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (showBackButton)
                _HeaderAction(
                  tooltip: 'Voltar',
                  icon: Icons.arrow_back_rounded,
                  onPressed: () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/');
                    }
                  },
                )
              else
                Container(
                  height: 42,
                  width: 42,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        colorScheme.primary.withValues(alpha: 0.28),
                        colorScheme.secondary.withValues(alpha: 0.18),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(
                      color: colorScheme.primary.withValues(alpha: 0.24),
                    ),
                  ),
                  child: Icon(
                    Icons.toys_rounded,
                    color: colorScheme.primary,
                    size: 22,
                  ),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (showBrand && !showBackButton) ...[
                      Text(
                        'SmartFunko',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0,
                        ),
                      ),
                      const SizedBox(height: 2),
                    ],
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        height: 1.05,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ...actions,
                  if (showSearch)
                    _HeaderAction(
                      tooltip: 'Buscar',
                      icon: Icons.manage_search_rounded,
                      onPressed: () => context.go('/catalogo'),
                    ),
                  if (showCartAction)
                    _HeaderAction(
                      tooltip: 'Carrinho',
                      icon: Icons.shopping_bag_outlined,
                      badgeCount: cartQuantity,
                      onPressed: () => context.go('/carrinho'),
                    ),
                  if (showProfileAction)
                    _HeaderAction(
                      tooltip: auth.isAuthenticated ? 'Perfil' : 'Entrar',
                      onPressed: () => context.go(
                        auth.isAuthenticated ? '/perfil' : '/login',
                      ),
                      child: auth.isAuthenticated
                          ? _AvatarInitials(name: auth.displayName)
                          : Icon(
                              Icons.person_outline_rounded,
                              color: colorScheme.onSurface,
                              size: 20,
                            ),
                    ),
                  if (showDrawerButton)
                    Builder(
                      builder: (context) => _HeaderAction(
                        tooltip: 'Menu',
                        icon: Icons.menu_rounded,
                        onPressed: () => Scaffold.of(context).openDrawer(),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  const _HeaderAction({
    required this.tooltip,
    required this.onPressed,
    this.icon,
    this.child,
    this.badgeCount,
  });

  final String tooltip;
  final VoidCallback onPressed;
  final IconData? icon;
  final Widget? child;
  final int? badgeCount;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final button = IconButton.filledTonal(
      tooltip: tooltip,
      style: IconButton.styleFrom(
        backgroundColor: colorScheme.surfaceContainerHighest.withValues(
          alpha: 0.80,
        ),
        foregroundColor: colorScheme.onSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
      onPressed: onPressed,
      icon:
          child ??
          Badge.count(
            isLabelVisible: (badgeCount ?? 0) > 0,
            count: badgeCount ?? 0,
            child: Icon(icon, size: 20),
          ),
    );

    return Padding(padding: const EdgeInsets.only(left: 6), child: button);
  }
}

class _AvatarInitials extends StatelessWidget {
  const _AvatarInitials({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initials = _initials(name);

    return CircleAvatar(
      radius: 11,
      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.18),
      child: Text(
        initials,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    final letters = parts
        .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
        .take(2)
        .join();
    return letters.isEmpty ? 'S' : letters;
  }
}
