---
title: Use of the `x-` Prefix in HTTP Headers
---

The `x-` prefix in HTTP headers historically indicates a **custom or
non-standard header**.

# Background

Originally, `x-` was used to mark experimental or private headers that were not
part of the official HTTP specification.

Over time, many `x-*` headers became widely adopted, which caused problems when
trying to standardize them later (duplicate names, compatibility issues). For
this reason, modern RFCs discourage using `x-` for headers intended to become
public standards.

# Practical Usage Today

Despite this, `x-` remains a common and accepted convention for:

- private APIs
- internal services
- system-specific integrations
- headers with no intention of standardization

In these contexts, `x-` clearly signals:

- "this header is custom"
- "this is not part of the HTTP standard"
- "this header is specific to this system"

# Conclusion

Using the `x-` prefix is discouraged only when designing headers meant to be
standardized or publicly adopted. For private, internal, or integration-specific
APIs, it remains a clear and practical choice.
