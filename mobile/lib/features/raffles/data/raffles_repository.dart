import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/network/api_client.dart';
import 'raffle_models.dart';

final rafflesRepositoryProvider = Provider<RafflesRepository>(
  (ref) => RafflesRepository(ref.watch(apiClientProvider)),
);

final rafflesListProvider = FutureProvider.autoDispose<List<RaffleSummary>>((
  ref,
) {
  return ref.watch(rafflesRepositoryProvider).getRaffles();
});

final raffleDetailProvider = FutureProvider.autoDispose
    .family<RaffleDetail, String>((ref, slug) {
      return ref.watch(rafflesRepositoryProvider).getRaffleDetail(slug);
    });

final myRafflesProvider = FutureProvider.autoDispose<List<RaffleEntry>>((ref) {
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
  const RafflesRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<RaffleSummary>> getRaffles() async {
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
  }

  Future<RaffleDetail> getRaffleDetail(String slug) async {
    final campaignResponse = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/public/raffles/$slug',
    );
    final numbersResponse = await _apiClient.get<Map<String, dynamic>>(
      '/api/v1/public/raffles/$slug/numbers',
    );
    final campaign = campaignResponse.data?['data'] ?? campaignResponse.data;
    final numbers = numbersResponse.data?['data'] ?? numbersResponse.data;

    if (campaign is Map<String, dynamic> && numbers is List) {
      return RaffleDetail.fromJson(
        campaign: campaign,
        numbers: numbers.whereType<Map<String, dynamic>>().toList(),
      );
    }

    throw const RafflesShapeException();
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
      return CreateRaffleEntryResponse.fromJson(rawData);
    }

    throw const RafflesShapeException();
  }

  Future<List<RaffleEntry>> getMyRaffles() async {
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
  }
}

class RafflesShapeException implements Exception {
  const RafflesShapeException();

  @override
  String toString() => 'A API retornou um formato inesperado de rifas.';
}
