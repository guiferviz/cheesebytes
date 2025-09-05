This note describes one of my long-term life projects.

**Goal:** Build a virtual computer from pure logic to understand, in my bones,
how computation works.

# Why This Matters

Most people use computers without truly knowing what happens under the hood.  
I want to go deeper, from basic gates to buses, registers, ALUs, and memory
addressing. This is not about building a physical machine, but about building
**the logic of a computer** in code.

# What It Means to Succeed

- I can design and simulate a simple computer architecture from scratch.
- I understand the data flow between components: how bits move, combine, and
  transform.
- I can explain to others how a computer works at a fundamental level, without
  looking at notes.
- I have at least one working implementation in software.
- I can run simple programs on it, like:
  - Fibonacci sequence.
  - Sorting algorithms.
  - Others.

# Guiding Principles

- **Clarity over complexity**: I would rather understand every part than chase
  extreme performance.
- **Build bottom-up**: Start with logic gates, then chips, then the CPU.
- **Document everything**: The journey matters as much as the result.
- **Code-first**: Everything should be defined and connected in code. A visual
  representation would be nice to have, but the core is building and linking
  components through code, starting from the simplest logic gates.

# Progress & Related Notes

These are the notes I have written along the way. They roughly follow the order
in which I tackled the work, but the process was not strictly linear:

1. [[What is Needed To Simulate a Computer]]: An overview of the project from a
   technical perspective. Gives some clues about how to approach this problem.
2. [[My Own Logic Circuit Simulator]]: Building the basic logic circuit
   simulation engine.

## TODO

- [[Implement Basic Logic Gates]]: Nand, And, Or, Not, and how they combine.
- [[Number Representation]]: Binary, two's complement, and character encoding.
- [[Combinational vs Sequential Circuits]]: Understanding circuits with and
  without memory.
- [[Building Flip-Flops and Registers]]: The foundation for memory and CPU
  state.
- [[Building the ALU]]: The Arithmetic Logic Unit, the heart of computation.
- [[Instruction Set Design]]: Defining and encoding the CPU’s operations.
- [[Building a Memory System]]: How to store and retrieve data.
- [[Control Unit Design]]: Coordinating the execution of instructions.
- [[Building a Simple CPU]]: Putting all components together.
- [[Running Sample Programs]]: Fibonacci, sorting, and other test cases.
- [[Debugging and Visualization Tools]]: Inspecting state, memory, and buses.
- [[Optimizations and Lessons Learned]]: Reflections after the first working
  version.
