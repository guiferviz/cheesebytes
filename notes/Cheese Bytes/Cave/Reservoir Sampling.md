---
aliases:
  - Algorithm R
---
**What if you need to pick a random item from a list, without ever knowing how long the list is, or even seeing all the items at once?** That is the magic of _reservoir sampling_.

**Reservoir sampling** is a clever algorithm for randomly selecting a single item from a data stream, where you don’t know the total number of items in advance, and you can’t store them all in memory.

- **Use case:** When you process huge datasets, endless streams, or just don’t want to keep everything in memory.
- **Guarantee:** Every item has the same chance to be picked, no matter where it appears in the stream.

# How Does It Work?

## One-Item Version

The one-item version, in three easy steps:

1. **Start empty:** The "reservoir" (your chosen item) is empty at first.
2. **First item:** Whatever you see first, keep it.
3. **Next items:** For the i-th item you see (i starting from 2), replace your current item with this new one **with probability 1/i**.

By the time you reach the end, every item had exactly the same chance to be chosen!

## K-Item Version

What if you want to select **not just one, but k random items** from the stream, with each possible subset of k items equally likely?

1. **Start with k items:** Add the first k items you see directly into your reservoir.
2. **Process the rest:** For each subsequent item at position i (with i starting from k+1):
    - Generate a random integer j between 1 and i (inclusive).
    - If j is 1, 2, ..., or k (that is, j ≤ k), replace the j-th element in your reservoir with the new item.
3. **Finish:** At the end, your reservoir contains k items, each uniformly chosen from the whole stream.

# Example

```python
import random

def reservoir_sampling(stream):
    chosen = None
    for i, item in enumerate(stream, 1):
        if random.randint(1, i) == 1:
            chosen = item
    return chosen
```

# Want to Go Deeper?

Explore the [[Random Selection in Data Streams - An Interactive Exploration]] note for proofs, experiments and visualizations!

The method in this note is called **Algorithm R** (see [Wikipedia](https://en.wikipedia.org/wiki/Reservoir_sampling#Simple:_Algorithm_R)). There are other versions out there, lik L or A. Honestly, it gets a little confusing! For now, I am sticking with this classic recipe and leaving the alphabet soup for another day :)