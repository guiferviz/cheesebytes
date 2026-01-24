---
aliases:
  - Gödel Number
---

Gödel's prime number encoding is a method used to uniquely encode finite
sequences of numbers (or other entities) into a single number by using the prime
factorization theorem. Here's the basic idea:

1. **Assign Positive Integers**: Assign each symbol in your sequence a positive
   integer. For example, let's suppose that we want to encode a sequence of
   letter. You might decide that:
   - 'A' corresponds to 1
   - 'B' corresponds to 2
   - 'C' corresponds to 3
   - and so on...
   - 'Z' corresponds to 26
2. **Create the Gödel Number**: For a sequence of $n$ symbols, you use the first
   $n$ prime numbers and raise each prime to the power that corresponds to the
   positive integer representing the symbol. For example, for the sequence $ABB$
   the Gödel number is calculated as:

$$
\text{enc}(A, B, B) = 2^{1} \cdot 3^{2} \cdot 5^{2} = 450
$$

> [!hint] Intuition
>
> - The **primes** correspond to the **positions** in the sequence.
> - The **exponents** (powers) correspond to the **symbols** in the sequence.

3. **Uniqueness**: Because of the unique factorization property of prime
   numbers, the resulting product will be a unique number for each distinct
   sequence. This ensures that each sequence of symbols maps to a unique Gödel
   number.

# Generic Formula

This is the generic formula for Gödel numbers:

$$\text{enc}(x_1, x_2, x_3, \ldots, x_n) = 2^{x_1} \cdot 3^{x_2} \cdot 5^{x_3} \cdot \ldots \cdot p_n^{x_n}$$

Here, $p_n$ is the $n$-th prime number, and $x_n$ is the integer assigned to the
$n$-th symbol.

# Theory vs Practice

Gödel’s prime number encoding is mainly a theoretical construction.

It guarantees a unique and reversible mapping from finite sequences to numbers,
which is why it is so useful in logic and computability theory. In practice,
however, the numbers grow extremely fast. Even assigning values from 1 to 26
means that a single large symbol already leads to exponents on the order of
$2^{26}$, and longer sequences quickly become unwieldy.

For real implementations, simpler canonical representations are usually more
efficient and easier to work with. Gödel encoding is best seen as a conceptual
tool, not a practical data representation.

> [!note] Canonical Representations
>
> By "canonical representations", I mean simpler ways to encode sequences so
> that all equivalent objects map to a single, standard form. Once normalized,
> equality checks and grouping become trivial, since equivalent inputs produce
> identical representations.
>
> For example, the strings "eat", "tea", and "ate" are different inputs, but
> they all map to the same canonical form "aet" when their characters are
> sorted.

# Resources

- https://plato.stanford.edu/entries/goedel-incompleteness/sup1.html
