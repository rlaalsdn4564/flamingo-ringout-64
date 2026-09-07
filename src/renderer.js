import * as T from "three";
import { FIGHTERS, STAGES, getFighter, getStage, clamp } from "./data.js";
import { createRig, poseRig, mesh } from "./models.js";
import { createStage, animateStage } from "./stages.js";
export function createRenderer(canvas) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.setSize(800, 600, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  const scene = new T.Scene();
  scene.background = new T.Color(0xaac7d5);
  scene.fog = new T.Fog(0xaac7d5, 30, 85);
  const ambient = new T.HemisphereLight(0xffecd0, 0x456075, 2.3);
  ambient.layers.enable(1);
  scene.add(ambient);
  const sun = new T.DirectionalLight(0xffeed0, 2.5);
  sun.layers.enable(1);
  sun.position.set(-5, 14, 11);
  scene.add(sun);
  const camera = new T.PerspectiveCamera(38, 4 / 3, 0.1, 180);
  camera.position.set(0, 7, 31);
  camera.lookAt(0, 2, 0);
  let currentStage = createStage("palace");
  scene.add(currentStage);
  let rigs = [];
  let effects = [];
  let projectiles = [];
  let menu = true;
  let menuTime = 0;
  const labels = [];
  function label(text, color) {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 48;
    const x = c.getContext("2d");
    x.font = "bold 28px sans-serif";
    x.textAlign = "center";
    x.lineWidth = 7;
    x.strokeStyle = "#20202c";
    x.strokeText(text, 48, 28);
    x.fillStyle = color;
    x.fillText(text, 48, 28);
    x.beginPath();
    x.moveTo(40, 34);
    x.lineTo(56, 34);
    x.lineTo(48, 46);
    x.closePath();
    x.fill();
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter;
    const m = new T.SpriteMaterial({
      map: t,
      depthTest: false,
      transparent: true,
    });
    const s = new T.Sprite(m);
    s.scale.set(1.15, 0.57, 1);
    scene.add(s);
    return s;
  }
  labels.push(label("1P", "#ffdd89"), label("CPU", "#b4e9f2"));
  labels.forEach((l) => l.layers.set(1));
  function stage(id) {
    if (currentStage.name === id) return;
    scene.remove(currentStage);
    disposeGroup(currentStage, false);
    currentStage = createStage(id);
    scene.add(currentStage);
    scene.background.set(getStage(id).sky);
    scene.fog.color.set(getStage(id).sky);
  }
  function fighters(ids) {
    for (const r of rigs) {
      scene.remove(r);
      disposeGroup(r, false);
    }
    rigs = ids.map(createRig);
    rigs.forEach((r) => {
      r.traverse((o) => o.layers.set(1));
      scene.add(r);
    });
  }
  function thumbnails() {
    const portraits = {};
    currentStage.visible = false;
    labels.forEach((l) => (l.visible = false));
    scene.background.set(0x252d3b);
    scene.fog.near = 60;
    for (const f of FIGHTERS) {
      const r = createRig(f.id);
      scene.add(r);
      poseRig(r, { x: 0, y: 0, facing: 0.21, pose: "idle" }, 0);
      r.rotation.y = -0.38;
      camera.position.set(0, 2, 7);
      camera.lookAt(0, 1.7, 0);
      renderer.render(scene, camera);
      portraits[f.id] = canvas.toDataURL("image/png");
      scene.remove(r);
      disposeGroup(r, false);
    }
    const stages = {};
    currentStage.visible = true;
    for (const s of STAGES) {
      stage(s.id);
      camera.position.set(0, 8, 32);
      camera.lookAt(0, 2, 0);
      renderer.render(scene, camera);
      stages[s.id] = canvas.toDataURL("image/png");
    }
    scene.fog.near = 30;
    stage("palace");
    return { portraits, stages };
  }
  function showMenu(id = "palace", selected = "coral") {
    menu = true;
    stage(id);
    fighters(FIGHTERS.map((f) => f.id));
    rigs.forEach((r, i) => {
      r.position.x = (i - 1.5) * 3.5;
    });
    labels.forEach((l) => (l.visible = false));
  }
  function begin(m) {
    menu = false;
    stage(m.stage.id);
    fighters(m.fighters.map((f) => f.id));
    effects.forEach((e) => {
      scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
    });
    effects = [];
    camera.position.set(0, 7, 31);
  }
  function spark(event) {
    if (
      event.type === "hit" ||
      event.type === "block" ||
      event.type === "ko" ||
      event.type === "jump"
    ) {
      const ko = event.type === "ko",
        count = ko ? 24 : event.type === "hit" ? 14 : 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const m = mesh(
          scene,
          new T.OctahedronGeometry(ko ? 0.35 : 0.17),
          new T.MeshBasicMaterial({
            color:
              event.type === "block" ? 0xb5e3f1 : i % 2 ? 0xffe296 : 0xff784c,
            transparent: true,
          }),
          [clamp(event.x ?? 0, -18, 18), clamp(event.y ?? 1, -6, 16), 0.5],
        );
        m.layers.set(1);
        effects.push({
          mesh: m,
          age: 0,
          life: ko ? 0.8 : 0.35,
          vx: Math.cos(angle) * (ko ? 14 : 8),
          vy: Math.sin(angle) * (ko ? 14 : 8),
        });
      }
    }
  }
  function draw(m, dt, reduced) {
    menuTime += dt;
    animateStage(currentStage, menuTime, reduced);
    if (menu) {
      rigs.forEach((r, i) =>
        poseRig(
          r,
          { x: (i - 1.5) * 3.3, y: 0, facing: i < 2 ? 1 : -1, pose: "idle" },
          menuTime + i,
        ),
      );
      camera.position.lerp(new T.Vector3(0, 6.5, 28.5), 0.1);
      camera.lookAt(0, 2.5, 0);
    } else if (m) {
      const visible = m.fighters.filter((f) => f.respawn <= 0);
      let cx = 0,
        cy = 2.3,
        z = 30;
      if (visible.length) {
        const xs = visible.map((f) => clamp(f.x, -14, 14)),
          ys = visible.map((f) => clamp(f.y, 0, 11));
        cx = clamp((Math.min(...xs) + Math.max(...xs)) / 2, -5, 5);
        cy = clamp((Math.min(...ys) + Math.max(...ys)) / 2 + 2.1, 2.1, 7);
        z = clamp(
          25 +
            (Math.max(...xs) - Math.min(...xs)) * 0.43 +
            (Math.max(...ys) - Math.min(...ys)) * 0.55,
          28,
          38,
        );
      }
      camera.position.lerp(new T.Vector3(cx, cy + 4, z), 1 - Math.exp(-dt * 4));
      camera.lookAt(cx, cy, 0);
      m.fighters.forEach((f, i) => {
        poseRig(rigs[i], f, m.elapsed);
        labels[i].visible = f.respawn <= 0;
        labels[i].position.set(f.x, f.y + 3.6, 0);
      });
      for (const p of projectiles) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
      }
      projectiles = [];
      for (const p of m.projectiles) {
        const s = mesh(
          scene,
          new T.OctahedronGeometry(0.33),
          new T.MeshBasicMaterial({ color: 0xffdfa4 }),
          [p.x, p.y, 0.15],
        );
        s.layers.set(1);
        s.rotation.z = m.elapsed * 12;
        projectiles.push(s);
      }
    }
    for (const e of effects) {
      e.age += dt;
      e.mesh.position.x += e.vx * dt;
      e.mesh.position.y += e.vy * dt;
      e.vy -= dt * 11;
      e.mesh.material.opacity = 1 - e.age / e.life;
      e.mesh.rotation.z += dt * 5;
    }
    effects = effects.filter((e) => {
      if (e.age >= e.life) {
        scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        return false;
      }
      return true;
    });
    // The visual fighting plane is composited in front of stage scenery. Characters
    // retain depth among their own meshes, but a decorative platform lip cannot
    // slice their necks in half when the physics plane passes beneath that platform.
    camera.layers.set(0);
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.clearDepth();
    const background = scene.background;
    scene.background = null;
    camera.layers.set(1);
    renderer.autoClear = false;
    renderer.render(scene, camera);
    scene.background = background;
    camera.layers.set(0);
    renderer.autoClear = true;
  }
  function disposeGroup(g, all) {
    g.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (all || !m.userData.shared) {
            m.map?.dispose();
            m.dispose();
          }
        });
      }
    });
  }
  function dispose() {
    disposeGroup(scene, true);
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { thumbnails, showMenu, begin, draw, spark, dispose, renderer, scene };
}
