import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/raffle_models.dart';

final raffleSelectionControllerProvider = StateNotifierProvider.autoDispose
    .family<RaffleSelectionController, Set<int>, String>(
      (ref, slug) => RaffleSelectionController(),
    );

class RaffleSelectionController extends StateNotifier<Set<int>> {
  RaffleSelectionController() : super(<int>{});

  void toggle(RaffleNumber number, {int? maxNumbers}) {
    if (!number.selectable) {
      return;
    }

    final next = {...state};
    if (next.contains(number.number)) {
      next.remove(number.number);
    } else {
      if (maxNumbers != null && next.length >= maxNumbers) {
        return;
      }
      next.add(number.number);
    }
    state = next;
  }

  void clear() {
    state = <int>{};
  }
}
