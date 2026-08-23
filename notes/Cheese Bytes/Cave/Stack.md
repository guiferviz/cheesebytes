A **stack** is an [[Abstract Data Type (ADT)|abstract data type]] that follows
**LIFO** (_last in, first out_) order: the last element inserted is the first
one removed.

Conceptually it needs two operations:

- `push(x)`: insert at the top.
- `pop()`: remove from the top.

## In Python

A stack is normally represented with a `list`:

```python
stack = []
stack.append(1)
stack.append(2)
stack.pop()  # 2
```

Both `append()` and `pop()` at the end of a list are $O(1)$ amortized.
