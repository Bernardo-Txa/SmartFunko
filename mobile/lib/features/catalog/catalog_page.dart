import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/smart_skeleton.dart';
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
    _CatalogFilter(label: 'Sob encomenda', value: 'order_only'),
    _CatalogFilter(label: 'Specials', value: 'specials'),
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
      subtitle: 'Busca, filtros e produtos reais',
      showSearch: true,
      onRefresh: () async {
        ref.read(catalogRepositoryProvider).invalidateProducts(request);
        ref.invalidate(catalogProductsProvider(request));
      },
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CatalogHero(),
          const SizedBox(height: 16),
          _CatalogSearchField(
            controller: _searchController,
            search: _search,
            onClear: () {
              _searchController.clear();
              setState(() => _search = '');
            },
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
              onConsult: _openProductOnWeb,
            ),
            loading: () => const _CatalogSkeletonGrid(),
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
    if (!product.canAddToCart) {
      _openProductOnWeb(product);
      return;
    }

    ref.read(cartControllerProvider.notifier).addProduct(product);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Produto adicionado ao carrinho.'),
        action: SnackBarAction(
          label: 'Ver carrinho',
          onPressed: () => context.go('/carrinho'),
        ),
      ),
    );
  }

  Future<void> _openProductOnWeb(ProductSummary product) async {
    final url = '${AppConfig.normalizedApiBaseUrl}/produto/${product.slug}';
    final uri = Uri.tryParse(url);

    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o produto.')),
      );
      return;
    }

    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível abrir o produto.')),
        );
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir o produto.')),
      );
    }
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

class _CatalogHero extends StatelessWidget {
  const _CatalogHero();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF101D33), Color(0xFF07101F)],
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: const Padding(
        padding: EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(Icons.storefront_rounded, color: AppColors.primary, size: 34),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Catálogo único',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'Funkos, pré-vendas, encomendas e specials no mesmo lugar.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CatalogSearchField extends StatelessWidget {
  const _CatalogSearchField({
    required this.controller,
    required this.search,
    required this.onClear,
    required this.onSubmitted,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String search;
  final VoidCallback onClear;
  final ValueChanged<String> onSubmitted;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'Buscar Funko, anime, personagem...',
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: search.isEmpty
            ? null
            : IconButton(
                tooltip: 'Limpar busca',
                icon: const Icon(Icons.close_rounded),
                onPressed: onClear,
              ),
      ),
      onSubmitted: onSubmitted,
      onChanged: onChanged,
    );
  }
}

class _CatalogContent extends ConsumerWidget {
  const _CatalogContent({
    required this.products,
    required this.search,
    required this.status,
    required this.onAddToCart,
    required this.onConsult,
  });

  final List<ProductSummary> products;
  final String search;
  final String? status;
  final ValueChanged<ProductSummary> onAddToCart;
  final ValueChanged<ProductSummary> onConsult;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final wishlist = ref.watch(wishlistControllerProvider);

    if (products.isEmpty) {
      return EmptyState(
        icon: Icons.manage_search_rounded,
        title: 'Nenhum produto encontrado.',
        message: 'Tente buscar por outro nome ou remover filtros.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          search.isEmpty ? 'Produtos SmartFunko' : 'Resultados para "$search"',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          '${products.length} produto(s) exibido(s)',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final columns = width >= 900
                ? 4
                : width >= 620
                ? 3
                : width >= 360
                ? 2
                : 1;
            final itemExtent = columns == 1
                ? 410.0
                : columns == 2
                ? 392.0
                : columns == 3
                ? 374.0
                : 356.0;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: products.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                mainAxisExtent: itemExtent,
              ),
              itemBuilder: (context, index) {
                final product = products[index];
                return ProductCard(
                  product: product,
                  onDetails: () => context.push('/produto/${product.slug}'),
                  onAddToCart: () => onAddToCart(product),
                  onConsult: () => onConsult(product),
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
              ChoiceChip(
                label: const Text('Todos'),
                avatar: const Icon(Icons.apps_rounded, size: 18),
                showCheckmark: false,
                selected: status == null,
                onSelected: (_) {
                  if (status != null) {
                    onStatusTap(status!);
                  }
                },
              ),
              const SizedBox(width: 8),
              for (final filter in statusFilters) ...[
                ChoiceChip(
                  label: Text(filter.label),
                  avatar: const Icon(Icons.sell_rounded, size: 18),
                  showCheckmark: false,
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

class _CatalogSkeletonGrid extends StatelessWidget {
  const _CatalogSkeletonGrid();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 620
            ? 3
            : constraints.maxWidth >= 360
            ? 2
            : 1;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: columns * 3,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: columns == 1
                ? 410
                : columns == 2
                ? 392
                : 374,
          ),
          itemBuilder: (context, index) => const ProductCardSkeleton(),
        );
      },
    );
  }
}
