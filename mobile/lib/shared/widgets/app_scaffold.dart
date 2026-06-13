import 'package:flutter/material.dart';

import '../layout/smart_app_shell.dart';

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    required this.title,
    required this.body,
    this.subtitle,
    this.showAppBar = true,
    this.showHeader,
    this.showBackButton = false,
    this.showBottomNavigation = true,
    this.showCartAction = true,
    this.showSearch = false,
    this.showDrawerButton = true,
    this.showProfileAction = true,
    this.actions = const [],
    this.onRefresh,
    this.padding,
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
  final bool showSearch;
  final bool showDrawerButton;
  final bool showProfileAction;
  final List<Widget> actions;
  final Future<void> Function()? onRefresh;
  final EdgeInsetsGeometry? padding;

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
      child: body,
    );
  }
}
