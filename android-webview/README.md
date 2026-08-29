# Portal N2 — Android WebView

1. Publique primeiro a pasta principal na Vercel.
2. Abra `app/src/main/res/values/strings.xml`.
3. Substitua `https://seu-projeto.vercel.app` pela URL HTTPS recebida da Vercel.
4. Abra esta pasta (`android-webview`) no Android Studio.
5. Aguarde o Gradle Sync e execute em um emulador ou aparelho.

O wrapper aceita somente a origem HTTPS configurada dentro da WebView. Links de
outros domínios são enviados ao navegador do aparelho. Não há
`addJavascriptInterface`, acesso a arquivos locais ou tráfego HTTP.

Para gerar um APK de teste, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
Para publicar na Play Store, altere o `applicationId`, configure sua assinatura de
release e gere um Android App Bundle (AAB).

