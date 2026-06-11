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
- Catálogo placeholder.
- Produto placeholder.
- Carrinho placeholder.
- Pedidos placeholder.
- Rifas placeholder.
- Clube placeholder.
- Perfil com usuário Supabase e logout.

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

1. Cliente acessa `/pedidos`.
2. Visitante vê CTA de login.
3. Usuário logado vê placeholder até integração com APIs reais.

Rifa:

1. Cliente acessa `/rifas`.
2. Cards placeholder levam para `/rifas/demo`.
3. Reserva e pagamento seguem fora da base 0.1.1.

## Roadmap

- `0.1.1`: base compilável, auth, router, tema e placeholders.
- `0.2`: catálogo/produto reais via APIs Next.
- `0.3`: carrinho e pedidos reais.
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
