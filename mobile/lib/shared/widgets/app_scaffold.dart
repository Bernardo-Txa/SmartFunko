import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'smart_app_bar.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.title,
    required this.body,
    this.showAppBar = true,
    this.showBackButton = false,
    this.showBottomNavigation = true,
    this.showCartAction = true,
    this.onRefresh,
    this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 24),
    super.key,
  });

  final String title;
  final Widget body;
  final bool showAppBar;
  final bool showBackButton;
  final bool showBottomNavigation;
  final bool showCartAction;
  final Future<void> Function()? onRefresh;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showAppBar
          ? SmartAppBar(
              title: title,
              showBackButton: showBackButton,
              showCartAction: showCartAction,
            )
          : null,
      bottomNavigationBar: showBottomNavigation
          ? const _SmartBottomNavigation()
          : null,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final scrollView = SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(padding: padding, child: body),
              ),
            );

            if (onRefresh == null) {
              return scrollView;
            }

            return RefreshIndicator(onRefresh: onRefresh!, child: scrollView);
          },
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

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) => context.go(_items[index].path),
      destinations: [
        for (final item in _items)
          NavigationDestination(
            icon: Icon(item.icon),
            selectedIcon: Icon(item.selectedIcon),
            label: item.label,
          ),
      ],
    );
  }

  int _selectedIndex(String location) {
    if (location.startsWith('/catalogo') || location.startsWith('/produto')) {
      return 1;
    }
    if (location.startsWith('/rifas')) return 2;
    if (location.startsWith('/pedidos')) return 3;
    if (location.startsWith('/perfil')) return 4;
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
