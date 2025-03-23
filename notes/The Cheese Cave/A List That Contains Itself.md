I have been writing recently about [[Having Fun With Python Chained Assignments]], and it turns out there is a well-known variation of a chained assignments puzzle. In this [[Decode The Code]], I am going to show a surprising way of creating a list that contains itself. It is always fun to work with self-referencing!

```python
a = a[0] = [0]
print(a)  # Prints: [[...]]
assert a != [[...]]
assert a == [a]
assert a is a[0]
```

What is `a = a[0] = [0]` doing, and how is even possible for it to work?

# Code Explained

The `[[...]]` is Python's way of indicating that the list `a` contains itself. It is an expression we cannot directly write in code because three dots in Python represent an ellipsis data type object, not a reference to the outer object. Therefore, `assert a != [[...]]` even though `print(a)` outputs `[[...]]`.

This line is surprising at first because in other languages like C or Java, assignments are made from right to left. With the first assignment being `a[0] = [0]`, it seems impossible for the code to work, because `a` is not defined.

To solve this puzzle, we need to know [[How Chained Assignments Work In Python]]. The rightmost expression is evaluated first, so the list with `[0]` is created first. Then, this value is assigned to the targets `a` and `a[0]` in order, from left to right. That is the key to understanding this.

This means the code is actually equivalent to:

```python
_rightmost_expr = [0]
a = _rightmost_expr
a[0] = _rightmost_expr
```

Note that introducing the `_rightmost_expr` variable is key here; otherwise, two different `[0]` in the code would lead to two different objects:

```python
a = [0]
a[0] = [0]
assert a == [[0]]
```

# Useful Link

This note is not going to be very extensive because I already found a really nice post about this example on [susam.net - Peculiar Self-References](https://susam.net/peculiar-self-references.html). It contains a more extensive explanation and various interesting variations.