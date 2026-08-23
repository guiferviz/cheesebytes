A **queue** and a **stack** are [[Abstract Data Type (ADT)|abstract data types]] that describe access rules, not a particular memory layout.

A **queue** is **FIFO** (_first in, first out_): the first element inserted is the
first one removed. Conceptually it only needs two operations:

- `enqueue(x)`: insert at one end.
- `dequeue()`: remove from the opposite end.

A **stack** is **LIFO** (_last in, first out_): the last element inserted is the
first one removed. Conceptually it needs:

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

For a FIFO queue, a Python `list` is a poor fit because removing from the front
with `pop(0)` is $O(N)$: the remaining elements have to be shifted.

Instead, Python code normally uses a [[Deque]]:

```python
from collections import deque

queue = deque()
queue.append(1)
queue.append(2)
queue.popleft()  # 1
```

Notice that a pure FIFO queue only needs `append()` and `popleft()`. The extra
operations provided by a deque (`appendleft()` and `pop()`) are not required by
the queue abstraction; they make the data structure more general.

Python also provides `queue.Queue`, which exposes a more explicit FIFO interface
through `put()` and `get()`. It is primarily designed for synchronized
communication between threads, so for ordinary algorithms such as BFS,
`collections.deque` is usually the lighter choice.
