---
title: Polynomial Rolling Hash Collision Demo
marimo-version: 0.13.11
---

This interactive notebook demonstrates how a **polynomial rolling hash** processes a text to generate hash values for fixed-size substrings. The rolling hash algorithm efficiently computes the hash of each sliding window using previously computed values, making it especially useful in applications such as:

- Duplicate content detection
- Plagiarism detection
- Malware signature scanning
- String search algorithms like Rabin-Karp

In this demo, you can:
- Input a custom text
- Adjust the window size for substring analysis
- Choose the base and modulus used in the hash function

The table below shows:
- The computed hash values
- How many times each hash appears
- The (unique) substrings associated with each hash

When two or more different substrings yield the same hash, a **collision** occurs — an interesting and sometimes problematic property of hashing algorithms. Here, you can explore how often and under what parameters such collisions appear.

```python {.marimo}
from collections import defaultdict
import unicodedata
import re


def rolling_hashes(text, window_size, base, mod):
    hashes = []
    hash_val = 0
    power = 1

    # Precompute base^(window_size-1)
    for i in range(window_size - 1):
        power = (power * base) % mod

    for i in range(len(text) - window_size + 1):
        if i == 0:
            # Compute initial hash
            for j in range(window_size):
                hash_val = (hash_val * base + character_to_number(text[j])) % mod
        else:
            # Rolling update
            hash_val = ((hash_val - character_to_number(text[i - 1]) * power) * base + character_to_number(text[i + window_size - 1])) % mod
            hash_val = (hash_val + mod) % mod  # ensure non-negative

        substr = text[i:i + window_size]
        hashes.append((hash_val, substr))

    return hashes


def normalize_text(text):
    text = unicodedata.normalize("NFKD", text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z ]+", "", text)
    return text


def character_to_number(x: str):
        return ord(x)
```

```python {.marimo}
import marimo as mo


text_input = mo.ui.text_area(value="To be, or not to be, that is the question.", label="Input text", full_width=True)
normalize_input = mo.ui.checkbox(value=True, label="Normalize text (convert to lowercase, remove accents and non-alpha characters)")
window_size_input = mo.ui.number(label="Window Size", value=5, start=1, stop=10)
base_input = mo.ui.number(label="Base", value=31, start=1)
mod_input = mo.ui.number(label="Modulus", value=101, start=1)
mapping_input = mo.ui.dropdown(label="Mapping", value="ASCII Code", options=["ASCII Code", "Custom Function"])
mapping_code = mo.ui.code_editor("""CHAR_TO_NUM = {
    " ": 0,
    "a": 1,
    "b": 2,
    "c": 3,
    "d": 4,
    "e": 5,
    "f": 6,
    "g": 7,
    "h": 8,
    "i": 9,
    "j": 10,
    "k": 11,
    "l": 12,
    "m": 13,
    "n": 14,
    "o": 15,
    "p": 16,
    "q": 17,
    "r": 18,
    "s": 19,
    "t": 20,
    "u": 21,
    "v": 22,
    "w": 23,
    "x": 24,
    "y": 25,
    "z": 26
}

def character_to_number(x):
    return CHAR_TO_NUM[x]""", theme="dark")
```

# Input Params

```python {.marimo}
ui_elements = [text_input, normalize_input, window_size_input, base_input, mod_input, mapping_input]
if mapping_input.value == "Custom Function":
    ui_elements.append(mapping_code)
mo.vstack(ui_elements)
```

```python {.marimo}
text = text_input.value
if normalize_input.value:
    text = normalize_text(text)
if mapping_input.value == "Custom Function":
    exec(mapping_code.value)
else:
    exec("character_to_number = lambda x: ord(x)")
window_size = int(window_size_input.value)
base = int(base_input.value)
mod = int(mod_input.value)

hash_results = rolling_hashes(text, window_size, base, mod)

hash_map = defaultdict(set)
for h, substr in hash_results:
    hash_map[h].add(substr)

table = [
    {"Hash": h, "Number Unique Values": len(subs), "Unique Values": subs}
    for h, subs in hash_map.items()
]
table = sorted(table, key=lambda x: x["Number Unique Values"], reverse=True)
hashes_with_collisions = sum(1 for i in table if i["Number Unique Values"] > 1)
num_collisions = sum(i["Number Unique Values"] for i in table if i["Number Unique Values"] > 1)
num_substrings = sum(i["Number Unique Values"] for i in table)
```

# Execution Results

```python {.marimo}
mo.md(
    f"""
**Total number of colliding hashes:** {hashes_with_collisions}
**Total number of unique substrings involved in collisions:** {num_collisions}
**Total number of unique substrings**: {num_substrings}
"""
)
```

Below is the list of hashes and their associated values, sorted in descending order by the number of unique substrings that produce each hash.

```python {.marimo}
mo.ui.table(table)
```

```python {.marimo}
import anywidget
import traitlets

class SlidingWindowWidget(anywidget.AnyWidget):
    _esm = r"""
    import { gsap } from "https://cdn.skypack.dev/gsap";
    import { GSDevTools } from "https://cdn.skypack.dev/gsap/GSDevTools";

    gsap.registerPlugin(GSDevTools);

    function render({ model, el }) {
        const text = model.get("text") || "hello world";
        const windowSize = model.get("window_size") || 4;

        // Limpiar contenido
        el.innerHTML = "";

        // Contenedor general
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.position = "relative";
        container.style.gap = "6px";
        container.style.fontFamily = "monospace";
        container.style.fontSize = "20px";
        container.style.marginBottom = "20px";
        container.style.padding = "10px";

        // Dibujar caracteres
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement("span");
            span.textContent = text[i];
            span.style.fontFamily = "monospace";
            span.style.padding = "8px";
            span.style.border = "1px solid #aaa";
            span.style.minWidth = "20px";
            span.style.textAlign = "center";
            container.appendChild(span);
        }

        // Crear overlay
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = `${windowSize * 38}px`;
        overlay.style.height = "72px";
        overlay.style.border = "2px solid red";
        overlay.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        overlay.style.zIndex = "10";
        overlay.style.pointerEvents = "none";
        container.appendChild(overlay);

        el.appendChild(container);
        const timeline = document.createElement("div");
        timeline.id = "mycon";
        el.appendChild(timeline);

        // Crear animación con GSAP
        const tl = gsap.timeline({ paused: true });

        for (let i = 0; i <= text.length - windowSize; i++) {
            console.log
            tl.to(overlay, {
                x: i * 34,
                duration: 0.5,
                ease: "power1.inOut"
            });
        }

        // DevTools para control manual
        setTimeout(() => {
          GSDevTools.create({
            //id: "#myid",
            animation: tl,
            container: timeline,
            css: {position: "relative"}
          });
        }, 2000);
        tl.play();
    }
    export default { render };
    """

    text = traitlets.Unicode("rolling hash demo").tag(sync=True)
    window_size = traitlets.Int(5).tag(sync=True)
```

```python {.marimo}
SlidingWindowWidget(text="Cheese Bytes Demo", window_size=5)
```

<div id="mycon2"></div>