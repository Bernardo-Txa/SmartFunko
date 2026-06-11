import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import 'api_error.dart';
import 'auth_interceptor.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref));

class ApiClient {
  ApiClient(this.ref)
    : _dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          sendTimeout: const Duration(seconds: 15),
          responseType: ResponseType.json,
          headers: const {'Content-Type': 'application/json'},
        ),
      ) {
    _dio.interceptors.add(AuthInterceptor(ref));
  }

  final Ref ref;
  final Dio _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _request(
      () => _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _request(
      () => _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _request(
      () => _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _request(
      () => _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<Response<T>> _request<T>(Future<Response<T>> Function() action) async {
    try {
      return await action();
    } on DioException catch (error) {
      throw ApiError.fromDio(error);
    } catch (error) {
      throw ApiError(
        message: 'Falha inesperada ao comunicar com a API.',
        raw: error,
      );
    }
  }
}
