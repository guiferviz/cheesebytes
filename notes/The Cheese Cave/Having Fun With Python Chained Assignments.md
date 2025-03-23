Working on a [[Dancing Links (DLX)]] implementation, I found myself writing:

```python
values = [v0, v1, v2] = 0, 1, 2
```

My objective was to create three integer variables (`v0 = 0`, `v1 = 1` and `v2 = 2`) and a list containing these three integers (`values = [0, 1, 2]`). However, I inadvertently created a new [[Decode The Code]] challenge in [[Python]] :)

Without running the code, can you identify what I did not achieve as expected? The code compiles without errors; it is the functionality that did not work as intended.

# The Problem

The problem lies in the type of the variable `values`; it is not a `list`. What is it then?

```python
values = [v0, v1, v2] = 0, 1, 2
assert isinstance(values, tuple)
```

It is a `tuple`! But why is this the case?

# Problem Explained

My initial understanding was that the assignments of expressions were executed from right to left, similar to C or Java. I thought `[v0, v1, v2] = 0, 1, 2` was creating a list with values 0, 1, and 2, and then assigning that list to the `values` variable. However, this understanding is incorrect in Python!

The fact that `values` ends up being a `tuple` only makes sense once we understand [[How Chained Assignments Work In Python]]. In Python, when you perform a chained assignment, the rightmost expression is evaluated first. In this case, the expression `0, 1, 2` is evaluated first, resulting in a tuple `(0, 1, 2)`. This tuple is then independently assigned to each of the targets on the left: `values` and `v0`, `v1`, and `v2`. Therefore, it does not matter how `v0`, `v1`, and `v2` are written (with or without brackets `[]`), `values` is assigned to the `(0, 1, 2)` tuple.

# Fixing The Issue

## Solution 1 - Breaking Code In Two Lines

One obvious way to resolve this is by separating the assignments into two lines:

```python
v0, v1, v2 = 0, 1, 2
values = [v0, v1, v2]
```

While I would likely choose this option for a company codebase, where code clarity is crucial and it is important to avoid confusing colleagues with coding puzzles, this solution is rather boring 🥱.

## Solution 2 - One-Liner

Alternatively, we can use a one-liner that correctly assigns `values` as a list. Simply take the original statement and convert the rightmost expression of the assignment into a list.

```python
values = [v0, v1, v2] = [0, 1, 2]
assert isinstance(values, list)
```

The specific type of the second target is not relevant to our goal, as long as it is an iterable object that allows unpacking. The following two methods of writing it are equivalent:

```python
values = (v0, v1, v2) = [0, 1, 2]
assert isinstance(values, list)
values = v0, v1, v2 = [0, 1, 2]
assert isinstance(values, list)
```

# Variations

The understanding gained from solving this problem can also be applied to tackle another related challenge: [[A List That Contains Itself]]. This problem is more complex due to the use of the same variable in both the first and second targets. To solve it, it is crucial to understand not only the mechanics of chained assignments but also the sequence in which they are executed.