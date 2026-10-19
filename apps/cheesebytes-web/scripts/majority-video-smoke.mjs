// Browser integration test with synthetic timestamps, not an audio-alignment test.
// Start cheesebytes_web:dev first, then pass its URL (default localhost:4399).
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:4399";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
  page.on("requestfailed", (request) => {
    if (!request.url().endsWith("/audio"))
      console.error(request.url(), request.failure());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__cheesebytes-video/alignment.json", async (route) => {
    const alignment = await page.evaluate(async () => {
      const tokenize = (value) =>
        value
          .toLowerCase()
          .replace(/[’']/g, "")
          .match(/[\p{L}\p{N}]+/gu) ?? [];
      const tokens = [
        ...document.querySelectorAll("[data-video-section] aside.notes"),
      ].flatMap((note) => {
        const clone = note.cloneNode(true);
        clone
          .querySelectorAll("[data-video-ignore], [data-video-mark]")
          .forEach((node) => node.remove());
        return tokenize(clone.textContent ?? "");
      });
      return {
        audio: {
          duration: tokens.length * 0.25,
          sha256: "browser-test-fixture",
        },
        words: tokens.map((text, index) => ({
          text,
          start: index * 0.25,
          end: (index + 1) * 0.25,
        })),
      };
    });
    if (process.env.ALIGNMENT_OUTPUT) {
      const fs = await import("node:fs/promises");
      await fs.writeFile(
        process.env.ALIGNMENT_OUTPUT,
        JSON.stringify(alignment),
      );
    }
    await route.fulfill({ json: alignment });
  });
  await page.route("**/__cheesebytes-video/audio", (route) => route.abort());
  const url = base + "/video-preview/majority-vote";
  await page.goto(url);
  await page
    .waitForFunction(
      () =>
        window.cheeseVideo?.ready &&
        [...document.querySelectorAll('astro-island[client="only"]')].every(
          (island) => island.hasAttribute("client-render-time"),
        ),
    )
    .catch(async (error) => {
      console.error(
        await page.evaluate(() => ({
          ready: window.cheeseVideo?.ready,
          error: window.cheeseVideo?.error ?? window.cheeseVideoBootError,
          islands: [...document.querySelectorAll("astro-island")].map((node) =>
            node.outerHTML.slice(0, 500),
          ),
          body: document.body.innerText.slice(0, 2000),
        })),
        errors,
      );
      throw error;
    });
  assert.equal(await page.evaluate(() => window.cheeseVideo.error), null);

  await page.goto(url + "?render=1");
  await page.addStyleTag({
    content: "astro-dev-toolbar {display:none !important}",
  });
  await page.waitForFunction(() => window.cheeseVideo?.ready);
  const fs = await import("node:fs/promises");
  const output =
    process.env.SCREENSHOT_DIR ?? "/tmp/guiferviz-playwright-mcp/majority-vote";
  await fs.mkdir(output, { recursive: true });
  const scenes = [
    "stream",
    "counting",
    "memory",
    "cancel",
    "pair-orders",
    "invariant",
    "online",
    "algorithm",
    "complexity",
    "strength",
    "catch",
    "verify",
    "friend",
    "distributed",
    "merge",
    "privacy",
    "extension",
    "closing",
  ];
  const seek = async (time) =>
    page.evaluate((time) => window.cheeseVideo.renderFrame(time), time);
  const timing = async (id) =>
    page.evaluate((id) => {
      const section = window.cheeseVideo.section(id);
      return {
        start: section.start,
        duration: section.duration,
        marks: section.globalMarks,
      };
    }, id);
  for (const id of scenes) {
    const section = await timing(id);
    await seek(section.start + section.duration - 0.05);
    const visual = page.locator(`[data-majority-scene="${id}"]`);
    assert(await visual.isVisible(), `${id}: visible`);
    // Text must remain within the fixed SVG safe area, including long headings.
    const overflow = await visual.locator("text").evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const b = n.getBBox();
          return (
            b.x < 25 || b.x + b.width > 1575 || b.y < 0 || b.y + b.height > 880
          );
        })
        .map((n) => n.textContent),
    );
    assert.deepEqual(overflow, [], `${id}: typography overflow`);
    await page.screenshot({ path: `${output}/${id}.png` });
  }
  const cancel = await timing("cancel");
  await seek(cancel.marks["pair-one"] + 0.4);
  const first = await page
    .locator('[data-majority-scene="cancel"]')
    .innerHTML();
  await seek((await timing("closing")).start + 1);
  await seek(cancel.marks["pair-one"] + 0.4);
  assert.equal(
    await page.locator('[data-majority-scene="cancel"]').innerHTML(),
    first,
    "reverse seek deterministic",
  );
  await page.screenshot({ path: `${output}/cancel-midpoint.png` });
  const algorithm = await timing("algorithm");
  await seek(algorithm.marks.match + 1.15);
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-strength"),
    "2",
  );
  await seek(algorithm.marks.new + 1.15);
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-candidate"),
    "triangle",
  );
  await seek(algorithm.start + algorithm.duration - 0.05);
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-processed"),
    "10",
  );
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-candidate"),
    "square",
  );
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-strength"),
    "2",
  );
  const verification = await timing("verify");
  await seek(verification.marks.none + 0.35);
  assert.equal(
    await page
      .locator('[data-majority-scene="verify"]')
      .getAttribute("data-verification"),
    "none",
  );
  await page.screenshot({ path: `${output}/verify-no-majority.png` });
  await seek(verification.start + verification.duration - 0.05);
  assert.equal(
    await page
      .locator('[data-majority-scene="verify"]')
      .getAttribute("data-verification"),
    "majority",
  );
  const catchScene = await timing("catch");
  await seek(catchScene.start + catchScene.duration - 0.05);
  assert.equal(
    await page
      .locator('[data-majority-scene="catch"]')
      .getAttribute("data-candidate"),
    "square",
  );
  assert.equal(
    await page
      .locator('[data-majority-scene="catch"]')
      .getAttribute("data-strength"),
    "1",
  );
  const pairOrders = await timing("pair-orders");
  await seek(pairOrders.start + pairOrders.duration - 0.05);
  assert.equal(
    await page.locator("[data-pair-order]").getAttribute("data-survivors"),
    "4",
  );
  const friend = await timing("friend");
  await seek(friend.start + friend.duration - 0.05);
  assert.equal(
    await page
      .locator("[data-friend-summary]")
      .getAttribute("data-friend-summary"),
    "square:3,circle:2",
  );
  const merge = await timing("merge");
  await seek(merge.start + merge.duration - 0.05);
  assert.equal(
    await page
      .locator("[data-merged-strength]")
      .getAttribute("data-merged-strength"),
    "1",
  );
  await seek(algorithm.marks.zero + 1.15);
  assert.equal(
    await page
      .locator('[data-majority-scene="algorithm"]')
      .getAttribute("data-strength"),
    "0",
  );
  await seek(merge.marks.cancel + 1);
  assert.equal(
    await page
      .locator("[data-merged-candidate]")
      .getAttribute("data-merged-strength"),
    null,
    "no final balance while pairs are cancelling",
  );
  await seek(merge.marks.cancel + 3.05);
  assert.equal(
    await page
      .locator("[data-merged-candidate]")
      .getAttribute("data-merged-strength"),
    "1",
  );
  const queuePoint = async (time) => {
    await seek(time);
    return page
      .locator('[data-majority-scene="algorithm"] [data-online-index="2"] > g')
      .evaluate((node) => {
        const m = node.transform.baseVal.consolidate().matrix;
        return { x: m.e, y: m.f };
      });
  };
  const beforeArrival = await queuePoint(algorithm.marks.match + 1.1 - 0.001);
  const afterArrival = await queuePoint(algorithm.marks.match + 1.1 + 0.001);
  assert(
    Math.hypot(
      beforeArrival.x - afterArrival.x,
      beforeArrival.y - afterArrival.y,
    ) < 1,
    "next shape keeps its position across the integer update",
  );
  const cluster = await timing("distributed");
  await seek(cluster.start + cluster.duration - 0.05);
  assert.equal(
    await page
      .locator("[data-cluster-verification]")
      .getAttribute("data-cluster-verification"),
    "6 / 11",
  );
  const application = await timing("privacy");
  await seek(application.start + application.duration - 0.05);
  assert.match(
    await page.locator("[data-application]").textContent(),
    /6 \/ 10/,
  );
  // Verification counts a shape when it has finished reaching its row.
  const scanDuration = verification.marks.none - verification.marks.scan;
  await seek(verification.marks.scan + scanDuration * 0.04);
  assert.match(
    await page.locator('[data-majority-scene="verify"]').textContent(),
    /0 \/ 7/,
  );
  // The narration explains the story: there are no slide titles, cards, or paragraphs.
  assert.equal(
    await page
      .locator("[data-majority-scene] h1, [data-majority-scene] p")
      .count(),
    0,
  );
  for (const id of scenes.filter((id) => id !== "memory")) {
    const section = await timing(id);
    await seek(section.start + section.duration * 0.5);
    const visual = page.locator(`[data-majority-scene="${id}"]`);
    assert(
      (await visual.textContent()).trim().length < 60,
      `${id}: too much visible text`,
    );
    await page.screenshot({ path: `${output}/${id}-motion.png` });
    const before = await visual.locator("svg").innerHTML();
    await seek(section.start + section.duration * 0.5 + 0.2);
    if (
      [
        "stream",
        "counting",
        "cancel",
        "invariant",
        "online",
        "algorithm",
        "complexity",
        "catch",
        "distributed",
        "closing",
      ].includes(id)
    ) {
      assert.notEqual(
        await visual.locator("svg").innerHTML(),
        before,
        `${id}: frozen motion`,
      );
    }
  }
  await page.goto(url + "?render=1");
  await page.addStyleTag({
    content: "astro-dev-toolbar {display:none !important}",
  });
  await page.waitForFunction(() => window.cheeseVideo?.ready);
  assert.equal(
    await page
      .getByRole("complementary", { name: "Animation settings" })
      .count(),
    0,
  );
  await seek((await timing("closing")).start + 1);
  await page.screenshot({ path: `${output}/render-closing.png` });
  if (process.env.DEMO_OUTPUT) {
    const { spawn } = await import("node:child_process");
    await page.setViewportSize({ width: 1280, height: 720 });
    const segments = [
      ["stream", "start", "end", 6],
      ["counting", "count", "simple", 3],
      ["memory", "start", "question", 4],
      ["cancel", "pair-one", "end", 5],
      ["algorithm", "match", "end", 6],
      ["verify", "start", "end", 4],
      ["distributed", "three", "end", 3],
      ["merge", "start", "end", 3],
      ["closing", "start", "end", 3],
    ];
    const encoder = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-r",
      "24",
      "-i",
      "pipe:0",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      process.env.DEMO_OUTPUT,
    ]);
    let encoderError = "";
    encoder.stderr.on("data", (chunk) => (encoderError += chunk));
    const finished = new Promise((resolve, reject) => {
      encoder.on("error", reject);
      encoder.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(encoderError)),
      );
    });
    for (const [id, from, to, duration] of segments) {
      const section = await timing(id);
      const start = section.marks[from];
      const end = section.marks[to] - 0.05;
      for (let frame = 0; frame < duration * 24; frame++) {
        await seek(start + ((end - start) * frame) / (duration * 24 - 1));
        const png = await page.screenshot();
        if (!encoder.stdin.write(png))
          await new Promise((resolve) => encoder.stdin.once("drain", resolve));
      }
      console.log(`Rendered motion preview: ${id}`);
    }
    encoder.stdin.end();
    await finished;
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 18 scenes, minimal text, continuous motion, reverse seeking, candidate replacement, verification, clean render mode",
  );
} finally {
  await browser.close();
}
