JWKS (JSON Web Key Set) is a public endpoint that exposes the public
cryptographic keys used to verify JWT signatures.

Example URL for Logto's JWKS endpoint: http://logto:3001/oidc/jwks A sample JWKS
response looks like this:

```json
{
  "keys": [
    {
      "kty": "EC",
      "use": "sig",
      "kid": "pmN4sVVvVB...",
      "alg": "ES384",
      "crv": "P-384",
      "x": "Bfgad_G-uavT...",
      "y": "N5IqY7uI_MSm..."
    }
  ]
}
```

It allows a system to validate tokens without sharing secrets, by fetching the
correct public key based on the `kid` (key ID) found in the JWT header.

Note that `keys` is an array, this makes key rotation possible and safe, since
new keys can be added without breaking existing clients.

When a backend caches JWKS keys, rotation is handled by keeping old keys valid
for a period of time while new keys are introduced. Tokens issued with the old
key continue to work until they expire, and new tokens are signed with the new
key. If a cached key is missing or outdated, the backend can refresh the JWKS
from the issuer.

In short: JWTs are signed, and JWKS tells you which keys are trusted to verify
those signatures.
