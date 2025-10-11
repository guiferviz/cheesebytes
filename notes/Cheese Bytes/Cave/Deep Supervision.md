    Learning from every layer.

Deep supervision is a **training technique** where intermediate layers of a
neural network also receive direct feedback through their own loss functions.
Instead of supervising only the final output, each layer (or iteration) is
encouraged to produce meaningful, partially correct representations.

This helps gradients flow more effectively through deep or recursive models and
makes every level “understand” what the network is trying to do.

# How it works

For a network with hidden representations $h_1, h_2, \dots, h_L$ and final head
$f(\cdot)$, standard training minimizes:

$$
\mathcal{L}_{\text{final}} = \ell\!\big(f(h_L),\, y\big).
$$

With deep supervision, attach auxiliary heads $f_i(\cdot)$ to a set of layers
$S \subset \{1,\dots,L\}$ and minimize:

$$
\mathcal{L}_{\text{deep-sup}} = \sum_{i \in S} \alpha_i \, \ell\!\big(f_i(h_i),\, y\big),
$$

where $\alpha_i \ge 0$ weight each auxiliary loss.

During inference, you typically **discard** the auxiliary heads and use only
$f(h_L)$.

# Why it helps

- Mitigates **vanishing gradients** by injecting local error signals.
- **Speeds up** convergence.
- Encourages **predictive** intermediate features.
- Often improves **generalization**.
