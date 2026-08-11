import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, main, constellation, baseStyles, joinStyles, packageJson] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
  readFile(new URL("../src/constellation-scene.js", import.meta.url), "utf8"),
  readFile(new URL("../src/immersive-base.css", import.meta.url), "utf8"),
  readFile(new URL("../src/join-first.css", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

test("landing page is Join-first without marketing a unified account", () => {
  assert.match(html, /Find the project that makes you want to show up\./);
  assert.match(html, />Sign up now</);
  assert.match(html, />Join a project</);
  assert.doesNotMatch(html, /unified account/i);
});

test("five project examples appear in the hero and join dialog", () => {
  assert.equal((html.match(/data-project-label=/g) ?? []).length, 5);
  for (const name of ["GreenGrid", "StudyCircle", "Campus Mobility", "OpenLab", "LocalLens"]) {
    assert.match(html, new RegExp(name));
    assert.match(main, new RegExp(name));
  }
});

test("signed-in workspace still exposes both project actions", () => {
  assert.match(html, /data-open-action="post"/);
  assert.match(html, /data-open-action="join"/);
  assert.match(main, /getAccountCapabilities/);
});

test("email privacy rule is visible and implemented by shared access logic", () => {
  assert.match(html, /Emails appear only after an application is accepted/);
  assert.match(main, /getVisibleTeamContacts/);
});

test("Three.js scene and Anime.js remain real dependencies", () => {
  assert.equal(packageJson.dependencies.three, "0.185.1");
  assert.equal(packageJson.dependencies.animejs, "4.5.0");
  assert.match(constellation, /from "three"/);
  assert.match(constellation, /const timer = new THREE\.Timer\(\);\s+timer\.connect\(document\);/);
  assert.match(main, /from "animejs"/);
});

test("new animation uses floating projects and moving signal points", () => {
  assert.match(constellation, /createSignal/);
  assert.match(constellation, /getPointAt\(signalProgress\)/);
  assert.match(constellation, /Math\.sin\(motion \* 0\.34/);
  assert.match(constellation, /pointermove/);
  assert.match(constellation, /setScrollProgress\(value\)/);
});

test("Firefox and unavailable WebGL receive an animated compatibility scene", () => {
  assert.match(constellation, /canvas\.getContext\("webgl2"/);
  assert.match(constellation, /createCompatibilityScene/);
  assert.match(constellation, /webglcontextlost/);
  assert.match(constellation, /rendererReason/);
  assert.match(joinStyles, /constellation-shell--fallback/);
  assert.match(joinStyles, /@keyframes fallback-project-float/);
  assert.match(joinStyles, /@keyframes fallback-join-glow/);
  assert.match(constellation, /canvas\.getBoundingClientRect\(\)/);
  assert.match(constellation, /if \(width === viewportWidth && height === viewportHeight\) return/);
});

test("landing sections retain one-time scroll-triggered reveals", () => {
  assert.equal((html.match(/data-scroll-reveal=/g) ?? []).length, 4);
  assert.match(main, /new IntersectionObserver/);
  assert.match(main, /observer\.unobserve/);
});

test("motion includes reduced-motion styling", () => {
  assert.match(main, /prefers-reduced-motion/);
  assert.match(baseStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(joinStyles, /@media \(max-width: 560px\)/);
});

test("prototype does not mutate production data", () => {
  assert.match(html, /No production data is changed/);
  assert.match(main, /No production data changed/);
});
