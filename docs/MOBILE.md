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

## Escopo MVP cliente

- Login Supabase Auth.
- Home cliente.
- Home com identidade Smart Funkos, CTAs e destaques do catálogo público.
- Catálogo real via API pública Next.js.
- Produto real por slug com galeria, preço, badges, descrição e compartilhamento.
- Carrinho local em memória com adicionar, remover, quantidade, limpar e total estimado.
- Pedidos placeholder.
- Rifas placeholder.
- Clube placeholder.
- Perfil com usuário Supabase e logout.

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
- `GET /api/v1/me/raffles/orders`

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
3. Botão `Enviar pedido` mostra aviso de que a criação real entra na próxima etapa.
4. Histórico em `/pedidos` permanece placeholder até integração com APIs reais.

Rifa:

1. Cliente acessa `/rifas`.
2. Cards placeholder levam para `/rifas/demo`.
3. Reserva e pagamento seguem fora da base 0.1.1.

## Roadmap

- `0.1.1`: base compilável, auth, router, tema e placeholders.
- `0.2`: catálogo/produto reais via APIs Next e carrinho local.
- `0.3`: criação real de pedido a partir do carrinho.
- `0.4`: rifas cliente.
- `0.5`: Clube e perfil conectados a dados reais.
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
