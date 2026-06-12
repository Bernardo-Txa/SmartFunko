import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'api_error.dart';

class AuthInterceptor extends Interceptor {
  const AuthInterceptor();

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _prepareRequest(options).then(
      (_) => handler.next(options),
      onError: (Object error, StackTrace stackTrace) {
        handler.reject(
          DioException(requestOptions: options, error: error),
          true,
        );
      },
    );
  }

  Future<void> _prepareRequest(RequestOptions options) async {
    final path = options.path;
    final requiresAuth = _requiresAuth(path);
    final isPublic = _isPublic(path);

    if (!options.headers.containsKey('Accept')) {
      options.headers['Accept'] = 'application/json';
    }

    final auth = Supabase.instance.client.auth;
    var session = auth.currentSession;

    if (requiresAuth && session?.isExpired == true) {
      try {
        final response = await auth.refreshSession();
        session = response.session ?? auth.currentSession;
      } catch (_) {
        session = auth.currentSession;
      }
    }

    final token = session?.accessToken.trim();
    final tokenPresent = token != null && token.isNotEmpty;
    final hasAuthorization = options.headers.containsKey('Authorization');

    if (requiresAuth && !tokenPresent) {
      if (kDebugMode) {
        debugPrint(
          '[AuthInterceptor] ${options.method} $path tokenPresent=false',
        );
      }
      throw const UnauthenticatedException();
    }

    if (requiresAuth && !isPublic && tokenPresent && !hasAuthorization) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    if (kDebugMode && requiresAuth) {
      debugPrint(
        '[AuthInterceptor] ${options.method} $path tokenPresent=$tokenPresent',
      );
    }
  }

  bool _requiresAuth(String path) {
    final normalizedPath = _normalizedPath(path);
    return normalizedPath == '/api/v1/me' ||
        normalizedPath.startsWith('/api/v1/me/');
  }

  bool _isPublic(String path) {
    final normalizedPath = _normalizedPath(path);
    return normalizedPath.startsWith('/api/v1/public/');
  }

  String _normalizedPath(String path) {
    final uri = Uri.tryParse(path);
    return uri?.path ?? path;
  }
}
