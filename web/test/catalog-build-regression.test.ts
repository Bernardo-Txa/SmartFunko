import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home keeps live catalog access out of static deployment builds", async () => {
  const source = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /export const dynamic = ["']force-dynamic["']/);
});

test("session-aware root layout is rendered dynamically", async () => {
  const source = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");

  assert.match(source, /export const dynamic = ["']force-dynamic["']/);
});

test("catalog pagination avoids an exact count over the public view", async () => {
  const source = await readFile(new URL("../src/lib/catalog.ts", import.meta.url), "utf8");

  assert.match(source, /\.select\(catalogCardSelect, \{ count: ["']planned["'] \}\)/);
  assert.doesNotMatch(source, /\.select\(catalogCardSelect, \{ count: ["']exact["'] \}\)/);
});
