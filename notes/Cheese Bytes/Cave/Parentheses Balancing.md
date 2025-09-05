---
title: Parentheses Balancing
marimo-version: 0.13.15
---

Given an expression formed only with parentheses, return whether they are
balanced.

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

mo.md("\n".join(rows))
```
