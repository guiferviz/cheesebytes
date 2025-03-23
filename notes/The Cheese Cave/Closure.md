A *closure* is a function that remembers the variables from the scope where it was created, even after that scope has exited. This allows the function to use those variables later, even if it is called from a different context.

# Example

```python
def enjoy_cheese(name):
	def cheesy_message():
		return f"Yummy, I love {name}!"
	return cheesy_message

taste_cheese = enjoy_cheese("Roquefort")
print(taste_cheese()) # Output: Hmmm, Roquefort!
```

In this example, the `cheesy_message` function is a closure that remembers the `name` variable (`"Roquefort"`) from the `enjoy_cheese` function, allowing it to use that value later.