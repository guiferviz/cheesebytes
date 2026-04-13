An [[Algorithm]] used to count the number of active bits (bits set to one in an
integer).

The idea is to repeatedly remove the rightmost set bit and count how many times
we can do that before the number becomes zero.

The key trick is that `n - 1` flips the rightmost set bit of `n` to 0 and turns
all the bits to its right into 1. So when we apply `n & (n - 1)`, that rightmost
set bit disappears, while the bits to the left remain unchanged. Each iteration
clears exactly one set bit, so the total number of iterations matches the number
of ones in the binary representation.

```pyodide auto-run=true run-delay=1000 show-run-button=true
def count_bits_one(n):
	count = 0
	while n:
		n &= (n - 1)
		count += 1
	return count

assert count_bits_one(0b1011) == 3
assert count_bits_one(0b10000000) == 1
assert count_bits_one(0b11111111) == 8

print("All tests passed!")
```

The complexity is $\mathcal{O}(m)$, where $m$ is the number of set bits in the
integer. This is typically more efficient than iterating over all bits,
especially for sparse integers.
