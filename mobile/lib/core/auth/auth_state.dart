import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

enum AuthStatus { loading, authenticated, unauthenticated, error }

class AuthState {
  const AuthState._({
    required this.status,
    this.errorMessage,
    this.session,
    this.user,
  });

  const AuthState.loading() : this._(status: AuthStatus.loading);

  const AuthState.unauthenticated()
    : this._(status: AuthStatus.unauthenticated);

  const AuthState.error(String message)
    : this._(status: AuthStatus.error, errorMessage: message);

  const AuthState.authenticated({
    required supabase.Session session,
    required supabase.User user,
  }) : this._(status: AuthStatus.authenticated, session: session, user: user);

  final AuthStatus status;
  final String? errorMessage;
  final supabase.Session? session;
  final supabase.User? user;

  supabase.Session? get effectiveSession =>
      session ?? supabase.Supabase.instance.client.auth.currentSession;

  supabase.User? get effectiveUser =>
      user ??
      effectiveSession?.user ??
      supabase.Supabase.instance.client.auth.currentUser;

  bool get isLoading => status == AuthStatus.loading;
  bool get isAuthenticated => effectiveSession != null && effectiveUser != null;
  bool get isError => status == AuthStatus.error;

  String get displayName {
    final metadataName = effectiveUser?.userMetadata?['name'];
    if (metadataName is String && metadataName.trim().isNotEmpty) {
      return metadataName.trim();
    }

    final email = effectiveUser?.email?.trim();
    if (email != null && email.isNotEmpty) {
      return email;
    }

    return 'Cliente Smart Funkos';
  }
}
