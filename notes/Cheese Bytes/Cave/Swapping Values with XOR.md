The XOR swap algorithm uses three [[XOR (exclusive OR) operation]]s to swap the
values of two variables, `a` and `b`. Here's the step-by-step process:

1. **Initial Values**:
   - Let `a` and `b` be the two variables you want to swap.
   - Example: `a = 5` (binary `0101`), `b = 3` (binary `0011`).
2. **First XOR Operation**:
   - `a = a ^ b`
   - This step stores the XOR of `a` and `b` in `a`.
   - Example: `a = 5 ^ 3` results in `a = 6` (binary `0110`).
3. **Second XOR Operation**:
   - `b = a ^ b`
   - This step updates `b` to the original value of `a`.
   - Example: `b = 6 ^ 3` results in `b = 5` (binary `0101`).
4. **Third XOR Operation**:
   - `a = a ^ b`
   - This step updates `a` to the original value of `b`.
   - Example: `a = 6 ^ 5` results in `a = 3` (binary `0011`).

After these three operations, the values of `a` and `b` are swapped.

# Code Example

```pyodide auto-run=once height=200 show-run-button=true
def xor_swap(a, b):
    print(f"Before swap: a = {a}, b = {b}")
    a = a ^ b
    b = a ^ b
    a = a ^ b
    print(f"After swap: a = {a}, b = {b}")

xor_swap(5, 3)
```
