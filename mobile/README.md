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

Web no Brave/Chromium:

```bash
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080 \
  --dart-define=API_BASE_URL=https://smart-funko.vercel.app \
  --dart-define=SUPABASE_URL=SUA_URL_SUPABASE \
  --dart-define=SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Depois abra `http://127.0.0.1:8080` no Brave ou Chrome.

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

## Mobile MVP Cliente 0.2

O app consome endpoints públicos do backend web em `API_BASE_URL`:

- `GET /api/v1/public/products`
- `GET /api/v1/public/products/[slug]`

Fluxos para testar:

- Home: abre com hero Smart Funkos, CTAs, destaques reais ou estado de erro.
- Catálogo: busca produtos reais, permite busca por texto, pull to refresh, card premium e adicionar ao carrinho.
- Produto: abre por slug, mostra galeria, preço, badges, descrição, adicionar ao carrinho e compartilhar `${API_BASE_URL}/produto/[slug]`.
- Carrinho: lista itens locais, altera quantidade, remove, limpa e calcula total estimado.

Limitações assumidas:

- Criação real de pedido entra na sprint `0.3`.
- Rifa real entra na sprint `0.4`.
- Clube real entra na sprint `0.5`.
- O carrinho `0.2` é local em memória e não persiste ao reiniciar o app.

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
