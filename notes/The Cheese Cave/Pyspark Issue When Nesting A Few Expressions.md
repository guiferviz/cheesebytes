#TODO 

Try and run this simple code in [[PySpark]]:

```python
n_cols = 40

# Create a df with 40 columns, each filled with the number one.
data = [tuple(1 for _ in range(n_cols))]
schema = ", ".join(f"col{i} int" for i in range(n_cols))
df = spark.createDataFrame(data, schema)

# Sum all cols one by one: col0 + col1 + ...
expr = sum(F.col(f"col{i}") for i in range(n_cols))

# Simply select the expression and show the output.
df.select(expr.alias("sum")).show()
```

How long it took for you? For me is still running. Really, didn't have patience to let if finish. This [[Decode The Code]] exploits the inner workings of Spark and its optimization engine.

> [!note]
> At the time of writing, I was using Spark version 3.4.1. This code might no longer be an issue in newer versions of Spark.

# Understanding The Expression

First think we need to understand is where is the code getting stuck. I wrote `df.select(expr.alias("sum")).show()` on purpose in the same line to make it less obvious for the reader. Our intuition says is the `show` action what is indeed blocking the code. We may even be tempted to run a `df.explain()` to understand the query plan, however it will never get executed. It is the `select` method the one that is blocking this code.

How is it possible that a lazy executed step not triggered by any Spark action is stucking the execution? It basically means that is not a problem in the execution but in the analysis/preparation of an expression. If we `print(expr)` we will get something like `Column<'((((((((((((((((((((((((((((((col0 + 0) + col1) + col2) + col3) + col4) + col5) + col6) + col7) + col8) + col9) + col10) + col11) + col12) + col13) + col14) + col15) + col16) + col17) + col18) + col19) + col20) + col21) + col22) + col23) + col24) + col25) + col26) + col27) + col28) + col29)'>`. <-- Regenerate expression with col39

The first think that catches our attention is all those parenthesis at the beginning. Different sums are grouped by order of they appear, creating a nested expression.

# Spark Optimizer

I'm not sure if we can call it optimizer, but when a new expression is created, Spark somehow evaluates it using several rules. Some of those rules are applied recursively around the nodes and not all of them are simple to run. Some of them have a over linear complexity, maybe n^2 or even worse.

# Solution

As the problem here is the depth of the expression, we can mitigate this problem simply breaking the expression in 2, so instead of having 40 nested parenthesis, we will have 2 groups of 20 nested parenthesis. Running complex analysis on this new expression is going to be faster becuase the expresion is shallow.

```python
expr = sum(F.col(f"col{i}") for i in range(n_cols // 2))
expr += sum(F.col(f"col{i}") for i in range(n_cols // 2, n_cols))
```

Try it! It should finish in probably less than a second. Of course, this solution can be improved, so instead of manually expliting this expression, we can use a shallow pyspark expressions that makes all this sum in just one step, instead of in 40 nested steps. We can use the transform high order function.

```python
Code with hihg order funcctions here
```

Don't under estimate apparently simply operation, the power of high complexities can be devastated!