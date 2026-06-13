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

O backend permite CORS para Flutter Web local em `http://localhost:*` e `http://127.0.0.1:*`. Em ambientes remotos, mantenha `NEXT_PUBLIC_SITE_URL` correto e use `CORS_ALLOWED_ORIGINS` no web se precisar autorizar origens adicionais. CORS nao substitui login: chamadas futuras para `/api/v1/me/*` continuam usando Bearer token.

Imagens externas que nao suportam CORS no navegador passam pelo proxy seguro do backend no Flutter Web:

```txt
GET /api/v1/public/image-proxy?url=<encoded_url>
```

O proxy aceita apenas dominios em allowlist (`cdn.awsli.com.br`, `smart-funko.vercel.app`, `*.supabase.co`) e bloqueia hosts locais/privados.

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

## Mobile 0.6.1: Geek Commerce Benchmark UI

Esta etapa evolui a interface mobile para uma experiência de e-commerce geek premium, inspirada por padrões de descoberta de Funko, BoxLunch, Hot Topic, Tokyo Otaku Mode, Geral Geek e Geek Fanáticos, sem copiar layout, marca ou assets dessas lojas.

Entregue no app:

- Home com descoberta por fandom, vitrine SmartFunko, drops limitados e teaser honesto de ranking/wishlist.
- Catálogo com busca por texto, entrada por `?q=Fandom`, chips de fandom e filtros de status (`Pronta-entrega`, `Pré-venda`, `Encomenda`, `Drops`).
- Cards de produto com visual de drop, wishlist preparada, badges e imagens cacheadas.
- Detalhe de produto com curadoria, wishlist preparada, compartilhar e carrinho preservado.
- Perfil e Clube com atalhos reais e placeholders explícitos para coleção, scanner, ranking, alertas e comunidade.
- Tema dark premium com superfícies, bordas, sombras e navegação inferior visualmente reforçadas.

Integrações preparadas, ainda sem backend novo:

- Wishlist persistente.
- Ranking dos mais desejados.
- Alertas de estoque e pré-venda.
- Minha coleção.
- Scanner de código.
- Comunidade/marketplace entre colecionadores.

Fluxos que devem continuar funcionais:

- Login Supabase.
- Catálogo público e detalhe por slug.
- Carrinho local.
- Checkout com criação de pedido real.
- Pedidos do cliente.
- Rifas e minhas rifas.

Checklist manual sugerido:

- Redmi Pad Pro: validar home, catálogo em grid, detalhe de produto, carrinho, checkout, rifas e perfil.
- Brave/Chromium Web: rodar via `flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080` e validar imagens, CORS, scroll horizontal dos chips e navegação por `/catalogo?q=Marvel`.
- Conferir que wishlist/ranking aparecem como roadmap e não simulam persistência real.

## Mobile MVP Cliente 0.2

O app consome endpoints públicos do backend web em `API_BASE_URL`:

- `GET /api/v1/public/products`
- `GET /api/v1/public/products/[slug]`

Validacao CORS de preflight:

```bash
curl -i -X OPTIONS \
  "https://smart-funko.vercel.app/api/v1/public/products?page=1&pageSize=24&sort=specials_first" \
  -H "Origin: http://localhost:33539" \
  -H "Access-Control-Request-Method: GET"
```

Validacao do proxy de imagem:

```bash
curl -I "https://smart-funko.vercel.app/api/v1/public/image-proxy?url=https%3A%2F%2Fcdn.awsli.com.br%2F800x800%2F84%2F84034%2Fproduto%2F161912510%2Ffunko-pop--disney-classics-dumbo-1195-exclusivo-a-1--800-5ixl3unfcx.jpg" \
  -H "Origin: http://localhost:36883"
```

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

## Mobile MVP Cliente 0.3

Fluxo de pedido real:

- Carrinho usa produtos reais do catalogo e guarda `variantId`.
- `Finalizar pedido` exige login.
- `/checkout` revisa itens, total estimado e observacoes.
- `POST /api/v1/me/orders` cria o pedido em analise.
- `/pedidos` lista pedidos reais.
- `/pedidos/[orderNumber]` mostra status, itens, total e link de pagamento se o backend liberar.

O app nao envia preco como fonte da verdade. O backend recalcula totais e valida produtos pelo token do usuario.

## Mobile MVP Cliente 0.4

Rifas reais experimentais:

- `/rifas` lista campanhas abertas via `GET /api/v1/public/raffles`.
- `/rifas/:slug` carrega detalhe e numeros via endpoints publicos.
- Cliente seleciona numeros disponiveis e reserva com `POST /api/v1/me/raffles/[slug]/reserve`.
- `/minhas-rifas` lista reservas pelo endpoint `GET /api/v1/me/raffles/orders`.

O backend continua definindo cliente pelo Bearer token e validando disponibilidade/total. Pagamento nativo nao e confirmado pelo app.

## Mobile 0.4.1

- `/api/v1/me/*` usa `Authorization: Bearer <access_token>` obtido da sessão atual do Supabase.
- O interceptor tenta renovar sessão expirada antes de enviar endpoints autenticados e não loga o token completo.
- Telas autenticadas mostram CTA de login e não disparam `/me` sem sessão.
- `/minhas-rifas` usa `GET /api/v1/me/raffles`; `/api/v1/me/raffles/orders` fica como compatibilidade no backend.
- Datas em `pt_BR` são inicializadas com `initializeDateFormatting('pt_BR', null)` antes de `runApp`.

Teste rápido de CORS/autenticação:

```bash
curl -i -X OPTIONS "https://smart-funko.vercel.app/api/v1/me/orders" \
  -H "Origin: http://localhost:36883" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

## Mobile 0.4.2

- `AuthController` sincroniza o estado com `Supabase.instance.client.auth.currentSession`.
- Checkout e rifa chamam `syncSession()` antes de decidir se enviam o usuário para login.
- `/login` aceita `from` e `redirect` para voltar ao checkout, rifa, pedidos ou minhas rifas.
- O interceptor lança erro controlado antes de chamar `/api/v1/me/*` quando não há token.

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
