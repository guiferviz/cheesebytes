# Majority Vote story

`src/stories/majority-vote.astro` contains the complete English narration,
semantic marks and thirteen video-enabled sections. It uses the article's
`SHAPES` palette, Cheese's local Iosevka font and a black 16:9 stage.

The visual treatment is motion-first: no section headings, persistent branding,
slide numbering, explanation paragraphs or UI cards. Streams move in depth,
counters fill physical stacks, hundreds of values spread into a cloud, unlike
pairs collide with particle bursts, candidates receive incoming shapes, and
weighted summaries converge into a single survivor. Only essential numbers,
a question mark, the algorithm name and its complexity appear on screen.
Ambient orbit motion and all particles derive from absolute section time, so
paused, reversed and rendered playback retain the same composition.

The sequence has six blue squares and four other shapes. Cancellation leaves
two squares. The online example includes a zero balance and a replacement
candidate. A separate seven-element example ends with a square candidate but
only three squares. Verification counts real occurrences; residual strength
is never presented as frequency. Three shards partition the original example
exactly once and combine to a square with residual strength two. A global
verification is still required unless a majority is guaranteed.

All animation state is evaluated from absolute timeline time. The visual uses
no random data, intervals, wall-clock animations or playback-dependent state.
The fixed SVG viewBox scales to the framework's render size.

## Preview and render with recorded narration

From the monorepo root:

```sh
pnpm exec moon run cheesebytes_web:preview_video -- src/stories/majority-vote.astro /path/to/voice.wav
pnpm exec moon run cheesebytes_web:create_video -- src/stories/majority-vote.astro /path/to/voice.wav /path/to/majority-vote.mp4
```

Preview route: `/video-preview/majority-vote`. Reveal route: `/present/majority-vote`.
Narration is unchanged; attach the actual recording to validate acoustic pacing.

## Validation without audio

```sh
pnpm exec moon run cheesebytes_web:test
pnpm exec moon run cheesebytes_web:dev -- --port 4399
# In another terminal:
node apps/cheesebytes-web/scripts/majority-video-smoke.mjs http://localhost:4399
```

The browser test supplies synthetic word timestamps. It checks hydration,
every scene, SVG text bounds, a visible-text budget, continuous animation,
reverse seeking, zero balance, candidate replacement,
final candidate, absence of majority, second-pass rejection and clean render mode.
It captures all scenes and cancellation mid-animation under
`/tmp/guiferviz-playwright-mcp/majority-vote`. `SCREENSHOT_DIR` overrides that
output directory; `ALIGNMENT_OUTPUT` optionally writes the synthetic alignment
for a silent local preview. These timestamps are test fixtures, not voice alignment.

Unit tests check the story examples and exhaustively check strict-majority
preservation for streams of up to seven elements across all two-way partitions.
They run as part of the existing Cheese Bytes consumer test task.

## Short motion review

Set `DEMO_OUTPUT=/tmp/guiferviz-playwright-mcp/majority-vote-motion/preview.mp4`
and `SCREENSHOT_DIR=/tmp/guiferviz-playwright-mcp/majority-vote-motion` when running
the browser smoke test to export a 37-second silent motion reel at 1280×720 and
24 fps. The reel compresses selected sections to review the visual direction;
it is not the full narrated video. This requires ffmpeg.
