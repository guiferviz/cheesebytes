Python's `collections.deque` is not implemented as a classic linked list with
one node per element. CPython stores elements in a **doubly-linked sequence of
fixed-size blocks**.

This is closely related to an **unrolled linked list**: each linked node contains
an array of several elements instead of a single element.

Conceptually:

```text
[ ... elements ... ] <-> [ ... elements ... ] <-> [ ... elements ... ]
        block                    block                    block
```

CPython currently defines a fixed `BLOCKLEN` and keeps references to the left
and right blocks together with indexes into those blocks. The implementation is
in [`Modules/_collectionsmodule.c`](https://github.com/python/cpython/blob/main/Modules/_collectionsmodule.c).

## Why `appendleft()` is O(1)

If there is free space before the current leftmost element, `appendleft()` only
moves the left index and stores the new reference:

```text
[ _ _ A B C D ]
    ^
 left index

appendleft(X)

[ _ X A B C D ]
   ^
left index
```

No existing elements are shifted.

If the current left block has no free slot, CPython allocates or reuses another
fixed-size block and links it before the current one:

```text
[ _ _ _ X ] <-> [ A B C D ]
```

Again, the old block is not copied.

The same idea applies at the right side. When a block becomes unnecessary after
popping elements, it can be detached and later reused.

Because the block size is fixed by the implementation, work proportional to one
block is still constant with respect to the number of elements $N$ in the deque.
If block size were instead a variable $K$, we could describe such work as
$O(K)$. For example:

- fixed $K = 64$ -> $O(K) = O(1)$ with respect to $N$
- $K = N / 10$ -> $O(K) = O(N)$
- $K = \sqrt{N}$ -> $O(\sqrt{N})$

This is a useful reminder that Big-O describes growth in terms of the variables
that are allowed to grow.

## Why not a dynamic circular buffer?

A [[Deque]] can also be implemented with a circular array. Keep a head and tail
index and wrap them around the array:

```text
[ C D _ _ _ A B ]
      tail   head
```

As long as there is spare capacity, insertion or removal at either end is
$O(1)$ and has excellent cache locality.

The trade-off appears when a dynamic circular buffer becomes full. To keep
allowing inserts, it normally allocates a larger contiguous array and copies the
existing elements:

```text
old:
[ A B C D E F G H ]

resize and copy:
[ A B C D E F G H _ _ _ _ _ _ _ _ ]
```

That resize is $O(N)$, although repeated appends can still be $O(1)$
**amortized** when capacity grows geometrically.

CPython's blocked design avoids that occasional whole-deque copy. Growing one
end requires linking another small block instead:

```text
[ A B C D ] <-> [ E F G H ]

append when the end block fills:

[ A B C D ] <-> [ E F G H ] <-> [ I _ _ _ ]
```

So the two designs make a different trade-off:

| Design | End operations | Occasional full copy | Locality |
| --- | --- | --- | --- |
| Dynamic circular buffer | $O(1)$ amortized | yes, $O(N)$ resize | excellent |
| CPython blocked deque | $O(1)$ at the ends | no whole-deque resize | good, but not fully contiguous |

The circular-buffer case also connects directly to [[Amortized Cost in Algorithm Analysis]].

## `list` vs `deque` in Python

A Python `list` is a dynamic array. It is ideal for stack-like access at the
right end:

```python
stack.append(x)
stack.pop()
```

Those operations are $O(1)$ amortized, and indexing is $O(1)$.

Removing from the front with `list.pop(0)` is $O(N)$ because the remaining
references have to be shifted. That is why FIFO algorithms such as BFS normally
use:

```python
from collections import deque

queue.append(x)
queue.popleft()
```

Related: [[Deque]], [[Queue and Stack]], [[Amortized Cost in Algorithm Analysis]].
