---
aliases:
  - Swapping Variables in Python
---
In this [[Decode The Code]] challenge, we explore the expression `a, b = b, a`, a powerful and concise method in [[Python]] for swapping the values of two variables. But how does this work, and why does `a` not get assigned to `b` first, followed by `b` being reassigned to the new value of `a` (effectively assigning `b` to itself again)?

# Why It Works

The magic behind `a, b = b, a` lies in Python's handling of tuple [[Packing And Unpacking In Python]]. When you write `a, b = b, a`, Python internally performs the following steps:

1. **Tuple Packing**: The right-hand side of the assignment `b, a` is evaluated first. This creates a temporary tuple containing the current values of `b` and `a`.

2. **Tuple Unpacking**: The left-hand side `a, b` is then assigned the values from the temporary tuple. This means `a` is assigned the value of `b`, and `b` is assigned the value of `a`.

This process of packing and unpacking ensures that both variables are updated simultaneously, preventing any overwriting of values during the swap.