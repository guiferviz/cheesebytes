Would this work? Can a lambda function reference itself in [[Python]]?

```python
fibonacci = lambda n: n if n <= 1 else fibonacci(n - 1) + fibonacci(n - 2)
assert fibonacci(5) == 5
assert fibonacci(6) == 8
```

Yes, it works!

In Python, a lambda function can indeed reference itself. In this example, the lambda function `fibonacci` is able to call itself within its own definition. This is possible because the `fibonacci` variable is available in the scope at the time the lambda is evaluated.

Here is a simple example to illustrate this concept:

```python
fun = lambda: x
x = 3
assert fun() == 3
```

In this example, the lambda function `fun` references the variable `x`, which is defined after the lambda. When `fun()` is called, it correctly returns the value of `x`. This shows how lambdas can reference variables within their scope, even if those variables are defined later.