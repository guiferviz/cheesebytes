**Interning** is an optimization where [[Python]] **reuses** immutable objects (like small numbers, strings, and sometimes tuples) instead of creating new copies.

# Common Examples

Strings are always interned:

```python
a = "hello"
b = "hello"
assert a is b  # same object (string interning)
```

Python interns integers between **-5 and 256** by default:

```python
a = 100
b = 100
assert a is b
```

However, bigger numbers are not reused:

```python
a = 1000
b = 1000
assert not a is b
```

# Mutable and Inmutable Objects

Interning **does not apply** to mutable objects. Even if two lists have the same content, they will be different objects:

```python
list1 = [1, 2, 3]
list2 = [1, 2, 3]
assert not list1 is list2
```

**But not all immutable objects are interned either.** For example, even though tuples are immutable, Python does not automatically intern them:

```python
tuple1 = (1, 2, 3)
tuple2 = (1, 2, 3)
assert not tuple1 is tuple2
```

This shows that immutability **allows** interning, but Python only applies it to specific types like small integers and strings.

## Why Does Python Do This?

**Performance**. It saves memory by avoiding duplicate objects.

> [!warning]
> Interning behavior can vary between implementations (CPython, PyPy...). It is just an implementation detail and may change.
