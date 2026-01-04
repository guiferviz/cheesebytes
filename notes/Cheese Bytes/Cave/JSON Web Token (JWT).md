A JWT (JSON Web Token) is just a long string made of three parts, joined
together with dots. JWT parts:

```
header.payload.signature
```

Each part has a very specific role.

# 1. Header

The header is a small JSON object that describes the token itself: which
algorithm was used to sign it, and what kind of token it is.

It is plain text JSON, then encoded using Base64URL, a variation of Base64
encoding that is URL-safe.

Decoding Base64URL is straightforward and can be done by anyone. This means,
anyone can read it.

# 2. Payload

The payload is another JSON object. This is where the token says things like:

- who the user is
- who issued the token
- when it expires
- which tenant or organization it belongs to

Again: plain JSON, encoded in Base64URL. Anyone can read it.

# 3. Signature

The signature is the important part.

It is created by taking:

- the encoded header
- the encoded payload
- a secret (or a private key)

and running them through a cryptographic algorithm.

The result proves that:

- the token was created by someone who knows the secret
- the header and payload have not been modified

The signature is also encoded in Base64URL.

# The key idea

JWTs are **not encrypted**, they are **encoded and signed**.

Anyone can decode a JWT and see its contents, for example, using:
https://jwt.io/.

JWTs (JSON Web Tokens) are designed to be
[[Tamper-Evident Technology|tamper-evident]], meaning that if someone modifies
the token in any way, the signature becomes invalid, and the token is considered
compromised.
