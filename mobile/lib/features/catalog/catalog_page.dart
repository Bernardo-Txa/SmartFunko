import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';

import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/list_skeleton.dart';
import '../cart/data/cart_controller.dart';
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
  Timer? _searchDebounce;

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final request = CatalogRequest(search: _search, sort: 'specials_first');
    final products = ref.watch(catalogProductsProvider(request));

    return AppScaffold(
      title: 'Catálogo',
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
                  ? const Icon(Icons.tune_rounded)
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
          const SizedBox(height: 18),
          products.when(
            data: (items) => _CatalogContent(
              products: items,
              search: _search,
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
}

class _CatalogContent extends StatelessWidget {
  const _CatalogContent({
    required this.products,
    required this.search,
    required this.onAddToCart,
  });

  final List<ProductSummary> products;
  final String search;
  final ValueChanged<ProductSummary> onAddToCart;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (products.isEmpty) {
      return EmptyState(
        icon: Icons.manage_search_rounded,
        title: search.isEmpty ? 'Nenhum produto disponível' : 'Nada encontrado',
        message: search.isEmpty
            ? 'O catálogo público não retornou produtos agora.'
            : 'Tente buscar por outro personagem, franquia ou categoria.',
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
                : width >= 360
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
                    ? 0.62
                    : columns == 2
                    ? 0.36
                    : 0.46,
              ),
              itemBuilder: (context, index) {
                final product = products[index];
                return ProductCard(
                  product: product,
                  onDetails: () => context.go('/produto/${product.slug}'),
                  onAddToCart: () => onAddToCart(product),
                );
              },
            );
          },
        ),
      ],
    );
  }
}
