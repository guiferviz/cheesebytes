Even though `Math.random()` is seeded from a secure source like `/dev/urandom`, it is **not cryptographically secure**.

- The internal generator is **fast but predictable**.
- If enough outputs are observed, **future values can be guessed**.
- Never use it for passwords, tokens, or encryption keys.

Use this instead for secure randomness:

```js
window.crypto.getRandomValues()
```

This uses a **CSPRNG** (Cryptographically Secure Pseudo-Random Number Generator) and is safe for security-sensitive use.