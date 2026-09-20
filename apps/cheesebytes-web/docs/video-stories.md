# Cheese Bytes stories: Reveal + video

A story in `src/stories/*.astro` is the source of truth for both presentation
and video output. The story owns sections, speaker notes, semantic marks and
visual components. Reveal.js and the video runtime are renderers of that same
source.

The reusable runtime now lives in the workspace package
`@guiferviz/cheese-bytes-video`. Cheese Bytes consumes public package exports;
the framework does not import application code.

```ts
// video.config.ts
import { defineVideoConfig } from "@guiferviz/cheese-bytes-video/config";

export default defineVideoConfig({
  stories: "./src/stories/*.astro",
  previewRoute: "/video-preview/[story]",
  render: { width: 1920, height: 1080, fps: 30 },
  alignment: { provider: "whisper", model: "base.en", language: "en" },
});
```

The Astro integration owns the temporary audio/alignment endpoints and injects
the preview route:

```js
import { cheeseBytesVideo } from "@guiferviz/cheese-bytes-video/astro-integration";

export default defineConfig({
  integrations: [react(), cheeseBytesVideo(videoConfig)],
});
```

## Authoring

A story in `src/stories/*.astro` keeps narration, visuals and timing together.
Each `StorySection` owns its own JavaScript timeline:

```astro
<StorySection
  id="coffee-demand"
  timeline={(t) => {
    const heatmap = t.visual("heatmap", heatmapVideoDefinition);

    t.fadeIn(heatmap, { from: "show-heatmap" });
    t.fadeIn(heatmap.aggregation, { to: "show-aggregation" });

    t.action(heatmap.shiftGrid, {
      from: "move-grid",
      to: "show-winner",
      ease: "power2.inOut",
      params: { x: 39, y: 36 },
    });

    t.action(heatmap.showWinner, { at: "show-winner" });
  }}
>
  <aside class="notes">
    <Mark id="show-heatmap" />Imagine this is a map...
    <Mark id="show-aggregation" />heat map...
    <Mark id="move-grid" />move the grid...
    <Mark id="show-winner" />here instead.
  </aside>

  <VideoVisual id="heatmap">
    <HeatmapVideoVisual initial={...} client:only="react" />
  </VideoVisual>
</StorySection>
```

`t.visual("heatmap", heatmapVideoDefinition)` creates a typed reference to the
already-rendered visual instance. TypeScript knows the contract: capabilities
such as `heatmap.shiftGrid`, targets such as `heatmap.aggregation`, and action
parameter names/types are checked while authoring. The runtime still validates
the same contract after hydration. Calling `t.visual("id")` without a
definition remains an untyped escape hatch.

React visuals do not repeat their section or visual ids. `useVideoVisual()`
finds the surrounding `<VideoVisual>` and `<StorySection>` wrappers from the
mounted DOM, registers the definition, and returns the deterministic state plus
a ref for the component root.

The timing grammar is shared by actions, transitions and layouts:

- `at: "mark"`: change instantly at the mark;
- `from: "mark"`: animate for 0.5 seconds starting at the mark;
- `to: "mark"`: animate for 0.5 seconds ending at the mark;
- `from: "a", to: "b"`: animate exactly between those marks;
- `duration` may override the 0.5 second default for `from` or `to`, but
  is not allowed with `at` or `from + to`.

Framework presentation methods currently include `fadeIn`, `fadeOut`,
`appear`, `disappear`, `slideIn` and `slideOut`. Root references target
the whole visual, while paths such as `heatmap.aggregation` target internals exposed
by the visual. Presentation state remains framework-owned; opacity, translation
and visibility do not become heatmap domain state.

Visuals that need independently targetable internals should expose those layers
from the shared renderer rather than rebuilding the visual for video. For
example, `HeatmapCanvas` owns the fixed paint order
`backdrop → aggregation → points → origin → border`. The video renderer only
attaches `data-video-target="aggregation"` to that existing aggregation layer,
so interactive and video renderers use the same composition and points remain
above the aggregation colors.

### Persistent split layouts

Multiple instances of the same visual may stay mounted with independent state.
A split only changes layout geometry: it moves/resizes the first visual into
the left half and the second visual into the right half, without replacing
either instance. Entrance/exit presentation is composed separately. The
framework also uses separate DOM wrappers for layout and presentation, so a
layout change never overwrites transition transforms or transforms owned by the
visual itself:

```astro
<StorySection
  id="coffee-demand"
  timeline={(t) => {
    const shifted = t.visual("heatmap", heatmapVideoDefinition);
    const original = t.visual("original", heatmapVideoDefinition);

    t.action(shifted.shiftGrid, {
      from: "move-grid",
      to: "show-winner",
      params: { x: 39, y: 36 },
    });
    t.action(shifted.showWinner, { at: "show-winner" });

    t.split([original, shifted], {
      from: "compare-results",
      duration: 0.8,
    });
    t.slideIn(original, {
      from: "compare-results",
      direction: "left",
      duration: 0.8,
    });
  }}
>
  ...
  <VideoVisual id="heatmap">...</VideoVisual>
  <VideoVisual id="original" videoOnly>...</VideoVisual>
</StorySection>
```

Before `compare-results`, both instances remain mounted. The `slideIn`
transition is what keeps `original` hidden before its entrance; `split` does
not own opacity, visibility or slide offsets. At the mark, `split` changes the
the visible viewport toward a 50/50 layout while `slideIn(original, ...)`
handles the presentation entrance from the left edge. Afterwards both stay
mounted side by side, so their React/component state and deterministic video
state remain independent and seekable. `videoOnly` hides comparison-only
layers in the Reveal renderer. Slide directions name the screen edge: `left`
means enter from, or exit toward, the left edge.

A visual that is hidden when the split starts is prepared at its destination
panel size while hidden. It enters at that size instead of shrinking from
fullscreen over the existing visual. Already-visible visuals still interpolate
their geometry. Slide distance accepts pixels or CSS percentages, and defaults
to `50%` (for example, `distance: "100%"` starts one whole target width away).

A section can opt out of video while remaining available to Reveal:

```astro
<StorySection id="later-slide" video={false}>
  ...
</StorySection>
```

The timeline DSL produces deterministic metadata during Astro rendering. The
browser runtime still evaluates everything as an absolute `time -> state`
function, rather than replaying imperative animation commands. This is what
keeps seek, HMR preview and frame-by-frame MP4 rendering deterministic.

## Interactive preview

From the repository task runner:

```sh
b cheesebytes_web:preview_video \
  src/stories/how-a-heatmap-can-mislead-you.astro \
  /path/to/voice.wav
```

The command:

1. creates a temporary directory;
2. runs faster-whisper once for the supplied WAV;
3. starts Astro with temporary alignment/audio endpoints;
4. opens the video preview in the browser;
5. deletes the temporary directory when the process exits.

The preview has play/pause, a seekable timeline, buttons for semantic marks and
a Tweakpane video inspector. Collapsible folders expose layouts, framework transitions and
component actions declared in the active section.
Each visual capability supplies its own editor schema, so numeric
parameters become sliders/number inputs, enums become selects, booleans become
checkboxes and text stays editable text.

Changing a value in the inspector pauses playback and applies an in-memory
override immediately; no source save, Whisper run or HMR cycle is required.
Use Start/Mid/End to inspect an animation precisely. For `from` or `to`
timing the duration is editable; for `from + to` it is derived from the marks.
Reset returns to the story values, and Copy settings copies the final action or
transition overrides. Split layouts also support duration/easing overrides,
reset and copy. Inspector overrides are intentionally
temporary: the Astro story remains the source of truth.

The video stage itself has pointer events disabled. Visual components are not
interactive during video preview or rendering; only editor chrome such as the
timeline and video inspector accepts input.

Astro HMR keeps the story live. Narration edits are recompiled in
the browser against the already-created word alignment, so changing the Astro,
visual code, CSS or marks does not rerun Whisper. If the WAV itself changes,
restart the preview command.

The same story is also available as a Reveal presentation under
`/present/<story-name>`. Existing named slide pages can simply wrap the shared
story with `PresentationLayout`.

## Render MP4

```sh
b cheesebytes_web:create_video \
  src/stories/how-a-heatmap-can-mislead-you.astro \
  /path/to/voice.wav \
  /path/to/output.mp4
```

Internally the command uses the exact same browser runtime as preview.
Playwright calls `await window.cheeseVideo.renderFrame(frame / fps)`; that
contract applies absolute time, lets React/layout settle, waits for fonts, then
the CLI captures the frame. ffmpeg muxes those deterministic frames with the
original audio. Alignment JSON and frame
PNGs are temporary and are removed even when rendering fails. Only the requested
MP4 remains.

The defaults are 1920x1080 and 30 fps. Override the frame rate with `FPS`, the
rendered prefix with `DURATION`, ffmpeg with `FFMPEG_BIN`, or Chromium with
`CHROME_BIN`. There is no hard-coded video duration: the final spoken word or
trailing mark in the enabled video sections determines it.

## Alignment behavior

The core compiler consumes the framework `WordAlignment` structure and is not
coupled to a speech-to-text engine. The bundled CLI currently provides a
faster-whisper adapter, configured through `video.config.ts`. Compilation
preserves real acoustic pauses and maps each `Mark` to the next spoken token;
a trailing mark maps to the previous token's acoustic end.

The compiler is strict enough to fail on unrelated narration, but it handles two
common transcription artifacts needed by recorded speech:

- a script token split into two or three Whisper words (for example
  `heatmap` vs `heat map`);
- a one-character recognition error for words of at least four characters
  (for example `data` vs `date`).

Content that belongs in speaker notes but is not spoken can be excluded with
`data-video-ignore`.

## Validation

Run the framework tests, standalone Astro consumer fixture, and Cheese Bytes
consumer build from the monorepo root:

```sh
pnpm exec moon run cheese_bytes_video:test
pnpm exec moon run cheese_bytes_video:build
pnpm exec moon run cheesebytes_web:test
```

The framework fixture lives under
`packages/cheese-bytes-video/test/fixture-astro-app` and imports only package
exports. Its build guards the package boundary independently of
`apps/cheesebytes-web`.

Browser integration smoke test (Chromium must already be installed):

```sh
pnpm exec moon run cheesebytes_web:dev -- --port 4399
# In another terminal:
node apps/cheesebytes-web/scripts/video-preview-smoke.mjs http://localhost:4399
```

The smoke test uses synthetic word timestamps to isolate browser/runtime/UI
behavior; it does not validate acoustic alignment. It checks split + slideIn,
reverse seeking, Tweakpane editing/reset, section changes and render mode.

