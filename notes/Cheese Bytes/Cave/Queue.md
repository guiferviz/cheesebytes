A **queue** is an [[Abstract Data Type (ADT)|abstract data type]] that follows
**FIFO** (_first in, first out_) order: the first element inserted is the first
one removed.

Conceptually it only needs two operations:

- `enqueue(x)`: insert at one end.
- `dequeue()`: remove from the opposite end.

## In Python

A Python `list` is a poor fit for a FIFO queue because removing from the front
with `pop(0)` is $O(N)$: the remaining elements have to be shifted.

Instead, Python code normally uses a [[Deque]]:

```python
from collections import deque

queue = deque()
queue.append(1)
queue.append(2)
queue.popleft()  # 1
```

A pure FIFO queue only needs `append()` and `popleft()`. The extra operations
provided by a deque make it a more general data type.

Python also provides `queue.Queue`, which exposes a more explicit FIFO interface
through `put()` and `get()`. It is primarily designed for synchronized
communication between threads, so for ordinary algorithms such as BFS,
`collections.deque` is usually the lighter choice.
