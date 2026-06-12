import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/cache/memory_cache.dart';
import '../../../core/network/api_client.dart';
import 'raffle_models.dart';

final rafflesRepositoryProvider = Provider<RafflesRepository>(
  (ref) => RafflesRepository(
    apiClient: ref.watch(apiClientProvider),
    cache: ref.watch(memoryCacheProvider),
  ),
);

final rafflesListProvider = FutureProvider<List<RaffleSummary>>((ref) {
  return ref.watch(rafflesRepositoryProvider).getRaffles();
});

final raffleDetailProvider = FutureProvider.family<RaffleDetail, String>((
  ref,
  slug,
) {
  return ref.watch(rafflesRepositoryProvider).getRaffleDetail(slug);
});

final myRafflesProvider = FutureProvider<List<RaffleEntry>>((ref) {
  final auth = ref.watch(authControllerProvider);
  if (auth.isLoading && !auth.isAuthenticated) {
    return const <RaffleEntry>[];
  }
  if (!auth.isAuthenticated) {
    return const <RaffleEntry>[];
  }

  return ref.watch(rafflesRepositoryProvider).getMyRaffles();
});

class RafflesRepository {
  const RafflesRepository({
    required ApiClient apiClient,
    required MemoryCache cache,
  }) : _apiClient = apiClient,
       _cache = cache;

  final ApiClient _apiClient;
  final MemoryCache _cache;

  static const Duration _publicRafflesTtl = Duration(seconds: 45);
  static const Duration _raffleDetailTtl = Duration(seconds: 45);
  static const Duration _myRafflesTtl = Duration(seconds: 45);

  Future<List<RaffleSummary>> getRaffles({bool forceRefresh = false}) {
    return _cache.getOrLoad<List<RaffleSummary>>(
      key: 'public:raffles',
      debugLabel: 'GET /api/v1/public/raffles',
      ttl: _publicRafflesTtl,
      forceRefresh: forceRefresh,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/public/raffles',
        );
        final rawData = response.data?['data'] ?? response.data;

        if (rawData is List) {
          return rawData
              .whereType<Map<String, dynamic>>()
              .map(RaffleSummary.fromJson)
              .toList();
        }

        throw const RafflesShapeException();
      },
    );
  }

  Future<RaffleDetail> getRaffleDetail(
    String slug, {
    bool forceRefresh = false,
  }) {
    return _cache.getOrLoad<RaffleDetail>(
      key: _raffleDetailCacheKey(slug),
      debugLabel: 'GET /api/v1/public/raffles/$slug',
      ttl: _raffleDetailTtl,
      forceRefresh: forceRefresh,
      loader: () async {
        final campaignResponse = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/public/raffles/$slug',
        );
        final numbersResponse = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/public/raffles/$slug/numbers',
        );
        final campaign =
            campaignResponse.data?['data'] ?? campaignResponse.data;
        final numbers = numbersResponse.data?['data'] ?? numbersResponse.data;

        if (campaign is Map<String, dynamic> && numbers is List) {
          return RaffleDetail.fromJson(
            campaign: campaign,
            numbers: numbers.whereType<Map<String, dynamic>>().toList(),
          );
        }

        throw const RafflesShapeException();
      },
    );
  }

  Future<CreateRaffleEntryResponse> reserveNumbers({
    required String slug,
    required CreateRaffleEntryRequest request,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      '/api/v1/me/raffles/$slug/reserve',
      data: request.toJson(),
    );
    final rawData = response.data?['data'] ?? response.data;

    if (rawData is Map<String, dynamic>) {
      final parsed = CreateRaffleEntryResponse.fromJson(rawData);
      invalidateRaffleDetail(slug);
      invalidateMyRaffles();
      return parsed;
    }

    throw const RafflesShapeException();
  }

  Future<List<RaffleEntry>> getMyRaffles({bool forceRefresh = false}) {
    final userId = _currentUserId;
    if (userId == null || userId.isEmpty) {
      return Future.value(const <RaffleEntry>[]);
    }

    return _cache.getOrLoad<List<RaffleEntry>>(
      key: _myRafflesCacheKey(userId),
      debugLabel: 'GET /api/v1/me/raffles',
      ttl: _myRafflesTtl,
      tokenPresent: _tokenPresent,
      forceRefresh: forceRefresh,
      loader: () async {
        final response = await _apiClient.get<Map<String, dynamic>>(
          '/api/v1/me/raffles',
        );
        final rawData = response.data?['data'] ?? response.data;

        if (rawData is List) {
          return rawData
              .whereType<Map<String, dynamic>>()
              .map(RaffleEntry.fromJson)
              .toList();
        }

        throw const RafflesShapeException();
      },
    );
  }

  void invalidateRaffles() {
    _cache.invalidate('public:raffles');
  }

  void invalidateRaffleDetail(String slug) {
    _cache.invalidate(_raffleDetailCacheKey(slug));
  }

  void invalidateMyRaffles([String? userId]) {
    final resolvedUserId = userId ?? _currentUserId;
    if (resolvedUserId == null || resolvedUserId.isEmpty) {
      _cache.invalidatePrefix('user:');
      return;
    }

    _cache.invalidate(_myRafflesCacheKey(resolvedUserId));
  }

  String _raffleDetailCacheKey(String slug) {
    return 'public:raffle:${slug.trim()}';
  }

  String _myRafflesCacheKey(String userId) {
    return 'user:$userId:raffles';
  }

  String? get _currentUserId => Supabase.instance.client.auth.currentUser?.id;

  bool get _tokenPresent {
    final token = Supabase.instance.client.auth.currentSession?.accessToken
        .trim();
    return token != null && token.isNotEmpty;
  }
}

class RafflesShapeException implements Exception {
  const RafflesShapeException();

  @override
  String toString() => 'A API retornou um formato inesperado de rifas.';
}
