# Misra–Gries production record

Source: `notes/Cheese Bytes/Cave/Majority Vote Algorithm.mdx`, its frequency-bound discussion and Misra–Gries reference. English narration continues the existing Majority Vote visual vocabulary.

## Script review 1 — focus and teaching

Rejected a survey of heavy-hitter algorithms. The one takeaway is that a residual count and a cancellation budget give a deterministic interval, and more counters can make that interval sufficient for a decision. Start with the disappearing stream, introduce two slots through arrivals, then motivate the three-way cancellation. Do not require prior knowledge of code.

## Script review 2 — mathematics and continuity

Use only SCTCTDSCTSSSSSC: 15 values, with exact frequencies S=7, C=4, T=3, D=1. Two counters leave S=5, C=1, with D=3 cancellations; three counters leave S=6, C=3, T=2, with D=1. Every deletion group has distinct values and contains at most one copy of any fixed value. Thus c_x <= f_x <= c_x + D, including c_x=0 for untracked values; N = sum(c_x) + (m+1)D. Values occurring strictly more than N/(m+1) must survive; survivors can be false positives. Error is additive, deterministic, and not a confidence percentage. Exact counts still require verification. The three-counter square interval [6,7] is entirely above the same threshold 5, so that particular threshold decision needs no second pass.

## Script review 3 — narration, reveal order and pacing

Keep formula labels until their spoken explanation. Distinguish the summary's residual 5 from the later exact 7. Replay explicitly when changing the number of slots; preserve the same 15 values and order. Show a cancellation group without a square so it is not depicted as privileged. Remove the initially proposed extra two-square tail: comparing two and three counters on the same data makes the memory/precision trade-off clearer. Put exact verification after the interval decision, then generalize. End on a useful bounded answer, with a ten-second editing tail, rather than a logo.

## Visual review record

Round 1: rendered eleven section midpoints. Removed duplicated arrival sprites over the counters; arrivals now move once and disappear into a counter. Kept the cancellation slots empty while the actual three actors converge. In the three-counter comparison, show the real prefix states after five and six arrivals before revealing the final summary, and animate the four distinct values removed together. Bound values were checked against the simulation tests.

Narration: Kokoro ONNX 0.6.1, model v1.0, af_heart. Each marked paragraph is synthesized separately and cached. Paragraph audio boundaries are measured; internal word timings are distributed by token length and are approximate, not a transcription. Action timing uses the measured paragraph durations. No claim of forced word alignment.


Round 2: inspected measured-voice section midpoints and five targeted frames. Kept candidate slots fixed when the square temporarily disappears in the three-counter prefix; circle and triangle must not jump left. Label both partial and complete replay states with the number of arrivals, so the two-counter final result is not confused with a partial three-counter state. Target frames confirm two-counter [5,8], three-counter [6,7], and the distinct exact verification result 7. Peak speech level is below clipping; a DC offset and conservative loudness were measured, so apply a high-pass filter and loudness normalization before final encoding. Audio listening could not be performed by the available audio-input tool; waveform/level and phrase-duration checks do not replace listening.


Round 3: encoded three 3-second H.264/AAC motion windows (three-way cancellation, four-way cancellation and verification) at 12 fps and reviewed their sampled poses plus six focused full-size PNGs. All reports have zero runtime/resource errors and stable inputs. Moved the four cancellation actors into the gap below the “3 counters” label so their paths cannot cross the heading. Exact 7 is revealed only during verification, after the [6,7] interval has already justified the >5 decision. Rendering chrome stays hidden. Final render will use 1280×720 at 24 fps with synthetic English narration and a ten-second tail.

Validation: 71 engine tests, new exhaustive short-stream bound/mass tests, engine TypeScript and targeted visual TypeScript passed. The upstream mobile smoke assertions passed at four viewports. The broader pre-existing agent smoke exposed HMR navigation/cancellation races after its deliberate broken-resource edits; those unrelated engine races were not changed by the mobile commit.
