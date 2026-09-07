import test from "node:test";
import assert from "node:assert/strict";
import { createInputBuffer } from "../src/input.js";
import { createMatch, step } from "../src/engine.js";
test("quick down-up tap survives until a simulation step", () => {
  for (const [code, action] of [
    ["Space", "jump"],
    ["KeyZ", "attack"],
    ["KeyX", "special"],
  ]) {
    const input = createInputBuffer();
    input.press(code);
    input.release(code);
    const sampled = input.consume();
    assert.equal(sampled[action], true);
    assert.equal(sampled[action + "Pressed"], true);
    assert.deepEqual(input.consume(), {});
  }
});
test("holding retains movement but does not generate repeated press edges", () => {
  const input = createInputBuffer();
  input.press("KeyZ");
  assert.equal(input.consume().attackPressed, true);
  input.press("KeyZ");
  const held = input.consume();
  assert.equal(held.attack, true);
  assert.equal(held.attackPressed, undefined);
  input.release("KeyZ");
  assert.deepEqual(input.consume(), {});
});
test("blur pause cancellation and restart clearing remove both levels and queued taps", () => {
  const input = createInputBuffer();
  input.press("ArrowRight");
  input.press("Space");
  input.release("Space");
  input.clear();
  assert.deepEqual(input.consume(), {});
});
test("direction and attack tapped in a frame preserve directional special", () => {
  const input = createInputBuffer();
  input.press("ArrowUp");
  input.press("KeyX");
  input.release("ArrowUp");
  input.release("KeyX");
  const m = createMatch({ training: true });
  m.phase = "battle";
  step(m, input.consume());
  assert.equal(m.fighters[0].attack.name, "recovery");
});
test("actual engine responds to a quick jump after keyup", () => {
  const input = createInputBuffer();
  const m = createMatch({ training: true });
  m.phase = "battle";
  input.press("Space");
  input.release("Space");
  step(m, input.consume());
  assert.ok(m.fighters[0].y > 0);
  assert.equal(m.fighters[0].jumps, 1);
});
test("actual engine responds to a quick witch special after keyup", () => {
  const input = createInputBuffer();
  const m = createMatch({ player: "witch", training: true });
  m.phase = "battle";
  input.press("KeyX");
  input.release("KeyX");
  step(m, input.consume());
  assert.equal(m.fighters[0].attack.name, "projectile");
});
