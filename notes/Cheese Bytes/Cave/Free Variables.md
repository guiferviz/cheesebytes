*Free variables* are identifiers in an expression that are not bound to a specific value or parameter within that expression.

So, if you have:

```python
def make_adder(x):
	def adder(y):
		return x + y
	return adder
```

- In the `adder` function, `y` is a **bound variable** because it is a parameter.
- But `x` is a **free variable** inside `adder` because it is not defined there, it comes from the surrounding scope of `make_adder`.