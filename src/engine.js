import { getFighter, getStage, clamp } from "./data.js";
export const FIXED_DT = 1 / 120;
const emptyInput = () => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  special: false,
  shield: false,
});
export function createFighter(id, index) {
  return {
    id,
    index,
    x: index ? 4 : -4,
    y: 0,
    vx: 0,
    vy: 0,
    facing: index ? -1 : 1,
    grounded: true,
    jumps: 2,
    percent: 0,
    stocks: 3,
    shield: 100,
    stun: 0,
    invincible: 0,
    attack: null,
    cooldown: 0,
    recoveryUsed: false,
    respawn: 0,
    ledge: 0,
    pose: "idle",
    age: 0,
    lastInput: emptyInput(),
    cpuClock: 0,
    cpuBeat: 0,
    landed: 0,
    koCount: 0,
  };
}
export function createMatch({
  player = "coral",
  cpu = "knight",
  stage = "palace",
  training = false,
  difficulty = "beginner",
  seed = 91,
} = {}) {
  return {
    stage: getStage(stage),
    fighters: [createFighter(player, 0), createFighter(cpu, 1)],
    time: 150,
    elapsed: 0,
    phase: "countdown",
    countdown: 2.4,
    training,
    difficulty,
    seed,
    events: [],
    particles: [],
    projectiles: [],
    hitstop: 0,
    koFlash: 0,
    winner: null,
    suddenDeath: false,
  };
}
const random = (m) => {
  m.seed = (Math.imul(m.seed, 1664525) + 1013904223) >>> 0;
  return m.seed / 4294967296;
};
function event(m, type, extra = {}) {
  m.events.push({ type, ...extra });
  if (m.events.length > 40) m.events.shift();
}
export function moveSpec(f, input, special = false) {
  const d = getFighter(f.id),
    air = !f.grounded;
  let type = input.up ? "up" : input.down ? "down" : "side";
  if (special && input.up)
    return {
      name: "recovery",
      damage: 8 * d.power,
      knock: 5.5,
      reach: 2.6,
      duration: 0.65,
      active: 0.08,
      angle: 1.25,
    };
  if (special && f.id === "witch" && !input.down)
    return {
      name: "projectile",
      damage: 9,
      knock: 4.5,
      reach: 2,
      duration: 0.58,
      active: 0.16,
      angle: 0.45,
    };
  return {
    name: (special ? "special-" : air ? "air-" : "") + type,
    damage:
      (special ? 17 : type === "down" ? 10 : type === "up" ? 11 : 8) * d.power,
    knock: special ? 7 : type === "up" ? 5.5 : 3.6,
    reach:
      (f.id === "knight" ? 3.1 : f.id === "chef" ? 2.5 : 2.2) +
      (special ? 0.65 : 0),
    duration: special ? 0.75 : 0.37,
    active: special ? 0.19 : 0.07,
    angle: type === "up" ? 1.27 : type === "down" && air ? -0.95 : 0.48,
  };
}
export function startAttack(m, f, input, special) {
  if (f.stun > 0 || f.cooldown > 0 || f.attack || f.respawn > 0 || f.ledge > 0)
    return false;
  const spec = moveSpec(f, input, special);
  if (spec.name === "recovery") {
    if (f.recoveryUsed) return false;
    f.recoveryUsed = true;
    f.grounded = false;
    f.vy = getFighter(f.id).jump * 1.12;
    f.vx = f.facing * 4.2;
  }
  f.attack = { ...spec, t: 0, hit: [], spawned: false };
  f.cooldown = spec.duration + 0.11;
  if (special && spec.name === "special-side")
    f.vx = f.facing * (f.id === "coral" ? 11 : 6);
  event(m, "swing", { fighter: f.index, special });
  return true;
}
function strike(m, source, target, spec, direction = source.facing) {
  if (target.invincible > 0 || target.respawn > 0) return false;
  if (target.pose === "shield" && target.shield > 0) {
    target.shield = Math.max(0, target.shield - spec.damage * 2.1);
    target.vx = direction * 2.8;
    event(m, "block", { x: target.x, y: target.y + 1.2 });
    if (target.shield === 0) {
      target.stun = 2;
      target.vy = 5;
      target.grounded = false;
      event(m, "break", { fighter: target.index });
    }
    return true;
  }
  const d = getFighter(target.id);
  target.percent = Math.min(999, target.percent + spec.damage);
  const accumulated =
    target.percent <= 60
      ? target.percent * 0.045
      : 2.7 + (target.percent - 60) * 0.19;
  const force = (spec.knock + accumulated) / d.weight;
  target.vx = Math.cos(spec.angle) * force * direction;
  target.vy = Math.sin(spec.angle) * force;
  target.grounded = false;
  target.stun = Math.min(1.1, 0.16 + force * 0.016);
  target.invincible = 0.09;
  target.attack = null;
  m.hitstop = 0.045;
  m.koFlash = 0.08;
  event(m, "hit", {
    x: target.x,
    y: target.y + 1.3,
    strong: force > 23,
    source: source.index,
  });
  return true;
}
export function cpuInput(m, f, target, dt) {
  const input = emptyInput();
  if (f.respawn > 0 || f.stun > 0) return input;
  f.cpuClock -= dt;
  const beginner = m.difficulty === "beginner";
  if (f.cpuClock <= 0) {
    f.cpuClock = beginner ? 0.62 + random(m) * 0.35 : 0.28 + random(m) * 0.2;
    f.cpuBeat++;
    f.cpuChoice = random(m);
  }
  const diff = target.x - f.x,
    center = -f.x;
  if (!f.grounded && (Math.abs(f.x) > m.stage.width - 1 || f.y < -1)) {
    input.left = center < 0;
    input.right = center > 0;
    if (f.vy < 1 && f.jumps > 0) input.jump = f.cpuBeat % 2 === 0;
    if (f.y < -1.5 && f.jumps === 0 && !f.recoveryUsed) {
      input.up = true;
      input.special = true;
    }
    return input;
  }
  if (Math.abs(diff) > 1.9) {
    input.left = diff < 0;
    input.right = diff > 0;
  }
  if (Math.abs(diff) > 0.15 && Math.sign(diff) !== f.facing) {
    input.left = diff < 0;
    input.right = diff > 0;
  }
  if (target.y > f.y + 1.8 && f.grounded) input.jump = f.cpuBeat % 3 === 0;
  if (target.y > f.y + 3.5 && f.grounded) {
    const footholds = m.stage.platforms.filter(
      (p) => p.y > f.y + 0.5 && p.y < f.y + 3.65,
    );
    footholds.sort(
      (a, b) =>
        Math.abs(a.x - f.x) +
        Math.abs(a.x - target.x) * 0.4 -
        (Math.abs(b.x - f.x) + Math.abs(b.x - target.x) * 0.4),
    );
    if (footholds[0]) {
      const p = footholds[0],
        dx = p.x - f.x;
      input.left = dx < -0.3;
      input.right = dx > 0.3;
      input.jump = Math.abs(dx) < p.w / 2 + 1 && f.cpuBeat % 3 === 0;
    }
  }
  if (target.y < f.y - 1.8 && f.grounded && f.y > 0) input.down = true;
  if (Math.abs(diff) < 3.1 && Math.abs(target.y - f.y) < 2.4) {
    input.attack = f.cpuBeat % 3 === 0;
    input.special = f.cpuBeat % (beginner ? 9 : 7) === 0;
    input.up = target.y > f.y + 1 || f.cpuChoice > 0.82;
    input.down = f.cpuChoice < 0.14;
    input.shield = !!target.attack && f.cpuChoice > 0.63;
  }
  if (
    beginner &&
    (target.stun > 0 || target.respawn > 0 || target.invincible > 0)
  ) {
    input.attack = false;
    input.special = false;
    if (Math.abs(f.x) < m.stage.width - 2) {
      input.left = false;
      input.right = false;
    }
  }
  if (f.grounded && Math.abs(f.x) > m.stage.width - 1) {
    input.left = f.x > 0;
    input.right = f.x < 0;
  }
  return input;
}
function knockOut(m, f) {
  f.stocks--;
  f.koCount++;
  f.respawn = 2.1;
  f.attack = null;
  f.vx = 0;
  f.vy = 0;
  f.pose = "ko";
  m.koFlash = 0.7;
  event(m, "ko", { fighter: f.index, x: f.x, y: f.y });
  if (m.training) f.stocks = 3;
  if (f.stocks <= 0) {
    m.phase = "result";
    m.winner = 1 - f.index;
    event(m, "finish", { winner: m.winner });
  }
}
function simulateFighter(m, f, input, dt) {
  const d = getFighter(f.id);
  f.age += dt;
  f.stun = Math.max(0, f.stun - dt);
  f.invincible = Math.max(0, f.invincible - dt);
  f.cooldown = Math.max(0, f.cooldown - dt);
  f.landed = Math.max(0, f.landed - dt);
  if (f.respawn > 0) {
    f.respawn -= dt;
    if (f.respawn <= 0) {
      f.x = f.index ? 3 : -3;
      f.y = 7;
      f.vx = f.vy = 0;
      f.percent = 0;
      f.invincible = 2.2;
      f.grounded = false;
      f.jumps = 2;
      f.recoveryUsed = false;
      f.shield = 100;
    }
    f.lastInput = { ...input };
    return;
  }
  if (f.ledge > 0) {
    f.ledge -= dt;
    f.pose = "ledge";
    if (input.jump || input.up) {
      f.ledge = 0;
      f.vy = d.jump;
      f.x += f.facing * 0.5;
      f.jumps = 1;
    } else {
      f.lastInput = { ...input };
      return;
    }
  }
  const allowed = f.stun <= 0;
  const shielding =
    allowed && input.shield && f.grounded && f.shield > 0 && !f.attack;
  if (shielding) f.shield = Math.max(0, f.shield - dt * 22);
  else f.shield = Math.min(100, f.shield + dt * 12);
  const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (allowed && !shielding) {
    if (horizontal) {
      f.facing = horizontal;
      f.vx += horizontal * d.speed * dt * (f.grounded ? 14 : 6);
      f.vx = clamp(f.vx, -d.speed, d.speed);
    } else f.vx *= Math.exp(-dt * (f.grounded ? 16 : 1.3));
    if (
      (input.jumpPressed || (input.jump && !f.lastInput.jump)) &&
      f.jumps > 0
    ) {
      f.vy = d.jump * (f.jumps === 1 ? 0.94 : 1);
      f.grounded = false;
      f.jumps--;
      f.ledge = 0;
      event(m, "jump", { fighter: f.index, x: f.x, y: f.y });
    }
    if (input.attackPressed || (input.attack && !f.lastInput.attack))
      startAttack(m, f, input, false);
    if (input.specialPressed || (input.special && !f.lastInput.special))
      startAttack(m, f, input, true);
  } else f.vx *= Math.exp(-dt * (shielding ? 16 : 0.7));
  if (f.attack) {
    f.attack.t += dt;
    if (
      f.attack.name === "projectile" &&
      !f.attack.spawned &&
      f.attack.t >= f.attack.active
    ) {
      f.attack.spawned = true;
      m.projectiles.push({
        owner: f.index,
        x: f.x + f.facing,
        y: f.y + 1.8,
        vx: f.facing * 12,
        life: 1.7,
        spec: { ...f.attack },
      });
      event(m, "projectile", { fighter: f.index });
    }
    if (f.attack.t >= f.attack.duration) f.attack = null;
  }
  const oldY = f.y;
  f.x += f.vx * dt;
  if (!f.grounded) f.vy -= 24 * dt * (input.down && f.vy < 0 ? 1.6 : 1);
  f.y += f.vy * dt;
  const canLand = f.vy <= 0;
  f.grounded = false;
  if (canLand) {
    for (const p of [...m.stage.platforms].sort((a, b) => b.y - a.y)) {
      if (
        Math.abs(f.x - p.x) <= p.w / 2 + 0.18 &&
        oldY >= p.y - 0.04 &&
        f.y <= p.y &&
        !(input.down && !p.solid)
      ) {
        f.y = p.y;
        f.vy = 0;
        f.grounded = true;
        f.jumps = 2;
        f.recoveryUsed = false;
        if (oldY > p.y + 0.04) f.landed = 0.18;
        break;
      }
    }
  }
  if (
    !f.grounded &&
    f.vy < 0 &&
    f.stun <= 0 &&
    f.y > -0.9 &&
    f.y < 0.25 &&
    Math.abs(Math.abs(f.x) - m.stage.width) < 0.6 &&
    !input.down
  ) {
    f.x = Math.sign(f.x) * (m.stage.width + 0.3);
    f.y = -0.6;
    f.vx = f.vy = 0;
    f.ledge = 1.3;
    f.facing = -Math.sign(f.x);
    f.invincible = 0.45;
    f.jumps = 1;
    f.recoveryUsed = false;
    event(m, "ledge", { fighter: f.index });
  }
  f.pose =
    f.stun > 0
      ? "hit"
      : shielding
        ? "shield"
        : f.attack
          ? f.attack.name
          : !f.grounded
            ? f.vy > 0
              ? "jump"
              : "fall"
            : Math.abs(f.vx) > 1
              ? "run"
              : "idle";
  if (f.x < -22 || f.x > 22 || f.y < -10 || f.y > 21) knockOut(m, f);
  f.lastInput = { ...input };
}
export function step(m, playerInput = {}, dt = FIXED_DT) {
  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    m.phase === "result" ||
    m.phase === "paused"
  )
    return;
  dt = Math.min(dt, 0.05);
  m.events = [];
  m.elapsed += dt;
  m.koFlash = Math.max(0, m.koFlash - dt);
  if (m.phase === "countdown") {
    m.countdown -= dt;
    if (m.countdown <= 0) {
      m.phase = "battle";
      event(m, "go");
    }
    return;
  }
  if (m.hitstop > 0) {
    m.hitstop = Math.max(0, m.hitstop - dt);
    return;
  }
  if (!m.training) m.time = Math.max(0, m.time - dt);
  if (m.time === 0) {
    const [a, b] = m.fighters;
    if (
      a.stocks === b.stocks &&
      Math.abs(a.percent - b.percent) < 0.01 &&
      !m.suddenDeath
    ) {
      m.suddenDeath = true;
      m.time = 60;
      a.percent = b.percent = 200;
      event(m, "sudden");
    } else {
      m.winner =
        a.stocks !== b.stocks
          ? a.stocks > b.stocks
            ? 0
            : 1
          : a.percent !== b.percent
            ? a.percent < b.percent
              ? 0
              : 1
            : null;
      m.phase = "result";
      event(m, "finish", { winner: m.winner });
      return;
    }
  }
  const inputs = [
    { ...emptyInput(), ...playerInput },
    m.training ? emptyInput() : cpuInput(m, m.fighters[1], m.fighters[0], dt),
  ];
  for (let i = 0; i < 2; i++) simulateFighter(m, m.fighters[i], inputs[i], dt);
  for (const source of m.fighters) {
    const a = source.attack;
    if (
      !a ||
      a.name === "projectile" ||
      a.t < a.active ||
      a.t > a.duration * 0.75
    )
      continue;
    const target = m.fighters[1 - source.index];
    const horizontal = (target.x - source.x) * source.facing;
    const vertical = Math.abs(
      target.y + 1.2 - (source.y + (a.name.includes("up") ? 2 : 1.2)),
    );
    if (
      !a.hit.includes(target.index) &&
      horizontal >= -0.45 &&
      horizontal < a.reach &&
      vertical < (a.name.includes("up") ? 2.7 : 2)
    ) {
      if (strike(m, source, target, a)) a.hit.push(target.index);
    }
  }
  for (const p of m.projectiles) {
    p.x += p.vx * dt;
    p.life -= dt;
    const target = m.fighters[1 - p.owner];
    if (
      Math.abs(p.x - target.x) < 0.75 &&
      Math.abs(p.y - target.y - 1.3) < 1.15
    ) {
      if (strike(m, m.fighters[p.owner], target, p.spec, Math.sign(p.vx)))
        p.life = 0;
    }
  }
  m.projectiles = m.projectiles.filter((p) => p.life > 0);
}
export function pauseMatch(m) {
  if (m.phase === "battle" || m.phase === "countdown") {
    m.beforePause = m.phase;
    m.phase = "paused";
    for (const f of m.fighters) f.lastInput = emptyInput();
    return true;
  }
  return false;
}
export function resumeMatch(m) {
  if (m.phase === "paused") {
    m.phase = m.beforePause || "battle";
    return true;
  }
  return false;
}
