import test from "node:test";
import assert from "node:assert/strict";
import { createPageLifecycle, isPauseToggle } from "../src/lifecycle.js";
import { createMatch, pauseMatch, resumeMatch, step } from "../src/engine.js";

test("P and Escape toggle once, never on auto-repeat", () => {
  for (const code of ["KeyP", "Escape"]) {
    assert.equal(isPauseToggle({ code, repeat: false }), true);
    assert.equal(isPauseToggle({ code, repeat: true }), false);
  }
  assert.equal(isPauseToggle({ code: "KeyZ", repeat: false }), false);
});

function fixture() {
  const match = createMatch();
  const calls = [];
  const lifecycle = createPageLifecycle({
    pause() { calls.push("pause"); pauseMatch(match); },
    resetClock() { calls.push("reset"); },
    stopFrame() { calls.push("stop"); },
    startFrame() { calls.push("start"); },
    dispose() { calls.push("dispose"); },
  });
  return { lifecycle, match, calls };
}

test("persisted pagehide keeps resources and returns to a paused resumable match", () => {
  const { lifecycle, match, calls } = fixture();
  lifecycle.hide({ persisted: true });
  assert.deepEqual(calls, ["pause", "reset", "stop"]);
  assert.equal(match.phase, "paused");
  const countdown = match.countdown;
  step(match, {}, 0.05);
  assert.equal(match.countdown, countdown);
  lifecycle.show({ persisted: true });
  assert.deepEqual(calls, ["pause", "reset", "stop", "reset", "start"]);
  assert.equal(match.phase, "paused");
  assert.equal(resumeMatch(match), true);
  step(match, {}, 0.05);
  assert.ok(match.countdown < countdown);
});

test("pageshow cannot start duplicate animation loops", () => {
  const { lifecycle, calls } = fixture();
  lifecycle.show({ persisted: false });
  lifecycle.show({ persisted: true });
  assert.deepEqual(calls, []);
  lifecycle.hide({ persisted: true });
  lifecycle.show({ persisted: true });
  lifecycle.show({ persisted: true });
  assert.equal(calls.filter(c => c === "start").length, 1);
});

test("real unload still tears down exactly once and cannot be restored", () => {
  const { lifecycle, calls } = fixture();
  lifecycle.hide({ persisted: false });
  lifecycle.hide({ persisted: false });
  lifecycle.show({ persisted: true });
  assert.deepEqual(calls, ["pause", "reset", "stop", "dispose"]);
});

test("a cache restore does not consume the later real-unload listener", () => {
  const { lifecycle, calls } = fixture();
  lifecycle.hide({ persisted: true });
  lifecycle.show({ persisted: true });
  lifecycle.hide({ persisted: false });
  assert.equal(calls.filter(c => c === "start").length, 1);
  assert.equal(calls.filter(c => c === "dispose").length, 1);
});
