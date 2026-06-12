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
    await syncSession(refreshExpired: false);
  }

  Future<AuthState> syncSession({bool refreshExpired = true}) async {
    var session = _client.auth.currentSession;

    if (refreshExpired && session?.isExpired == true) {
      try {
        final response = await _client.auth.refreshSession();
        session = response.session ?? _client.auth.currentSession;
      } on supabase.AuthException catch (error) {
        await _clearSupabaseSession();
        state = AuthState.error(error.message);
        return state;
      } catch (_) {
        await _clearSupabaseSession();
        state = const AuthState.unauthenticated();
        return state;
      }
    }

    _emitSession(session);
    return state;
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

  Future<void> _clearSupabaseSession() async {
    try {
      await _client.auth.signOut();
    } catch (_) {
      // Best effort: the local state below still stops protected app flows.
    }
  }

  void _handleAuthStateChange(supabase.AuthState data) {
    _emitSession(data.session);
  }

  void _emitSession(supabase.Session? session) {
    final user = session?.user ?? _client.auth.currentUser;

    if (session == null || user == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    state = AuthState.authenticated(session: session, user: user);
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
