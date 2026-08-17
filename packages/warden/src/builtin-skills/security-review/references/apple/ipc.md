# Apple IPC And Entry Points

Open when reviewing custom URL schemes, Universal Links, App Intents, pasteboard, App Groups, extensions, or share/Handoff entry points.

Any other app or webpage can invoke a registered custom scheme. Universal Links are origin-bound to an associated domain, but the URL parameters are still attacker-controlled. Treat both as untrusted input.

## Attackers

| Source | Trust |
|--------|--------|
| `myapp://…` from Safari, Notes, another app, QR, push | Untrusted. Scheme is not an identity. |
| `https://app.example.com/…` Universal Link | Host is associated, path/query are attacker-controlled. |
| App Intent / Siri / Shortcuts / Spotlight | Untrusted caller. Same checks as the in-app action. |
| `UIPasteboard.general` | Other apps can plant or, on older iOS, read. |
| App Group container / `UserDefaults(suiteName:)` | Every app and extension in the group. |
| App extension (`NSExtension`) | Host app may be hostile. Validate every payload. |

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Privileged scheme action | `onOpenURL` / `application(_:open:options:)` transfers money, changes email, applies a token, or deletes data from query items | Allowlisted actions. Server re-auth for irreversible work. Ignore unknown hosts/paths. |
| Token in a scheme | `myapp://auth?token=` or `myapp://reset?code=` consumed as a session | One-time server-validated code. Prefer Universal Links for auth redirects. Never persist the raw URL. |
| Unvalidated file/url param | Scheme/link path opens `WKWebView`, `Data(contentsOf:)`, or a filesystem path | Exact allowlist of hosts or resource IDs. No `..`. No `file:` unless you built it. |
| Missing source check on an internal scheme | Internal-only action accepted from any caller | Same-team `sourceApplication` allowlist, or do not use a custom scheme for internal IPC |
| App Intent side effect | `@AppIntent` performs the same privileged mutation as an in-app button with no auth re-check | Re-run the same authorization as the UI path. Do not put secrets in intent parameters or results. |
| General pasteboard secret | `UIPasteboard.general.string = refreshToken` | Do not write secrets. If the user copies, that is their action, not a finding. |
| App Group secret | Token in `UserDefaults(suiteName:)` or a file under `containerURL(forSecurityApplicationGroupIdentifier:)` | Keychain with an explicit access group, or do not share the secret. |
| Unsafe unarchive of IPC | `NSKeyedUnarchiver.unarchiveObject(with: urlPayload)` / `decodeObject(forKey:)` on scheme, pasteboard, or extension data | `JSONDecoder` or `unarchivedObject(ofClass:from:)`. Never decode arbitrary classes. |

## Report When

- A custom scheme or Universal Link handler performs a privileged or irreversible action, or consumes auth material, without validating path/query against an allowlist.
- Auth tokens or codes arrive in a scheme/link and are stored or used as a session without single-use server validation.
- An App Intent / extension entry point mutates sensitive state or returns a secret, and the in-app path would have required a stronger check.
- A secret is written to `UIPasteboard.general` by app code.
- A secret is written to an App Group container that another target in the repo can read.
- Attacker-controlled bytes are deserialized with an open `NSKeyedUnarchiver`.

## Do Not Report

- A scheme that only navigates to a public screen (`myapp://settings`) with no sensitive side effect.
- Universal Links that open a product page after parsing an ID, with the server enforcing authz.
- Missing `sourceApplication` on a documented public deep link that cannot do harm.
- User-initiated copy of a password field.
- App Groups used for non-secrets (widgets, shared theme).
- `NSKeyedUnarchiver` of bundled or otherwise trusted constants.

## Trace

1. Find the handler: `application(_:open:options:)`, `scene(_:openURLContexts:)`, `.onOpenURL`, `continue userActivity`, `AppIntent.perform()`.
2. List every query/path value that reaches a sink.
3. Name the sink: WebView load, token store, payment call, file I/O, unarchive, privileged API.
4. Confirm there is no allowlist, server check, or same-team source check on that path.
5. State who can invoke it (any app, any webpage, Shortcuts).

## Minimal Examples

**Report: scheme applies a session token**

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    let token = URLComponents(url: url, resolvingAgainstBaseURL: false)?
        .queryItems?.first(where: { $0.name == "token" })?.value
    Keychain.save(token: token!)
    return true
}
```

Any app or page can set the user's session.

**Report: scheme drives a privileged action**

```swift
.onOpenURL { url in
    if url.host == "transfer" {
        let amount = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "amount" })?.value
        Payments.send(amount: Decimal(string: amount!)!)
    }
}
```

**Do not report: navigation only**

```swift
.onOpenURL { url in
    guard url.host == "product", let id = url.pathItems.first, id.allSatisfy(\.isNumber) else { return }
    router.openProduct(id: id)
}
```

**Report: secret on the general pasteboard**

```swift
UIPasteboard.general.string = session.refreshToken
```

## ObjC Leads

`application:openURL:options:`, `application:continueUserActivity:restorationHandler:`, `UIPasteboard.generalPasteboard`, `NSUserDefaults` with a suite name, `NSKeyedUnarchiver`.
