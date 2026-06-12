import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final memoryCacheProvider = Provider<MemoryCache>((ref) => MemoryCache());

class MemoryCacheEntry<T> {
  const MemoryCacheEntry({required this.value, required this.expiresAt});

  final T value;
  final DateTime expiresAt;

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

class MemoryCache {
  final Map<String, MemoryCacheEntry<Object?>> _entries = {};
  final Map<String, Future<Object?>> _inFlightRequests = {};

  T? get<T>(String key) {
    final entry = _entries[key];
    if (entry == null) {
      return null;
    }

    if (entry.isExpired) {
      _entries.remove(key);
      return null;
    }

    final value = entry.value;
    if (value is T) {
      return value;
    }

    return null;
  }

  void set<T>(String key, T value, Duration ttl) {
    _entries[key] = MemoryCacheEntry<Object?>(
      value: value,
      expiresAt: DateTime.now().add(ttl),
    );
  }

  Future<T> getOrLoad<T>({
    required String key,
    required String debugLabel,
    required Duration ttl,
    required Future<T> Function() loader,
    bool forceRefresh = false,
    bool tokenPresent = false,
  }) async {
    if (forceRefresh) {
      invalidate(key);
    } else {
      final cached = get<T>(key);
      if (cached != null) {
        _logApi(debugLabel, cacheHit: true, tokenPresent: tokenPresent);
        _logPerf(debugLabel, milliseconds: 0, cacheHit: true);
        return cached;
      }
    }

    final inFlight = _inFlightRequests[key];
    if (inFlight != null) {
      _logApi(
        debugLabel,
        cacheHit: false,
        tokenPresent: tokenPresent,
        inFlight: true,
      );
      final value = await inFlight;
      return value as T;
    }

    final stopwatch = Stopwatch()..start();
    _logApi(debugLabel, cacheHit: false, tokenPresent: tokenPresent);

    final future = loader().then<Object?>((value) {
      set<T>(key, value, ttl);
      return value;
    });

    _inFlightRequests[key] = future;

    try {
      final value = await future;
      return value as T;
    } finally {
      stopwatch.stop();
      _inFlightRequests.remove(key);
      _logPerf(
        debugLabel,
        milliseconds: stopwatch.elapsedMilliseconds,
        cacheHit: false,
      );
    }
  }

  void invalidate(String key) {
    _entries.remove(key);
  }

  void invalidatePrefix(String prefix) {
    _entries.removeWhere((key, value) => key.startsWith(prefix));
    _inFlightRequests.removeWhere((key, value) => key.startsWith(prefix));
  }

  void clear() {
    _entries.clear();
    _inFlightRequests.clear();
  }

  void _logApi(
    String debugLabel, {
    required bool cacheHit,
    required bool tokenPresent,
    bool inFlight = false,
  }) {
    if (!kDebugMode) {
      return;
    }

    final inFlightText = inFlight ? ' inFlight=true' : '';
    final tokenText = debugLabel.contains('/api/v1/me')
        ? ' tokenPresent=$tokenPresent'
        : '';
    debugPrint('[API] $debugLabel cacheHit=$cacheHit$tokenText$inFlightText');
  }

  void _logPerf(
    String debugLabel, {
    required int milliseconds,
    required bool cacheHit,
  }) {
    if (!kDebugMode) {
      return;
    }

    final label = _perfLabel(debugLabel);
    debugPrint('[Perf] $label loaded in ${milliseconds}ms cacheHit=$cacheHit');
  }

  String _perfLabel(String debugLabel) {
    final parts = debugLabel.split(' ');
    final path = parts.isEmpty ? debugLabel : parts.last;
    if (path.contains('/public/products/') &&
        path != '/api/v1/public/products') {
      return 'productDetail';
    }
    if (path.contains('/public/products')) return 'products';
    if (path.contains('/public/raffles/') && !path.endsWith('/numbers')) {
      return 'raffleDetail';
    }
    if (path.contains('/public/raffles')) return 'raffles';
    if (path.contains('/me/orders/')) return 'myOrderDetail';
    if (path.contains('/me/orders')) return 'myOrders';
    if (path.contains('/me/raffles')) return 'myRaffles';
    if (path.contains('/me')) return 'profile';
    return path;
  }
}
