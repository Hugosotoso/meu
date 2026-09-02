package br.com.portaln2.webview

import android.annotation.SuppressLint
import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.content.pm.PackageManager
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var errorPanel: View
    private lateinit var errorMessage: TextView
    private var allowedHost: String? = null
    private val printWebViews = mutableListOf<WebView>()
    private var pendingGeolocationOrigin: String? = null
    private var pendingGeolocationCallback: GeolocationPermissions.Callback? = null

    companion object {
        private const val LOCATION_PERMISSION_REQUEST = 2001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        root = findViewById(R.id.root)
        webView = findViewById(R.id.web_view)
        progress = findViewById(R.id.progress)
        errorPanel = findViewById(R.id.error_panel)
        errorMessage = findViewById(R.id.error_message)

        findViewById<Button>(R.id.retry_button).setOnClickListener {
            carregarPaginaInicial()
        }

        configurarWebView()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(0) {
                navegarParaTras()
            }
        }

        if (savedInstanceState == null) {
            carregarPaginaInicial()
        } else if (webView.restoreState(savedInstanceState) == null) {
            carregarPaginaInicial()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView() {
        WebView.setWebContentsDebuggingEnabled(false)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            setGeolocationEnabled(true)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "$userAgentString PortalN2WebView/1.0"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = true
            }
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }

        webView.addJavascriptInterface(PrintBridge(), "PortalN2Android")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                val originUri = Uri.parse(origin)
                val origemPermitida = originUri.scheme == "https" &&
                    originUri.host?.lowercase(Locale.ROOT) == allowedHost

                if (!origemPermitida) {
                    callback.invoke(origin, false, false)
                    return
                }

                if (temPermissaoDeLocalizacao()) {
                    callback.invoke(origin, true, false)
                    return
                }

                pendingGeolocationOrigin = origin
                pendingGeolocationCallback = callback
                requestPermissions(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION,
                    ),
                    LOCATION_PERMISSION_REQUEST,
                )
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest): Boolean {
                return tratarNavegacao(request.url)
            }

            @Deprecated("Compatibilidade com versões antigas do WebView")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String): Boolean {
                return tratarNavegacao(Uri.parse(url))
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                ocultarErro()
                progress.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progress.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                if (request.isForMainFrame) {
                    mostrarErro(getString(R.string.error_message))
                }
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse,
            ) {
                if (request.isForMainFrame && errorResponse.statusCode >= 400) {
                    mostrarErro("O servidor respondeu com o código ${errorResponse.statusCode}.")
                }
            }
        }

        webView.setDownloadListener { url, _, _, _, _ ->
            abrirForaDoApp(Uri.parse(url))
        }
    }

    private fun temPermissaoDeLocalizacao(): Boolean =
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != LOCATION_PERMISSION_REQUEST) return

        val origin = pendingGeolocationOrigin
        val callback = pendingGeolocationCallback
        if (origin != null && callback != null) {
            callback.invoke(origin, temPermissaoDeLocalizacao(), false)
        }
        pendingGeolocationOrigin = null
        pendingGeolocationCallback = null
    }

    private inner class PrintBridge {
        @JavascriptInterface
        fun getVersion(): Int = 2

        @JavascriptInterface
        fun printHtml(html: String) {
            runOnUiThread {
                val printWebView = WebView(this@MainActivity)
                var enviadoParaImpressao = false

                printWebView.settings.apply {
                    javaScriptEnabled = false
                    allowFileAccess = false
                    allowContentAccess = false
                    defaultTextEncodingName = "UTF-8"
                }
                printWebView.setBackgroundColor(Color.WHITE)
                printWebView.visibility = View.INVISIBLE

                printWebView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String?) {
                        if (enviadoParaImpressao) return
                        enviadoParaImpressao = true

                        // Aguarda o documento invisível concluir o layout antes de
                        // entregar seu adaptador ao serviço de impressão do Android.
                        view.postDelayed({
                            if (isFinishing || isDestroyed) return@postDelayed

                            val printManager =
                                getSystemService(Context.PRINT_SERVICE) as PrintManager
                            val nomeDocumento =
                                "${getString(R.string.app_name)}-${System.currentTimeMillis()}"
                            val adapter = view.createPrintDocumentAdapter(nomeDocumento)
                            val atributos = PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build()

                            printManager.print(
                                getString(R.string.print_job_name),
                                adapter,
                                atributos,
                            )
                            Toast.makeText(
                                this@MainActivity,
                                "Documento pronto. Selecione Salvar como PDF.",
                                Toast.LENGTH_LONG,
                            ).show()
                        }, 250)
                    }
                }

                printWebViews.add(printWebView)
                root.addView(
                    printWebView,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    ),
                )
                printWebView.loadDataWithBaseURL(
                    getString(R.string.web_app_url),
                    html,
                    "text/html",
                    "UTF-8",
                    null,
                )
            }
        }
    }

    private fun carregarPaginaInicial() {
        val url = getString(R.string.web_app_url).trim()
        val uri = Uri.parse(url)
        val host = uri.host?.lowercase(Locale.ROOT)

        if (
            uri.scheme != "https" ||
            host.isNullOrBlank() ||
            host.contains("seu-projeto")
        ) {
            mostrarErro(getString(R.string.configuration_message))
            return
        }

        allowedHost = host
        ocultarErro()
        webView.loadUrl(uri.toString())
    }

    private fun tratarNavegacao(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        val host = uri.host?.lowercase(Locale.ROOT)

        if (scheme == "https" && host == allowedHost) {
            return false
        }

        if (scheme in setOf("https", "http", "mailto", "tel")) {
            abrirForaDoApp(uri)
        }

        return true
    }

    private fun abrirForaDoApp(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "Nenhum aplicativo disponível para abrir este link.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mostrarErro(mensagem: String) {
        progress.visibility = View.GONE
        webView.visibility = View.GONE
        errorMessage.text = mensagem
        errorPanel.visibility = View.VISIBLE
    }

    private fun ocultarErro() {
        errorPanel.visibility = View.GONE
        webView.visibility = View.VISIBLE
    }

    private fun navegarParaTras() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            finish()
        }
    }

    @Deprecated("Usado em aparelhos anteriores ao Android 13")
    override fun onBackPressed() {
        navegarParaTras()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.removeJavascriptInterface("PortalN2Android")
        webView.webChromeClient = null
        webView.webViewClient = WebViewClient()
        webView.destroy()
        printWebViews.forEach {
            root.removeView(it)
            it.destroy()
        }
        printWebViews.clear()
        super.onDestroy()
    }
}
