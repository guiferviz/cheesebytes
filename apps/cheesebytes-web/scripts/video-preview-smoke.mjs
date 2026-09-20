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
      const tokens = [...document.querySelectorAll("[data-video-section] aside.notes")]
        .flatMap((note) => {
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
    await route.fulfill({ json: alignment });
  });
  await page.route("**/__cheesebytes-video/audio", (route) => route.abort());
  const url = base + "/video-preview/how-a-heatmap-can-mislead-you";
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

  const mark = await page.evaluate(
    () =>
      window.cheeseVideo.section("coffee-demand").globalMarks[
        "compare-results"
      ],
  );
  async function seek(time) {
    await page.evaluate((time) => window.cheeseVideo.renderFrame(time), time);
  }
  const original = page.locator(
    '[data-video-section="coffee-demand"] [data-video-visual-instance="original"]',
  );
  const shifted = page.locator(
    '[data-video-section="coffee-demand"] [data-video-visual-instance="heatmap"]',
  );
  const style = (element) =>
    element.evaluate((node) => {
      const layout = node.querySelector(":scope > [data-video-layout]");
      const presentation = layout?.querySelector(
        ":scope > [data-video-presentation]",
      );
      return {
        width: parseFloat(layout?.style.width ?? ""),
        left: parseFloat(layout?.style.left ?? ""),
        opacity: parseFloat(presentation?.style.opacity ?? ""),
        transform: presentation?.style.transform ?? "",
      };
    });
  await seek(mark - 0.1);
  assert.equal((await style(original)).opacity, 0);
  assert.equal((await style(shifted)).width, 100);
  await seek(mark + 0.4);
  const midpoint = await style(original);
  assert.equal(midpoint.width, 50);
  assert(midpoint.opacity > 0 && midpoint.opacity < 1);
  assert(Math.abs((await style(shifted)).width - 75) < 0.001);
  await seek(mark + 0.8);
  assert.equal((await style(original)).opacity, 1);
  assert.equal((await style(shifted)).left, 50);
  await seek(mark + 0.4);
  assert.deepEqual(await style(original), midpoint);

  const inspector = page.getByRole("complementary", {
    name: "Animation settings",
  });
  const folder = inspector
    .locator(".tp-fldv")
    .filter({
      has: page.locator(":scope > button", { hasText: "slideIn → original" }),
    })
    .last();
  await folder.locator(":scope > button").click();
  const duration = folder
    .locator(".tp-lblv")
    .filter({
      has: page.locator(".tp-lblv_l", { hasText: /^Duration$/ }),
    })
    .locator("input");
  await duration.fill("1.6");
  await duration.press("Enter");
  assert.equal(
    await page.evaluate(() => {
      const runtime = window.cheeseVideo;
      const transition = runtime
        .transitionsForSection("coffee-demand")
        .find((item) => item.type === "slideIn");
      return runtime.transitionSettings(transition).duration;
    }),
    1.6,
  );
  await folder.getByRole("button", { name: "Mid", exact: true }).click();
  assert(
    Math.abs(
      (await page.evaluate(() => window.cheeseVideo.time)) - (mark + 0.8),
    ) < 0.001,
  );
  await folder.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(Number(await duration.inputValue()), 0.8);

  const splitFolder = inspector
    .locator(".tp-fldv")
    .filter({
      has: page.locator(":scope > button", {
        hasText: "split · original | heatmap",
      }),
    })
    .last();
  await splitFolder.locator(":scope > button").click();
  const splitDuration = splitFolder
    .locator(".tp-lblv")
    .filter({
      has: page.locator(".tp-lblv_l", { hasText: /^Duration$/ }),
    })
    .locator("input");
  await splitDuration.fill("1.6");
  await splitDuration.press("Enter");
  await seek(mark + 0.8);
  assert(Math.abs((await style(shifted)).width - 75) < 0.001);
  await splitFolder.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal((await style(shifted)).width, 50);

  const actionFolder = inspector
    .locator(".tp-fldv")
    .filter({
      has: page.locator(":scope > button", { hasText: "heatmap.shiftGrid" }),
    })
    .last();
  await actionFolder.locator(":scope > button").click();
  const gridX = actionFolder
    .locator(".tp-lblv")
    .filter({
      has: page.locator(".tp-lblv_l", { hasText: /^Grid X$/ }),
    })
    .locator("input");
  await gridX.fill("70");
  await gridX.press("Enter");
  assert.equal(
    await page.evaluate(() => {
      const runtime = window.cheeseVideo;
      return runtime.actionParams(runtime.actionsForSection("coffee-demand")[0])
        .x;
    }),
    70,
  );
  await actionFolder
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  assert.equal(Number(await gridX.inputValue()), 39);

  // Registration/playhead events must not replace the controls mid-edit.
  const handle = await duration.elementHandle();
  await seek(mark + 0.2);
  assert.equal(await handle.evaluate((node) => node.isConnected), true);
  const secondStart = await page.evaluate(
    () => window.cheeseVideo.section("boundary-choices").start,
  );
  await seek(secondStart + 1);
  assert.equal(
    await inspector
      .getByRole("button", { name: "slideIn → original", exact: true })
      .count(),
    0,
  );
  await seek(mark + 0.4);
  if (process.env.SCREENSHOT)
    await page.screenshot({ path: process.env.SCREENSHOT });
  await page.goto(url + "?render=1");
  await page.waitForFunction(() => window.cheeseVideo?.ready);
  assert.equal(
    await page
      .getByRole("complementary", { name: "Animation settings" })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: split + slideIn, seek backwards, Tweakpane edits/reset, section changes, clean render mode",
  );
} finally {
  await browser.close();
}
