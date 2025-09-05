A master-slave D flip-flop is built from two D latches connected in series, with
the clock signal inverted between them. Here is how it works:

1. Master latch: Open (transparent) when the clock is low (Clk = 0). It tracks
   the input D directly during this time.

2. When the clock goes high (Clk = 1), the master latch closes (freezing its
   value) and the slave latch opens, capturing the master's last stored value.

3. Any changes to the input D while the clock is high are ignored by the
   flip-flop, because the master is locked and the slave only sees the master's
   fixed output.

Result: The output only updates at the rising edge of the clock and is
completely immune to any "glitches" or changes in D that happen while the clock
is high. The circuit acts as an edge-triggered memory, even though it is made
with level-sensitive latches.
