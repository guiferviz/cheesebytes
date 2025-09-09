# Defining What I Really Want from This Simulator

The first step is to be clear about what I am actually looking for in this
simulator.

There are plenty of drag-and-drop logic simulators out there; I have used some
myself back in university. Even then, I had issues with their graphical
interfaces; it drove me crazy to see wires crossing all over the place, and
after carefully arranging them, they would get messed up again just by adding a
new component or, sometimes, simply by closing and reopening the file.

So, the first requirement is:

1. **It must be a pure code simulator**. Being able to visualize the circuits
   somehow would be a bonus, but the core requirement is that I can implement
   and connect components using functions and Python code.

The second point that I think is important is that I want the simulation to be
done at the lowest possible level: using universal logic gates. Many of the
simulators I have seen simulate components based on their behavior, without
using the sub-components they are actually made of. I want to build components
from simpler ones, and then only simulate the simplest ones. Lots of bit-level
operations!

2. **It must simulate each component from the simplest logical elements**. As a
   plus, it would be nice to have an optional way to simulate some components
   purely in Python for performance, but only if I choose to. This option will
   be explored if performance becomes an issue.

It is also important to be clear about what we **do not** need:

3. We do not need to simulate electrical signals in fine detail. We will only
   simulate 0s and 1s, and time will be discrete (stepped), not continuous.
4. There will be no intermediate states between 0 and 1, however it would be
   nice to simulate race conditions and glitches. This forces a better design.

# Evaluating Existing Circuit Simulators

Before writing anything from scratch, I like to take a look at "the
competition". Even though writing a Python program to simulate circuits will
surely teach me a lot, it is not the main goal of this project. The main goal is
to understand how a computer works and to be able to build one myself with my
own ~~hands~~ keys.

I am going to list some existing Python libraries and tools that I found.
JavaScript alternatives are also included, as they can be useful for interactive
online simulations. However, as I am already familiar with Python, and I now
have [[Marimo Islands]] (Python in the browser) working in [[Cheese Bytes]], I
prefer to stick with Python for this project.

- **[PySpice](https://pypi.org/project/PySpice/)**: As described in the README:
  "PySpice is a Python module which interfaces Python to the
  [Ngspice](http://ngspice.sourceforge.net/) and
  [Xyce](https://xyce.sandia.gov/) circuit simulators." Not what I am after; I
  do not want to install any extra programs.
- **[Online Logic Simulator (lodev)](https://lodev.org/logicemu/)**: A
  JavaScript library that lets you interact with circuits. Does not seem suited
  to simulating a full computer, but it is fun to play in real time with the
  example circuits on their main page. The site also has a series of
  articles/tutorials explaining certain circuits.
- **[pyeda](https://github.com/cjdrake/pyeda)**: At first it looked promising,
  but from what I can tell (and perhaps due to my ignorance), it is more about
  logical operations and simplification. Could be useful for designing efficient
  circuits, but that’s not my priority now. I just want something functional,
  speed is not a concern.
- **[pyhdl](https://github.com/SdNssr/pyhdl)**: Closer to what I want, but it is
  a small project (few stars on GitHub) and I do not like how it simulates
  components. I want to simulate NAND gates and build everything else from them
  — not simulate components directly in Python.
- **[myhdl](https://www.myhdl.org/)**: The most serious project I have found. It
  feels a bit complex at first glance and has many features I do not need, since
  I am not planning to take this to hardware (ASICs or FPGAs) for now. Like
  others, it does not simulate fundamental logic gates; it simulates
  higher-level components.
- **[CircuitLab](https://www.circuitlab.com/editor)**: A modern web-based
  circuit simulator. It has a free (and incomplete)
  [book](https://ultimateelectronicsbook.com/?from=editor_onload_promo) teaching
  basic electronics and, I assume, how to use CircuitLab.
- **[CircuitVerse](https://circuitverse.org/users/3/projects/248)**: Another
  interesting simulator. It also has a
  [book/tutorial](https://learn.circuitverse.org/) introducing circuit design.
  The code is on GitHub and circuits can be imported/exported in JSON format.
- **[logic.ly](https://logic.ly/demo/)**: Visually attractive and exactly the
  kind of simulations I am looking for. However, it is paid software, and it
  does not seem possible to program components or connect them using code.

After several hours of research, I decided to make my own implementation.  
Deep down I knew this would happen... I would find some flaw in any library just
to give myself the excuse to code my own. And honestly... it is going to be fun!
