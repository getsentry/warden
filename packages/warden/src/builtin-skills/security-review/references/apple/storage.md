# Apple Storage And Secrets

Open when reviewing `UserDefaults`, files, Core Data, Realm, logs, backup flags, or Keychain accessibility.

The sandbox is not a secrecy boundary against backups. `UserDefaults` is a plist in the sandbox and is included in iTunes / Finder / iCloud backups. Encoding is not encryption.

## Attackers

| Sink | Who can read it |
|------|-----------------|
| `UserDefaults.standard` | Backup. Any code in the app. Not other apps. |
| Files in Documents / Library | Backup unless `isExcludedFromBackup` is actually set on that file. |
| Logs (`print`, `NSLog`, `os.Logger`, Crashlytics) | Device logs, attached Mac, some MDM, crash reporters. |
| Keychain item without `ThisDeviceOnly` | Migrates in encrypted backups. |
| App Group defaults/files | Every app/extension in the group, plus backup. |

Physical theft of an unlocked phone is out of scope. Backup of a secret is in scope.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Token in defaults | `defaults.set(refreshToken, forKey:)` | Keychain, `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` or stricter |
| Encoded secret | `defaults.set(token.data(using: .utf8)!.base64EncodedString(), forKey:)` | Same as plaintext. Encoding is not a control. |
| Secret in a file | `try token.write(to: documents/"session.json")` | Keychain, or file protection + exclude from backup **and** still prefer Keychain for tokens |
| Secret in logs | `logger.info("auth \(response)")` where response contains a token | Log a request ID, never the token |
| Weak Keychain ACL | `kSecAttrAccessibleAlways`, `kSecAttrAccessibleAlwaysThisDeviceOnly` | `WhenUnlockedThisDeviceOnly` / `AfterFirstUnlockThisDeviceOnly` plus access control if the item is a long-lived secret |
| Shared suite | `UserDefaults(suiteName: appGroup)` stores a token | Keychain access group, or do not share |

## Report When

- A session token, refresh token, password, private key, or API secret is written to `UserDefaults`, a sandbox file, Core Data, or a log sink.
- The same secret is written after `base64`, hex, JSON, or plist encoding.
- A Keychain item holding a secret uses `kSecAttrAccessibleAlways` / `AlwaysThisDeviceOnly`.
- A secret is written to an App Group container. Pair with `ipc.md` if another target can read it.

## Do Not Report

- `UserDefaults` for names, themes, non-secret IDs, public client IDs, feature flags.
- `print` / `os.log` of non-secrets, view lifecycle, or redacted placeholders.
- Missing `isExcludedFromBackup` on non-secret files.
- Missing Data Protection class on non-secret files.
- Keychain use without biometrics. That is `auth.md` only if `LAContext` is the real gate.
- "Should have used Keychain" for data that is not a secret.

## Trace

1. Identify the value. Prove it is a secret (name, type, where it is later sent as `Authorization`, used as a key, or unlocks an account).
2. Follow assignments, wrappers, Codable models, and "secure storage" helpers. A helper named `SecureStore` that writes defaults still counts.
3. Name the sink API and whether the value is encoded first.
4. For files, check backup exclusion only as extra impact, not as the bug. The bug is storing the secret outside Keychain.
5. For logs, show the interpolated value includes the secret, not just an object description that might.

## Minimal Examples

**Report: refresh token in UserDefaults**

```swift
UserDefaults.standard.set(response.refreshToken, forKey: "refreshToken")
```

**Report: encoded secret is still a secret**

```swift
let blob = try JSONEncoder().encode(tokens) // includes refreshToken
UserDefaults.standard.set(blob.base64EncodedString(), forKey: "session")
```

**Report: token logged**

```swift
os_log("login %{public}@", log: .default, type: .info, response.accessToken)
```

**Do not report: non-secret defaults**

```swift
UserDefaults.standard.set(user.displayName, forKey: "displayName")
```

**Do not report: Keychain store of a token**

```swift
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "refresh",
    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
    kSecValueData as String: Data(token.utf8),
]
SecItemAdd(query as CFDictionary, nil)
```

## ObjC Leads

`NSUserDefaults`, `writeToFile:`, `NSFileManager`, `NSLog`, `os_log`, `SecItemAdd` with `kSecAttrAccessibleAlways`.
