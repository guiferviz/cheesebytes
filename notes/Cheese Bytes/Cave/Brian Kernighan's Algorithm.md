An [[Algorithm]] used to count the number of active bits (bits set to one in an integer).

```python
def count_set_bits_kernighan(n):
	count = 0
	while n:
		n &= (n - 1)
		count += 1
	return count
```

The complexity is $\mathcal{O}(m)$, where $m$ is the number of set bits in the integer. This is typically more efficient than iterating over all bits, especially for sparse integers.