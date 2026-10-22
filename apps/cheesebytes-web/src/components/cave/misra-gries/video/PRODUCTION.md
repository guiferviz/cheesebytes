# Misra–Gries: interactive production

## Viewer, question and takeaway

We do not know which shape is frequent. The question is whether **any** kind
occurs strictly more than one third of the stream. A preselected square would
need only a square counter and total; that is deliberately not this problem.
A full frequency table grows with the number of kinds. Misra–Gries retains a
bounded number of candidate identities and residual counts, plus bookkeeping.
The viewer should leave understanding subtraction, and how a deletion budget
bounds the information discarded.

English Kokoro narration remains separate from the browser animation. The
interactive preview is the review deliverable; do not render a whole MP4 for
every revision. Build instructions are in `preview/README.md` in this app.

## Example and mathematical continuity

Canonical order: `SCSSCTSCDSTCSCS`. Fifteen arrivals: S=7, C=5, T=2, D=1.
There is no run longer than two equal kinds.

- After five arrivals, the two candidates hold S=3, C=2. The incoming T cancels
  one copy of each kind: S=2, C=1 remain. The counters are not erased.
- The next deletion is again from S=3, C=2, this time with incoming D.
- The third is from S=3, C=1 with T. Only the circle becomes empty; two squares
  remain. None of the three cancellations empties all memory.
- Final two-counter state: S=4, C=2, D=3 deletion steps. Square frequency is in
  [4,7]; circle frequency in [2,5]; any untracked kind is at most 3.
- With the same arrivals and three counters: S=6, C=4, T=1, D=1. Square frequency
  is in [6,7]. The entire interval exceeds 5, so a frequent kind is certified.
  The circle's upper bound is 5, exactly the boundary; it does not qualify.
- A separately announced verification pass reveals the exact square count 7.
  The interval had already settled the original question.

For each kind, c <= f <= c+D; N=sum(c)+(m+1)D. D <= floor(N/(m+1)), so every
kind occurring more than N/(m+1) must be among the candidates. This is a
deterministic additive error bound, not a confidence level.

## Script and visual revision

The owner's feedback rejected the previous title-heavy treatment and artificial
runs ending in five squares. The current script starts from an unknown frequent
kind, demonstrates one-item subtraction from non-unit counts, continues the
same stream without rewinding the demonstration, then uses that exact deletion
budget to derive bounds. Candidate discovery, threshold decisions and exact
verification are separate steps. The ending names the shape only after it has
been discovered.

The voice carries the explanation. Inside the animation, remove paragraph
captions and repeated headings. Keep shapes, residual numerals, interval
endpoints, the threshold, short bookkeeping labels and one general formula.
Solid copies mean actual survivors; hollow copies mean possible deleted copies.
Matching occurrences get the existing exact-count outline only on verification.

Copies leave the candidate piles individually; the remaining copies settle
smoothly. Counts change at collision/arrival. Deletion groups show three dots
with two counters and four with three. Incoming kinds, surviving identities and
fixed slot positions continue through cuts. Intro shapes vary geometrically to
express an open set of kinds; the small worked example is announced explicitly.

## Review and limits

Checks cover the canonical prefix and both final states, absence of long runs,
nonempty survivors after every example cancellation, exhaustive short-stream
mass/bound guarantees, stable slots and continuous motion. Engine tests and
TypeScript pass. Moon could not fetch its Rust toolchain plugin in this session;
the declared package test/typecheck commands were run directly instead.

Review the actual browser app with sound and seek controls at portrait mobile,
landscape and desktop sizes. The static app must fetch its own scoped audio and
alignment assets and contain SVG/React visuals rather than a video element.
Capture each scene plus the populated cancellation's setup, movement and result.
Screenshots establish composition; frame sequences support continuity review.
Do not claim a mosaic alone proves smooth playback.

The voice uses measured paragraph boundaries and approximate internal word
positions. Perceptual listening and phonetic alignment have not been verified.
If narration changes, regenerate it explicitly and preserve current provenance.
