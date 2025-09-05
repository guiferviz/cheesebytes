---
aliases:
  - Python Non-Deterministic Hash
---
[[Python]]'s `hash()` function can return different values for the same input in different sessions. For example:

```sh
$ python -c "print(hash('hi'))"
5037238841261226463
$ python -c "print(hash('hi'))"
4385354407237833037
```

This is by design, to enhance security and prevent certain types of collision attacks. You can control this behavior by setting the `PYTHONHASHSEED` environment variable. If you set `PYTHONHASHSEED` to '0', Python will use the same seed value every time it starts up, and the `hash()` function will return consistent values across sessions. However, this is generally not recommended, as it reduces the security of the hash function.

If you want to hash arbitrary objects deterministically, you can use the `hashlib` standard module.