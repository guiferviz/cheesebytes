import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/misra-gries/",
  srcDir: fileURLToPath(new URL("./src", import.meta.url)),
  output: "static",
  outDir: process.env.CHEESEBYTES_PREVIEW_OUT,
  publicDir: process.env.CHEESEBYTES_PREVIEW_MEDIA,
  integrations: [react()],
  vite: { resolve: { dedupe: ["react", "react-dom"] } },
});
