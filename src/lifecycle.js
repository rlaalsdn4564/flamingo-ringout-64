export function isPauseToggle(event) {
  return !event.repeat && (event.code === "Escape" || event.code === "KeyP");
}

// A bfcache entry keeps its renderer and match, but never its running input/clock.
export function createPageLifecycle({ pause, resetClock, stopFrame, startFrame, dispose }) {
  let cached = false;
  let terminated = false;
  return {
    hide(event) {
      if (terminated) return;
      pause();
      resetClock();
      stopFrame();
      if (event.persisted) {
        cached = true;
        return;
      }
      cached = false;
      terminated = true;
      dispose();
    },
    show(event) {
      if (terminated || !cached || !event.persisted) return;
      cached = false;
      resetClock();
      startFrame();
    },
  };
}
