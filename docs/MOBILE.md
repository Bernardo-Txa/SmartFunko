# Mobile Smart Funkos

## Arquitetura

O app mobile é um cliente Flutter para a área do cliente da Smart Funkos.

- Flutter com Material 3.
- Riverpod para estado.
- GoRouter para navegação.
- Supabase Auth para sessão do usuário.
- Dio para consumir APIs Next.js em `API_BASE_URL`.
- Supabase service role, InfinitePay API key e webhook secrets permanecem somente no backend.

## Decisão de integração

O mobile autentica o usuário diretamente no Supabase Auth com `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Depois disso, chamadas futuras às APIs Next.js devem enviar `Authorization: Bearer <access token>` pelo `ApiClient`.

Pagamentos, rifas produtivas, pedidos e operações sensíveis continuam centralizados no backend web.

## Mobile 0.4.1: autenticação e locale

Endpoints `/api/v1/me/*` exigem `Authorization: Bearer <access_token>`. O token vem de `Supabase.instance.client.auth.currentSession?.accessToken`; o interceptor tenta renovar sessão expirada antes da chamada e nunca envia `Bearer null` ou token vazio.

Telas autenticadas não devem chamar `/api/v1/me/*` sem sessão. `/pedidos`, `/minhas-rifas` e `/checkout` exibem CTA de login quando o usuário está deslogado, e o checkout volta para `/checkout` após login via `from=/checkout`.

Para testar um token real:

```bash
curl -i "https://smart-funko.vercel.app/api/v1/me/orders" \
  -H "Origin: http://localhost:36883" \
  -H "Authorization: Bearer TOKEN_VALIDO"
```

O app inicializa `initializeDateFormatting('pt_BR', null)` antes de `runApp` e configura `MaterialApp` com locale `pt_BR`, delegates e `flutter_localizations`.

## Mobile 0.4.2: estado unico de auth

A fonte de verdade de login no app e a sessao atual do Supabase. `AuthController.syncSession()` consulta `Supabase.instance.client.auth.currentSession`, tenta renovar token expirado e atualiza o provider antes de guards de checkout e rifa bloquearem o fluxo.

Fluxos protegidos usam a sessao efetiva do Supabase para evitar falso bloqueio quando o provider ainda esta defasado apos login, hot restart ou retomada do app. Enquanto o estado ainda carrega, as telas mostram `Verificando sua sessão...`.

## Escopo MVP cliente

- Login Supabase Auth.
- Home objetiva com ações principais, produtos em destaque reais e rifas ativas reais.
- Catálogo real via API pública Next.js, busca por texto e filtros de status funcionais.
- Produto real por slug com galeria, preço, badges, descrição, compartilhamento e carrinho.
- Carrinho local em memória com adicionar, remover, quantidade, limpar e total estimado.
- Pedidos reais do cliente.
- Rifas reais experimentais.
- Perfil simples com conta, pedidos, minhas rifas e sair.

## Mobile Reset UX: foco e funcionalidade

O mobile foi resetado para uma experiência direta, sem teasers ou componentes que pareçam funcionalidades disponíveis sem fluxo real de ponta a ponta.

Entregas:

- Bottom nav simples: Home, Catálogo, Rifas, Pedidos e Perfil.
- Home com título, texto curto, quatro ações principais, produtos em destaque e rifas ativas apenas quando a API retornar dados.
- Catálogo com busca e filtros de status que chamam o contrato público existente.
- Cards de produto sem wishlist fake, sem CTA morto e sem chips decorativos.
- Produto com descrição, preço, status, adicionar ao carrinho, compartilhar e voltar ao catálogo.
- Perfil com dados do usuário, Meus pedidos, Minhas rifas e Sair.
- Clube mantido como rota compatível, mas fora da navegação e sem pontuação demo.

Removido ou escondido:

- Drawer complexo.
- Descoberta por fandom em chips.
- Wishlist/favoritos sem persistência.
- Ranking, alertas, scanner, coleção, comunidade e marketplace.
- Seções de roadmap dentro da experiência principal.
- Pontuação, benefícios ou conquistas demo no Clube.

Preservado:

- Login Supabase.
- Catálogo público e detalhe por slug.
- Cache de catálogo/produto e imagens com fallback.
- Carrinho local e criação real de pedido.
- Pedidos reais do cliente.
- Rifas reais experimentais e minhas rifas.
- Proteção contra duplo submit no checkout/rifa.

Critérios de validação:

- `flutter analyze`
- `flutter test`
- Teste manual em 360 x 800, 390 x 844 e 430 x 932.
- Fluxo Home > Catálogo > Produto > Carrinho > Pedido.
- Fluxo Rifas > Detalhe > Reserva > Minhas rifas.
- Login, logout e retorno de rotas protegidas.

## Integração Mobile 0.2

Endpoints públicos usados:

- `GET /api/v1/public/products?q=&category=&filter=&page=&pageSize=&sort=`
- `GET /api/v1/public/products/[slug]`

Contrato consumido pelo app:

- `ProductSummary`: `id`, `slug`, `name`, `price`, `imageUrl`, `status`, `category`, `special`, `supplierName`, `isAvailable`.
- `ProductDetail`: `id`, `slug`, `name`, `description`, `price`, `images`, `status`, `category`, `subcategory`, `special`, `supplierName`, `badges`.
- `CartItem`: produto, preço, imagem, quantidade e subtotal local.

O app aceita campos nulos e variações simples de shape (`data`, `products`, `items`) para manter a UI resiliente. O compartilhamento de produto usa `${API_BASE_URL}/produto/[slug]`.

## CORS Mobile 0.2.1

Flutter Web local consome o backend remoto a partir de origens como `http://localhost:*` e `http://127.0.0.1:*`. As APIs publicas e de cliente respondem preflight `OPTIONS` com allowlist de origem.

Origens permitidas no backend:

- `http://localhost:*`.
- `http://127.0.0.1:*`.
- `https://smart-funko.vercel.app`.
- `NEXT_PUBLIC_SITE_URL`, quando configurado.
- `CORS_ALLOWED_ORIGINS`, lista opcional separada por virgula.

Exemplo:

```txt
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:33539,https://smart-funko.vercel.app
```

CORS nao libera acesso anonimo a APIs autenticadas: `/api/v1/me/*` segue exigindo Bearer token. `/api/v1/admin/*` nao foi liberado para mobile.

## Imagens Externas 0.2.2

Flutter Web pode bloquear imagens de CDNs externas quando o host nao envia `Access-Control-Allow-Origin`. Para o catalogo/produto, o app resolve imagens externas pelo proxy publico:

```txt
GET /api/v1/public/image-proxy?url=<encoded_url>
```

O proxy aplica CORS, cache publico e valida seguranca antes de buscar a imagem. Allowlist inicial:

- `cdn.awsli.com.br`.
- `smart-funko.vercel.app`.
- `*.supabase.co`, validado por sufixo exato `.supabase.co`.

Bloqueios importantes:

- `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`.
- faixas privadas `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- metadata/cloud internals como `169.254.169.254` e `metadata.google.internal`.
- respostas que nao sejam `image/jpeg`, `image/png`, `image/webp` ou `image/gif`.

No mobile, a URL e resolvida em `mobile/lib/core/network/image_url_resolver.dart`. Supabase Storage e imagens do proprio backend continuam diretas; imagens externas no Flutter Web usam o proxy. Futuro recomendado: migrar imagens externas para Supabase Storage/CDN proprio, padronizando o bucket `product-images`.

## Pedido Real 0.3

O carrinho local agora pode ser enviado como pedido real quando o cliente esta logado.

Endpoints reutilizados:

- `POST /api/v1/me/orders`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/[orderNumber]`

Fluxo:

1. Cliente adiciona produtos ao carrinho.
2. `Finalizar pedido` exige login.
3. `/checkout` mostra revisao, total estimado e observacoes opcionais.
4. O app envia apenas `variantId` e `quantity`; o backend recalcula precos e totais.
5. Pedido entra em analise (`under_review`) e o carrinho e limpo apos sucesso.
6. `/pedidos` lista pedidos reais do cliente e `/pedidos/[orderNumber]` mostra o detalhe.

Status suportados no mobile:

- `under_review`: Em analise.
- `approved_for_payment` / `awaiting_payment` / `pending_payment`: Aguardando pagamento.
- `paid`: Pago.
- `rejected`: Recusado.
- `cancelled`: Cancelado.
- `refunded`: Estornado.

Limitacoes:

- pagamento nativo InfinitePay fica para etapa futura;
- pedido ainda passa por aprovacao/admin;
- rifas reais entram na 0.4.

## Rifas Reais 0.4

O mobile consome o fluxo experimental de rifas ja existente no backend.

Endpoints usados:

- `GET /api/v1/public/raffles`
- `GET /api/v1/public/raffles/[slug]`
- `GET /api/v1/public/raffles/[slug]/numbers`
- `POST /api/v1/me/raffles/[slug]/reserve`
- `GET /api/v1/me/raffles`

`GET /api/v1/me/raffles/orders` continua existindo como compatibilidade do backend, mas o mobile usa o path claro `/api/v1/me/raffles`.

Fluxo:

1. `/rifas` lista campanhas abertas.
2. `/rifas/[slug]` mostra detalhe, progresso e grade de numeros.
3. Somente numeros disponiveis podem ser selecionados.
4. Reserva exige login e envia apenas a lista de numeros.
5. Backend valida disponibilidade, cliente, total e evita dupla reserva.
6. `/minhas-rifas` lista reservas/participacoes do cliente.

O modulo segue experimental/dev. Manter `NEXT_PUBLIC_ENABLE_RAFFLES=true` somente quando o ambiente estiver preparado. O app nao confirma pagamento por conta propria; se houver link seguro retornado pelo backend, ele apenas abre o link externo.

## Fora do MVP

- Admin mobile.
- Push notifications.
- Offline mode.
- Pagamento nativo.
- Deep links avançados.
- BI mobile.
- Chat.
- Scanner.
- Marketplace.
- Publicação nas lojas.

## Fluxos

Login:

1. Cliente abre `/login`.
2. Informa e-mail e senha.
3. `AuthController.signIn` chama Supabase Auth.
4. Em sucesso, o app navega para `/`.
5. Em erro, mostra mensagem amigável.

Pedido:

1. Cliente adiciona produtos ao carrinho local.
2. Cliente ajusta quantidades e confere total estimado.
3. `Finalizar pedido` exige login quando necessário.
4. O app envia o pedido real ao backend.
5. Em sucesso, limpa o carrinho e navega para `/pedidos/[orderNumber]` quando houver número.

Rifa:

1. Cliente acessa `/rifas`.
2. Abre uma campanha real em `/rifas/[slug]`.
3. Seleciona números disponíveis.
4. Reserva exige login e o backend valida disponibilidade.
5. Se houver link de pagamento, o app abre o link externo; o app não marca pagamento localmente.

## Roadmap

- UI premium.
- Wishlist real.
- Alertas reais.
- Coleção do usuário.
- Scanner.
- Comunidade/marketplace.

Histórico:

- `0.1.1`: base compilável, auth, router e tema.
- `0.2`: catálogo/produto reais via APIs Next e carrinho local.
- `0.3`: criação real de pedido a partir do carrinho.
- `0.4`: rifas cliente.
- `0.5`: Clube e perfil conectados a dados reais.
- `0.6.x`: UI premium foi adiada; mobile voltou ao foco funcional.
- Release prep: ícones, splash, screenshots, políticas e lojas.

## Publicação

Antes de Play Store e App Store:

- Revisar nome, ícone e splash.
- Validar bundle/package `br.com.smartfunkos.app`.
- Gerar screenshots por dispositivo.
- Revisar privacy policy e termos.
- Configurar assinatura Android.
- Configurar certificados e provisioning iOS.
- Rodar build release e testes em dispositivos reais.
