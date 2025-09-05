---
title: Reversing A Linked List
marimo-version: 0.13.14
---

This interactive note demonstrates how a singly linked list is reversed using Python.

```python {.marimo}
import marimo as mo


class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

    def __str__(self):
        return f"Node({self.value})"


def linked_list_to_mermaid(head: Node) -> str:
    if not head:
        return "graph LR\n    empty[(empty)]"

    lines = ["graph LR"]
    node_defs = []
    edges = []

    idx = 0
    current = head

    while current:
        node_defs.append(f"    node{idx}[{current.value}]")
        if current.next:
            edges.append(f"    node{idx} --> node{idx + 1}")
        else:
            edges.append(f"    node{idx} --> none((None))")
        current = current.next
        idx += 1

    return "\n".join(lines + node_defs + edges)


def get_last_node(head: Node):
    node = head
    while node.next:
        node = node.next
    return node
```

```python {.marimo}
numbers_input = mo.ui.text(label="Enter a list of numbers (comma-separated)", value="1,2,3,4")
numbers_input
```

Here is a visual representation of the linked list:

```python {.marimo}
def parse_linked_list(text: str) -> Node:
    try:
        nums = [int(x.strip()) for x in text.split(",") if x.strip()]
    except ValueError:
        return None  # Invalid input

    if not nums:
        return None

    head = Node(nums[0])
    current = head
    for num in nums[1:]:
        current.next = Node(num)
        current = current.next

    return head

head = parse_linked_list(numbers_input.value)
diagram = linked_list_to_mermaid(head)
mo.mermaid(diagram)
```

The diagram after applying the reverse function looks like this:

```python {.marimo}
CODE = """def reverse(head: Node):
    previous = None
    current = head
    while current != None:
        next = current.next
        current.next = previous
        previous = current
        current = next"""
code_editor = mo.ui.code_editor(CODE, theme="dark", show_copy_button=False)
code_editor
```

```python {.marimo}
import traceback


reverse = None
with mo.redirect_stderr(), mo.redirect_stdout():
    try:
        exec(code_editor.value)
    except Exception as e:
        print("Errors defining the function:")
        traceback.print_exc()
```

```python {.marimo}
import copy

mo.stop(reverse is None)
head_copy = copy.deepcopy(head)
tail = get_last_node(head_copy)
ok = True
with mo.redirect_stderr(), mo.redirect_stdout():
    try:
        reverse(head_copy)
    except:
        print("Errors running the function:")
        traceback.print_exc()
        ok = False
```

```python {.marimo}
mo.stop(not ok)
diagram_reverse = linked_list_to_mermaid(tail)
mo.mermaid(diagram_reverse)
```

You can edit the code in the reverse function cell to experiment with different logic.
The diagram will update automatically to reflect the result 🙌🏽