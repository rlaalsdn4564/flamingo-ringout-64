import test from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  step,
  FIXED_DT,
  pauseMatch,
  resumeMatch,
  moveSpec,
  startAttack,
  cpuInput,
} from "../src/engine.js";
import { FIGHTERS, STAGES } from "../src/data.js";
const match = (options) => {
  const m = createMatch({ ...options });
  m.phase = "battle";
  return m;
};
function advance(m, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / FIXED_DT); i++)
    step(m, typeof input === "function" ? input(m, i) : input, FIXED_DT);
}
test("all four fighters have distinct physical parameters and role specials", () => {
  assert.equal(
    new Set(FIGHTERS.map((f) => [f.speed, f.weight, f.jump].join())).size,
    4,
  );
  assert.equal(new Set(FIGHTERS.map((f) => f.special)).size, 4);
});
test("three platform layouts are distinct and stable", () => {
  assert.equal(new Set(STAGES.map((s) => JSON.stringify(s.platforms))).size, 3);
  for (const s of STAGES) {
    assert.equal(s.platforms.filter((p) => p.solid).length, 1);
    assert.ok(s.platforms.every((p) => p.w > 0 && Number.isFinite(p.y)));
  }
});
test("match starts in countdown then begins with full time", () => {
  const m = createMatch();
  advance(m, 2.5);
  assert.equal(m.phase, "battle");
  assert.ok(m.time > 149.8);
});
test("ground remains solid at rest and friction stops movement", () => {
  const m = match({ training: true });
  advance(m, 0.3, { right: true });
  const x = m.fighters[0].x;
  advance(m, 0.5);
  assert.ok(m.fighters[0].x > x);
  assert.ok(Math.abs(m.fighters[0].vx) < 0.1);
  assert.equal(m.fighters[0].y, 0);
});
test("jump is edge-triggered and only one additional jump is possible", () => {
  const m = match({ training: true });
  step(m, { jump: true });
  assert.equal(m.fighters[0].jumps, 1);
  advance(m, 0.2, { jump: true });
  assert.equal(m.fighters[0].jumps, 1);
  step(m, {});
  step(m, { jump: true });
  assert.equal(m.fighters[0].jumps, 0);
  step(m, {});
  step(m, { jump: true });
  assert.equal(m.fighters[0].jumps, 0);
});
test("up special consumes one recovery until landing", () => {
  const m = match({ training: true }),
    f = m.fighters[0];
  f.y = 2;
  f.grounded = false;
  assert.equal(startAttack(m, f, { up: true }, true), true);
  assert.equal(f.recoveryUsed, true);
  f.attack = null;
  f.cooldown = 0;
  assert.equal(startAttack(m, f, { up: true }, true), false);
  advance(m, 2);
  assert.equal(f.recoveryUsed, false);
});
test("directional attacks are distinct and knight has greater reach", () => {
  const m = match();
  const [a, b] = m.fighters;
  assert.notEqual(
    moveSpec(a, { up: true }).angle,
    moveSpec(a, { down: true }).angle,
  );
  assert.ok(moveSpec(b, {}).reach > moveSpec(a, {}).reach);
});
test("attack hits in facing direction once per activation", () => {
  const m = match({ training: true }),
    [a, b] = m.fighters;
  a.x = 0;
  b.x = 1.4;
  a.facing = 1;
  advance(m, 0.36, { attack: true });
  assert.equal(b.percent, 8);
  advance(m, 0.4, { attack: true });
  assert.equal(b.percent, 8);
});
test("attack does not hit targets behind the attacker", () => {
  const m = match({ training: true }),
    [a, b] = m.fighters;
  a.x = 0;
  b.x = -2;
  a.facing = 1;
  advance(m, 0.36, { attack: true });
  assert.equal(b.percent, 0);
});
test("high percent produces stronger knockback", () => {
  const velocity = [];
  for (const percent of [0, 150]) {
    const m = match({ training: true }),
      [a, b] = m.fighters;
    a.x = 0;
    b.x = 1.4;
    b.percent = percent;
    advance(m, 0.1, { attack: true });
    velocity.push(Math.abs(b.vx));
  }
  assert.ok(velocity[1] > velocity[0] * 2);
});
test("witch projectile is a real moving hitbox", () => {
  const m = match({ player: "witch", training: true }),
    [a, b] = m.fighters;
  a.x = -4;
  b.x = 3;
  advance(m, 0.8, { special: true });
  assert.equal(b.percent, 9);
});
test("shield drains while held and regenerates when released", () => {
  const m = match({ training: true }),
    f = m.fighters[0];
  advance(m, 1, { shield: true });
  assert.ok(f.shield < 80);
  const old = f.shield;
  advance(m, 1);
  assert.ok(f.shield > old);
});
test("fall through only affects elevated platforms", () => {
  const m = match({ training: true }),
    f = m.fighters[0];
  f.x = 0;
  f.y = 5.8;
  f.grounded = true;
  advance(m, 1.4, { down: true });
  assert.equal(f.y, 0);
  assert.equal(f.grounded, true);
});
test("blast zone removes exactly one stock and respawns with invincibility", () => {
  const m = match({ training: true }),
    f = m.fighters[0];
  m.training = false;
  f.x = 23;
  step(m, {});
  assert.equal(f.stocks, 2);
  advance(m, 1);
  assert.equal(f.stocks, 2);
  advance(m, 1.2);
  assert.ok(f.invincible > 1.9);
  assert.equal(f.percent, 0);
  assert.ok(f.y > 0);
});
test("last-stock knockout enters result with winner", () => {
  const m = match(),
    f = m.fighters[0];
  f.stocks = 1;
  f.y = -11;
  step(m);
  assert.equal(m.phase, "result");
  assert.equal(m.winner, 1);
});
test("training timer and stock pool do not expire", () => {
  const m = match({ training: true });
  advance(m, 5);
  assert.equal(m.time, 150);
  m.fighters[0].x = 24;
  step(m);
  assert.equal(m.fighters[0].stocks, 3);
});
test("timeout compares stocks then percentage", () => {
  const m = match();
  m.time = 0.001;
  m.fighters[0].percent = 42;
  m.fighters[1].percent = 43;
  step(m);
  assert.equal(m.phase, "result");
  assert.equal(m.winner, 0);
});
test("exact tie becomes a 200-percent sudden death only once", () => {
  const m = match();
  m.time = 0.001;
  step(m);
  assert.equal(m.suddenDeath, true);
  assert.equal(m.time, 60);
  assert.equal(m.fighters[0].percent, 200);
  m.time = 0.001;
  step(m);
  assert.equal(m.phase, "result");
  assert.equal(m.winner, null);
});
test("pause holds timer, positions and countdown; resume restores phase", () => {
  const m = createMatch();
  assert.equal(pauseMatch(m), true);
  advance(m, 2);
  assert.equal(m.countdown, 2.4);
  assert.equal(resumeMatch(m), true);
  assert.equal(m.phase, "countdown");
  advance(m, 3);
  pauseMatch(m);
  const t = m.time,
    x = m.fighters[0].x;
  advance(m, 4, { right: true });
  assert.equal(m.time, t);
  assert.equal(m.fighters[0].x, x);
  resumeMatch(m);
  step(m, { right: true });
  assert.ok(m.time < t);
});
test("CPU attempts recovery toward centre", () => {
  const m = match(),
    f = m.fighters[1];
  f.x = 13;
  f.y = -2;
  f.grounded = false;
  f.jumps = 0;
  const i = cpuInput(m, f, m.fighters[0], FIXED_DT);
  assert.equal(i.left, true);
  assert.equal(i.up, true);
  assert.equal(i.special, true);
});
test("CPU turns to an opponent who crosses behind at close range", () => {
  const m = match({ cpu: "witch" }),
    [a, b] = m.fighters;
  a.x = -3;
  b.x = -1.6;
  b.facing = 1;
  const input = cpuInput(m, b, a, FIXED_DT);
  assert.equal(input.left, true);
  assert.equal(input.right, false);
});
test("CPU chooses an intermediate foothold to reach a high platform", () => {
  const m = match(),
    [a, b] = m.fighters;
  a.x = 0;
  a.y = 5.8;
  b.x = 4;
  b.y = 0;
  b.grounded = true;
  const input = cpuInput(m, b, a, FIXED_DT);
  assert.equal(input.right, true);
});
test("default beginner gives an idle player time to learn across all opponents", () => {
  for (const cpu of FIGHTERS) {
    const m = createMatch({ cpu: cpu.id, seed: 91 });
    let firstKO = null;
    while (m.phase !== "result" && m.elapsed < 160) {
      step(m, {}, FIXED_DT);
      if (firstKO === null && m.fighters[0].koCount) firstKO = m.elapsed - 2.4;
    }
    assert.ok(firstKO >= 12, `${cpu.id}: first KO ${firstKO}`);
    assert.ok(
      m.elapsed - 2.4 >= 45,
      `${cpu.id}: game length ${m.elapsed - 2.4}`,
    );
    assert.equal(m.phase, "result");
  }
});
test("beginner reacts more slowly than normal without changing fighter stats", () => {
  for (const difficulty of ["beginner", "normal"]) {
    const m = match({ difficulty }),
      f = m.fighters[1];
    cpuInput(m, f, m.fighters[0], FIXED_DT);
    if (difficulty === "beginner") assert.ok(f.cpuClock >= 0.62);
    else assert.ok(f.cpuClock < 0.49);
    assert.equal(f.shield, 100);
  }
});
test("respawn begins over a solid central stage footprint on all stages", () => {
  for (const stage of STAGES) {
    const m = match({ stage: stage.id, training: true }),
      f = m.fighters[0];
    f.x = 23;
    step(m, {});
    advance(m, 2.11);
    const base = m.stage.platforms.find((p) => p.solid);
    assert.ok(Math.abs(f.x - base.x) < base.w / 2);
    assert.equal(f.percent, 0);
    assert.ok(f.invincible > 1.9);
    assert.equal(f.stocks, 3);
    advance(m, 2.4);
    assert.ok(f.y >= 0);
  }
});
test("all fighter-stage CPU pairings stay finite and reach a result", () => {
  for (const stage of STAGES)
    for (let i = 0; i < 4; i++) {
      const m = match({
        player: FIGHTERS[i].id,
        cpu: FIGHTERS[(i + 1) % 4].id,
        stage: stage.id,
        seed: 123 + i,
      });
      for (let n = 0; n < 24000 && m.phase !== "result"; n++) {
        const controls = cpuInput(m, m.fighters[0], m.fighters[1], FIXED_DT);
        step(m, controls);
        for (const f of m.fighters)
          assert.ok([f.x, f.y, f.vx, f.vy, f.percent].every(Number.isFinite));
      }
      assert.equal(m.phase, "result", `${stage.id}/${FIGHTERS[i].id}`);
      assert.ok(
        m.fighters.some((f) => f.percent > 0 || f.koCount > 0),
        "combat happened",
      );
    }
});
