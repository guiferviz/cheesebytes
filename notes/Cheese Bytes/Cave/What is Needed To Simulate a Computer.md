This note outlines the main areas to consider when simulating a computer.  
It is a high-level checklist, not an implementation plan, and does not assume
whether the simulator will be built from scratch or based on an existing tool.

# Scope & Limitations

- Simulation level: digital logic (logic gates, combinational and sequential
  circuits, CPU-level integration). No analog or transistor-level simulation.
- Single CPU, single core.

# Core Considerations

- **Simulator**: What tool or code will run the simulation? Must allow accurate
  modeling of components at the chosen level of abstraction.
- **Abstraction Levels**: How the system will be built up from smaller parts:
  1. Logic gates.
  2. Combinational circuits.
  3. Sequential circuits (flip-flops, registers).
  4. Higher-level components (ALU, memory, control unit).
  5. CPU integration.
  6. Running programs.
- **Data & Encoding**: How data and instructions are represented:
  - Number representation (binary, two's complement...)
  - Instruction encoding (opcodes, operands)
  - Memory model (addressing, endianness, alignment rules)
- **Testing & Verification**: How to confirm the system behaves correctly:
  - Unit tests for components.
  - Integration tests for the CPU.
  - Programs as functional tests.
- **Visualization** (optional): Possible ways to inspect the state:
  - Text-based inspection.
  - Graphical views of signals, buses, and memory.
