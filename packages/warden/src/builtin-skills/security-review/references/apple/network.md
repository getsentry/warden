# Apple Network Trust

Open when reviewing `URLSession` trust challenges, `WKNavigationDelegate` auth challenges, cleartext HTTP of secrets, or code that disables ATS / server trust.

ATS already encrypts `URLSession` traffic. Missing pinning is not a finding. Report only when the app turns off system trust or sends secrets in cleartext.

## Attackers

Remote MITM on the local network, hostile Wi-Fi, or a compromised captive portal.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Accept any cert | `urlSession(_:didReceive:)` / `webView(_:didReceive:)` calls `completionHandler(.useCredential, …)` without `SecTrustEvaluateWithError` | Do not implement the callback. Or evaluate `serverTrust` and cancel on failure. |
| Trust always true | `completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))` for every challenge | Same as above. |
| ATS kill-switch used by secret traffic | Code builds `http://` URLs for login/API, or uses `Network.framework` / BSD sockets to skip ATS, and the body or headers carry tokens | `https://` via `URLSession`. No custom trust. |
| TLS version forced down | `tlsMinimumSupportedProtocolVersion = .TLSv10` on a session that carries secrets | Leave the system default. |

## Report When

- A `URLSessionDelegate` or `WKNavigationDelegate` authentication-challenge handler accepts server trust without a successful `SecTrustEvaluateWithError`.
- Login, token refresh, or other secret-bearing requests are sent over `http://`, or over a socket API that bypasses ATS.
- Production code installs a custom trust that always succeeds

## Do Not Report

- Missing certificate pinning, missing `NSPinnedDomains`, or "ATS pinning not configured".
- Presence of `urlSession(_:didReceive:)` that correctly calls `SecTrustEvaluateWithError` and cancels on failure.
- ATS exceptions for unrelated hosts with no secrets (analytics, images) unless trust evaluation is also disabled.
- `NSAllowsArbitraryLoads` in a plist with no secret-bearing cleartext path in the changed Swift/ObjC.
- Third-party SDK traffic you cannot trace to a secret.
- Development-only trust overrides that cannot ship in the reviewed target.

## Trace

1. Find challenge handlers and `http://` URL builders.
2. For challenges: does every path either cancel or call `SecTrustEvaluateWithError` and check the result?
3. For cleartext: does this request include a token, password, or PII that enables account takeover?
4. Confirm ATS cannot save the path (`NWConnection`, `CFStream`, raw sockets ignore ATS).

## Minimal Examples

**Report: accept any server certificate**

```swift
func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
}
```

**Report: login over HTTP**

```swift
var request = URLRequest(url: URL(string: "http://api.example.com/login")!)
request.httpBody = try JSONEncoder().encode(creds)
```

**Do not report: default URLSession HTTPS**

```swift
let (data, _) = try await URLSession.shared.data(from: URL(string: "https://api.example.com/me")!)
```

**Do not report: evaluate then cancel**

```swift
func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let trust = challenge.protectionSpace.serverTrust,
          SecTrustEvaluateWithError(trust, nil) else {
        completionHandler(.cancelAuthenticationChallenge, nil)
        return
    }
    completionHandler(.useCredential, URLCredential(trust: trust))
}
```
