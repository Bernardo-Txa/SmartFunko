import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import 'auth_state.dart';

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(),
);

class AuthController extends StateNotifier<AuthState> {
  AuthController() : super(const AuthState.loading()) {
    _subscription = supabase.Supabase.instance.client.auth.onAuthStateChange
        .listen(_handleAuthStateChange);
    unawaited(restoreSession());
  }

  late final StreamSubscription<supabase.AuthState> _subscription;

  supabase.SupabaseClient get _client => supabase.Supabase.instance.client;

  Future<void> restoreSession() async {
    _emitSession(_client.auth.currentSession);
  }

  Future<void> signIn({required String email, required String password}) async {
    state = const AuthState.loading();

    try {
      final response = await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      final session = response.session;
      if (session == null) {
        state = const AuthState.error(
          'Nao foi possivel entrar com essas credenciais.',
        );
        return;
      }

      _emitSession(session);
    } on supabase.AuthException catch (error) {
      state = AuthState.error(error.message);
    } catch (_) {
      state = const AuthState.error('Falha ao conectar. Tente novamente.');
    }
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } finally {
      state = const AuthState.unauthenticated();
    }
  }

  void _handleAuthStateChange(supabase.AuthState data) {
    _emitSession(data.session);
  }

  void _emitSession(supabase.Session? session) {
    if (session == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    state = AuthState.authenticated(session: session, user: session.user);
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
