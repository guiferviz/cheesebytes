A length-extension attack exploits how hash functions such as SHA-256 process a
message in blocks and carry an internal state from one block to the next. The
final digest is essentially the final value of that state.

Suppose a server creates a tag like this:

```text
SHA256(secret || message)
```

If an attacker knows both `message` and its full digest, they can use the digest
as the state from which SHA-256 should continue. By guessing the length of the
secret, they can reconstruct SHA-256's padding and append more data:

```text
message || padding || extra_data
```

They can then calculate a valid digest for:

```text
secret || message || padding || extra_data
```

without knowing the secret. The attack does not recover the secret or break
SHA-256; it abuses the construction around it.

# Why HMAC Is Safe

Hash-based Message Authentication Code (HMAC) uses two hashing layers:

```text
H((K xor opad) || H((K xor ipad) || message))
```

Continuing the inner hash is not enough because the attacker still cannot
produce the outer hash, which also depends on the secret key.

# When the Attack Applies

A classic length-extension attack normally requires the attacker to:

- know the message and its full digest;
- be able to append data to the message;
- guess the secret's length;
- submit the extended representation to a verifier that accepts it.

If the digest is never exposed and the system only reveals a small derived
value such as `digest % 6`, the attacker does not have the complete internal
state required to continue SHA-256. In that narrower case, classic length
extension is much less relevant, although `SHA256(secret || message)` should
still be replaced with HMAC when message authentication is the goal.
