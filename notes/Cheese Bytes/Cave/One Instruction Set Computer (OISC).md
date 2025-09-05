---
aliases:
  - Ultimate Reduced Instruction Set Computer (URISC)
---

A One Instruction Set Computer (OISC), also known as an Ultimate Reduced
Instruction Set Computer (URISC), is a type of computer architecture that uses
only a single instruction to perform all operations. Despite having only one
instruction, an OISC can still be Turing complete if the single instruction is
powerful enough.

Examples:

1. **Subleq (Subtract and Branch if Less than or Equal to Zero):**

   - **Instruction:** `subleq A, B, C`
   - **Operation:** Subtract the value at address `A` from the value at
     address `B`, store the result at `B`, and if the result is less than or
     equal to zero, jump to address `C`.
   - **Explanation:** This instruction can perform arithmetic (through repeated
     subtraction), conditional branching (with the jump), and memory
     manipulation (by storing the result).

2. **Move and Branch (MOV):**
   - **Instruction:** `mov A, B`
   - **Operation:** Move the value at address `A` to address `B`, and then based
     on the value or some condition, decide whether to branch to another
     instruction.
   - **Explanation:** With clever use of memory and conditions, this can
     simulate other operations and control flow.

> [!example] > [movfuscator](https://github.com/xoreaxeaxeax/movfuscator) is a C
> compiler that uses only the `mov` instruction. There is also
> [a video from the author](https://www.youtube.com/watch?v=NmWwRmvjAE8)
> explaining how he did it.

> [!quote] Yet as it turns out, we can do comparisons using only load and store
> instructions. If you store a value into address A and a different value into
> address B, then examining the contents of address A afterwards will tell you
> whether A and B are equal.
>
> - Stephen Dolan [mov paper](https://drwho.virtadpt.net/files/mov.pdf).
