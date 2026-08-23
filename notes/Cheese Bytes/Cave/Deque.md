A **deque** (_double-ended queue_) is a queue-like abstract data type that allows
insertion and removal at **both ends**.

A regular [[Queue and Stack|queue]] is FIFO and only needs to insert at one end
and remove from the other. A deque generalizes that interface:

- insert right
- remove right
- insert left
- remove left

In Python, `collections.deque` exposes these operations as:

```python
d.append(x)
d.pop()
d.appendleft(x)
d.popleft()
```

The important distinction is that **deque is an abstract data type, not a memory
layout**. It can be implemented in several ways, for example:

- a doubly-linked list
- a circular buffer
- a linked sequence of fixed-size blocks

The last approach is the one used by CPython's `collections.deque`; see
[[Python Deque Implementation]].

## Queue vs deque

A pure FIFO queue does not need all four deque operations. With Python's deque,
a queue normally uses only:

```python
queue.append(x)   # enqueue
queue.popleft()   # dequeue
```

Using `appendleft()` together with `popleft()` would instead insert and remove
from the same end, producing LIFO-like behavior rather than FIFO behavior.

A deque is therefore more general than a queue, while supporting a queue almost
for free once efficient operations at both ends already exist.

Related: [[Queue and Stack]], [[Python Deque Implementation]].
