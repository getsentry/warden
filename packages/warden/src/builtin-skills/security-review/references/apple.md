# Apple Native Security Notes

Use this when reviewing Swift or Objective-C on iOS, iPadOS, visionOS, watchOS, or tvOS. This reference adapts the dedicated workflow-security prior art for the broad `security-review` skill; keep findings exploit-oriented, not style-oriented.

Load a topic file only when the change needs more depth than this page.

## Platform Entry Points

- main, @main, @UIApplicationMain, AppDelegate functions

- Custom URL scheme handlers, Universal Links, App Intents, Siri/Shortcuts, share sheet, and app extensions are potentially caller-controlled entry points. Another app or webpage can invoke them.

## High-Signal Patterns


| Pattern              | Vulnerable                                                                                                                                               | Safer                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Deep-link session    | `onOpenURL` / `application(_:open:)` applies `token` or `code` from the URL                                                                              | One-time server-validated code. Do not persist the raw URL.                            |
| Privileged deep link | Scheme or Universal Link transfers funds, changes email, or deletes data from query items                                                                | Allowlisted actions. Re-auth on the server for irreversible work.                      |
| Unencrypted secret   | Refresh token or private key in `UserDefaults`, a file, logs, or `UIPasteboard.general`, including after propagating through other variables or encoding | Keychain with a tight accessibility class. Do not log or paste secrets.                |
| Boolean local auth   | `evaluatePolicy` then read an ACL-less Keychain item or defaults token                                                                                   | Store the secret with `SecAccessControl` and read it with `SecItemCopyMatching`.       |
| Accept-any-cert      | `URLSession` / `WKNavigationDelegate` challenge handler calls `.useCredential` without `SecTrustEvaluateWithError`                                       | Omit the callback, or evaluate `serverTrust` and cancel on failure.                    |
| WebView bridge       | `WKScriptMessageHandler` returns a token or starts a payment; reply via `evaluateJavaScript("cb('\(secret)')")`                                          | Origin-check `frameInfo.securityOrigin`. Reply with `WKScriptMessageHandlerWithReply`. |
| Unsafe unarchive     | `NSKeyedUnarchiver.unarchiveObject(with:)` on scheme, pasteboard, or extension data                                                                      | `JSONDecoder` or `unarchivedObject(ofClass:from:)`.                                    |




## False-Positive Controls

- Missing certificate pinning, jailbreak detection, obfuscation, screenshot hiding, and keyboard-cache flags are not findings.
- `UserDefaults`, logs, and pasteboard matter only when the value is a session token, refresh token, password, private key, or some secret.
- `LAContext.evaluatePolicy` used only to show UI is fine when the secret fetch goes through Keychain access control.
- `WKWebView` loading a hard-coded first-party URL with no bridge and no attacker-controlled navigation is not a finding.
- `crypto` / `SecureEnclave` / `SecRandomCopyBytes` are suitable for security randomness; `Int.random` and `arc4random` are not when they mint a token.
- React Native, Flutter, KMP, and Capacitor are out of scope for this reference.

## Deeper Notes


| Open when the change is about...                                          | Read                          |
| ------------------------------------------------------------------------- | ----------------------------- |
| Schemes, Universal Links, App Intents, pasteboard, App Groups, extensions | `references/apple/ipc.md`     |
| `UserDefaults`, files, logs, backups, Keychain accessibility              | `references/apple/storage.md` |
| `LAContext` or biometric UI used as a gate                                | `references/apple/auth.md`    |
| Trust challenges or cleartext secret traffic                              | `references/apple/network.md` |
| `WKWebView` bridges, `evaluateJavaScript`, `UIWebView`                    | `references/apple/webview.md` |
| CryptoKit, CommonCrypto, hardcoded keys                                   | `references/apple/crypto.md`  |




## Minimal Examples

**Report: refresh token in unencrypted storage**

```swift
UserDefaults.standard.set(response.refreshToken, forKey: "refreshToken")
```

Encoding first (`base64`, JSON) does not make this safe.

**Report: biometric UI, unprotected secret**

```swift
let ok = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock")
if ok {
    API.setSession(UserDefaults.standard.string(forKey: "refreshToken")!)
}
```

Require: Keychain item with `SecAccessControl`. The prompt must be the system Keychain prompt.

**Do not report: Keychain-bound secret**

```swift
let access = SecAccessControlCreateWithFlags(
    nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .biometryCurrentSet, nil
)!
// SecItemAdd with kSecAttrAccessControl: access
// Later SecItemCopyMatching triggers the system prompt. No LAContext.
```

