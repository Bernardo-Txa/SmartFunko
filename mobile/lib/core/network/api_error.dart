import 'package:dio/dio.dart';

class ApiError implements Exception {
  const ApiError({required this.message, this.raw, this.statusCode});

  final String message;
  final int? statusCode;
  final Object? raw;

  factory ApiError.fromDio(DioException error) {
    final rawError = error.error;
    if (rawError is UnauthenticatedException) {
      return ApiError(message: rawError.message, statusCode: 401, raw: error);
    }

    final response = error.response;
    final statusCode = response?.statusCode;
    final data = response?.data;

    String message;
    if (data is Map<String, dynamic>) {
      final candidate = data['message'] ?? data['error'] ?? data['detail'];
      message = candidate is String && candidate.trim().isNotEmpty
          ? candidate.trim()
          : _messageForStatus(statusCode);
    } else {
      message = _messageForStatus(statusCode, error.type);
    }

    return ApiError(message: message, statusCode: statusCode, raw: error);
  }

  static String _messageForStatus(int? statusCode, [DioExceptionType? type]) {
    if (type == DioExceptionType.connectionTimeout ||
        type == DioExceptionType.sendTimeout ||
        type == DioExceptionType.receiveTimeout) {
      return 'A conexão com a API expirou.';
    }

    if (type == DioExceptionType.connectionError) {
      return 'Não foi possível conectar ao servidor.';
    }

    return switch (statusCode) {
      400 => 'A requisição foi rejeitada.',
      401 => 'Sua sessão expirou. Entre novamente.',
      403 => 'Você não tem acesso a essa ação.',
      404 => 'O recurso solicitado não foi encontrado.',
      422 => 'Os dados informados são inválidos.',
      500 => 'Não foi possível concluir a operação.',
      _ => 'Não foi possível concluir a operação.',
    };
  }

  @override
  String toString() => message;
}

class UnauthenticatedException implements Exception {
  const UnauthenticatedException([this.message = 'Entre para continuar.']);

  final String message;

  @override
  String toString() => message;
}
