A sparse embedding is **not** about using a sparse data structure, it is about
having a **sparse gradient**.

In a standard `nn.Embedding`, every weight in the embedding table receives a
gradient during backpropagation. That means even embeddings that were never used
in the current batch still get zero gradients, which is wasteful when you have
millions of embeddings.

When you set `sparse=True`, PyTorch only keeps gradients for the **indices that
were actually used**. Instead of a full dense gradient tensor, it builds a
sparse gradient that contains:

- the indices of the used embeddings, and
- their corresponding gradient values.

This saves a lot of memory and computation, especially in models with large
vocabularies or user/item tables.

So "sparse" here refers to **how gradients are stored and updated**, not to the
tensor format of the embeddings themselves. The embedding matrix is still dense;
only the updates are sparse.
