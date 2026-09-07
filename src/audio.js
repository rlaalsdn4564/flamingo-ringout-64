export function createAudio() {
  let context,
    enabled = false;
  return {
    setEnabled(v) {
      enabled = v;
      if (v) {
        context ??= new AudioContext();
        context.resume().catch(() => {});
      }
    },
    play(type) {
      if (!enabled || !context || context.state !== "running") return;
      const freq = {
        hit: 110,
        block: 540,
        jump: 450,
        ko: 80,
        go: 740,
        finish: 520,
        swing: 200,
        projectile: 890,
        sudden: 240,
      }[type];
      if (!freq) return;
      const o = context.createOscillator(),
        g = context.createGain();
      o.type = type === "hit" || type === "ko" ? "sawtooth" : "square";
      o.frequency.setValueAtTime(freq, context.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        type === "jump" ? 900 : Math.max(25, freq * 0.4),
        context.currentTime + 0.16,
      );
      g.gain.setValueAtTime(0.035, context.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      o.connect(g).connect(context.destination);
      o.start();
      o.stop(context.currentTime + 0.21);
    },
    dispose() {
      context?.close();
    },
  };
}
