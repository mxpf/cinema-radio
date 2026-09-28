import AppKit
import WebKit

@MainActor
final class RadioPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
    override func cancelOperation(_ sender: Any?) { orderOut(sender) }
}

@MainActor
final class RadioApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    private var statusItem: NSStatusItem!
    private var panel: RadioPanel!
    private var webView: WKWebView!
    private var isPlaying = false
    private var loaded = false
    private var activity: NSObjectProtocol?
    private let site = URL(string: "https://radio.maxpfennig.haus/")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "radio", accessibilityDescription: "Offscreen")
            button.image?.isTemplate = true
            button.toolTip = "Offscreen — click to open, right-click for options"
            button.target = self
            button.action = #selector(statusClicked)
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }
        let configuration = WKWebViewConfiguration()
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(self, name: "radioState")
        configuration.userContentController.addUserScript(WKUserScript(source: """
        const style = document.createElement('style');
        style.textContent = 'html,body{background:transparent!important}body{padding:26px 28px 30px!important;min-height:100vh!important}body::before,.scene::before,.page-links{display:none!important}';
        document.head.appendChild(style);
        const report = () => window.webkit.messageHandlers.radioState.postMessage({
          playing:document.body.classList.contains('playing'),
          title:document.getElementById('title-text')?.textContent || 'Offscreen',
          station:document.getElementById('station-name')?.textContent || ''
        });
        new MutationObserver(report).observe(document.body,{attributes:true,attributeFilter:['class']});
        const title = document.getElementById('title-text');
        if(title)new MutationObserver(report).observe(title,{childList:true,characterData:true,subtree:true});
        const station = document.getElementById('station-name');
        if(station)new MutationObserver(report).observe(station,{childList:true,characterData:true,subtree:true});
        report();
        """, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 540, height: 455), configuration: configuration)
        webView.navigationDelegate = self
        webView.underPageBackgroundColor = .clear
        // WKWebView's macOS backing must also stop painting an opaque surface.
        webView.setValue(false, forKey: "drawsBackground")
        webView.pageZoom = 0.62
        panel = RadioPanel(contentRect: webView.frame, styleMask: [.borderless], backing: .buffered, defer: false)
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false // The radio itself supplies the shaped shadow.
        panel.level = .popUpMenu
        panel.hidesOnDeactivate = true
        panel.isReleasedWhenClosed = false
        panel.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
        panel.contentView = webView
        panel.delegate = self
        webView.load(URLRequest(url: site))
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(wokeUp), name: NSWorkspace.didWakeNotification, object: nil)
    }

    @objc private func statusClicked() {
        if NSApp.currentEvent?.type == .rightMouseUp { showMenu(); return }
        if panel.isVisible { panel.orderOut(nil) } else { showRadio() }
    }
    @objc private func showRadio() {
        guard let button = statusItem.button, let menuWindow = button.window else { return }
        let anchor = menuWindow.convertToScreen(button.convert(button.bounds, to: nil))
        let screen = menuWindow.screen?.visibleFrame ?? NSScreen.main!.visibleFrame
        let x = min(max(anchor.midX - panel.frame.width / 2, screen.minX + 8), screen.maxX - panel.frame.width - 8)
        let y = max(screen.minY, anchor.minY - panel.frame.height)
        panel.setFrameOrigin(NSPoint(x: x, y: y))
        NSApp.activate(ignoringOtherApps: true)
        panel.makeKeyAndOrderFront(nil)
    }
    func windowDidResignKey(_ notification: Notification) { panel.orderOut(nil) }
    private func showMenu() {
        let menu = NSMenu()
        let actions: [(String, Selector, String)] = [
            ("Show Radio", #selector(showRadio), ""),
            (isPlaying ? "Power Off" : "Power On", #selector(togglePower), ""),
            ("Open Website", #selector(openWebsite), ""),
            ("Reload Radio", #selector(reloadRadio), ""),
            ("Quit Offscreen", #selector(quit), "q")
        ]
        for (title, action, key) in actions {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
            item.target = self
            if action == #selector(togglePower) { item.isEnabled = loaded }
            menu.addItem(item)
        }
        menu.autoenablesItems = false
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }
    @objc private func togglePower() { webView.evaluateJavaScript("document.getElementById('toggle')?.click()", completionHandler: nil) }
    @objc private func openWebsite() { NSWorkspace.shared.open(site) }
    @objc private func reloadRadio() { setPlaying(false); loaded = false; webView.load(URLRequest(url: site)) }
    @objc private func quit() { NSApp.terminate(nil) }
    @objc private func wokeUp() {
        // Returning from system sleep rejoins the shared station clock.
        webView.evaluateJavaScript("if(typeof tick==='function')tick()", completionHandler: nil)
    }
    private func setPlaying(_ value: Bool) {
        isPlaying = value
        statusItem.button?.contentTintColor = value ? .systemOrange : nil
        if value && activity == nil {
            activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiatedAllowingIdleSystemSleep], reason: "Offscreen playback")
        } else if !value, let current = activity {
            ProcessInfo.processInfo.endActivity(current); activity = nil
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == site.host,
              let state = message.body as? [String: Any] else { return }
        setPlaying(state["playing"] as? Bool ?? false)
        let title = state["title"] as? String ?? "Offscreen"
        let station = state["station"] as? String ?? ""
        statusItem.button?.toolTip = isPlaying ? "\(title) · \(station)" : "Offscreen — off"
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = webView.url?.host == site.host }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "https" && url.host == site.host { decisionHandler(.allow) }
        else {
            if navigationAction.navigationType == .linkActivated && ["https", "http"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        loaded = false
        statusItem.button?.toolTip = "Offscreen could not connect. Right-click → Reload Radio."
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { setPlaying(false); loaded = false; webView.reload() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
    func applicationWillTerminate(_ notification: Notification) {
        if let current = activity { ProcessInfo.processInfo.endActivity(current) }
    }
}

@main
struct CinemaRadioMain {
    @MainActor static func main() {
        let app = NSApplication.shared
        let delegate = RadioApp()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
