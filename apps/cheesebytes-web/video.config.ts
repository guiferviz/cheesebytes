import { defineVideoConfig } from "@guiferviz/cheese-bytes-video/config";

export default defineVideoConfig({
  stories: "./src/stories/*.astro",
  previewRoute: "/video-preview/[story]",
  render: {
    width: 1920,
    height: 1080,
    fps: 30,
  },
  alignment: {
    provider: "whisper",
    model: "base.en",
    language: "en",
  },
});
