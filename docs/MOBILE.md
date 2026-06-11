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
