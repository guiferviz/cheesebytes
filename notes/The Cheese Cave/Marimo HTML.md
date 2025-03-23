---
title: Marimo Html
marimo-version: 0.11.20
---

Hola!

```marimo
import marimo as mo
mo.md("Ejemplo!")
```

```marimo
slider = mo.ui.slider(1, 100)
slider
```

```marimo
mo.md(f"The value is {slider.value}")
```