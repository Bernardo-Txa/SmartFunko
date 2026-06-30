# SmartFunko Mobile

## Estado atual

O app mobile da SmartFunko é um MVP cliente Flutter funcional e em evolução.
Ele é integrado ao web/backend da SmartFunko, consome APIs públicas e autenticadas do Next.js e usa Supabase Auth para autenticação.

Domínio oficial:

```txt
https://smartfunko.com.br
```

O app não contém secrets, não executa rotinas administrativas e não confirma pagamentos por conta própria.

## Escopo do app

- Login e logout com Supabase Auth.
- Recuperação de senha via fluxo web.
- Home mobile como hub do cliente.
- Catálogo.
- Busca e filtros de catálogo.
- Detalhe do produto por slug.
- Carrinho local.
- Checkout assistido com envio de pedido real ao backend.
- Meus pedidos.
- Detalhe do pedido.
- Rifas.
- Minhas rifas/reservas.
- Perfil.
- Branding mobile com ícone, splash e assets oficiais.
- Estados visuais de loading, empty e error em evolução.

## Como rodar

Requisitos:

- Flutter SDK estável.
- Android Studio e Android SDK para Android.
- Xcode para iOS em macOS.
- Chrome ou Chromium para execução web local.

Verifique o ambiente:

```bash
flutter doctor -v
```

Instale as dependências:

```bash
cd mobile
flutter pub get
```

Android emulator:

```bash
flutter run -d emulator-5554 \
  --dart-define=API_BASE_URL=https://smartfunko.com.br \
  --dart-define=SUPABASE_URL=https://sufppaxdxmxdcfkuvanm.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Dispositivo físico:

```bash
flutter devices

flutter run -d ID_DO_DEVICE \
  --dart-define=API_BASE_URL=https://smartfunko.com.br \
  --dart-define=SUPABASE_URL=https://sufppaxdxmxdcfkuvanm.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Flutter Web local:

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=https://smartfunko.com.br \
  --dart-define=SUPABASE_URL=https://sufppaxdxmxdcfkuvanm.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Sem as três variáveis, o app abre uma tela de erro clara em desenvolvimento.

## Variáveis de ambiente

Variáveis permitidas no app via `--dart-define`:

- `API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Variáveis proibidas no app:

- `SUPABASE_SERVICE_ROLE_KEY`
- `INFINITEPAY_API_KEY`
- `INFINITEPAY_WEBHOOK_SECRET`
- `DATABASE_URL`
- qualquer secret server-side

O Flutter nunca deve chamar InfinitePay diretamente.
Pagamentos, geração de links, webhooks e service role são responsabilidade do backend web.

## Branding mobile

Assets oficiais usados no mobile:

```txt
mobile/assets/branding/app_icon.png
mobile/assets/branding/app_icon_foreground.png
mobile/assets/branding/logo_horizontal_white.png
mobile/assets/branding/logo_dark.png
mobile/assets/branding/logo_square.png
mobile/assets/branding/splash_logo.png
```

Asset adicional usado pela splash Android 12:

```txt
mobile/assets/branding/splash_android12.png
```

Gerar ícones nativos e web:

```bash
dart run flutter_launcher_icons
```

Gerar splash nativa:

```bash
dart run flutter_native_splash:create
```

Regras de uso:

- O launcher icon usa o ícone azul oficial.
- A splash usa fundo dark/navy.
- A logo horizontal branca é usada em fundos escuros.
- A logo escura é usada apenas em fundos claros.
- `app_icon_foreground.png` é o foreground do adaptive icon Android.

## Fluxos funcionais

### Auth

- Login com Supabase Auth.
- Logout.
- Recuperação de senha.
- E-mail não confirmado recebe mensagem amigável quando retornado pelo Supabase.
- Reset de senha direciona para o fluxo web em `https://smartfunko.com.br/redefinir-senha`.
- Rotas protegidas sincronizam a sessão atual do Supabase antes de chamar `/api/v1/me/*`.

### Catálogo

- Lista produtos reais via API pública.
- Busca por texto e filtros de status.
- Cards de produto com preço, status, imagem e ação de carrinho.
- Detalhe do produto por slug.
- Compartilhamento usa `${API_BASE_URL}/produto/[slug]`.

### Carrinho e checkout assistido

- Cliente adiciona produtos ao carrinho local.
- Cliente revisa itens e quantidades.
- `Finalizar pedido` exige login.
- App envia `variantId` e `quantity`; o backend recalcula preço, total e disponibilidade.
- Backend cria pedido real em análise.
- Pagamento não acontece direto no app.
- Link de pagamento é liberado posteriormente pelo backend/admin.
- Webhook e verificação server-side são a fonte da verdade de pagamento.

### Pedidos

- Lista pedidos reais do usuário.
- Abre detalhe por número do pedido.
- Mostra status, itens, total e datas.
- Mostra link de pagamento quando o backend retornar um link disponível.

### Rifas

- Lista campanhas.
- Abre detalhe da campanha por slug.
- Carrega números.
- Permite selecionar e reservar números quando o backend habilita o fluxo.
- Lista minhas rifas/reservas.
- Pagamento sempre passa pelo backend.
- O app não sorteia, não confirma pagamento e não altera status financeiro localmente.

### Perfil

- Mostra dados básicos da conta.
- Oferece atalhos para pedidos e minhas rifas.
- Permite logout.

## Fluxos experimentais/controlados

Rifas existem no app, mas dependem das regras, flags e validações do backend.
O app apenas consome o fluxo; não executa sorteio nem confirmação de pagamento.

O checkout assistido cria pedidos em análise.
A aprovação, geração de link InfinitePay, confirmação de pagamento e baixa financeira continuam no backend/admin.

## O que não existe no mobile

O mobile ainda não possui:

- painel administrativo;
- geração direta de pagamento InfinitePay;
- service role;
- marketplace;
- scanner;
- ranking;
- comunidade;
- coleção pessoal completa;
- fluxo nativo completo de deep link para reset de senha;
- publicação em loja.

Rotas compatíveis ou telas internas fora da navegação principal não significam produto final publicado para o cliente.

## Checklist manual

1. Splash abre com branding correto.
2. Login funciona.
3. Logout funciona.
4. Esqueci minha senha envia e-mail.
5. Home carrega.
6. Catálogo lista produtos.
7. Busca/filtros funcionam.
8. Produto abre.
9. Produto adiciona ao carrinho.
10. Carrinho mostra itens.
11. Checkout cria pedido real.
12. App direciona para pedido após checkout.
13. Pedidos listam dados reais.
14. Link de pagamento abre quando disponível.
15. Rifas carregam.
16. Reserva de rifa funciona quando habilitada.
17. Minhas rifas carrega reservas reais.
18. Perfil abre.
19. Ícone do app está correto.
20. Splash nativa está correta.
21. Sem tela branca, overflow ou botão morto.

## Comandos úteis

```bash
flutter pub get
flutter analyze
flutter test
```

Build debug Android:

```bash
flutter build apk --debug \
  --dart-define=API_BASE_URL=https://smartfunko.com.br \
  --dart-define=SUPABASE_URL=https://sufppaxdxmxdcfkuvanm.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Teste rápido de CORS/autenticação:

```bash
curl -i -X OPTIONS "https://smartfunko.com.br/api/v1/me/orders" \
  -H "Origin: http://localhost:36883" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

## Pendências reais

- Testar fluxo completo em dispositivo físico.
- Revisar deep links nativos, especialmente reset de senha.
- Preparar Play Store/App Store.
- Publicar ou revisar política de privacidade.
- Publicar ou revisar termos de uso.
- Gerar screenshots para loja.
- Avaliar crash reporting/analytics.
- Melhorar acessibilidade fina.
- Ampliar testes automatizados.
