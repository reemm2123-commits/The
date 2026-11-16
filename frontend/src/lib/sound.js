let ctx = null;
let master = null;
let ambient = null;

export const soundEnabled = () => localStorage.getItem("tu-sound") !== "off";

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noise(dur) {
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(g, t, attack, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq, type, peak, decay, when = 0) {
  const c = ac();
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  env(g, t, 0.006, peak, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function rustle(peak = 0.22, from = 2600, to = 900, dur = 0.32) {
  const c = ac();
  const t = c.currentTime;
  const s = noise(dur + 0.05);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = 0.9;
  const g = c.createGain();
  env(g, t, 0.02, peak, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

const SFX = {
  paper: () => rustle(),
  pin: () => { tone(1900, "triangle", 0.12, 0.07); tone(3400, "sine", 0.05, 0.05, 0.004); rustle(0.05, 4000, 2000, 0.06); },
  thread: () => { tone(330, "triangle", 0.14, 0.8); tone(661, "sine", 0.05, 0.6, 0.01); },
  correct: () => [523.25, 659.25, 987.77].forEach((f, i) => tone(f, "sine", 0.16, 1.3, i * 0.09)),
  wrong: () => { tone(110, "sine", 0.32, 0.55); tone(92, "triangle", 0.14, 0.7, 0.08); },
  unlock: () => { rustle(0.18, 1800, 600, 0.5); [880, 1318.5, 1760].forEach((f, i) => tone(f, "sine", 0.08, 1.8, 0.15 + i * 0.12)); },
  turn: () => { tone(659.25, "sine", 0.07, 0.25); tone(440, "sine", 0.06, 0.35, 0.12); },
  reveal: () => { tone(55, "sine", 0.4, 2.5); tone(82.4, "triangle", 0.12, 2.2, 0.05); [392, 466.2, 587.3].forEach((f, i) => tone(f, "sine", 0.07, 2.5, 0.4 + i * 0.18)); },
};

export function sfx(name) {
  if (!soundEnabled()) return;
  try { SFX[name]?.(); } catch (_) { /* audio unavailable */ }
}

export function startAmbient() {
  if (!soundEnabled() || ambient) return;
  try {
    const c = ac();
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.07, c.currentTime + 5);
    g.connect(master);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    lp.connect(g);
    const oscs = [55, 82.41, 110.6].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = i === 2 ? 0.2 : 0.45;
      o.connect(og).connect(lp);
      o.start();
      return o;
    });
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.06;
    const lg = c.createGain();
    lg.gain.value = 160;
    lfo.connect(lg).connect(lp.frequency);
    lfo.start();
    const rain = noise(4);
    rain.loop = true;
    const rf = c.createBiquadFilter();
    rf.type = "lowpass";
    rf.frequency.value = 700;
    const rg = c.createGain();
    rg.gain.value = 0.3;
    rain.connect(rf).connect(rg).connect(g);
    rain.start();
    const notes = [196, 220, 261.63, 293.66, 329.63];
    const timer = setInterval(() => {
      if (Math.random() < 0.45) tone(notes[Math.floor(Math.random() * notes.length)], "sine", 0.018, 4);
    }, 6500);
    ambient = {
      stop() {
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + 1.2);
        clearInterval(timer);
        setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); rain.stop(); g.disconnect(); }, 1400);
      },
    };
  } catch (_) { ambient = null; }
}

export function stopAmbient() {
  ambient?.stop();
  ambient = null;
}

export function setSoundEnabled(on) {
  localStorage.setItem("tu-sound", on ? "on" : "off");
  if (!on) stopAmbient();
}
