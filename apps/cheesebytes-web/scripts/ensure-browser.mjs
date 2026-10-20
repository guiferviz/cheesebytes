import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DEVELOPMENT_CONTAINER === "1") {
  const require = createRequire(new URL("../package.json", import.meta.url));
  const versions = JSON.parse(
    await readFile(
      new URL("../../../tooling/development/versions.json", import.meta.url),
    ),
  );
  assert.equal(
    require("playwright/package.json").version,
    versions.playwright,
    "Rebuild the toolchain for this Playwright version",
  );
  const browser = await require("playwright").chromium.launch({
    headless: true,
  });
  await browser.close();
} else {
  execFileSync(
    "pnpm",
    ["exec", "playwright", "install", "--with-deps", "chromium"],
    { stdio: "inherit" },
  );
}
