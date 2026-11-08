let ctx = null;
let master = null;

export function audioCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  try {
    audioCtx();
  } catch { /* no Web Audio */ }
}

// Soft three-note bell. Ascending when a focus session ends, descending when a break ends.
export function chime(up = true) {
  const c = audioCtx();
  const notes = up ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
  notes.forEach((f, i) => {
    const t = c.currentTime + i * 0.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    g.connect(master);
    for (const [mult, level] of [[1, 1], [2.01, 0.18], [3.02, 0.06]]) {
      const o = c.createOscillator();
      const og = c.createGain();
      o.frequency.value = f * mult;
      og.gain.value = level;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.7);
    }
  });
}
