import 'package:flutter/material.dart';

import '../layout/smart_app_shell.dart';
import 'cart_floating_button.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.title,
    required this.body,
    this.subtitle,
    this.showAppBar = false,
    this.showHeader,
    this.showBackButton = false,
    this.showBottomNavigation = true,
    this.showCartAction = true,
    this.showFloatingCartButton = true,
    this.showSearch = false,
    this.showDrawerButton = false,
    this.showProfileAction = true,
    this.actions = const [],
    this.onRefresh,
    this.padding,
    this.floatingActionButton,
    super.key,
  });

  final String title;
  final Widget body;
  final String? subtitle;
  final bool showAppBar;
  final bool? showHeader;
  final bool showBackButton;
  final bool showBottomNavigation;
  final bool showCartAction;
  final bool showFloatingCartButton;
  final bool showSearch;
  final bool showDrawerButton;
  final bool showProfileAction;
  final List<Widget> actions;
  final Future<void> Function()? onRefresh;
  final EdgeInsetsGeometry? padding;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return SmartAppShell(
      title: title,
      subtitle: subtitle,
      showHeader: showHeader ?? showAppBar,
      showBackButton: showBackButton,
      showSearch: showSearch,
      showDrawerButton: showDrawerButton,
      showCartAction: showCartAction,
      showProfileAction: showProfileAction,
      showBottomNavigation: showBottomNavigation,
      actions: actions,
      onRefresh: onRefresh,
      padding: padding,
      floatingActionButton:
          floatingActionButton ??
          (showBottomNavigation && showFloatingCartButton
              ? const CartFloatingButton()
              : null),
      child: body,
    );
  }
}
