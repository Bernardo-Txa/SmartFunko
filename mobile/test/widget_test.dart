import 'package:flutter_test/flutter_test.dart';
import 'package:smart_funkos/main.dart';

void main() {
  test('provider retry is bounded to one delayed attempt', () {
    final error = StateError('offline');
    expect(appProviderRetry(0, error), const Duration(seconds: 1));
    expect(appProviderRetry(1, error), isNull);
  });

  testWidgets('shows clear config error when dart defines are missing', (
    tester,
  ) async {
    await tester.pumpWidget(const SmartFunkosBootstrap());

    expect(find.text('Configurações obrigatórias ausentes'), findsOneWidget);
    expect(find.text('• API_BASE_URL'), findsOneWidget);
    expect(find.text('• SUPABASE_URL'), findsOneWidget);
    expect(find.text('• SUPABASE_ANON_KEY'), findsOneWidget);
  });
}
