Introduced in [[Python]] in [PEP-3132](https://peps.python.org/pep-3132/), extended unpacking is a way of allowing more flexible unpacking of iterable objects. It enables the use of the `*` operator to capture multiple items in a list or tuple into a single variable, while still allowing other elements to be unpacked into separate variables.

# Examples

## Basic Usage

In this example, `first` captures the first element, while `remaining` captures all subsequent elements in the list:

```python
first, *remaining = range(5)
assert first == 0
assert remaining == [1, 2, 3, 4]
```

## Using `*` In Different Positions

The `*` operator can be used in various positions within the unpacking pattern. Here, `first` and `last` capture the first and last elements, respectively, while `middle` captures all elements in between.

```python
first, *middle, last = range(5)
assert first == 0
assert middle == [1, 2, 3]
assert last == 4
```