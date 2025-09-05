In [[Python]], the `[:]` slice notation can be used to create a **shallow copy** of a sequence.

```python
my_list = [1, 2, 3]
copy_list = my_list[:]
assert not my_list is copy_list
```

**For mutable sequences (like lists)**:

- `[:]` creates a **new object** (different `id()`)
- but the contents (the elements inside) are still the _same objects_ as in the original list (shallow copy).

**For immutable sequences (like strings or tuples)**:

- Slicing with `[:]` **does not create a new object**.  
- The original object is returned because immutability makes copying unnecessary.

```python
my_str = "hello"
assert my_str[:] is my_str

my_tuple = (1, 2, 3)
assert my_tuple[:] is my_tuple
```

> [!note] **Nested structures**
> 
> `[:]` only creates a shallow copy. If the original list contains other mutable objects (lists, dicts, etc.), both copies will still reference the same inner objects.
> 
> ```python
> my_list = [[1], [2]]
> copy_list = my_list[:]
> copy_list[0][0] = 99
> assert my_list == [[99], [2]]
> assert not my_list is [[99], [2]]
> ```