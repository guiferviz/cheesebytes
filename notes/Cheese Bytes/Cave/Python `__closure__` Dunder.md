The `__closure__` attribute is a [[Python Dunder]] that has a value only when a function is implemented with a [[Closure]]. This attribute becomes particularly useful when you want to inspect the state of these enclosed variables.

# Example

```python
def cheese_counter(cheese_name, count=0):
    def taste_cheese():
        nonlocal count
        count += 1
        return f"Tasted {cheese_name} {count} time(s)!"

    return taste_cheese


gouda_counter = cheese_counter("Gouda")
assert gouda_counter.__closure__ is not None
assert gouda_counter.__closure__[0].cell_contents == "Gouda"
assert gouda_counter.__closure__[1].cell_contents == 0
print(gouda_counter())  # Output: Tasted Gouda 1 time(s)!
assert gouda_counter.__closure__[1].cell_contents == 1
```