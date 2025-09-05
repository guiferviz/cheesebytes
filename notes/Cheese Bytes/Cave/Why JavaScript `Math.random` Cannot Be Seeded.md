`Math.random()` **cannot be seeded** because JavaScript **does not define how it should work internally**.

Each browser or JavaScript engine (like Chrome's V8 or Firefox's SpiderMonkey) is free to use its own algorithm. That means the results are not consistent or predictable. Even if you could change the seed, using the same seed in different browsers or engines would likely produce different numbers, because each one may use a different algorithm.

A **seed is still used**, but it comes from a high-entropy source like `/dev/urandom`. This seed is **automatically set at runtime**, e.g. when the page loads or the Node process starts.

While the seed itself is secure, remember that the generator behind `Math.random()` is not — see [[JavaScript `Math.random` Is Not Secure For Cryptography]] for details.

# Do You Need a Seed?

If you need:
- **Reproducibility** (e.g., simulations, games).
- **Control over the seed**.
- **Cross-platform consistency**.

Use a custom seeded PRNG like:
- [`seedrandom`](https://github.com/davidbau/seedrandom)
- Custom implementation of [[Mulberry32]], `xorshift32`, `xoshiro128`...