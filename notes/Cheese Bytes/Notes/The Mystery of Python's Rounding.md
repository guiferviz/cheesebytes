Here is a snippet that tests your intuition about a very basic mathematical
operation. We often take `round()` for granted, but does it behave exactly how
you learned in school?

```python
numbers = [0.5, 1.5, 2.5, 3.5, 4.5]
results = [round(n) for n in numbers]

print(results)
```

**What does this print?**

1. `[1, 2, 3, 4, 5]` (Standard "round half up")
2. `[0, 1, 2, 3, 4]` (Floor/Truncate)
3. `[0, 2, 2, 4, 4]`
4. `[1, 2, 2, 4, 5]`

## The Solution

The output is:

```
[0, 2, 2, 4, 4]
```

## The Explanation

If you expected `[1, 2, 3, 4, 5]`, you are thinking of the classic rounding rule
taught in most schools: "always round 0.5 up".

However, Python 3 uses a strategy called **Bankers Rounding** (technically known
as _Round Half to Even_). The rule is simple but surprising:

1.  If the decimal part is anything other than `0.5`, it rounds to the nearest
    integer normally.
2.  If the decimal part is **exactly `0.5`**, it rounds to the **nearest even
    integer**.

This is why:

- `0.5` rounds down to `0` (0 is even).
- `1.5` rounds up to `2` (2 is even).
- `2.5` rounds down to `2` (2 is even).
- `3.5` rounds up to `4` (4 is even).

### Why does Python do this?

The standard "round half up" method introduces a systematic statistical bias. If
you process a large dataset, always rounding `0.5` upwards will slightly skew
your sums and averages higher than they should be.

Bankers rounding attempts to mitigate this bias. By rounding to the nearest even
number, the assumption is that (over a large set of random numbers) you will
round up half the time and down half the time, canceling out the error.

**The Catch:** This logic relies on your data being "messy" enough to land near
both even and odd. If all your numbers are between `1` and `2`, for example,
you'd still have a bias towards higher numbers because all `1.5` found in your
data will be rounded up to `2`.
