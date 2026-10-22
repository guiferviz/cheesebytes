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

Each arrival is one actor throughout its transfer into a pile. Rounded routes
use the space above cards and their right gutters, keeping clear of existing
shapes. Cancellation actors leave individually, settle at separate positions
above their own slots, and fade together with the incoming kind. Surviving
copies preserve their order as rows grow or shrink. Counts change when arrivals
land or the removed group fades. Deletion groups show three dots
with two counters and four with three. Incoming kinds, surviving identities and
fixed slot positions continue through cuts. Intro shapes vary geometrically to
express an open set of kinds; the small worked example is announced explicitly.

## Motion and composition review

- Around 33 s, cancellation actors previously converged onto the same pixel.
  They now occupy separate positions. A populated 3/2 state still loses just
  one copy of each, retaining 2/1. There is no destination/source crossfade
  drawing a second incoming copy on top of the first.
- Around 63–65 s and 75–77 s, straight-line rearrangements could cross other
  survivors. Horizontal spacing is established before vertical compaction.
- Around 78 s, the rising square interval previously intersected the appearing
  circle interval. The upper interval now finishes moving before the lower one
  appears. The same interval geometry continues into the threshold scene.
- Interval endpoints no longer repeat the axis numerals. A shared threshold
  has one 5, and verification turns the existing 7 green rather than adding
  another 7 above it. The second pass outlines the occurrences without another
  redundant numeric tally. The generalization changes 2 to 99 without cycling
  through dozens of briefly visible integers.
- The three-counter replay uses ten seconds for its fifteen arrivals (previously
  about 7.75). Its six and representative square travel into the interval;
  they are not destroyed and recreated in a blank transition. Card numerals
  have additional clearance below two-row piles. Continuous scene boundaries
  retain their state; intentional resets fade out and in on both sides.

## Review evidence and limits

Eight example/geometry tests cover both final states, nonempty cancellation
survivors, exhaustive short-stream bounds, identity/position handoffs, separation
of every visible actor through both complete passes (120 samples per arrival),
and survivor/possible-copy rearrangements. Visual TypeScript, the interactive
static build and Astro diagnostics pass. Moon could not fetch its Rust plugin
in this environment; the declared package commands were used directly.

The browser review sampled the whole timeline at 10 fps (1,790 states), located
shape/text clearance issues, and rechecked the last corrected 110–116 s window
at 30 fps (180 states, no detected intersections). Labelled scene/contact sheets
and focused consecutive frames were inspected, including the cancellation,
interval rearrangement, replay-to-bound handoff and exact verification. Nine
scene joins were compared at ±1 ms; changes were confined to subpixel edge
rasterization, with mean RGB difference below 0.05 on the 0–255 scale.

Actual browser playback through five seconds of the three-counter pass produced
301 animation-frame samples: median 16.7 ms and 95th percentile 16.8 ms, with
monotonic story time and no browser errors. This is a headless desktop measurement,
not a promise about every phone. Separate mobile/landscape/desktop checks at
320×568, 390×844, 844×390 and 1280×720 verify controls, scoped audio loading,
playback, scene seeking, keyboard behavior and fullscreen. The app uses SVG/React
and contains no video element. Short 30 fps diagnostic clips support motion
review; a mosaic alone does not establish perceived fluidity.

The unchanged English Kokoro voice uses measured paragraph boundaries and
approximate internal word positions. Perceptual listening and phonetic alignment
have not been verified. Visual changes reuse the existing audio; narration edits
must explicitly regenerate speech and preserve provenance. Artifacts remain
outside the repository.
