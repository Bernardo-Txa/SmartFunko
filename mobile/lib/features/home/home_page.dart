import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/image_url_resolver.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/branding/smart_funko_brand.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/section_header.dart';
import '../../shared/widgets/smart_progress.dart';
import '../../shared/widgets/status_badge.dart';
import '../catalog/data/catalog_repository.dart';
import '../catalog/data/product_models.dart';
import '../orders/data/order_models.dart';
import '../orders/data/orders_repository.dart';
import '../orders/domain/order_status_mapper.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final orders = ref.watch(ordersProvider);
    final featuredProducts = ref.watch(featuredProductsProvider);

    return AppScaffold(
      title: 'SmartFunko',
      showAppBar: false,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HomeHero(auth: auth),
          const SizedBox(height: 24),
          _AccountStatus(authenticated: auth.isAuthenticated, orders: orders),
          const SizedBox(height: 24),
          const _HowItWorks(),
          const SizedBox(height: 24),
          featuredProducts.when(
            data: (products) => _FeaturedProducts(products: products),
            loading: () => const _SectionLoading(title: 'Produtos em destaque'),
            error: (error, stackTrace) => ErrorState(
              message: 'Não foi possível carregar os produtos em destaque.',
              onRetry: () {
                ref
                    .read(catalogRepositoryProvider)
                    .invalidateProducts(
                      const CatalogRequest(pageSize: 6, sort: 'specials_first'),
                    );
                ref.invalidate(featuredProductsProvider);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeHero extends StatelessWidget {
  const _HomeHero({required this.auth});

  final AuthState auth;

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = auth.isAuthenticated == true;
    final greeting = isAuthenticated
        ? 'Olá, ${auth.displayName}'
        : 'Bem-vindo à SmartFunko';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.darkSurfaceElevated,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 52,
              width: double.infinity,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Transform.translate(
                  offset: const Offset(-5, 0),
                  child: const SmartFunkoLogo(
                    variant: SmartFunkoLogoVariant.horizontalWhite,
                    width: 166,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              greeting,
              style: const TextStyle(
                color: AppColors.primarySoft,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sua coleção começa aqui',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 25,
                height: 1.06,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Colecionáveis selecionados, pedidos organizados e pagamento seguro.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.45,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final inline = constraints.maxWidth >= 320;
                final primaryButton = PrimaryButton(
                  label: inline ? 'Catálogo' : 'Ver catálogo',
                  icon: Icons.manage_search_rounded,
                  fullWidth: true,
                  onPressed: () => context.go('/catalogo'),
                );
                final secondaryButton = PrimaryButton(
                  label: inline ? 'Pedidos' : 'Meus pedidos',
                  icon: Icons.receipt_long_rounded,
                  variant: PrimaryButtonVariant.outlined,
                  foregroundColor: AppColors.brandYellow,
                  fullWidth: true,
                  onPressed: () => context.go('/pedidos'),
                );

                if (inline) {
                  return Row(
                    children: [
                      Expanded(child: primaryButton),
                      const SizedBox(width: 10),
                      Expanded(child: secondaryButton),
                    ],
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    primaryButton,
                    const SizedBox(height: 10),
                    secondaryButton,
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountStatus extends StatelessWidget {
  const _AccountStatus({required this.authenticated, required this.orders});

  final bool authenticated;
  final AsyncValue<List<OrderSummary>> orders;

  @override
  Widget build(BuildContext context) {
    if (!authenticated) {
      return const _VisitorPrompt();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(
          title: 'Sua conta agora',
          subtitle: 'Resumo real dos seus pedidos vinculados à conta.',
        ),
        const SizedBox(height: 12),
        orders.when(
          data: (items) => _OrdersSnapshot(orders: items),
          loading: () => const _DarkInfoPanel(
            child: SizedBox(
              height: 64,
              child: Center(child: SmartSpinner(size: 26, strokeWidth: 2.4)),
            ),
          ),
          error: (error, stackTrace) => _DarkInfoPanel(
            child: Row(
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: AppColors.danger,
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Não foi possível carregar seus pedidos agora.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/pedidos'),
                  child: const Text('Abrir'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _VisitorPrompt extends StatelessWidget {
  const _VisitorPrompt();

  @override
  Widget build(BuildContext context) {
    return _DarkInfoPanel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.lock_outline_rounded, color: AppColors.primary),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Entre para acompanhar tudo',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Pedidos e dados da conta ficam vinculados ao seu login.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          TextButton(
            onPressed: () => context.go('/login?from=/'),
            child: const Text('Entrar'),
          ),
        ],
      ),
    );
  }
}

class _OrdersSnapshot extends StatelessWidget {
  const _OrdersSnapshot({required this.orders});

  final List<OrderSummary> orders;

  @override
  Widget build(BuildContext context) {
    final ongoing = orders.where(_isOngoingOrder).length;
    final latest = orders.isEmpty ? null : orders.first;
    final latestStatus = latest == null
        ? null
        : mapOrderStatus(
            context,
            status: latest.status,
            reviewStatus: latest.reviewStatus,
          );

    return _DarkInfoPanel(
      onTap: () => context.go('/pedidos'),
      child: Row(
        children: [
          _SnapshotMetric(
            label: 'Pedidos',
            value: '${orders.length}',
            icon: Icons.receipt_long_rounded,
          ),
          const SizedBox(width: 10),
          _SnapshotMetric(
            label: 'Em andamento',
            value: '$ongoing',
            icon: Icons.timelapse_rounded,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Último status',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      latestStatus?.icon ?? Icons.inbox_outlined,
                      color: latestStatus?.color ?? AppColors.textSecondary,
                      size: 17,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        latestStatus?.label ?? 'Nenhum pedido',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  bool _isOngoingOrder(OrderSummary order) {
    final status = order.reviewStatus.isNotEmpty
        ? order.reviewStatus
        : order.status;

    return !{'paid', 'rejected', 'cancelled', 'refunded'}.contains(status);
  }
}

class _SnapshotMetric extends StatelessWidget {
  const _SnapshotMetric({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 84,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(height: 7),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HowItWorks extends StatelessWidget {
  const _HowItWorks();

  static const _steps = [
    _StepItem(
      number: '1',
      title: 'Escolha o produto',
      text:
          'Use o catálogo único para encontrar pronta-entrega, pré-venda e encomendas.',
    ),
    _StepItem(
      number: '2',
      title: 'Envie seu carrinho',
      text: 'O pedido entra em análise para validação da equipe SmartFunko.',
    ),
    _StepItem(
      number: '3',
      title: 'Receba o link',
      text: 'Depois da aprovação, o pagamento seguro é liberado por link.',
    ),
    _StepItem(
      number: '4',
      title: 'Acompanhe pela conta',
      text: 'O status fica visível em Meus pedidos durante o atendimento.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Como funciona'),
        const SizedBox(height: 8),
        const Text(
          'A SmartFunko trabalha com atendimento assistido: você monta o pedido, nossa equipe valida a disponibilidade e libera o pagamento com segurança.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            height: 1.45,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 620 ? 4 : 2;

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _steps.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                mainAxisExtent: 132,
              ),
              itemBuilder: (context, index) {
                return _StepCard(step: _steps[index]);
              },
            );
          },
        ),
      ],
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.step});

  final _StepItem step;

  @override
  Widget build(BuildContext context) {
    return _DarkInfoPanel(
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 28,
            width: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accent,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Text(
              step.number,
              style: const TextStyle(
                color: Color(0xFF07111F),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            step.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            step.text,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              height: 1.25,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _StepItem {
  const _StepItem({
    required this.number,
    required this.title,
    required this.text,
  });

  final String number;
  final String title;
  final String text;
}

class _FeaturedProducts extends StatelessWidget {
  const _FeaturedProducts({required this.products});

  final List<ProductSummary> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const EmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'Nenhum produto em destaque',
        message: 'Quando houver produtos disponíveis, eles aparecerão aqui.',
      );
    }

    final visibleProducts = products.take(8).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: 'Produtos em destaque',
          subtitle: 'Itens reais do catálogo SmartFunko.',
          actionLabel: 'Ver catálogo',
          onAction: () => context.go('/catalogo'),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 232,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: visibleProducts.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              return _FeaturedProductCard(product: visibleProducts[index]);
            },
          ),
        ),
      ],
    );
  }
}

class _FeaturedProductCard extends StatelessWidget {
  const _FeaturedProductCard({required this.product});

  final ProductSummary product;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 168,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () => context.go('/produto/${product.slug}'),
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.brandSky,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: product.special
                    ? AppColors.accent.withValues(alpha: 0.42)
                    : AppColors.brandNavy.withValues(alpha: 0.20),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: SizedBox(
                      height: 104,
                      width: double.infinity,
                      child: _NetworkThumb(imageUrl: product.imageUrl),
                    ),
                  ),
                  const SizedBox(height: 9),
                  StatusBadge(label: product.status.label),
                  const SizedBox(height: 7),
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.brandNavy,
                      fontSize: 13,
                      height: 1.18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Spacer(),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.brandYellow,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 4,
                      ),
                      child: Text(
                        product.price.formatted,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.brandNavy,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NetworkThumb extends StatelessWidget {
  const _NetworkThumb({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final fallback = ColoredBox(
      color: AppColors.imageSurface,
      child: Center(
        child: const SmartFunkoLogo(
          variant: SmartFunkoLogoVariant.square,
          width: 34,
          height: 34,
          excludeFromSemantics: true,
        ),
      ),
    );
    final resolvedUrl = resolveImageUrl(imageUrl);

    if (resolvedUrl.isEmpty) {
      return fallback;
    }

    return ColoredBox(
      color: AppColors.imageSurface,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: CachedNetworkImage(
          imageUrl: resolvedUrl,
          fit: BoxFit.contain,
          memCacheWidth: 240,
          memCacheHeight: 240,
          placeholder: (context, url) => fallback,
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }
}

class _DarkInfoPanel extends StatelessWidget {
  const _DarkInfoPanel({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(14),
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: AppColors.darkSurfaceElevated,
      borderRadius: BorderRadius.circular(AppRadius.md),
      border: Border.all(color: AppColors.darkBorder.withValues(alpha: 0.72)),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.18),
          blurRadius: 16,
          offset: const Offset(0, 10),
        ),
      ],
    );

    if (onTap == null) {
      return DecoratedBox(
        decoration: decoration,
        child: Padding(padding: padding, child: child),
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: Ink(
          decoration: decoration,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

class _SectionLoading extends StatelessWidget {
  const _SectionLoading({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: title),
        const SizedBox(height: 12),
        const _DarkInfoPanel(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(8),
              child: SmartSpinner(size: 26, strokeWidth: 2.4),
            ),
          ),
        ),
      ],
    );
  }
}
