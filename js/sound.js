/* Jednoduché zvuky cez WebAudio (bez externých súborov) */
const Snd = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  tone(f1, f2, dur, type = 'square', vol = 0.06) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur = 0.3, vol = 0.12) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(g).connect(this.ctx.destination);
    s.start();
  },
  shoot() { this.tone(900, 220, 0.12, 'sawtooth', 0.035); },
  miss() { this.tone(200, 120, 0.09, 'sine', 0.03); },
  pickup() { this.tone(520, 880, 0.14, 'triangle', 0.06); },
  rescue() { this.tone(660, 990, 0.1, 'triangle', 0.07); setTimeout(() => this.tone(990, 1320, 0.16, 'triangle', 0.06), 90); },
  fail() { this.tone(300, 70, 0.5, 'sawtooth', 0.07); this.noise(0.4, 0.09); },
  jump() { this.tone(420, 700, 0.08, 'square', 0.03); },
  catch_() { this.tone(300, 1200, 0.18, 'sine', 0.07); },
};
