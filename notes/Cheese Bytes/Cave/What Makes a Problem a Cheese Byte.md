A Cheese Byte problem is not a programming exercise wrapped in a story. The
story is not there to decorate the problem or make it feel lighter. It exists
only if it helps you understand the problem better than a technical description
would.

In a Cheese Byte problem, the narrative is part of the logic.

The story must carry real constraints. Every element in the scenario represents
something concrete: a limitation, a permission, or a rule of the system. If a
detail can be removed without changing how the problem works, it does not belong
there. Flavor without structure is noise.

The narrative should introduce the rules naturally, not list them. Instead of
stating formal constraints, the situation itself makes them obvious. What can be
changed, what must stay fixed, and what actions are allowed should feel
inevitable given the context. You understand the rules because the world of the
problem would break otherwise.

A good Cheese Byte story guides intuition before implementation. It nudges you
toward the right mental model without revealing the solution. If the core idea
involves symmetry, balance, accumulation, or pairing, the scenario should make
those ideas feel unavoidable. The reader should start thinking correctly before
writing a single line of code.

The story is a mental model, not a joke. You should be able to reason inside it.
When you get stuck, you can return to the scenario and ask, “What would this
mean here?” If that question makes sense and helps you progress, the narrative
is doing its job.

Most importantly, a Cheese Byte problem should be fully understandable without
programming knowledge. A non-programmer should be able to read the description
and clearly explain what needs to be decided, what is allowed, and what is not.
Code is a tool to solve the problem, not the definition of the problem.

# Examples

## Bad Story

A weak problem says:

    "Here is a fun story, and here is the real task".

A chef writes letters on the surface of a loaf of bread. He wonders whether
rearranging those letters could produce a word that reads the same forwards and
backwards. If it is possible, return true; otherwise, return false.

This story is bad because nothing in it does anything.

Writing on bread imposes no constraints. Rearranging letters is already the
problem statement. The bread, the chef, the setting: all of it can be removed
without changing a single rule. The narrative does not shape the reasoning. It
does not suggest symmetry, pairing, or limits. It is just a skin stretched over
the original text.

You are not thinking differently because of the story. You are simply
translating it back into the technical problem and solving that.

## Good Story

A Cheese Byte problem says:

    "This situation is the task, expressed in another language".

During a late-night role-playing game, a group of friends is playing with a deck
numbered from 1 to N. At some point, a gust of wind opens the window and one
card slips into the fireplace, burning it.

The deck is shuffled. The cards are no longer in order. The players know exactly
which range the deck should contain, and they know that only one card was lost.
Their task is to determine which number vanished, without sorting the deck or
reconstructing it by hand.

This story encodes the constraints cleanly.

There is exactly one missing value. No duplicates were added. The order is
meaningless. The range is known. The wind explains the loss; the shuffle
explains the disorder. Every narrative element maps to a property of the
problem.

---

If the story does not introduce structure, constraints, or intuition, it is not
a Cheese Byte. It is just decoration.
