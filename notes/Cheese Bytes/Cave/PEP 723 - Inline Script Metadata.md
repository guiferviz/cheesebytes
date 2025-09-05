PEP 723 introduces a metadata format that can be embedded in single-file
[[Python]] scripts. This assists launchers, IDEs, and other tools that need to
interact with these scripts, providing information such as dependencies and
supported Python versions.

**Motivation:**  
Python is often used for scripting, but there is no standard way to define
metadata for these scripts. This PEP aims to standardize the way metadata is
embedded within scripts, making it easier for tools to understand and execute
them.

**Rationale:**  
The metadata is embedded within the script itself, similar to
the `pyproject.toml` format, providing a consistent experience for users. This
avoids the need for separate files and ensures the script remains
self-contained.

**Specification:**

- Metadata blocks start with `# /// TYPE` and end with `# ///`.
- The content between these lines must be comments.
- The first type of metadata block is named `script`, containing fields
  like `dependencies` and `requires-python`.
- Tools must produce an error if they encounter multiple blocks of the same
  type.

**Example:**

```
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests<3",
#   "rich",
# ]
# ///
import requests
from rich.pretty import pprint

resp = requests.get("https://peps.python.org/api/peps.json")
data = resp.json()
pprint([(k, v["title"]) for k, v in data.items()][:10])
```

You can run script using this inline metadata using `uv run <my-script.py>` from
[[Python UV]].
