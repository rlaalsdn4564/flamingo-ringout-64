import * as T from "three";
import { getFighter } from "./data.js";
const materials = new Map();
export function material(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new T.MeshLambertMaterial({ color, flatShading: true }),
    );
  materials.get(color).userData.shared = true;
  return materials.get(color);
}
export function mesh(
  parent,
  geometry,
  color,
  pos = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const m = new T.Mesh(
    geometry,
    typeof color === "object" ? color : material(color),
  );
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function ellipsoid(parent, color, pos, scale, segments = 10) {
  return mesh(parent, new T.SphereGeometry(1, segments, 6), color, pos, scale);
}
export function box(parent, color, pos, size) {
  return mesh(parent, new T.BoxGeometry(...size), color, pos);
}
export function cylinder(parent, color, pos, top, bottom, height, sides = 8) {
  return mesh(
    parent,
    new T.CylinderGeometry(top, bottom, height, sides),
    color,
    pos,
  );
}
export function tube(parent, color, points, radius = 0.1, sides = 7) {
  return mesh(
    parent,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      Math.max(6, points.length * 3),
      radius,
      sides,
      false,
    ),
    color,
  );
}
export function group(parent, pos = [0, 0, 0]) {
  const g = new T.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
}
export function createRig(id) {
  const root = new T.Group(),
    d = getFighter(id),
    skin =
      id === "witch"
        ? 0xe5a0be
        : id === "knight"
          ? 0xf28e99
          : id === "chef"
            ? 0xfa9682
            : 0xf36c7b;
  const ink = 0x242333,
    light = 0xffc2b7,
    foot = 0xd95049;
  const torso = group(root, [0, 1.24, 0]);
  const stout =
    id === "chef" ? 1.5 : id === "knight" ? 1.18 : id === "witch" ? 0.8 : 1;
  ellipsoid(torso, skin, [0, 0.25, 0], [0.44 * stout, 0.62, 0.34 * stout]);
  ellipsoid(torso, light, [0, 0.2, 0.245], [0.33 * stout, 0.44, 0.13]);
  // A bent S-neck, hooked beak and tall articulated legs establish a bird silhouette.
  const neck = group(torso, [0, 0.5, 0]);
  tube(
    neck,
    skin,
    [
      [0, 0, 0],
      [0, 0.2, 0.16],
      [0, 0.55, 0.22],
      [0, 0.77, 0.02],
      [0, 0.94, 0.01],
    ],
    0.14,
  );
  const head = group(neck, [0, 0.93, 0.02]);
  ellipsoid(head, light, [0, 0.03, 0.02], [0.27, 0.27, 0.24]);
  tube(
    head,
    0xffd29b,
    [
      [0, 0.015, 0.17],
      [0, -0.015, 0.36],
      [0, -0.13, 0.45],
    ],
    0.125,
  );
  tube(
    head,
    ink,
    [
      [0, -0.1, 0.44],
      [0, -0.23, 0.47],
      [0, -0.28, 0.4],
    ],
    0.096,
  );
  for (const s of [-1, 1]) {
    ellipsoid(head, 0xfff5cf, [s * 0.218, 0.075, 0.12], [0.058, 0.105, 0.09]);
    ellipsoid(head, ink, [s * 0.251, 0.073, 0.15], [0.022, 0.064, 0.044]);
    box(head, skin, [s * 0.215, 0.18, 0.1], [0.09, 0.025, 0.19]).rotation.z =
      -s * 0.25;
  }
  const tail = group(torso, [0, 0.1, -0.27]);
  for (let i = 0; i < 3; i++)
    ellipsoid(
      tail,
      0xac4165,
      [(i - 1) * 0.13, 0, -0.18],
      [0.13, 0.14, 0.42],
    ).rotation.x = -0.45;
  const wings = [],
    forearms = [],
    legs = [],
    knees = [],
    feet = [];
  for (const s of [-1, 1]) {
    const wing = group(torso, [s * 0.38 * stout, 0.42, 0]);
    wings.push(wing);
    ellipsoid(wing, skin, [s * 0.12, -0.24, 0], [0.16, 0.37, 0.17]).rotation.z =
      s * 0.32;
    const fore = group(wing, [s * 0.23, -0.48, 0]);
    forearms.push(fore);
    ellipsoid(fore, light, [0, -0.22, 0.02], [0.19, 0.29, 0.135]);
    for (let i = 0; i < 3; i++)
      ellipsoid(fore, skin, [(i - 1) * 0.09, -0.4, 0.02], [0.069, 0.2, 0.071]);
    const leg = group(root, [s * 0.2 * stout, 1.28, 0]);
    legs.push(leg);
    cylinder(leg, foot, [0, -0.28, 0.05], 0.072, 0.06, 0.61, 7).rotation.x =
      -0.16;
    const knee = group(leg, [0, -0.57, 0.1]);
    knees.push(knee);
    ellipsoid(knee, skin, [0, 0, 0], [0.09, 0.1, 0.09]);
    cylinder(knee, foot, [0, -0.3, -0.06], 0.047, 0.047, 0.6, 7).rotation.x =
      0.19;
    const shoe = group(knee, [0, -0.61, -0.12]);
    feet.push(shoe);
    const geom = new T.BufferGeometry();
    geom.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          -0.18, 0, 0.35, 0.18, 0, 0.35, 0, 0, -0.05, -0.18, 0.07, 0.35, 0,
          0.08, -0.05, 0.18, 0.07, 0.35, -0.18, 0, 0.35, -0.18, 0.07, 0.35,
          0.18, 0.07, 0.35, -0.18, 0, 0.35, 0.18, 0.07, 0.35, 0.18, 0, 0.35, 0,
          0, -0.05, 0, 0.08, -0.05, -0.18, 0.07, 0.35, 0, 0, -0.05, -0.18, 0.07,
          0.35, -0.18, 0, 0.35, 0.18, 0, 0.35, 0.18, 0.07, 0.35, 0, 0.08, -0.05,
          0.18, 0, 0.35, 0, 0.08, -0.05, 0, 0, -0.05,
        ],
        3,
      ),
    );
    geom.computeVertexNormals();
    mesh(shoe, geom, foot);
  }
  const accessories = [];
  if (id === "coral") {
    // Fast, short sports jacket, oversized gloves and striped trainers.
    ellipsoid(torso, 0x0a727c, [0, 0.07, -0.06], [0.47, 0.37, 0.35]);
    ellipsoid(torso, 0xf8e4a0, [0, 0.1, 0.27], [0.27, 0.28, 0.06]);
    box(head, 0xdc373f, [0, 0.15, 0], [0.51, 0.075, 0.4]);
    for (const s of [-1, 1]) {
      const scarf = tube(
        head,
        0xdd394c,
        [
          [s * 0.12, 0.14, -0.16],
          [s * 0.25, 0.12, -0.4],
          [s * 0.37, 0.25, -0.68],
        ],
        0.065,
      );
      accessories.push(scarf);
    }
    forearms.forEach((a, i) => {
      ellipsoid(a, 0xe93d32, [0, -0.2, 0.13], [0.23, 0.27, 0.23]);
      cylinder(a, 0xffeed9, [0, -0.03, 0.08], 0.15, 0.16, 0.11);
    });
    feet.forEach((a) => {
      ellipsoid(a, 0xf5efdf, [0, 0.085, 0.14], [0.19, 0.15, 0.34]);
      box(a, 0x107987, [0, 0.12, 0.25], [0.38, 0.07, 0.12]);
    });
  } else if (id === "chef") {
    ellipsoid(torso, 0xf0eee0, [0, 0.17, 0], [0.67, 0.56, 0.48]);
    box(torso, 0x3b5761, [0, -0.21, 0.2], [0.93, 0.14, 0.6]);
    for (const s of [-1, 1])
      for (let j = 0; j < 3; j++)
        ellipsoid(
          torso,
          ink,
          [s * 0.16, 0.44 - j * 0.16, 0.446],
          [0.035, 0.035, 0.018],
          6,
        );
    tube(
      neck,
      0xb92437,
      [
        [-0.2, 0.1, 0.02],
        [0, 0.04, 0.23],
        [0.2, 0.1, 0.02],
      ],
      0.095,
    );
    cylinder(head, 0xf6f1da, [0, 0.38, 0], 0.24, 0.24, 0.32);
    for (let i = 0; i < 5; i++)
      ellipsoid(
        head,
        0xfff9e8,
        [Math.cos(i * 1.26) * 0.17, 0.63, Math.sin(i * 1.26) * 0.15],
        [0.23, 0.23, 0.22],
      );
    const pan = group(forearms[1], [0, -0.42, 0.14]);
    box(pan, 0x855431, [0, -0.13, 0], [0.075, 0.4, 0.075]);
    cylinder(pan, 0x333b40, [0, -0.51, 0], 0.46, 0.4, 0.095, 12).rotation.x =
      Math.PI / 2;
    const inner = cylinder(
      pan,
      0x667777,
      [0, -0.51, 0.054],
      0.32,
      0.32,
      0.012,
      12,
    );
    inner.rotation.x = Math.PI / 2;
    accessories.push(pan);
    feet.forEach((a) => ellipsoid(a, ink, [0, 0.09, 0.12], [0.23, 0.14, 0.34]));
  } else if (id === "knight") {
    ellipsoid(torso, 0x287f9e, [0, 0.25, 0], [0.56, 0.58, 0.41]);
    ellipsoid(torso, 0x9de1d9, [0, 0.29, 0.34], [0.32, 0.35, 0.11]);
    box(torso, 0xd8bd70, [0, -0.19, 0.07], [1.01, 0.14, 0.65]);
    cylinder(head, 0x3b839d, [0, 0.11, -0.015], 0.3, 0.32, 0.45, 10);
    ellipsoid(head, light, [0, 0.005, 0.21], [0.23, 0.23, 0.15]);
    tube(
      head,
      0xf38385,
      [
        [0, 0.37, 0],
        [0, 0.6, -0.15],
        [0, 0.66, -0.41],
      ],
      0.14,
    );
    for (const [i, a] of wings.entries())
      ellipsoid(a, 0xadd6ce, [0, 0, 0], [0.3, 0.2, 0.28]);
    const spear = group(forearms[1], [0, -0.4, 0.06]);
    cylinder(spear, 0xbda268, [0, 0.1, 0], 0.045, 0.045, 2.65);
    mesh(spear, new T.ConeGeometry(0.18, 0.5, 5), 0xbce6e2, [0, 1.66, 0]);
    accessories.push(spear);
    const shield = group(forearms[0], [0, -0.18, 0.24]);
    ellipsoid(shield, 0x194d6d, [0, 0, 0], [0.38, 0.53, 0.11]);
    ellipsoid(shield, 0xe0bf75, [0, 0, 0.05], [0.28, 0.43, 0.075]);
    ellipsoid(shield, 0x4a9fbc, [0, 0, 0.1], [0.21, 0.34, 0.05]);
    accessories.push(shield);
    knees.forEach((a) =>
      ellipsoid(a, 0x7fbdbd, [0, -0.15, 0], [0.13, 0.23, 0.14]),
    );
    feet.forEach((a) =>
      ellipsoid(a, 0x287390, [0, 0.09, 0.1], [0.19, 0.17, 0.37]),
    );
  } else {
    cylinder(torso, 0x2b324d, [0, -0.18, 0], 0.28, 0.64, 0.86, 9);
    tube(
      torso,
      0xdfba64,
      [
        [-0.4, -0.59, 0.27],
        [0, -0.62, 0.54],
        [0.4, -0.59, 0.27],
      ],
      0.047,
    );
    const cape = mesh(
      torso,
      new T.ConeGeometry(0.7, 1.45, 7, 1, true),
      0x514669,
      [0, 0.19, -0.31],
    );
    cape.rotation.x = -0.2;
    accessories.push(cape);
    cylinder(head, 0x34374f, [0, 0.28, 0], 0.55, 0.55, 0.075, 10);
    const hat = mesh(
      head,
      new T.ConeGeometry(0.38, 0.94, 7),
      0x3b3758,
      [0.06, 0.76, -0.03],
    );
    hat.rotation.z = -0.18;
    cylinder(head, 0xd2b063, [0.012, 0.39, 0], 0.32, 0.35, 0.13, 8);
    const wand = group(forearms[1], [0, -0.34, 0.1]);
    cylinder(wand, 0xc8ad66, [0, 0.15, 0], 0.043, 0.043, 1.9, 7);
    const moon = mesh(
      wand,
      new T.TorusGeometry(0.27, 0.062, 5, 11, Math.PI * 1.7),
      0xf2d986,
      [0, 1.28, 0],
    );
    moon.rotation.z = -0.8;
    ellipsoid(wand, 0xbbe0ed, [0, 1.28, 0], [0.11, 0.16, 0.11]);
    accessories.push(wand);
  }
  root.scale.setScalar(d.size);
  root.userData = {
    id,
    torso,
    neck,
    head,
    wings,
    forearms,
    legs,
    knees,
    feet,
    accessories,
    bodyBase: 1.24,
  };
  const shield = mesh(
    root,
    new T.IcosahedronGeometry(1.7, 1),
    new T.MeshBasicMaterial({
      color: d.color,
      transparent: true,
      opacity: 0.22,
      wireframe: false,
      depthWrite: false,
    }),
    [0, 1.4, 0],
  );
  shield.visible = false;
  root.userData.shield = shield;
  const shadow = mesh(
    root,
    new T.CircleGeometry(0.63, 12),
    new T.MeshBasicMaterial({
      color: 0x242a35,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
    [0, 0.022, 0],
    [1, 1, 0.6],
  );
  shadow.rotation.x = -Math.PI / 2;
  root.userData.shadow = shadow;
  return root;
}
export function poseRig(root, f, time = 0) {
  const r = root.userData;
  root.position.set(f.x || 0, f.y || 0, 0);
  root.rotation.y = ((f.facing ?? 1) * Math.PI) / 2;
  r.torso.position.y = 1.24;
  r.torso.rotation.set(0, 0, 0);
  r.neck.rotation.set(0, 0, 0);
  r.head.rotation.set(0, 0, 0);
  for (const a of [...r.wings, ...r.forearms, ...r.legs, ...r.knees])
    a.rotation.set(0, 0, 0);
  r.wings[0].rotation.z = -0.18;
  r.wings[1].rotation.z = 0.18;
  const p = f.pose || "idle";
  const phase = time * 16,
    attack = f.attack,
    progress = attack ? attack.t / attack.duration : 0;
  r.shield.visible = p === "shield";
  r.shadow.visible = (f.y || 0) < 0.1;
  if (p === "run") {
    r.torso.rotation.x = 0.22;
    r.torso.position.y += Math.abs(Math.sin(phase)) * 0.055;
    r.legs.forEach((a, i) => {
      a.rotation.x = Math.sin(phase + i * Math.PI) * 0.88;
      r.knees[i].rotation.x =
        Math.max(0, -Math.sin(phase + i * Math.PI)) * 0.85;
      r.wings[i].rotation.x = -Math.sin(phase + i * Math.PI) * 0.65;
    });
  } else if (p === "jump" || p === "fall" || p === "recovery") {
    r.legs[0].rotation.x = -0.75;
    r.legs[1].rotation.x = 0.4;
    r.knees[0].rotation.x = 1.2;
    r.knees[1].rotation.x = 0.45;
    r.wings[0].rotation.z = -1.1;
    r.wings[1].rotation.z = 1.1;
    if (p === "recovery") {
      r.torso.rotation.y = time * 24;
      r.wings[0].rotation.z = -1.8;
      r.wings[1].rotation.z = 1.8;
    }
  } else if (p === "hit") {
    r.torso.rotation.x = -0.65;
    r.head.rotation.x = -0.25;
    r.wings[0].rotation.z = -1.4;
    r.wings[1].rotation.z = 1.2;
    r.legs[0].rotation.x = 0.7;
    r.legs[1].rotation.x = -0.5;
  } else if (p === "shield") {
    r.torso.position.y = 1.08;
    r.wings[0].rotation.x = -1.15;
    r.wings[1].rotation.x = -1.15;
    r.wings[0].rotation.z = -0.75;
    r.wings[1].rotation.z = 0.75;
    r.legs[0].rotation.x = -0.22;
    r.legs[1].rotation.x = -0.22;
    r.knees[0].rotation.x = 0.4;
    r.knees[1].rotation.x = 0.4;
  } else if (p === "ledge") {
    r.wings[0].rotation.x = -2.7;
    r.wings[1].rotation.x = -2.7;
    r.legs[0].rotation.x = 0.3;
    r.legs[1].rotation.x = -0.2;
  } else if (attack) {
    const swing = Math.sin(Math.min(1, progress / 0.65) * Math.PI);
    r.torso.rotation.y = -0.55 + 1.5 * swing;
    if (p.includes("up")) {
      r.wings[1].rotation.x = -2.8 * swing;
      r.wings[0].rotation.z = -1.2 * swing;
      r.torso.rotation.x = -0.3 * swing;
    } else if (p.includes("down")) {
      r.torso.rotation.x = 0.7 * swing;
      r.legs[1].rotation.x = -1.45 * swing;
      r.wings[0].rotation.z = -0.8;
    } else if (r.id === "coral") {
      r.legs[1].rotation.x = -1.7 * swing;
      r.knees[1].rotation.x = 0.1;
      r.torso.rotation.x = -0.28 * swing;
      r.wings[0].rotation.x = -1.2;
    } else if (r.id === "chef") {
      r.wings[1].rotation.x = -2.4 * swing;
      r.forearms[1].rotation.x = 0.7 * swing;
      r.torso.rotation.z = -0.3 * swing;
    } else if (r.id === "knight") {
      r.wings[1].rotation.x = -1.65 * swing;
      r.forearms[1].rotation.x = -0.7 * swing;
    } else {
      r.wings[1].rotation.x = -1.2 * swing;
      r.wings[0].rotation.z = -1.45 * swing;
      r.torso.rotation.y = time * 8;
    }
  } else {
    r.torso.position.y += Math.sin(time * 3) * 0.025;
    r.neck.rotation.x = Math.sin(time * 2) * 0.03;
    r.wings[0].rotation.x = -0.2;
    r.wings[1].rotation.x = -0.18;
    r.legs[1].rotation.x = 0.08;
  }
  root.visible = f.respawn === undefined || f.respawn <= 0;
  if (f.invincible > 0) root.visible = Math.floor(time * 12) % 3 !== 0;
  return root;
}
