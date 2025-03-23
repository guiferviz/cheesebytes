---
aliases:
  - Chained Assignments In Python
---
A **chained assignment** in [[Python]] assigns the same value to multiple variables in a single statement. For example:

```python
a = b = c = value
```

In chained assignments, the rightmost expression is evaluated first, meaning it is fully resolved before any assignments are made to the variables on the left.

Consider this example:

```python
a = b = []
```

Here, the rightmost expression `[]` is evaluated first, resulting in an empty list. This list is then assigned to both `a` and `b`. In the [Python documentation on assignments](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements), `a` and `b` are referred to as _targets_. The assignment to these targets occurs from left to right, so `a` is assigned first, followed by `b`. This order is crucial in some cases, especially when reusing the same variable, as it can affect the outcome of your code. In this example, since we are merely creating new variables, the order is not significant. However, for an example where order matters, refer to [[A List That Contains Itself]].

The following code is equivalent to the chained assignment `a = b = []`:

```python
_rightmost_expr = []
a = _rightmost_expr
b = _rightmost_expr
```

Introducing the `_rightmost_expr` variable is essential to avoid creating two separate lists:

```python
a = []
b = []
assert a is not b
b.append(1)
assert a == []
```

Conversely, with the `_rightmost_expr` or with a chained assignment:

```python
a = b = []
assert a is b
b.append(1)
assert a == [1]
```