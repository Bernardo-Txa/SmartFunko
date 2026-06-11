import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../core/auth/auth_state.dart';
import '../features/auth/login_page.dart';
import '../features/cart/cart_page.dart';
import '../features/catalog/catalog_page.dart';
import '../features/club/club_page.dart';
import '../features/home/home_page.dart';
import '../features/orders/order_detail_page.dart';
import '../features/orders/orders_page.dart';
import '../features/product/product_detail_page.dart';
import '../features/profile/profile_page.dart';
import '../features/raffles/raffle_detail_page.dart';
import '../features/raffles/raffles_page.dart';
import '../features/splash/splash_page.dart';

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
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(path: '/', builder: (context, state) => const HomePage()),
      GoRoute(
        path: '/catalogo',
        builder: (context, state) => const CatalogPage(),
      ),
      GoRoute(
        path: '/produto/:slug',
        builder: (context, state) =>
            ProductDetailPage(slug: state.pathParameters['slug'] ?? 'demo'),
      ),
      GoRoute(path: '/carrinho', builder: (context, state) => const CartPage()),
      GoRoute(
        path: '/pedidos',
        builder: (context, state) => const OrdersPage(),
      ),
      GoRoute(
        path: '/pedidos/:orderNumber',
        builder: (context, state) => OrderDetailPage(
          orderNumber: state.pathParameters['orderNumber'] ?? '',
        ),
      ),
      GoRoute(path: '/rifas', builder: (context, state) => const RafflesPage()),
      GoRoute(
        path: '/rifas/:slug',
        builder: (context, state) =>
            RaffleDetailPage(slug: state.pathParameters['slug'] ?? 'demo'),
      ),
      GoRoute(path: '/clube', builder: (context, state) => const ClubPage()),
      GoRoute(
        path: '/perfil',
        builder: (context, state) => const ProfilePage(),
      ),
    ],
  );
});
