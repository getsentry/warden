# Apple Local Authentication

Open when reviewing `LocalAuthentication`, `LAContext`, or biometric UI used as a gate.

`LAContext.evaluatePolicy` asks the system whether Face ID / Touch ID / passcode succeeded and returns a bool to a developer-controlled reply block. That is not authorization. The Secure Enclave only gates a secret when the item is stored with `SecAccessControl` and read via `SecItemCopyMatching`.

A hook that flips the `evaluatePolicy` reply to `true` therefore unlocks any path that only checks that bool. It does not unlock Keychain items protected with `biometryCurrentSet`, `biometryAny`, or `userPresence`.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Boolean gate | `evaluatePolicy` then reveal a secret, set a session, or call a privileged API | Store the secret with `SecAccessControl`. Read it with `SecItemCopyMatching`. No separate `evaluatePolicy`. |
| ACL-less Keychain | `evaluatePolicy` then `SecItemCopyMatching` without `kSecAttrAccessControl` | Add the item with `SecAccessControlCreateWithFlags` and `.biometryCurrentSet` or `.userPresence`. |
| UI lock only | Lock screen dismissed on LA success; token stays in `UserDefaults` or memory | Drop in-memory secrets on lock. Next use is a Keychain read that triggers the system prompt. |

Optional: pass an `LAContext` as `kSecUseAuthenticationContext` to customize the Keychain prompt. That is still Keychain-gated, not a boolean gate.

## Report When

- `evaluatePolicy` is the only check before a privileged action or before reading a token that is already in memory, `UserDefaults`, or an ACL-less Keychain item.

## Do Not Report

- `evaluatePolicy` used only to show UI, with the secret fetch going through `SecItemCopyMatching` + access control.
- Passcode fallback (`.deviceOwnerAuthentication` / `.userPresence`) when the Keychain item is access-controlled.
- Missing Face ID usage strings.
- `touchIDAuthenticationAllowableReuseDuration` on a context used with Keychain.

## Trace

1. Find `evaluatePolicy`.
2. On success, name the secret or privileged call.
3. If the secret is in Keychain, check the add/update query for `kSecAttrAccessControl`.
4. Report only if that ACL is missing and the secret or action is already available to the process.

## Minimal Examples

**Report: boolean unlocks a stored token**

```swift
let ok = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock")
if ok {
    API.setSession(UserDefaults.standard.string(forKey: "refreshToken")!)
}
```

**Report: Keychain read after a separate LAContext check**

```swift
if try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock") {
    SecItemCopyMatching([
        kSecClass: kSecClassGenericPassword,
        kSecAttrAccount: "refresh",
        kSecReturnData: true,
    ] as CFDictionary, &item)
}
```

No `kSecAttrAccessControl`. The prompt is optional.

**Do not report: Keychain-bound secret**

```swift
let access = SecAccessControlCreateWithFlags(
    nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, nil
)!
// SecItemAdd with kSecAttrAccessControl: access
// SecItemCopyMatching presents the system prompt and returns the item only on success.
```

## ObjC Leads

`-[LAContext evaluatePolicy:localizedReason:reply:]`, `SecAccessControlCreateWithFlags`, `kSecAttrAccessControl`, `kSecUseAuthenticationContext`.
