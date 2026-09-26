import AppKit
import WebKit

@MainActor
final class RadioApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var statusItem: NSStatusItem!
    private let popover = NSPopover()
    private var webView: WKWebView!
    private var isPlaying = false
    private var loaded = false
    private var activity: NSObjectProtocol?
    private let site = URL(string: "https://radio.maxpfennig.haus/")!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "radio", accessibilityDescription: "Cinema Radio")
            button.image?.isTemplate = true
            button.toolTip = "Cinema Radio — click to open, right-click for options"
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
        style.textContent = 'body{padding:26px 28px 30px!important;min-height:100vh!important}.page-links{display:none!important}';
        document.head.appendChild(style);
        const report = () => window.webkit.messageHandlers.radioState.postMessage({
          playing:document.body.classList.contains('playing'),
          title:document.getElementById('title-text')?.textContent || 'Cinema Radio',
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
        webView.pageZoom = 0.62
        let controller = NSViewController()
        controller.view = webView
        popover.contentViewController = controller
        popover.contentSize = NSSize(width: 540, height: 455)
        popover.behavior = .transient
        popover.animates = true
        webView.load(URLRequest(url: site))
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(wokeUp), name: NSWorkspace.didWakeNotification, object: nil)
    }

    @objc private func statusClicked() {
        if NSApp.currentEvent?.type == .rightMouseUp { showMenu(); return }
        if popover.isShown { popover.performClose(nil) } else { showRadio() }
    }
    @objc private func showRadio() {
        guard let button = statusItem.button else { return }
        NSApp.activate(ignoringOtherApps: true)
        popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        popover.contentViewController?.view.window?.makeKey()
    }
    private func showMenu() {
        let menu = NSMenu()
        let actions: [(String, Selector, String)] = [
            ("Show Radio", #selector(showRadio), ""),
            (isPlaying ? "Power Off" : "Power On", #selector(togglePower), ""),
            ("Open Website", #selector(openWebsite), ""),
            ("Reload Radio", #selector(reloadRadio), ""),
            ("Quit Cinema Radio", #selector(quit), "q")
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
            activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiatedAllowingIdleSystemSleep], reason: "Cinema Radio playback")
        } else if !value, let current = activity {
            ProcessInfo.processInfo.endActivity(current); activity = nil
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == site.host,
              let state = message.body as? [String: Any] else { return }
        setPlaying(state["playing"] as? Bool ?? false)
        let title = state["title"] as? String ?? "Cinema Radio"
        let station = state["station"] as? String ?? ""
        statusItem.button?.toolTip = isPlaying ? "\(title) · \(station)" : "Cinema Radio — off"
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
        statusItem.button?.toolTip = "Cinema Radio could not connect. Right-click → Reload Radio."
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
