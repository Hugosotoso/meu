# Portal Integrado N2

Versão web do projeto criado no Expo Snack, pronta para gerar o site estático,
publicar na Vercel e abrir dentro de um aplicativo Android com WebView.

> **Importante:** este projeto é um protótipo acadêmico e não é um serviço
> oficial. Use somente dados fictícios e cadastre previamente no Supabase os
> servidores que participarão da demonstração.

## Como a solução funciona

Não é necessário reescrever todas as telas em Java ou Kotlin. O código React
Native/TypeScript é exportado pelo Expo para web. A Vercel hospeda esse site e o
projeto Kotlin da pasta `android-webview` carrega a URL HTTPS em uma WebView.

## Estrutura

- `src/`: telas Expo Router e componentes do site.
- `src/lib/demoData.ts`: dados exclusivamente fictícios do modo demonstração.
- `vercel.json`: build e redirecionamento de rotas para a Vercel.
- `android-webview/`: projeto que deve ser aberto no Android Studio.
- `.env.example`: exemplo de configuração opcional do Supabase.

## 1. Executar o site localmente

Instale uma versão LTS atual do Node.js. Dentro da pasta principal, execute:

```bash
npm install
npm run web
```

O terminal mostrará o endereço local. Para validar o projeto antes de publicar:

```bash
npm run typecheck
npm run build
```

O segundo comando cria a pasta `dist`.

## 2. Publicar na Vercel

A forma mais simples é usar um repositório GitHub:

1. Crie um repositório e envie o conteúdo desta pasta.
2. Na Vercel, escolha **Add New > Project** e importe o repositório.
3. Confirme **Build Command** como `npm run build`.
4. Confirme **Output Directory** como `dist`.
5. Clique em **Deploy**.
6. Teste a URL recebida, inclusive atualizando uma rota interna no navegador.

O arquivo `vercel.json` já contém essas configurações e o fallback necessário
para o Expo Router.

No modo demonstração não é necessário configurar variáveis de ambiente.

## 3. Configurar o Android Studio

Depois de publicar o site:

1. Abra `android-webview/app/src/main/res/values/strings.xml`.
2. Confirme a URL de produção `https://meu-teal.vercel.app`.
3. Abra somente a pasta `android-webview` no Android Studio.
4. Aguarde o **Gradle Sync**. Se solicitado, instale o Android SDK 36 e use JDK 17.
5. Selecione um emulador ou celular e clique em **Run**.

Para gerar um APK de teste, use:

**Build > Build Bundle(s) / APK(s) > Build APK(s)**

Para a Play Store, altere primeiro o `applicationId` em
`android-webview/app/build.gradle.kts`, configure uma chave de assinatura e gere
um Android App Bundle (AAB).

## Supabase e autenticação

O portal usa o Supabase para persistir servidores, ofícios, férias, solicitações
logísticas, auditoria e notificações. Crie um arquivo `.env.local` a partir de
`.env.example` ou configure estas variáveis na Vercel:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_ENABLE_REMOTE_LOOKUP
```

O login por CPF chama `portal_iniciar_sessao`, que emite um token aleatório com
validade de oito horas. O navegador recebe o token, enquanto o banco armazena
somente seu hash. As políticas RLS usam essa sessão para limitar contracheques,
solicitações, auditoria e notificações à matrícula correta; operações globais
de Gabinete e da Central de Gestão exigem perfil `DIAMANTE` no banco.

A migração `20260831_secure_portal_rls.sql` também remove o acesso direto à
tabela `servidores`, elimina políticas `using (true)`, impede exclusões pela
Data API e força matrícula, nome e autoria por gatilho. O CPF fixo que existia
no código foi removido.

O token reduz a exposição da demonstração, mas CPF sozinho não comprova
identidade. Para produção institucional, substitua essa etapa por Supabase Auth,
Gov.br/OIDC ou pelo provedor autorizado. Nunca coloque uma chave `service_role`
em código Expo, navegador ou WebView.

Para uma integração institucional, use o fluxo de identidade autorizado pelo
provedor oficial; não copie páginas, marcas ou formulários de login de terceiros.

## Proteções do projeto Android

- aceita somente a origem HTTPS configurada;
- abre domínios externos no navegador do aparelho;
- bloqueia conteúdo misto HTTP/HTTPS;
- desativa acesso da WebView a arquivos locais;
- não utiliza `addJavascriptInterface` nem outra ponte JavaScript nativa;
- mostra uma tela de erro com opção de tentar novamente.

O aplicativo depende de internet. Recursos do navegador, como impressão ou
download, devem ser testados no aparelho após cada mudança importante do site.
