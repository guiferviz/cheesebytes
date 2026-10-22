# Misra–Gries interactive preview

This is the real Astro story and React video runtime, published as a static app.
It uses Kokoro narration plus its alignment; it does not embed an MP4 and needs
no server or running Docker container after publication.

From the monorepo root, in the shared development toolchain:

```sh
pnpm --dir apps/cheesebytes-web exec node scripts/build-misra-preview.mjs \
  --audio /media/input/narration-interactive.wav \
  --alignment /media/input/alignment-interactive.json \
  --out /media/output/interactive-preview
```

The equivalent Moon task is `cheesebytes_web:interactive_misra_preview`; pass
those three arguments to the task. Use an output directory outside the checkout.
The builder verifies the supplied audio hash, compresses narration to MP3 and
builds only this page, with content-hashed audio/alignment URLs. Dependencies
come from the existing locked workspace; there is no second installation.

Publish the resulting directory at `/misra-gries/`. Keep the Site identity and
audience in its existing `.openai/hosting.json`. The root Majority Vote app is
independent. In this conversation the destination is the existing private Site
`cheesebytes-majority-preview`.

For a visual-only revision, rebuild and publish. The unchanged narration keeps
its asset identity. If spoken words change, regenerate Kokoro and alignment
before rebuilding; never pair revised narration text with old audio. Source
narration is in `src/stories/misra-gries.astro`, and the visuals/example live in
`src/components/cave/misra-gries/video/`. Paths here are relative to the app.
Do not run the full MP4 renderer for interactive reviews. Export a movie only
when explicitly requested.

The viewer offers play/pause, scrubbing, scene selection, optional animation
settings and fullscreen. Keyboard commands are local to the focused animation:
Space plays/pauses, arrows seek by one second, F enters fullscreen, Escape blurs.
The mobile layout reuses the shared preview controls. Check narrow portrait,
landscape, sound playback and seeking on the compiled static output.
