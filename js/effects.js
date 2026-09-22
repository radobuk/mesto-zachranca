/* Častice: oheň, dym, iskry, plávajúci text */
const FX = {
  parts: [],
  texts: [],

  reset() { this.parts.length = 0; this.texts.length = 0; },

  add(p) {
    if (this.parts.length > 820) this.parts.shift();
    this.parts.push(p);
  },

  fire(x, y, s = 1) {
    for (let i = 0; i < 2; i++)
      this.add({
        t: "fire", x: x + U.rnd(-14, 14) * s, y: y + U.rnd(-8, 8),
        vx: U.rnd(-0.5, 0.5), vy: U.rnd(-2.8, -1.3) * s,
        r: U.rnd(5, 11) * s, life: 1, dec: U.rnd(0.022, 0.042),
      });
    if (Math.random() < 0.45)
      this.add({
        t: 'smoke', x: x + U.rnd(-16, 16) * s, y: y - 18,
        vx: U.rnd(-0.6, 0.6), vy: U.rnd(-1.6, -0.7),
        r: U.rnd(12, 26) * s, life: 1, dec: U.rnd(0.005, 0.012),
      });
  },

  sparks(x, y, n = 18, color = '#ffd25c') {
    for (let i = 0; i < n; i++) {
      const a = U.rnd(0, Math.PI * 2), sp = U.rnd(2, 9);
      this.add({
        t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        r: U.rnd(2, 4), life: 1, dec: U.rnd(0.02, 0.05), c: color,
      });
    }
  },

  boom(x, y) {
    for (let i = 0; i < 40; i++) {
      const a = U.rnd(0, Math.PI * 2), sp = U.rnd(1, 11);
      this.add({
        t: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        r: U.rnd(10, 26), life: 1, dec: U.rnd(0.012, 0.03),
      });
    }
    this.sparks(x, y, 26, '#fff0b0');
  },

  web(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = U.rnd(0, Math.PI * 2);
      this.add({
        t: 'spark', x, y, vx: Math.cos(a) * U.rnd(1, 4), vy: Math.sin(a) * U.rnd(1, 4),
        r: U.rnd(1.5, 3), life: 1, dec: 0.06, c: '#ffffff',
      });
    }
  },

  text(x, y, txt, color = '#fff', size = 22) {
    this.texts.push({ x, y, txt, color, size, life: 1 });
  },

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.t === 'spark') p.vy += 0.34 * dt;
      else p.vy *= 1 - 0.012 * dt;
      if (p.t === 'smoke') p.r += 0.35 * dt;
      p.life -= p.dec * dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 0.8 * dt;
      t.life -= 0.012 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  },

  draw(ctx) {
    ctx.save();
    // dym (normálne miešanie)
    for (const p of this.parts) {
      if (p.t !== 'smoke') continue;
      ctx.globalAlpha = p.life * 0.3;
      ctx.fillStyle = '#4a4a55';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    // plamene (aditívne – svietia)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      if (p.t !== 'fire') continue;
      const l = U.clamp(p.life, 0, 1);
      ctx.globalAlpha = l * 0.55;
      ctx.fillStyle = `hsl(${46 * l},100%,${34 + 24 * l}%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * l, 0, 7); ctx.fill();
      ctx.globalAlpha = l * 0.5;
      ctx.fillStyle = `hsl(${18 + 30 * l},100%,72%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * l * 0.45, 0, 7); ctx.fill();
    }
    // iskry
    for (const p of this.parts) {
      if (p.t !== 'spark') continue;
      ctx.globalAlpha = U.clamp(p.life, 0, 1);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = U.clamp(t.life * 1.4, 0, 1);
      ctx.font = `900 ${t.size}px "Trebuchet MS",sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,.65)';
      ctx.strokeText(t.txt, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
    }
    ctx.restore();
  },
};
