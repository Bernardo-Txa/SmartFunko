import 'package:flutter/foundation.dart';

import '../config/app_config.dart';

String resolveImageUrl(String? url) {
  final value = url?.trim() ?? '';
  if (value.isEmpty) {
    return '';
  }

  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
    return '';
  }

  if (uri.path.startsWith('/api/v1/public/image-proxy')) {
    return value;
  }

  final apiBaseUri = Uri.tryParse(AppConfig.normalizedApiBaseUrl);
  final host = uri.host.toLowerCase();
  final apiHost = apiBaseUri?.host.toLowerCase();
  final isBackendImage = apiHost != null && host == apiHost;
  final isSupabaseImage = host.endsWith('.supabase.co');

  if (!kIsWeb || isBackendImage || isSupabaseImage) {
    return value;
  }

  final proxyBase = AppConfig.normalizedApiBaseUrl;
  if (proxyBase.isEmpty) {
    return value;
  }

  return '$proxyBase/api/v1/public/image-proxy?url=${Uri.encodeComponent(value)}';
}
