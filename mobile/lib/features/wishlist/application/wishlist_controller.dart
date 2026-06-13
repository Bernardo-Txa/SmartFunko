import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/auth/auth_state.dart';
import '../data/wishlist_repository.dart';
import '../domain/wishlist_item.dart';

final wishlistControllerProvider =
    StateNotifierProvider<WishlistController, WishlistState>((ref) {
      final controller = WishlistController(
        repository: ref.watch(wishlistRepositoryProvider),
      );

      ref.listen<AuthState>(
        authControllerProvider,
        (previous, next) => controller.handleAuthChanged(previous, next),
      );
      controller.handleAuthChanged(null, ref.read(authControllerProvider));

      return controller;
    });

class WishlistState {
  const WishlistState({
    this.userId,
    this.ids = const <String>{},
    this.items = const <WishlistItem>[],
    this.idsLoaded = false,
    this.itemsLoaded = false,
    this.isLoadingIds = false,
    this.isLoadingItems = false,
    this.updatingIds = const <String>{},
    this.errorMessage,
  });

  final String? userId;
  final Set<String> ids;
  final List<WishlistItem> items;
  final bool idsLoaded;
  final bool itemsLoaded;
  final bool isLoadingIds;
  final bool isLoadingItems;
  final Set<String> updatingIds;
  final String? errorMessage;

  bool get hasUser => userId != null && userId!.isNotEmpty;

  bool isWishlisted(String productId) => ids.contains(productId);

  bool isUpdating(String productId) => updatingIds.contains(productId);

  WishlistState copyWith({
    String? userId,
    bool clearUserId = false,
    Set<String>? ids,
    List<WishlistItem>? items,
    bool? idsLoaded,
    bool? itemsLoaded,
    bool? isLoadingIds,
    bool? isLoadingItems,
    Set<String>? updatingIds,
    String? errorMessage,
    bool clearError = false,
  }) {
    return WishlistState(
      userId: clearUserId ? null : userId ?? this.userId,
      ids: ids ?? this.ids,
      items: items ?? this.items,
      idsLoaded: idsLoaded ?? this.idsLoaded,
      itemsLoaded: itemsLoaded ?? this.itemsLoaded,
      isLoadingIds: isLoadingIds ?? this.isLoadingIds,
      isLoadingItems: isLoadingItems ?? this.isLoadingItems,
      updatingIds: updatingIds ?? this.updatingIds,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class WishlistController extends StateNotifier<WishlistState> {
  WishlistController({required WishlistRepository repository})
    : _repository = repository,
      super(const WishlistState());

  final WishlistRepository _repository;

  void handleAuthChanged(AuthState? previous, AuthState next) {
    final previousUserId = previous?.effectiveUser?.id;
    final nextUserId = next.effectiveUser?.id;

    if (!next.isAuthenticated || nextUserId == null || nextUserId.isEmpty) {
      if (previousUserId != null && previousUserId.isNotEmpty) {
        _repository.invalidate(previousUserId);
      }
      clear();
      return;
    }

    if (state.userId != nextUserId) {
      if (state.userId != null) {
        _repository.invalidate(state.userId);
      }
      state = WishlistState(userId: nextUserId);
      unawaited(loadIds());
    }
  }

  Future<void> loadIds({bool forceRefresh = false}) async {
    if (!state.hasUser) {
      return;
    }
    if (state.idsLoaded && !forceRefresh) {
      return;
    }

    state = state.copyWith(isLoadingIds: true, clearError: true);

    try {
      final ids = await _repository.getWishlistIds(forceRefresh: forceRefresh);
      state = state.copyWith(
        ids: ids,
        idsLoaded: true,
        isLoadingIds: false,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isLoadingIds: false,
        errorMessage: 'Não foi possível carregar a wishlist.',
      );
    }
  }

  Future<void> getWishlist({bool forceRefresh = false}) async {
    if (!state.hasUser) {
      return;
    }
    if (state.itemsLoaded && !forceRefresh) {
      return;
    }

    state = state.copyWith(isLoadingItems: true, clearError: true);

    try {
      final items = await _repository.getWishlist(forceRefresh: forceRefresh);
      state = state.copyWith(
        ids: items.map((item) => item.productId).toSet(),
        items: items,
        idsLoaded: true,
        itemsLoaded: true,
        isLoadingItems: false,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isLoadingItems: false,
        errorMessage: 'Não foi possível carregar a wishlist.',
      );
    }
  }

  Future<void> refresh() async {
    if (!state.hasUser) {
      return;
    }

    await Future.wait([
      loadIds(forceRefresh: true),
      getWishlist(forceRefresh: true),
    ]);
  }

  Future<bool> toggle(String productId) async {
    if (!state.hasUser) {
      throw const WishlistUnauthenticatedException();
    }
    if (state.isUpdating(productId)) {
      return state.isWishlisted(productId);
    }

    final wasWishlisted = state.isWishlisted(productId);
    final previousIds = Set<String>.from(state.ids);
    final previousItems = List<WishlistItem>.from(state.items);
    final nextIds = Set<String>.from(state.ids);
    final nextUpdating = Set<String>.from(state.updatingIds)..add(productId);

    if (wasWishlisted) {
      nextIds.remove(productId);
    } else {
      nextIds.add(productId);
    }

    state = state.copyWith(
      ids: nextIds,
      items: wasWishlisted
          ? state.items.where((item) => item.productId != productId).toList()
          : state.items,
      updatingIds: nextUpdating,
      clearError: true,
    );

    try {
      if (wasWishlisted) {
        await _repository.remove(productId);
      } else {
        await _repository.add(productId);
      }

      final finishedUpdating = Set<String>.from(state.updatingIds)
        ..remove(productId);
      state = state.copyWith(
        itemsLoaded: wasWishlisted ? state.itemsLoaded : false,
        updatingIds: finishedUpdating,
        clearError: true,
      );
      return !wasWishlisted;
    } catch (_) {
      final finishedUpdating = Set<String>.from(state.updatingIds)
        ..remove(productId);
      state = state.copyWith(
        ids: previousIds,
        items: previousItems,
        updatingIds: finishedUpdating,
        errorMessage: 'Não foi possível atualizar a wishlist.',
      );
      rethrow;
    }
  }

  Future<void> add(String productId) async {
    if (!state.isWishlisted(productId)) {
      await toggle(productId);
    }
  }

  Future<void> remove(String productId) async {
    if (state.isWishlisted(productId)) {
      await toggle(productId);
    }
  }

  void clear() {
    if (state.userId != null && state.userId!.isNotEmpty) {
      _repository.invalidate(state.userId);
    }
    state = const WishlistState();
  }
}

class WishlistUnauthenticatedException implements Exception {
  const WishlistUnauthenticatedException();

  @override
  String toString() => 'Entre para salvar favoritos.';
}
