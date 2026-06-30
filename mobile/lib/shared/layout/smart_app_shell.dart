import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'responsive_content.dart';
import '../widgets/smart_header.dart';

class SmartAppShell extends StatelessWidget {
  const SmartAppShell({
    required this.child,
    this.title,
    this.subtitle,
    this.showHeader = true,
    this.showSearch = false,
    this.showBackButton = false,
    this.showDrawerButton = false,
    this.showCartAction = true,
    this.showProfileAction = true,
    this.showBottomNavigation = true,
    this.actions = const [],
    this.onRefresh,
    this.padding,
    this.floatingActionButton,
    super.key,
  });

  final Widget child;
  final String? title;
  final String? subtitle;
  final bool showHeader;
  final bool showSearch;
  final bool showBackButton;
  final bool showDrawerButton;
  final bool showCartAction;
  final bool showProfileAction;
  final bool showBottomNavigation;
  final List<Widget> actions;
  final Future<void> Function()? onRefresh;
  final EdgeInsetsGeometry? padding;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final headerTitle = title ?? 'SmartFunko';

    return Scaffold(
      extendBody: true,
      appBar: showHeader
          ? SmartHeader(
              title: headerTitle,
              subtitle: subtitle,
              showBackButton: showBackButton,
              showSearch: showSearch,
              showDrawerButton: showDrawerButton,
              showCartAction: showCartAction,
              showProfileAction: showProfileAction,
              actions: actions,
            )
          : null,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: showBottomNavigation
          ? const _SmartBottomNavigation()
          : null,
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: theme.brightness == Brightness.dark
                ? [AppColors.darkBackgroundAlt, AppColors.darkBackground]
                : [AppColors.lightBackground, AppColors.lightSurfaceElevated],
          ),
        ),
        child: SafeArea(
          top: !showHeader,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final resolvedPadding =
                  padding ??
                  EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    showBottomNavigation ? 132 : 32,
                  );
              final scrollView = SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                physics: const AlwaysScrollableScrollPhysics(),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: ResponsiveContent(
                    child: Padding(padding: resolvedPadding, child: child),
                  ),
                ),
              );

              if (onRefresh == null) {
                return scrollView;
              }

              return RefreshIndicator(onRefresh: onRefresh!, child: scrollView);
            },
          ),
        ),
      ),
    );
  }
}

class _SmartBottomNavigation extends StatelessWidget {
  const _SmartBottomNavigation();

  static const _items = [
    _NavItem(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
      path: '/',
    ),
    _NavItem(
      label: 'Catálogo',
      icon: Icons.search_rounded,
      selectedIcon: Icons.manage_search_rounded,
      path: '/catalogo',
    ),
    _NavItem(
      label: 'Rifas',
      icon: Icons.confirmation_number_outlined,
      selectedIcon: Icons.confirmation_number_rounded,
      path: '/rifas',
    ),
    _NavItem(
      label: 'Pedidos',
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long_rounded,
      path: '/pedidos',
    ),
    _NavItem(
      label: 'Perfil',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
      path: '/perfil',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = _selectedIndex(location);

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.10),
              ),
            ),
            child: NavigationBar(
              selectedIndex: selectedIndex,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              onDestinationSelected: (index) => context.go(_items[index].path),
              destinations: [
                for (final item in _items)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.selectedIcon),
                    label: item.label,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  int _selectedIndex(String location) {
    if (location.startsWith('/catalogo') || location.startsWith('/produto')) {
      return 1;
    }
    if (location.startsWith('/rifas') || location.startsWith('/minhas-rifas')) {
      return 2;
    }
    if (location.startsWith('/pedidos')) return 3;
    if (location.startsWith('/perfil') || location.startsWith('/wishlist')) {
      return 4;
    }
    return 0;
  }
}

class _NavItem {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.path,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String path;
}
