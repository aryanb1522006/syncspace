import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, main, orbit, styles, packageJson] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
  readFile(new URL("../src/orbit-scene.js", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

test("prototype is explicitly a one-account post-and-join experience", () => {
  assert.match(html, /One account\. Build something—or join/);
  assert.match(html, /data-open-action="post"/);
  assert.match(html, /data-open-action="join"/);
  assert.match(main, /getAccountCapabilities/);
});

test("email privacy rule is visible and implemented by shared access logic", () => {
  assert.match(html, /Emails appear only after an application is accepted/);
  assert.match(main, /getVisibleTeamContacts/);
});

test("requested motion libraries are real dependencies and used by the prototype", () => {
  assert.equal(packageJson.dependencies.three, "0.185.1");
  assert.equal(packageJson.dependencies.animejs, "4.5.0");
  assert.match(orbit, /from "three"/);
  assert.match(orbit, /const timer = new THREE\.Timer\(\);\s+timer\.connect\(document\);/);
  assert.match(main, /from "animejs"/);
});

test("motion includes an accessibility fallback", () => {
  assert.match(main, /prefers-reduced-motion/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("major landing sections use one-time scroll-triggered Anime.js reveals", () => {
  assert.equal((html.match(/data-scroll-reveal=/g) ?? []).length, 3);
  assert.match(main, /new IntersectionObserver/);
  assert.match(main, /observer\.unobserve/);
  assert.match(main, /rootMargin: "0px 0px -18% 0px"/);
});

test("prototype copy states that it does not mutate production data", () => {
  assert.match(html, /No production data is changed/);
  assert.match(main, /No production data changed/);
});
