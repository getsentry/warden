# Apple Crypto And Hardcoded Secrets

Open when reviewing CryptoKit, CommonCrypto, `SecKey`, hardcoded keys, or randomness used to protect secrets.

"Use CryptoKit" is not a finding. Report broken algorithms, hardcoded key material, or non-crypto RNG only when they protect a secret or auth decision.

## Attackers

Remote and same-device attackers who can read the app binary, a backup, or a ciphertext they were given. They cannot be assumed to have a debugger.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Hardcoded private key / AES key / HMAC secret | `SymmetricKey(data: Data(base64Encoded: "…")!)`, PEM in source, `SecKeyCreateWithData` on a bundled private key used for auth | Keychain / Secure Enclave generated keys. No long-lived private material in the repo. |
| Hardcoded bearer token | `let apiKey = "sk_live_…"` sent as auth | Server-side secret. Public client IDs are fine. |
| Broken cipher for a secret | `kCCAlgorithmDES`, `kCCAlgorithmAES` + `kCCOptionECBMode`, RC4, XOR "encryption" of a token | CryptoKit `AES.GCM` or `ChaChaPoly` with a Keychain key |
| Broken hash for a password / token | `Insecure.MD5` / `Insecure.SHA1` / `CC_MD5` of a password | System Keychain, or a real KDF (`CryptoKit` / `SecKey`) on the server |
| Predictable secret | `Int.random`, `drand48`, `arc4random` used as a session token or reset code | `SecureEnclave` / `SymmetricKey` / `SecRandomCopyBytes` |

## Report When

- Real private key, AES/HMAC key, or live API secret is in source and used for security.
- A token or password is "encrypted" with ECB, DES, RC4, XOR, or a hardcoded key, then stored or sent.
- A session identifier or reset code is generated with a non-crypto RNG and accepted as auth.

## Do Not Report

- `Insecure.MD5` / SHA1 for a non-security checksum or etag.
- `arc4random` for UI, jitter, or analytics.
- CommonCrypto AES-GCM/CBC with a Keychain key and a random IV, even if CryptoKit would be nicer.
- Missing Secure Enclave.
- Public client IDs, example keys, test fixtures, `sk_test_` confined to tests.
- Certificate pinning helpers.

## Trace

1. Is the output used as auth, a wrapping key, or stored next to a secret? If not, stop.
2. Where does the key material come from? Literal, bundled file, Keychain, server.
3. Name the algorithm and mode. ECB and DES on a secret are enough. CBC needs a fixed IV or hardcoded key to be worth reporting.
4. For RNG, show the value is later compared as a capability (token, code), not a display nonce.

## Minimal Examples

**Report: hardcoded AES key wrapping a token**

```swift
let key = SymmetricKey(data: Data(base64Encoded: "YWFhYWFhYWFhYWFhYWFhYQ==")!)
let box = try AES.GCM.seal(Data(refreshToken.utf8), using: key)
UserDefaults.standard.set(box.combined, forKey: "tok")
```

The key is in the binary. This is still an unencrypted secret for anyone who reads the app. Pair with `storage.md`.

**Report: ECB of a session blob**

```swift
CCCrypt(CCOperation(kCCEncrypt), CCAlgorithm(kCCAlgorithmAES), CCOptions(kCCOptionECBMode),
        keyBytes, kCCKeySizeAES128, nil, input, inputLen, out, outLen, &moved)
```

**Do not report: CryptoKit with a generated key**

```swift
let key = SymmetricKey(size: .bits256)
// persist via Keychain, then AES.GCM.seal
```

**Do not report: MD5 of a file for cache busting**

```swift
let digest = Insecure.MD5.hash(data: fileData)
```

## ObjC Leads

`CCCrypt`, `CC_MD5`, `SecKeyCreateWithData`, literal `NSString` keys, `arc4random` / `rand` used as tokens.
