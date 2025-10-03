After doing some research, documented in
[[Decide What Computer Simulator to Use]], I decided to build my own computer
simulator. And yes, I am going to do it in Python.

This page is where I will document how that simulator is built, from its bare
bones to the final working engine. Having this simulator is a requirement before
I can move forward with the thrilling mission of building
[[My Own Logical Computer|my own computer]].

The simulator is based on a few fundamental concepts.

# Signals

In the simulator, the most basic concept is the **signal**. A signal is a
logical entity that carries information; it can have a width of **1 bit**
(simple on/off, 0 or 1) or **multiple bits**. This is that what traditional
hardware terminology calls a _bus_ (a set of parallel wires). In our simulator,
simply a multi-bit signal.

## Practical Notes

- A signal of width `1` behaves exactly like a bit.
- A signal of width `n > 1` behaves like a bus carrying `n` bits in parallel.
- Slicing operations can be applied to signals to obtain sub-signals, for
  example:
  ```python
  address = Signal(16)
  high_byte = address[8:16]
  low_byte = address[0:8]
  ```

# Components

The second fundamental element is the **component**. A component is any logical
construction made from input/output signals and other components. It can be as
small as a Nand gate or as large as a CPU.

## The Public Interface of a Component

In the simulator, a component is represented as a Python class that inherits
from `Component`. Every component has the following public interface:

- `inputs`: a dictionary mapping **input names** to `Signal` objects.
- `outputs`: a dictionary mapping **output names** to `Signal` objects.
- `subcomponents`: a list of other `Component` instances that this component is
  built from.
- `connect()`: a method where the internal structure of the component is
  declared by creating and wiring subcomponents.
- `simulate(state)`: a method that defines the explicit behavior of the
  component at the software level. Not all components need to implement this —
  simple gates can, but higher-level components might rely only on their
  subcomponents.

### Automatic Input/Output Detection

To make component definition easier, you do **not** need to manually fill the
`inputs` and `outputs` dictionaries. Instead, the simulator inspects the class
annotations:

- Attributes annotated with `Input` are automatically added to the `inputs`
  dictionary.
- Attributes annotated with `Output` are automatically added to the `outputs`
  dictionary.

The "magic" of the `connect()` method is that when it is called during component
initialization, any subcomponent created inside it is automatically added to the
`subcomponents` list.

This means you do **not** write:

```python
class Not(Component):
    def __init__(self, a: Signal, q: Signal):
        self.inputs["a"] = a
        self.outputs["q"] = q
        self.subcomponents.append(Nand(a, a, q))
```

but instead simply declare the interface and connect things in a very natural
way. Here is a minimal example of how to define a Not gate:

```python
from typing import Annotated
from nandscape import Component, Signal, Input, Output


class Not(Component):
    a: Annotated[Signal, Input]
    q: Annotated[Signal, Output]

    def connect(self):
        Nand(self.a, self.a, self.q)

    def simulate(self, state):
        state[self.q] = not state[self.a]
```

To make it a bit more easy to read and write, the `Annotated[Signal, Input]` and
`Annotated[Signal, Output]` annotations can be aliased to `InSignal` and
`OutSignal`, respectively:

```python
from typing import Annotated
from nandscape import Component, InSignal, OutSignal


class Not(Component):
    a: InSignal
    q: OutSignal

    def connect(self):
        Nand(self.a, self.a, self.q)

    def simulate(self, state):
        state[self.q] = not state[self.a]
```

## Fundamental Logic Gate

The Nand gate is the fundamental building block of the simulator. It is the only
component that does not connect to other components internally, so its `connect`
method is empty. All other components will be built from Nand gates (or from
other components that ultimately reduce to Nand gates).

# Logical Structure vs Layout

The logical structure of the simulator describes which components are connected
to which. In hardware design, this is often stored in files known as "netlists".

The layout, on the other hand, describes the physical or visual arrangement of
the elements.

This simulator will focus first on the logical structure. Layout and
visualization will be considered as a separate, independent feature. Visual
metadata could be added to the logical model later to improve readability or
aesthetics.

# Simulation Modes

In this library, the logical design, the visual layout, and the simulation
engine are completely independent. The `Component` class defines only the
logical behavior of the component; how that behavior is actually simulated is
the job of the simulator.

This separation makes it easy to implement different simulation strategies, such
as:

- **Step-by-step simulation**, where all components are updated on each tick.
- **Event-driven simulation**, where only components affected by a signal change
  are updated.

For now, I am leaning towards using the event-driven approach. This approach
lets me model propagation delays per gate and observe transient glitches when
paths have different delays. It also scales better because only the parts of the
circuit that actually change are reevaluated.

# Conclusion

With these foundations (clear separation between logic, layout, and simulation,
a unified concept of `Signal`, and a consistent `Component` interface) the
simulator is ready to grow from the simplest Nand gate to complex components.
