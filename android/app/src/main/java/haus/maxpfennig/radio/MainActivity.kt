@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package haus.maxpfennig.radio

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.media3.session.*
import androidx.webkit.WebViewAssetLoader
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject
import java.io.ByteArrayInputStream

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var controller: MediaController? = null
    private var connection: ListenableFuture<MediaController>? = null
    private var destroyed = false
    private var pageReady = false
    private val executor by lazy { ContextCompat.getMainExecutor(this) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = FrameLayout(this)
        root.setBackgroundColor(0xff252b29.toInt())
        ViewCompat.setOnApplyWindowInsetsListener(root) { view,insets ->
            val edges=insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(edges.left,edges.top,edges.right,edges.bottom);insets
        }
        web=WebView(this)
        root.addView(web,FrameLayout.LayoutParams(-1,-1));setContentView(root)
        val loader=WebViewAssetLoader.Builder().addPathHandler("/assets/",WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.settings.apply {
            javaScriptEnabled=true;domStorageEnabled=true;allowFileAccess=false;allowContentAccess=false
            mixedContentMode=WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture=true;setGeolocationEnabled(false)
        }
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0)
        web.addJavascriptInterface(Bridge(),"RadioNative")
        web.webViewClient=object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView,request: WebResourceRequest): WebResourceResponse {
                // There are no remote frames/scripts/pages with access to the bridge.
                return loader.shouldInterceptRequest(request.url) ?: WebResourceResponse("text/plain","UTF-8",403,"Blocked",emptyMap(),ByteArrayInputStream(ByteArray(0)))
            }
            override fun shouldOverrideUrlLoading(view: WebView,request: WebResourceRequest): Boolean {
                if (request.url.toString()==PAGE) return false
                if (request.isForMainFrame && request.hasGesture() && request.url.scheme=="https") {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW,request.url)) }
                }
                return true
            }
            override fun onPageFinished(view: WebView,url: String) { pageReady=url==PAGE; if(pageReady) send("{\"action\":\"state\"}") }
        }
        web.loadUrl(PAGE)
        connection=MediaController.Builder(this,SessionToken(this,ComponentName(this,RadioService::class.java))).buildAsync().also { future ->
            future.addListener({
                if (!destroyed) runCatching { controller=future.get();send("{\"action\":\"state\"}") }
                    .onFailure { web.evaluateJavascript("document.getElementById('status').textContent='Could not connect to the player. Reopen the app.'",null) }
            },executor)
        }
    }
    inner class Bridge {
        @JavascriptInterface fun postMessage(message: String) {
            if (message.length>512) return
            runOnUiThread { if(!destroyed && pageReady && web.url==PAGE) send(message) }
        }
    }
    private fun send(message: String) {
        val player=controller ?: return
        val future=player.sendCustomCommand(SessionCommand(RadioService.COMMAND,Bundle.EMPTY),Bundle().apply { putString("message",message) })
        future.addListener({
            if (!destroyed && pageReady) runCatching {
                val data=future.get().extras.getString("state") ?: return@runCatching
                val safe=JSONObject(data).toString()
                web.evaluateJavascript("window.renderNativeRadio && window.renderNativeRadio($safe)",null)
            }
        },executor)
    }
    override fun onResume() { super.onResume(); if(::web.isInitialized) web.onResume() }
    override fun onPause() { if(::web.isInitialized) web.onPause(); super.onPause() }
    override fun onDestroy() {
        destroyed=true;connection?.let { MediaController.releaseFuture(it) }
        web.removeJavascriptInterface("RadioNative");web.destroy();super.onDestroy()
    }
    companion object { private const val PAGE="https://appassets.androidplatform.net/assets/index.html" }
}
