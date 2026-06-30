import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../../shared/widgets/primary_button.dart';
import '../../shared/widgets/smart_card.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  static const _redirectUrl = 'https://smartfunko.com.br/redefinir-senha';
  static const _successMessage =
      'Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.';

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isSubmitting = false;
  String? _message;
  bool _isError = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Esqueci minha senha',
      showBottomNavigation: false,
      showBackButton: true,
      showCartAction: false,
      showProfileAction: false,
      showSearch: false,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: SmartCard(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.shield_outlined,
                    color: theme.colorScheme.primary,
                    size: 42,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Redefinir senha',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Informe seu e-mail para receber o link de recuperação. A redefinição abre no site oficial da SmartFunko.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'E-mail',
                      prefixIcon: Icon(Icons.mail_outline_rounded),
                    ),
                    validator: (value) {
                      final email = value?.trim() ?? '';
                      if (email.isEmpty || !email.contains('@')) {
                        return 'Informe um e-mail válido.';
                      }
                      return null;
                    },
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  if (_message != null) ...[
                    const SizedBox(height: 14),
                    _ResetMessage(message: _message!, isError: _isError),
                  ],
                  const SizedBox(height: 20),
                  PrimaryButton(
                    label: 'Enviar link de recuperação',
                    icon: Icons.mark_email_read_outlined,
                    isLoading: _isSubmitting,
                    fullWidth: true,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: 'Voltar ao login',
                    icon: Icons.arrow_back_rounded,
                    variant: PrimaryButtonVariant.outlined,
                    fullWidth: true,
                    onPressed: () => context.go('/login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_isSubmitting || _formKey.currentState?.validate() != true) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _message = null;
      _isError = false;
    });

    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        _emailController.text.trim(),
        redirectTo: _redirectUrl,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _message = _successMessage;
        _isError = false;
      });
    } on AuthException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _message = _messageForAuthError(error);
        _isError = true;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _message = 'Não foi possível enviar o link agora. Tente novamente.';
        _isError = true;
      });
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  String _messageForAuthError(AuthException error) {
    final message = error.message.toLowerCase();
    final status = error.statusCode?.toString();
    final rateLimited =
        status == '429' ||
        message.contains('rate') ||
        message.contains('too many') ||
        message.contains('muitos');

    if (rateLimited) {
      return 'Você solicitou muitos e-mails em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }

    return 'Não foi possível enviar o link agora. Tente novamente.';
  }
}

class _ResetMessage extends StatelessWidget {
  const _ResetMessage({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppColors.danger : AppColors.success;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              isError
                  ? Icons.error_outline_rounded
                  : Icons.check_circle_outline_rounded,
              color: color,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w800,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
