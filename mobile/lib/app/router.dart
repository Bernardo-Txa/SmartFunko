import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../core/auth/auth_state.dart';
import '../features/auth/forgot_password_page.dart';
import '../features/auth/login_page.dart';
import '../features/cart/cart_page.dart';
import '../features/catalog/catalog_page.dart';
import '../features/checkout/checkout_review_page.dart';
import '../features/club/club_page.dart';
import '../features/home/home_page.dart';
import '../features/orders/order_detail_page.dart';
import '../features/orders/orders_page.dart';
import '../features/product/product_detail_page.dart';
import '../features/profile/profile_page.dart';
import '../features/raffles/my_raffles_page.dart';
import '../features/raffles/raffle_detail_page.dart';
import '../features/raffles/raffles_page.dart';
import '../features/splash/splash_page.dart';
import '../features/wishlist/presentation/wishlist_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final path = state.uri.path;
      final isLogin = path == '/login';
      final isSplash = path == '/splash';

      if (auth.status == AuthStatus.loading) {
        return isSplash ? null : '/splash';
      }

      if (isSplash) {
        return '/';
      }

      if (auth.isAuthenticated && isLogin) {
        final redirect =
            state.uri.queryParameters['redirect'] ??
            state.uri.queryParameters['from'];
        return redirect?.startsWith('/') == true ? redirect : '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (context, state) =>
            _buildPage(state, const SplashPage(), slide: false),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => _buildPage(state, const LoginPage()),
      ),
      GoRoute(
        path: '/esqueci-senha',
        pageBuilder: (context, state) =>
            _buildPage(state, const ForgotPasswordPage()),
      ),
      GoRoute(
        path: '/',
        pageBuilder: (context, state) => _buildPage(state, const HomePage()),
      ),
      GoRoute(
        path: '/catalogo',
        pageBuilder: (context, state) => _buildPage(state, const CatalogPage()),
      ),
      GoRoute(
        path: '/produto/:slug',
        pageBuilder: (context, state) => _buildPage(
          state,
          ProductDetailPage(slug: state.pathParameters['slug'] ?? 'demo'),
        ),
      ),
      GoRoute(
        path: '/carrinho',
        pageBuilder: (context, state) => _buildPage(state, const CartPage()),
      ),
      GoRoute(
        path: '/checkout',
        pageBuilder: (context, state) =>
            _buildPage(state, const CheckoutReviewPage()),
      ),
      GoRoute(
        path: '/pedidos',
        pageBuilder: (context, state) => _buildPage(state, const OrdersPage()),
      ),
      GoRoute(
        path: '/pedidos/:orderNumber',
        redirect: (context, state) {
          final orderNumber = state.pathParameters['orderNumber']?.trim();
          return orderNumber == null || orderNumber.isEmpty ? '/pedidos' : null;
        },
        pageBuilder: (context, state) => _buildPage(
          state,
          OrderDetailPage(
            orderNumber: state.pathParameters['orderNumber'] ?? '',
          ),
        ),
      ),
      GoRoute(
        path: '/rifas',
        pageBuilder: (context, state) => _buildPage(state, const RafflesPage()),
      ),
      GoRoute(
        path: '/minhas-rifas',
        pageBuilder: (context, state) =>
            _buildPage(state, const MyRafflesPage()),
      ),
      GoRoute(
        path: '/rifas/:slug',
        pageBuilder: (context, state) => _buildPage(
          state,
          RaffleDetailPage(slug: state.pathParameters['slug'] ?? 'demo'),
        ),
      ),
      GoRoute(
        path: '/clube',
        pageBuilder: (context, state) => _buildPage(state, const ClubPage()),
      ),
      GoRoute(
        path: '/perfil',
        pageBuilder: (context, state) => _buildPage(state, const ProfilePage()),
      ),
      GoRoute(
        path: '/wishlist',
        pageBuilder: (context, state) =>
            _buildPage(state, const WishlistPage()),
      ),
    ],
  );
});

CustomTransitionPage<void> _buildPage(
  GoRouterState state,
  Widget child, {
  bool slide = true,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 180),
    reverseTransitionDuration: const Duration(milliseconds: 140),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );

      final faded = FadeTransition(opacity: curved, child: child);
      if (!slide) {
        return faded;
      }

      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.02, 0.012),
          end: Offset.zero,
        ).animate(curved),
        child: faded,
      );
    },
  );
}
