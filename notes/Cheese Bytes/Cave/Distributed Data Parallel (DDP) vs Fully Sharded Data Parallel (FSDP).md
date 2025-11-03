Both **DDP (Distributed Data Parallel)** and **FSDP (Fully Sharded Data
Parallel)** are strategies for training models across multiple GPUs, but they
handle model parameters differently.

# DDP — Distributed Data Parallel

- Each GPU holds a **full copy** of the model.
- The input batch is split across GPUs.
- Each GPU computes gradients locally, and all GPUs synchronize them at the end
  of each step.
- Simple and efficient, but limited by GPU memory since each device stores the
  entire model.

# FSDP — Fully Sharded Data Parallel

- The model's parameters and gradients are **sharded** (split) across GPUs.
- Each GPU only stores a portion of the model at any time.
- During forward and backward passes, the required shards are temporarily
  gathered and then released.
- Much more memory-efficient: allows training very large models that would not
  fit with DDP.
