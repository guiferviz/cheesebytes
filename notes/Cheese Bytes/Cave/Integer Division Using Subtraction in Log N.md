Divide two positive integers without using division (`/`), multiplication (`*`), or modulus (`%`). Return the integer quotient (ignore the remainder).

# Related Article: Integer Division Using Subtraction

In [[Integer Division Using Subtraction]], we showed the **naive** approach, which runs in **O(N)** time. Being N the divisor. This method substract `divisor` one step at a time.

# Optimized Algorithm with Bit Shifts

We simulate the process of division by repeatedly subtracting the **largest multiple** of the divisor from the dividend. To speed this up, we use bit shifts to double the divisor until it is just smaller than the dividend, subtract it, and accumulate the result.

```python {.marimo}
import marimo as mo


code_editor = mo.ui.code_editor("""def divide(dividend: int, divisor: int) -> int:
    if divisor == 0:
        raise ZeroDivisionError

    quotient = 0
    while dividend >= divisor:
        temp_divisor = divisor
        multiple = 1
        while dividend >= (temp_divisor << 1):
            temp_divisor <<= 1
            multiple <<= 1
        dividend -= temp_divisor
        quotient += multiple
    return quotient

assert divide(10, 3) == 3
assert divide(100, 5) == 20
assert divide(7, 2) == 3""", show_copy_button=False, theme="dark")
code_editor
```

```python {.marimo}
import traceback


reverse = None
with mo.redirect_stderr(), mo.redirect_stdout():
    try:
        exec(code_editor.value)
    except Exception as e:
        print("Errors in your code:")
        traceback.print_exc()
```

## Complexity Analysis

- **Inner doubling loop:** each shift is a power-of‑2 jump, requiring **O(log N)** steps to exceed `dividend`.
- **Outer subtraction loop:** each iteration removes at least half of the current `dividend` in the worst case, yielding **O(log N)** total iterations.

Overall, the algorithm runs in **O(log N)** time.

# Other Multiplication Bases

The same idea works if you multiply by any constant instead of 2:  
A larger gives a smaller constant, but:

- **Small N**: Coarser jumps may require extra fine adjustments, sometimes increasing iterations.
- **Practical constraint**: The problem forbids `*`, so there is no native bit‑shift for multiplying by any k≠2.

# Relation to Exponential Search

This doubling pattern mirrors **exponential search**, where we rapidly expand by powers of 2 to locate a range, then binary-search within it. Here, we use shifts to find the largest feasible chunk before subtracting—combining exponential growth and subtraction in a logarithmic-time division.
