import * as T from "three";
import { getStage } from "./data.js";
import {
  mesh,
  box,
  ellipsoid,
  cylinder,
  tube,
  group,
  material,
} from "./models.js";
function texture(kind, a, b) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = a;
  x.fillRect(0, 0, 64, 64);
  let seed = 417;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 560; i++) {
    x.fillStyle = rand() > 0.5 ? b : "rgba(255,255,255,.12)";
    x.fillRect(
      Math.floor(rand() * 64),
      Math.floor(rand() * 64),
      1 + Math.floor(rand() * 3),
      1,
    );
  }
  if (kind === "brick") {
    for (let row = 0; row < 4; row++) {
      x.fillStyle = b;
      x.fillRect(0, row * 16, 64, 2);
      for (let j = -1; j < 3; j++) {
        let p = j * 32 + (row % 2) * 16;
        x.fillRect(p, row * 16, 2, 16);
        x.fillStyle = "rgba(255,255,255,.25)";
        x.fillRect(p + 2, row * 16 + 2, 28, 1);
        x.fillStyle = b;
      }
    }
  }
  if (kind === "wood") {
    for (let j = 0; j < 8; j++) {
      x.fillStyle = b;
      x.fillRect(j * 8, 0, 1, 64);
      x.fillStyle = "rgba(255,255,255,.15)";
      x.fillRect(j * 8 + 1, 0, 1, 64);
    }
    x.fillStyle = b;
    for (let i = 0; i < 6; i++) x.fillRect((i * 13) % 64, (i * 19) % 64, 7, 2);
  }
  if (kind === "roof") {
    for (let row = 0; row < 8; row++) {
      x.fillStyle = b;
      x.fillRect(0, row * 8, 64, 1);
      for (let j = 0; j < 8; j++)
        x.fillRect(j * 8 + (row % 2) * 4, row * 8, 1, 8);
    }
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
const textureCache = new Map();
function textured(kind, a, b, repeat = [1, 1]) {
  const key = [kind, a, b, repeat].join();
  if (textureCache.has(key)) return textureCache.get(key);
  const map = texture(kind, a, b);
  map.repeat.set(...repeat);
  const m = new T.MeshLambertMaterial({ map, flatShading: true });
  m.userData.shared = true;
  textureCache.set(key, m);
  return m;
}
function cloud(parent, x, y, z, size, color = 0xe5eeee) {
  const g = group(parent, [x, y, z]);
  for (const [px, py, pz, sx, sy, sz] of [
    [-1, 0, 0, 1, 0.48, 0.65],
    [0, 0.3, -0.05, 1.05, 0.72, 0.72],
    [0.94, 0.03, 0, 0.85, 0.46, 0.61],
    [-0.48, 0.52, -0.12, 0.73, 0.57, 0.68],
    [0.38, 0.17, 0.3, 0.88, 0.47, 0.55],
  ]) {
    ellipsoid(
      g,
      color,
      [px * size, py * size, pz * size],
      [sx * size, sy * size, sz * size],
      10,
    );
  }
}
function shell(parent, x, y, z, scale = 1) {
  const g = group(parent, [x, y, z]);
  g.scale.setScalar(scale);
  for (let i = 0; i < 7; i++) {
    const l = ellipsoid(
      g,
      i % 2 ? 0xf5b3a3 : 0xffd3b2,
      [Math.sin((i - 3) * 0.24) * 0.36, Math.cos((i - 3) * 0.24) * 0.38, 0],
      [0.1, 0.55, 0.12],
      7,
    );
    l.rotation.z = -(i - 3) * 0.24;
  }
  box(g, 0xeab49a, [0, 0, 0], [0.5, 0.18, 0.2]);
  return g;
}
function island(parent, y, width, color = 0x9c7765) {
  const g = group(parent, [0, y - 2.3, -0.75]);
  mesh(
    g,
    new T.CylinderGeometry(width * 0.54, 1.8, 4, 10),
    color,
    [0, 0, 0],
    [1, 1, 0.4],
  );
  for (let i = 0; i < 9; i++) {
    const x = ((i - 4) * width) / 9;
    mesh(
      g,
      new T.ConeGeometry(0.7, 2.4 + (i % 3) * 0.7, 5),
      i % 2 ? 0x776866 : 0xb29378,
      [x, -1.5, -0.1],
    ).rotation.z = Math.PI;
  }
}
function palace(g, data) {
  const stone = textured("brick", "#c1b49e", "#887d71", [5, 2]),
    pink = textured("roof", "#d1787f", "#924f64", [2, 2]),
    walk = textured("brick", "#e2cdac", "#b4937c", [5, 1]);
  island(g, 0, 18.4);
  box(g, stone, [0, -0.8, -0.3], [18.4, 1.6, 3.6]);
  box(g, walk, [0, -0.1, -0.3], [18.6, 0.2, 3.7]);
  for (let i = -8; i <= 8; i += 2) {
    box(g, 0xf1d6ae, [i, -0.9, 1.51], [0.25, 1.5, 0.2]);
    shell(g, i, -0.7, 1.6, 0.34);
  }
  for (const s of [-1, 1]) {
    const t = group(g, [s * 7.1, 0, -3.5]);
    cylinder(t, stone, [0, 2.7, 0], 1.45, 1.7, 5.4, 10);
    cylinder(t, 0xe6cdae, [0, 5.3, 0], 1.7, 1.7, 0.3, 10);
    mesh(t, new T.ConeGeometry(2.05, 3, 10), pink, [0, 6.85, 0]);
    ellipsoid(t, 0xf4d38b, [0, 8.45, 0], [0.13, 0.2, 0.13]);
    for (const xx of [-0.55, 0.55]) {
      box(t, 0x405b6a, [xx, 3.2, 1.4], [0.42, 1.5, 0.1]);
      box(t, 0xe7d7bd, [xx, 3.2, 1.5], [0.035, 1.5, 0.035]);
    }
    shell(t, 0, 4.5, 1.5, 0.7);
  }
  const arch = group(g, [0, 0, -5]);
  box(arch, stone, [0, 2.1, -0.4], [10, 4.2, 1.4]);
  for (let x = -3.6; x < 4; x += 2.4) {
    box(arch, 0x4f757e, [x, 1.6, 0.32], [1.55, 2.85, 0.06]);
    mesh(arch, new T.TorusGeometry(0.78, 0.17, 4, 10, Math.PI), 0xead3af, [
      x,
      2.75,
      0.43,
    ]);
  }
  box(arch, 0xeed0a6, [0, 4.4, -0.2], [10.5, 0.35, 1.7]);
  for (let i = -5; i <= 5; i++) {
    box(arch, 0xd1b49b, [i, 4.78, -0.2], [0.55, 0.55, 1.2]);
  }
  shell(arch, 0, 5.55, 0.5, 1.4);
  for (const p of data.platforms.slice(1)) {
    box(g, walk, [p.x, p.y - 0.2, -0.1], [p.w, 0.4, 1.6]);
    for (let j = -1; j <= 1; j++) {
      shell(g, p.x + j * 0.7, p.y - 0.57, 0.67, 0.38);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = -30 + i * 8;
    mesh(
      g,
      new T.ConeGeometry(5 + (i % 3), 8 + (i % 4), 5),
      0x8eabb3,
      [x, -0.3, -28],
      [1, 0.6, 1],
    );
  }
  for (let i = 0; i < 4; i++)
    cloud(g, -19 + i * 13, 10 + (i % 2) * 2, -18, 3.6);
  const water = mesh(
    g,
    new T.PlaneGeometry(120, 90),
    textured("noise", "#74b2b9", "#6b9ba6", [8, 8]),
    [0, -6, -12],
  );
  water.rotation.x = -Math.PI / 2;
}
function grove(g, data) {
  const bark = textured("wood", "#957051", "#514d35", [3, 2]),
    grass = textured("noise", "#6b9c43", "#426937", [9, 2]);
  island(g, 0, 16.6, 0x756449);
  box(g, bark, [0, -0.7, -0.5], [16.6, 1.4, 3.5]);
  box(g, grass, [0, -0.07, -0.5], [16.9, 0.16, 3.7]);
  const tree = group(g, [-1.5, 0, -4.8]);
  tube(
    tree,
    bark,
    [
      [0, -1, 0],
      [-0.45, 2, 0],
      [0.3, 5.6, 0],
      [0.1, 9.6, -0.5],
    ],
    1.5,
    9,
  );
  for (const s of [-1, 1])
    tube(
      tree,
      bark,
      [
        [0, 4.5, 0],
        [s * 2, 6.5, 0.1],
        [s * 5.5, 6.7, 0.4],
        [s * 7, 8, -0.1],
      ],
      0.57,
      7,
    );
  for (let i = 0; i < 10; i++) {
    const x = ((i % 5) - 2) * 3.1;
    ellipsoid(
      tree,
      i % 3 === 0 ? 0x9eb653 : i % 2 ? 0x477d42 : 0x6b9747,
      [x, 8.5 + Math.floor(i / 5) * 2.6 + (i % 2), -1],
      [3.9, 2.1, 2.8],
      7,
    );
  }
  for (let i = 0; i < 6; i++)
    tube(
      tree,
      0x679346,
      [
        [i * 2 - 5, 8, -0.2],
        [i * 2 - 4.6, 5, 0.3],
        [i * 2 - 5, 2.2, 0],
      ],
      0.065,
      5,
    );
  for (const p of data.platforms.slice(1)) {
    box(g, bark, [p.x, p.y - 0.25, -0.1], [p.w, 0.5, 1.6]);
    box(g, grass, [p.x, p.y - 0.035, -0.1], [p.w + 0.15, 0.08, 1.8]);
    for (let i = 0; i < 3; i++) {
      const x = p.x + (i - 1) * 0.8;
      ellipsoid(g, 0x5e8e3f, [x, p.y - 0.6, 0.6], [0.7, 0.36, 0.2], 6);
    }
  }
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const x = s * (6.5 + i * 0.4);
      tube(
        g,
        0x627746,
        [
          [x, 0, -1.5],
          [x + 0.2, 1.8 + i * 0.1, -1.5],
        ],
        0.028,
        4,
      );
      ellipsoid(
        g,
        0x754f33,
        [x + 0.2, 1.9 + i * 0.1, -1.5],
        [0.11, 0.36, 0.11],
        6,
      );
    }
  for (let i = 0; i < 5; i++) {
    const x = -28 + i * 14;
    cylinder(g, 0x759786, [x, 2, -22], 1.6, 2.4, 14, 7);
    ellipsoid(g, 0x83ad81, [x, 9, -23], [8, 5, 5], 7);
  }
  for (let i = 0; i < 7; i++)
    ellipsoid(g, 0xb3ceaa, [-25 + i * 9, -2, -25], [7, 4, 4], 7);
  for (let i = 0; i < 9; i++) {
    const x = -7.5 + i * 1.85;
    ellipsoid(g, 0xdab898, [x, -0.45, 1.34], [0.25, 0.1, 0.05], 6);
  }
}
function airship(g, data) {
  const wood = textured("wood", "#b1835e", "#695245", [6, 1]),
    metal = textured("brick", "#617e8d", "#425365", [3, 1]);
  box(g, wood, [0, -0.22, -0.4], [17.6, 0.44, 3.8]);
  ellipsoid(g, metal, [0, -1.1, -0.8], [9.3, 1.75, 2.3], 12);
  box(g, 0xd2ae70, [0, -0.1, 1.57], [17.9, 0.24, 0.13]);
  for (const s of [-1, 1]) {
    const engine = group(g, [s * 8.6, -0.15, -0.8]);
    cylinder(engine, 0xbd9b67, [0, 0, 0], 0.6, 0.65, 1.4, 9).rotation.z =
      Math.PI / 2;
    const rotor = group(engine, [s * 0.8, 0, 0]);
    box(rotor, 0x65544f, [0, 0, 0], [0.12, 3.3, 0.28]);
    box(rotor, 0xb8c2b6, [0, 0, 0], [0.12, 0.28, 3.3]);
    rotor.userData.spin = "x";
    box(g, 0x415568, [s * 5.8, 1.05, -1.7], [0.16, 2.1, 0.16]);
    tube(
      g,
      0xc5b277,
      [
        [s * 6.5, 0.2, -2],
        [s * 5.8, 5.8, -2],
        [s * 3, 8, -3],
      ],
      0.036,
      5,
    );
  }
  const cabin = group(g, [0, 0, -3.3]);
  box(cabin, 0x496f86, [0, 1.7, 0], [4.2, 3.4, 2.1]);
  box(cabin, 0xcca96b, [0, 3.5, 0], [4.6, 0.3, 2.4]);
  for (let i = -1; i <= 1; i++) {
    box(cabin, 0xbed8d3, [i * 1.12, 2.1, 1.07], [0.85, 1.23, 0.06]);
    box(cabin, 0x34445f, [i * 1.12, 2.1, 1.12], [0.04, 1.26, 0.04]);
  }
  const balloon = group(g, [0, 7.3, -5.6]);
  ellipsoid(
    balloon,
    textured("wood", "#baab81", "#897e66", [3, 1]),
    [0, 0, 0],
    [8, 2.4, 2.9],
    14,
  );
  for (const x of [-4, 0, 4]) {
    const hoop = mesh(
      balloon,
      new T.TorusGeometry(2.43, 0.07, 5, 16),
      0x675e58,
      [x, 0, 0],
    );
    hoop.rotation.y = Math.PI / 2;
    hoop.scale.x = 1.1;
  }
  box(balloon, 0xab6264, [0, 0.1, 2.84], [3.8, 1.22, 0.04]);
  for (const p of data.platforms.slice(1)) {
    box(g, metal, [p.x, p.y - 0.2, -0.1], [p.w, 0.4, 1.5]);
    box(g, 0xd8b67f, [p.x, p.y + 0.015, 0.65], [p.w, 0.08, 0.08]);
  }
  const moon = ellipsoid(g, 0xf2dcac, [16, 13, -30], [3.8, 3.8, 0.7], 16);
  moon.userData.moon = true;
  for (let i = 0; i < 9; i++)
    cloud(g, -37 + i * 10, -3 + (i % 3) * 4, -20 - (i % 2) * 9, 3.8, 0x768ba5);
  for (let i = 0; i < 45; i++)
    ellipsoid(
      g,
      0xd6d3c3,
      [((i * 17) % 91) - 45, 8 + ((i * 7) % 17), -45],
      [0.055, 0.055, 0.055],
      4,
    );
}
export function createStage(id) {
  const g = new T.Group();
  g.name = id;
  const data = getStage(id);
  (({ palace, grove, airship })[id] || palace)(g, data);
  return g;
}
export function animateStage(g, time, reduced) {
  if (reduced) return;
  g.traverse((o) => {
    if (o.userData.spin) o.rotation[o.userData.spin] = time * 11;
  });
}
