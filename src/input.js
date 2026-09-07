export const KEY_MAP = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Space: "jump",
  KeyZ: "attack",
  KeyX: "special",
  KeyC: "shield",
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
};
export function createInputBuffer() {
  const held = new Set(),
    pressed = new Set();
  return {
    press(code) {
      if (!KEY_MAP[code]) return;
      if (!held.has(code)) pressed.add(code);
      held.add(code);
    },
    release(code) {
      held.delete(code);
    },
    consume() {
      const input = {};
      for (const code of held) input[KEY_MAP[code]] = true;
      for (const code of pressed) {
        const action = KEY_MAP[code];
        input[action] = true;
        if (["jump", "attack", "special"].includes(action))
          input[action + "Pressed"] = true;
      }
      pressed.clear();
      return input;
    },
    clear() {
      held.clear();
      pressed.clear();
    },
  };
}
