Try running this simple [[PySpark]] code. If you have PySpark installed, it
should work out of the box — just copy and paste:

```python
from pyspark.sql import SparkSession
import pyspark.sql.functions as F

spark = SparkSession.builder.getOrCreate()

# Create a df with 40 columns, each filled with the number one.
n_cols = 40
data = [tuple(1 for _ in range(n_cols))]
schema = ", ".join(f"col{i} int" for i in range(n_cols))
df = spark.createDataFrame(data, schema)

# Sum all cols one by one: col0 + col1 + ...
expr = sum(F.col(f"col{i}") for i in range(n_cols))

# Simply select the expression and show the output.
df.select(expr.alias("sum")).show()
```

**How long did it take for you?** For me, it never finished — I did not even
have the patience to wait. This [[Decode The Code]] explores why such a
simple-looking operation can trip up Spark’s optimization engine.

> [!note] At the time of writing, I was using Spark version 3.4.1. This issue
> might no longer occur in newer versions.

# 🔍 Understanding Where It Gets Stuck

At first glance, it seems the delay must be happening during the `show()`
action. That’s where Spark usually triggers execution. But this time, something
else is happening.

Even running `df.explain()` to examine the query plan hangs indefinitely. Why?  
Because **the code is actually stuck during the `select()` step**, _before_ any
action happens.

This might sound surprising. Spark is supposed to evaluate transformations
lazily, right? So how can `select()` — which just builds a plan — cause the
whole process to freeze?

The problem lies in the **analysis phase**, when Spark tries to _prepare_ the
expression. If you inspect the `expr` variable right after defining it:

```python
print(expr)
```

You’ll see something like this:

```sql
Column<'((((((((((((((((((((((((((((((((((((((((col0 + 0) + col1) + col2) + ... ) + col39)'>
```

Notice the enormous number of nested parentheses. Spark constructs a deeply
nested tree, grouping sums from left to right, resulting in a **linear chain 40
levels deep**.

# ⚙️ Spark’s Analyzer and Its Complexity

When Spark builds expressions, it applies a series of **analyzer and optimizer
rules** to verify and simplify the computation. Many of these rules are
recursive.  
In this case, the deep nesting forces the analyzer to walk up and down a long
expression tree repeatedly.  
Some rules have complexity worse than O(n), possibly O(n²) or higher.

So even though no data is being processed yet, Spark burns CPU cycles just
**analyzing** the expression!

# 🛠 Solution: Make the Expression Shallower

To fix this, we need to reduce the **depth** of the expression tree.

Instead of summing all 40 columns in a single chain, split the work into two
smaller sums:

```python
expr = sum(F.col(f"col{i}") for i in range(n_cols // 2))
expr += sum(F.col(f"col{i}") for i in range(n_cols // 2, n_cols))
```

Now, Spark will only have to analyze two expressions with 20 nested sums each —
much shallower and faster. **This version completes in under a second.**

## 🧠 Even Better: Use High-Order Functions

But we can do even better by avoiding nested sums altogether.

Instead of manually combining columns, we can use Spark’s **higher-order
functions**, which create shallow, efficient expressions:

```python
df = df.withColumn(
	"columns_array", F.array([F.col(f"col{i}") for i in range(n_cols)])
)
df = df.withColumn(
	"sum",
	F.aggregate("columns_array", F.lit(0), lambda acc, x: acc + x)
)
df.select("sum").show()
```

This approach turns all the columns into an array and applies an `aggregate`
function to sum them up. **No deep nesting. No analyzer overload.**

# ⚡ Key Takeaway

Deep expression trees can overwhelm Spark’s analyzer long before any data
processing begins.

Don't underestimate an apparently simple operation; the power of high
complexities can be devastating!
