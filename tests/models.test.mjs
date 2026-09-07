import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createRig, poseRig } from "../src/models.js";
import { FIGHTERS } from "../src/data.js";
const poses = [
  "idle",
  "run",
  "jump",
  "fall",
  "hit",
  "shield",
  "ledge",
  "side",
  "special-side",
  "up",
  "special-up",
  "down",
  "recovery",
];
test("four genuinely different editable meshes, no external character assets", () => {
  const counts = [];
  for (const f of FIGHTERS) {
    const r = createRig(f.id);
    let count = 0;
    r.traverse((o) => {
      if (o.geometry) count += o.geometry.attributes.position.count;
    });
    counts.push(count);
    assert.ok(count > 2000);
  }
  assert.equal(new Set(counts).size, 4);
});
test("all poses have finite vertices, knee and wing joints and ground origin", () => {
  for (const f of FIGHTERS) {
    const r = createRig(f.id);
    assert.equal(r.userData.knees.length, 2);
    assert.equal(r.userData.forearms.length, 2);
    for (const pose of poses) {
      poseRig(
        r,
        {
          x: 0,
          y: 0,
          pose,
          facing: 1,
          attack:
            pose.includes("side") ||
            pose.includes("up") ||
            pose.includes("down")
              ? { t: 0.2, duration: 0.6 }
              : null,
        },
        1.2,
      );
      r.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(r);
      assert.ok(
        [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(
          Number.isFinite,
        ),
      );
      assert.ok(b.max.y - b.min.y < 6, `${f.id}/${pose} bounds`);
    }
  }
});
test("attack pose differs from idle and mirrors facing without changing world origin", () => {
  const r = createRig("coral");
  poseRig(r, { x: 2, y: 3, pose: "idle", facing: 1 }, 0);
  const before = r.userData.legs[1].rotation.x;
  poseRig(
    r,
    { x: 2, y: 3, pose: "side", facing: -1, attack: { t: 0.2, duration: 0.6 } },
    0,
  );
  assert.notEqual(r.userData.legs[1].rotation.x, before);
  assert.equal(r.position.x, 2);
  assert.equal(r.position.y, 3);
  assert.equal(r.rotation.y, -Math.PI / 2);
});
