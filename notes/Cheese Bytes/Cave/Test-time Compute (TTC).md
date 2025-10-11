Test-time compute (TTC) is not a new neural network architecture or some
mystical property of the model. It is simply the time (and computational energy)
the model uses while thinking and generating its response.

When you ask the model to:

- reason step by step ([[Chain of Thought (CoT)]]),
- explore multiple solutions ([[Tree of Thought (ToT)]]),
- review and correct itself (reflection),
- or adjust its effort according to the difficulty (adaptive compute),

... you are increasing its test-time compute, usually through the prompt (your
instruction).
