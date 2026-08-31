# Portal N2 — Android WebView

1. A aplicação web de produção está configurada em `https://meu-teal.vercel.app`.
2. Abra esta pasta (`android-webview`) no Android Studio.
3. Aguarde o Gradle Sync e execute em um emulador ou aparelho.

O wrapper aceita somente a origem HTTPS configurada dentro da WebView. Links de
outros domínios são enviados ao navegador do aparelho. O acesso a arquivos locais
e o tráfego HTTP permanecem desativados.

A interface JavaScript `PortalN2Android` é exposta apenas para permitir que os
documentos HTML do site sejam enviados ao serviço de impressão do Android. O app
também solicita localização quando o módulo de Frota abre o mapa.

Para gerar um APK de teste, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
Para publicar na Play Store, altere o `applicationId`, configure sua assinatura de
release e gere um Android App Bundle (AAB).
