import { parseArgs } from "node:util";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const { values } = parseArgs({
  options: {
    audio: { type: "string" },
    alignment: { type: "string" },
    out: { type: "string" },
  },
});
if (!values.audio || !values.alignment || !values.out)
  throw new Error(
    "Usage: node scripts/build-misra-preview.mjs --audio WAV --alignment JSON --out DIRECTORY",
  );
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stage = await mkdtemp(join(tmpdir(), "misra-preview-"));
const publicDir = join(stage, "public");
const media = join(publicDir, "media");
const hash = (data) =>
  createHash("sha256").update(data).digest("hex").slice(0, 16);
function run(command, args, env = process.env) {
  const r = spawnSync(command, args, { cwd: app, env, stdio: "inherit" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${command} exited ${r.status}`);
}
try {
  await mkdir(media, { recursive: true });
  await cp(join(app, "public/fonts"), join(publicDir, "fonts"), {
    recursive: true,
  });
  const alignment = JSON.parse(
    await readFile(resolve(values.alignment), "utf8"),
  );
  if (!alignment.words?.length)
    throw new Error("Alignment has no narration words");
  const inputAudio = resolve(values.audio),
    wav = await readFile(inputAudio);
  const { createHash: cryptoHash } = await import("node:crypto");
  if (
    alignment.audio?.sha256 &&
    alignment.audio.sha256 !== cryptoHash("sha256").update(wav).digest("hex")
  )
    throw new Error("Audio and alignment hashes differ");
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    inputAudio,
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "96k",
    join(stage, "voice.mp3"),
  ]);
  const voice = await readFile(join(stage, "voice.mp3")),
    voiceName = `voice-${hash(voice)}.mp3`;
  await writeFile(join(media, voiceName), voice);
  alignment.audio.sha256 = cryptoHash("sha256").update(voice).digest("hex");
  const json = JSON.stringify(alignment),
    alignmentName = `alignment-${hash(json)}.json`;
  await writeFile(join(media, alignmentName), json);
  run("pnpm", ["exec", "astro", "build", "--root", resolve(app, "preview")], {
    ...process.env,
    CHEESEBYTES_PREVIEW_OUT: resolve(values.out),
    CHEESEBYTES_PREVIEW_MEDIA: publicDir,
    PUBLIC_MISRA_AUDIO: `/misra-gries/media/${voiceName}`,
    PUBLIC_MISRA_ALIGNMENT: `/misra-gries/media/${alignmentName}`,
  });
  console.log(
    JSON.stringify({
      directory: resolve(values.out),
      audio: `media/${voiceName}`,
      alignment: `media/${alignmentName}`,
    }),
  );
} finally {
  await rm(stage, { recursive: true, force: true });
}
