# Apple WebViews

Open when reviewing `WKWebView`, `WKScriptMessageHandler`, `evaluateJavaScript`, `WKUserScript`, or `UIWebView`.

Not applicable on watchOS. JavaScript in the page can call every `WKScriptMessageHandler` registered on that WebView. Default `evaluateJavaScript` runs in the page world and can leak values to page JS.

## Attackers

| Source | Trust |
|--------|--------|
| Remote URL, or a URL taken from a scheme/link | Untrusted page + JS |
| HTML string built from user / scheme / network input | Injection → JS |
| Trusted first-party page, but handler also exposed to iframes / navigations | Origin confusion |
| `UIWebView` + `JSExport` / `JSContext` | Always-on JS, weaker isolation |

Need a path for attacker JS: injected HTML, attacker URL, or a bridge that is still attached after navigation to an untrusted origin.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Privileged bridge | `WKScriptMessageHandler` returns tokens, starts payments, or opens `file://` without origin checks | Minimize methods. Validate `message.frameInfo.securityOrigin`. Refuse unexpected hosts. |
| Reply via `evaluateJavaScript` | Handler does `evaluateJavaScript("cb('\(token)')")` | `WKScriptMessageHandlerWithReply`. Never interpolate secrets into JS. |
| Untrusted load | `webView.load(URLRequest(url: userURL))` or `loadHTMLString(userHTML, …)` with JS on | Allowlisted https hosts, or disable JS (`WKPreferences.isJavaScriptEnabled = false` where possible) and no bridge. |
| Local file + JS | `loadFileURL` / `allowFileAccessFromFileURLs` with attacker-influenced HTML | Do not combine file access and untrusted HTML. Prefer `QLPreviewController` for files. |
| `UIWebView` bridge | `JSContext` / `JSExport` on `UIWebView` | `WKWebView` + restricted handlers. Report `UIWebView` only with a bridge or untrusted content. |
| Sensitive write into DOM | `evaluateJavaScript("document.body.innerHTML = '\(secret)'")` in `.page` | Native UI overlay, or a non-page `WKContentWorld` that still must not share the secret with page JS. |

## Report When

- A script message handler performs a privileged action or returns a secret, and attacker JS can reach that WebView.
- The handler replies by injecting JS that contains a secret.
- Attacker-controlled HTML or URL is loaded into a WebView that has a privileged bridge or file access.
- `UIWebView` loads untrusted content or exposes native objects.

## Do Not Report

- `WKWebView` loading a hard-coded first-party URL with no bridge and no attacker-controlled navigation.
- JavaScript enabled on a trusted page with no sensitive native API.
- Missing `WKContentWorld` isolation for a non-secret DOM read.
- `UIWebView` with no untrusted input and no bridge (deprecation only).
- `hasOnlySecureContent` not checked (informational API).

## Trace

1. How does content get into the WebView? Hard-coded URL, scheme param, HTML string, file.
2. Which handlers are registered, and on which content world?
3. What does each handler do with `message.body`? What does it return?
4. Can the WebView navigate away from the trusted origin while the handler stays registered?
5. Pair with `ipc.md` if a scheme/link chooses the loaded URL.

## Minimal Examples

**Report: bridge returns a session token**

```swift
func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
    let token = Keychain.refreshToken
    message.webView?.evaluateJavaScript("window.onToken('\(token)')")
}
```

Any script in the page can `postMessage` and then exfiltrate `onToken`.

**Report: untrusted URL + privileged handler**

```swift
ucc.add(self, name: "native")
webView.load(URLRequest(url: incomingDeepLink)) // attacker URL

func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
    Payments.send(amount: message.body as! String)
}
```

**Do not report: first-party page, no secrets**

```swift
webView.load(URLRequest(url: URL(string: "https://help.example.com/faq")!))
```

**Safer reply shape (still require origin + no secret unless needed)**

```swift
func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                           replyHandler: @escaping (Any?, String?) -> Void) {
    guard message.frameInfo.securityOrigin.host == "app.example.com" else {
        replyHandler(nil, "denied")
        return
    }
    replyHandler(["ok": true], nil)
}
```

## ObjC Leads

`WKWebView`, `addScriptMessageHandler:name:`, `evaluateJavaScript:completionHandler:`, `UIWebView`, `JSContext`, `JSExport`.
