---
title: Validating Parentheses with Counting
marimo-version: 0.13.15
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

Try modifying the code below to test your own logic. Test cases are provided and
automatically run to validate your solution.

```python {.marimo}
import marimo as mo

is_balanced_code_editor = mo.ui.code_editor("""def is_balanced(expression: str):
    balance = 0
    for char in expression:
        if char == "(":
            balance += 1
        elif char == ")":
            balance -= 1
            if balance < 0:
                return False
    return balance == 0""", theme="dark")
is_balanced_code_editor
```

```python {.marimo}
import traceback

is_balanced = None
reverse = None
with mo.redirect_stderr(), mo.redirect_stdout():
    try:
        exec(is_balanced_code_editor.value)
    except Exception as e:
        print("Errors in your code:")
        traceback.print_exc()
```

```python {.marimo}
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

rows = [
    "| Input | Expected | Actual | Result |",
    "|-------|----------|--------|--------|"
]

for s, expected in test_cases:
    error = None
    actual = None
    try:
        actual = is_balanced(s)
    except Exception as e:
        error = e
    result = "✅" if actual == expected else "❌" if not error else f"💥 {str(error)}"
    rows.append(f"| `{s}` | `{expected}` | `{actual}` | {result} |")

mo.md(
    f"""
    Test Results:

    {"\n".join(rows)}
    """
)
```
