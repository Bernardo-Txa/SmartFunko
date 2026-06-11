# Smart Funkos Mobile

App Flutter cliente da Smart Funkos.

## Requisitos

- Flutter SDK estável.
- Android Studio e Android SDK para Android.
- Xcode para iOS em macOS.
- Chrome ou Chromium para execução web local.

Verifique o ambiente:

```bash
flutter doctor -v
```

## Instalação

```bash
cd mobile
flutter pub get
```

## Variáveis permitidas no app

O app usa apenas valores públicos via `--dart-define`:

- `API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Exemplo:

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=https://smart-funko.vercel.app \
  --dart-define=SUPABASE_URL=SUA_URL_SUPABASE \
  --dart-define=SUPABASE_ANON_KEY=SUA_ANON_KEY
```

## Variáveis proibidas no app

Nunca embutir no Flutter:

- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_API_KEY`
- `INFINITEPAY_WEBHOOK_SECRET`

InfinitePay, service role e webhooks devem ficar somente no backend Next.js.

## Como rodar

Web:

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=https://smart-funko.vercel.app \
  --dart-define=SUPABASE_URL=SUA_URL_SUPABASE \
  --dart-define=SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Android:

```bash
flutter run -d android \
  --dart-define=API_BASE_URL=https://smart-funko.vercel.app \
  --dart-define=SUPABASE_URL=SUA_URL_SUPABASE \
  --dart-define=SUPABASE_ANON_KEY=SUA_ANON_KEY
```

iOS:

```bash
flutter run -d ios \
  --dart-define=API_BASE_URL=https://smart-funko.vercel.app \
  --dart-define=SUPABASE_URL=SUA_URL_SUPABASE \
  --dart-define=SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Sem as três variáveis, o app abre uma tela de erro clara em desenvolvimento.

## Comandos de qualidade

```bash
flutter analyze
flutter test
```

## Estrutura

- `lib/app`: app, router e tema.
- `lib/core`: configuração, auth, rede e utilitários.
- `lib/shared/widgets`: widgets reutilizáveis.
- `lib/features`: telas do MVP cliente.

## Identificadores

- Android package: `br.com.smartfunkos.app`
- iOS bundle id: `br.com.smartfunkos.app`
- Nome de exibição: `Smart Funkos`

## Pendências de loja

- Criar ícone final.
- Criar splash real.
- Preparar screenshots.
- Publicar privacy policy e termos.
- Configurar Play Console.
- Configurar App Store Connect.
