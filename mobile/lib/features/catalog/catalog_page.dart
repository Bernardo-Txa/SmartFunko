import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/list_skeleton.dart';
import '../cart/data/cart_controller.dart';
import '../../core/auth/auth_controller.dart';
import '../wishlist/application/wishlist_controller.dart';
import 'data/catalog_repository.dart';
import 'data/product_models.dart';
import 'widgets/product_card.dart';

class CatalogPage extends ConsumerStatefulWidget {
  const CatalogPage({super.key});

  @override
  ConsumerState<CatalogPage> createState() => _CatalogPageState();
}

class _CatalogPageState extends ConsumerState<CatalogPage> {
  final _searchController = TextEditingController();
  String _search = '';
  String? _status;
  Timer? _searchDebounce;
  bool _routeQueryApplied = false;
  String? _lastRouteQuery;

  static const _statusFilters = [
    _CatalogFilter(label: 'Pronta-entrega', value: 'available'),
    _CatalogFilter(label: 'Pré-venda', value: 'preorder'),
    _CatalogFilter(label: 'Encomenda', value: 'order_only'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final query = GoRouterState.of(context).uri.queryParameters['q']?.trim();
    if (_routeQueryApplied && query == _lastRouteQuery) {
      return;
    }

    _routeQueryApplied = true;
    _lastRouteQuery = query;
    _searchDebounce?.cancel();

    if (query != null && query.isNotEmpty) {
      _search = query;
      _searchController.text = query;
    } else {
      _search = '';
      _searchController.clear();
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final request = CatalogRequest(
      search: _search,
      status: _status,
      sort: 'specials_first',
    );
    final products = ref.watch(catalogProductsProvider(request));

    return AppScaffold(
      title: 'Catálogo',
      subtitle: 'Produtos disponíveis para pedido',
      showAppBar: false,
      showSearch: true,
      onRefresh: () async {
        ref.read(catalogRepositoryProvider).invalidateProducts(request);
        ref.invalidate(catalogProductsProvider(request));
      },
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Buscar por personagem, franquia ou SKU',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _search.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Limpar busca',
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _search = '');
                      },
                    ),
            ),
            onSubmitted: (value) => _applySearch(value),
            onChanged: (value) {
              _searchDebounce?.cancel();
              _searchDebounce = Timer(
                const Duration(milliseconds: 400),
                () => _applySearch(value),
              );
            },
          ),
          const SizedBox(height: 12),
          _CatalogFilters(
            statusFilters: _statusFilters,
            search: _search,
            status: _status,
            onStatusTap: _toggleStatus,
            onClear: _clearFilters,
          ),
          const SizedBox(height: 18),
          products.when(
            data: (items) => _CatalogContent(
              products: items,
              search: _search,
              status: _status,
              onAddToCart: _addToCart,
            ),
            loading: () => const ListSkeleton(itemCount: 6, imageSize: 88),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar o catálogo.',
              onRetry: () {
                ref.read(catalogRepositoryProvider).invalidateProducts(request);
                ref.invalidate(catalogProductsProvider(request));
              },
            ),
          ),
        ],
      ),
    );
  }

  void _addToCart(ProductSummary product) {
    ref.read(cartControllerProvider.notifier).addProduct(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} adicionado ao carrinho.'),
        action: SnackBarAction(
          label: 'Ver',
          onPressed: () => context.go('/carrinho'),
        ),
      ),
    );
  }

  void _applySearch(String value) {
    final nextSearch = value.trim();
    if (!mounted || nextSearch == _search) {
      return;
    }

    setState(() => _search = nextSearch);
  }

  void _toggleStatus(String status) {
    setState(() => _status = _status == status ? null : status);
  }

  void _clearFilters() {
    _searchDebounce?.cancel();
    _searchController.clear();
    setState(() {
      _search = '';
      _status = null;
    });
  }
}

class _CatalogContent extends ConsumerWidget {
  const _CatalogContent({
    required this.products,
    required this.search,
    required this.status,
    required this.onAddToCart,
  });

  final List<ProductSummary> products;
  final String search;
  final String? status;
  final ValueChanged<ProductSummary> onAddToCart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final wishlist = ref.watch(wishlistControllerProvider);

    if (products.isEmpty) {
      return EmptyState(
        icon: Icons.manage_search_rounded,
        title: search.isEmpty && status == null
            ? 'Nenhum produto disponível'
            : 'Nada encontrado',
        message: search.isEmpty && status == null
            ? 'O catálogo público não retornou produtos agora.'
            : 'Tente outro status ou termo de busca.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          search.isEmpty
              ? 'Produtos Smart Funkos'
              : 'Resultados para "$search"',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final columns = width >= 900
                ? 4
                : width >= 640
                ? 3
                : width >= 430
                ? 2
                : 1;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: products.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: columns == 1
                    ? 0.58
                    : columns == 2
                    ? 0.40
                    : 0.46,
              ),
              itemBuilder: (context, index) {
                final product = products[index];
                return ProductCard(
                  product: product,
                  onDetails: () => context.go('/produto/${product.slug}'),
                  onAddToCart: () => onAddToCart(product),
                  isWishlisted: wishlist.isWishlisted(product.id),
                  isWishlistUpdating: wishlist.isUpdating(product.id),
                  onToggleWishlist: () => _toggleWishlist(
                    context,
                    ref,
                    product,
                    isAuthenticated: auth.isAuthenticated,
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  Future<void> _toggleWishlist(
    BuildContext context,
    WidgetRef ref,
    ProductSummary product, {
    required bool isAuthenticated,
  }) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!isAuthenticated) {
      messenger.showSnackBar(
        SnackBar(
          content: const Text('Entre para salvar favoritos.'),
          action: SnackBarAction(
            label: 'Entrar',
            onPressed: () => context.go('/login?from=/catalogo'),
          ),
        ),
      );
      return;
    }

    try {
      final added = await ref
          .read(wishlistControllerProvider.notifier)
          .toggle(product.id);
      if (!context.mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            added ? 'Adicionado à wishlist.' : 'Removido da wishlist.',
          ),
        ),
      );
    } catch (_) {
      if (!context.mounted) {
        return;
      }
      messenger.showSnackBar(
        const SnackBar(content: Text('Não foi possível atualizar a wishlist.')),
      );
    }
  }
}

class _CatalogFilters extends StatelessWidget {
  const _CatalogFilters({
    required this.statusFilters,
    required this.search,
    required this.status,
    required this.onStatusTap,
    required this.onClear,
  });

  final List<_CatalogFilter> statusFilters;
  final String search;
  final String? status;
  final ValueChanged<String> onStatusTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final hasFilters = search.isNotEmpty || status != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final filter in statusFilters) ...[
                FilterChip(
                  label: Text(filter.label),
                  avatar: const Icon(Icons.sell_rounded, size: 18),
                  selected: status == filter.value,
                  onSelected: (_) => onStatusTap(filter.value),
                ),
                const SizedBox(width: 8),
              ],
              if (hasFilters)
                ActionChip(
                  avatar: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('Limpar'),
                  onPressed: onClear,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CatalogFilter {
  const _CatalogFilter({required this.label, required this.value});

  final String label;
  final String value;
}
