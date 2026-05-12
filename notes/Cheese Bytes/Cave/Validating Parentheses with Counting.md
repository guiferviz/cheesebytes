---
title: Validating Parentheses with Counting
noteType: "emmental-full"
---

Given an expression formed only with standard parentheses `(` and `)`, return
whether they are balanced.

This is a simplified version of the classic
[Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) problem.
Because we only have one type of parenthesis, we can solve this by simply
**counting** `balance`.

**The Logic:**

1. Start with `balance = 0`.
2. Iterate through the string:
   - For `(`, add 1.
   - For `)`, subtract 1.
3. If `balance` ever drops below 0, return `False` (too many closing
   parentheses).
4. Return `True` if `balance` is 0 at the end.

Try modifying the code below to test your own logic. Test cases are provided to
validate your implementation.

```python pyodide auto-run=once height=520 show-run-button=true
def is_balanced(expression: str):
    balance = 0
    for char in expression:
        if char == "(":
            balance += 1
        elif char == ")":
            balance -= 1
            if balance < 0:
                return False
    return balance == 0


def run_tests():  # FOLD
    test_cases = [
        ("", True),
        ("()", True),
        ("()()", True),
        ("(())", True),
        ("(()(()))", True),
        (")(", False),
        ("(()", False),
        ("())", False),
        ("(()))(", False),
        ("()(()())", True),
        ("((())(()))", True),
        ("(()(()(())))", True),
        ("(((((((((())))))))))", True),
        ("(((((((()", False),
        ("(()))))", False),
    ]

    failed = False
    print("Test results:\n")

    for s, expected in test_cases:
        try:
            actual = is_balanced(s)
        except Exception as error:
            actual = None
            print(f"🔴 {s!r} FAIL (error: {error})")
            failed = True
            continue

        if actual == expected:
            print(f"🟢 {s!r} PASS")
        else:
            print(f"🔴 {s!r} FAIL (expected {expected}, got {actual})")
            failed = True

    if failed:
        raise AssertionError("Some test cases failed")

    print("\nAll tests passed!")


run_tests()
```
