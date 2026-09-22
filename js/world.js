/* Mesto: budovy, pozadie, ulica, bezpečné zóny */
const World = {
  W: 15000,
  GROUND_Y: 1250,
  buildings: [],
  zones: [],
  far: [],
  mid: [],
  stars: [],

  generate() {
    this.buildings.length = 0;
    this.zones.length = 0;
    this.far.length = 0;
    this.mid.length = 0;
    this.stars.length = 0;

    const pal = ['#3b4866', '#33405c', '#45536f', '#2d3950', '#4c5a7d', '#39456180'];

    let x = 200;
    while (x < this.W - 500) {
      const w = U.rndi(150, 330);
      const low = Math.random() < 0.28;
      const h = low ? U.rndi(160, 350) : U.rndi(320, 940);
      const b = {
        x, y: this.GROUND_Y - h, w, h,
        color: U.pick(pal),
        cols: Math.max(2, Math.floor(w / 46)),
        rows: Math.max(2, Math.floor(h / 56)),
        win: [],
        antenna: Math.random() < 0.35,
      };
      for (let i = 0; i < b.cols * b.rows; i++) b.win.push(Math.random() < 0.42);
      b.det = [];
      if (Math.random() < 0.55) b.det.push({ t: 'tank', p: U.rnd(0.15, 0.78) });
      const nv = U.rndi(1, 3);
      for (let i = 0; i < nv; i++)
        b.det.push({ t: 'vent', p: U.rnd(0.08, 0.88), w: U.rnd(16, 34), h: U.rnd(9, 20) });
      this.buildings.push(b);
      x += w + U.rndi(80, 200);
    }

    // bezpečné zóny (sanitka) do medzier medzi budovami
    for (let i = 0; i < this.buildings.length - 1; i += 3) {
      const a = this.buildings[i], c = this.buildings[i + 1];
      const gx = (a.x + a.w + c.x) / 2;
      this.zones.push({ x: gx, y: this.GROUND_Y });
    }

    // paralaxné vrstvy
    for (let l = 0; l < 2; l++) {
      const arr = l === 0 ? this.far : this.mid;
      let px = -400;
      const f = l === 0 ? 0.28 : 0.55;
      while (px < this.W * f + 2200) {
        const w = U.rndi(90, 230);
        arr.push({ x: px, w, h: U.rndi(140, l === 0 ? 520 : 720) });
        px += w + U.rndi(20, 70);
      }
    }
    for (let i = 0; i < 160; i++)
      this.stars.push({ x: U.rnd(0, 4000), y: U.rnd(0, 700), r: U.rnd(0.6, 1.8), a: U.rnd(0.25, 1) });
  },

  pointIn(x, y) {
    for (const b of this.buildings)
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    return null;
  },

  // lúč pre vystrelenie pavučiny
  rayHit(x, y, dx, dy, maxLen) {
    const step = 7, n = Math.floor(maxLen / step);
    for (let i = 2; i <= n; i++) {
      const px = x + dx * step * i, py = y + dy * step * i;
      if (py > this.GROUND_Y) return null;
      const b = this.pointIn(px, py);
      if (b) return { x: px, y: py };
    }
    return null;
  },

  // pomoc pri mierení: nájdi najlepšiu strechu v smere pohľadu
  assist(px, py, dx, dy, range) {
    let best = null, bestScore = 1e9;
    for (const b of this.buildings) {
      if (b.y > py - 30) continue;
      if (b.x + b.w < px - range || b.x > px + range) continue;
      const ax = U.clamp(px + dx * 170, b.x + 12, b.x + b.w - 12);
      const ay = b.y + 5;
      const d = U.dist(px, py, ax, ay);
      if (d > range || d < 60) continue;
      const dot = ((ax - px) / d) * dx + ((ay - py) / d) * dy;
      if (dot < 0.2) continue;
      const s = d * (1.7 - dot);
      if (s < bestScore) { bestScore = s; best = { x: ax, y: ay }; }
    }
    return best;
  },

  // najvyššia strecha v okolí x (aby supavec lietal nad mestom, nie v ňom)
  roofAbove(x, margin) {
    let top = this.GROUND_Y - 300;
    for (const b of this.buildings) {
      if (b.x + b.w < x - margin || b.x > x + margin) continue;
      if (b.y < top) top = b.y;
    }
    return top;
  },

  nearestZone(x) {
    let best = this.zones[0], bd = 1e9;
    for (const z of this.zones) {
      const d = Math.abs(z.x - x);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  },

  // náhodná budova aspoň minH vysoká
  randomBuilding(minH) {
    for (let i = 0; i < 40; i++) {
      const b = U.pick(this.buildings);
      if (b.h >= minH) return b;
    }
    return this.buildings[0];
  },

  // voľné miesto na ulici (medzera medzi budovami)
  randomStreet() {
    for (let i = 0; i < 40; i++) {
      const k = U.rndi(0, this.buildings.length - 2);
      const a = this.buildings[k], c = this.buildings[k + 1];
      const gap = c.x - (a.x + a.w);
      if (gap > 110) return a.x + a.w + gap / 2;
    }
    return U.rnd(400, this.W - 400);
  },

  drawBg(ctx, cam, cw, ch) {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#10143a');
    g.addColorStop(0.42, '#3a3c78');
    g.addColorStop(0.72, '#8f5b76');
    g.addColorStop(1, '#e09a5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // hviezdy
    ctx.save();
    for (const s of this.stars) {
      const sx = (s.x - cam.x * 0.06) % 4000;
      const sy = s.y - cam.y * 0.06;
      if (sy < -10 || sy > ch) continue;
      ctx.globalAlpha = s.a * U.clamp(1 - sy / (ch * 0.7), 0, 1);
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx < 0 ? sx + 4000 : sx, sy, s.r, s.r);
    }
    ctx.restore();

    // slnko
    const sunX = 1000 - cam.x * 0.08, sunY = ch * 0.62 - cam.y * 0.08;
    const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 260);
    sg.addColorStop(0, 'rgba(255,214,140,.95)');
    sg.addColorStop(0.25, 'rgba(255,150,90,.42)');
    sg.addColorStop(1, 'rgba(255,120,70,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - 280, sunY - 280, 560, 560);

    this.cwCache = cw;
    // vzdialená a stredná silueta
    this.layer(ctx, this.far, 0.28, 'rgba(24,28,62,.75)', cam, ch);
    this.layer(ctx, this.mid, 0.55, 'rgba(18,22,48,.9)', cam, ch);
  },

  layer(ctx, arr, f, color, cam, ch) {
    ctx.fillStyle = color;
    for (const b of arr) {
      const sx = b.x - cam.x * f;
      if (sx + b.w < -50 || sx > this.cwCache + 50) continue;
      const by = this.GROUND_Y - b.h - cam.y * f;
      ctx.fillRect(sx, by, b.w, Math.max(0, ch + 300 - by));
    }
  },

  drawFg(ctx, cam, cw, ch, t) {
    const left = cam.x - 60, right = cam.x + cw + 60;

    for (const b of this.buildings) {
      if (b.x + b.w < left || b.x > right) continue;
      if (!b.grad) {
        b.grad = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
        b.grad.addColorStop(0, b.color);
        b.grad.addColorStop(1, 'rgba(10,14,30,.96)');
      }
      ctx.fillStyle = b.grad;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // hrana / svetlo zhora
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(b.x, b.y, b.w, 6);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(b.x + b.w - 10, b.y, 10, b.h);

      // okná
      const mw = b.w / b.cols, mh = b.h / b.rows;
      const ww = mw * 0.52, wh = mh * 0.5;
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const lit = b.win[r * b.cols + c];
          ctx.fillStyle = lit ? 'rgba(255,214,130,.85)' : 'rgba(10,16,34,.55)';
          ctx.fillRect(b.x + c * mw + (mw - ww) / 2, b.y + r * mh + (mh - wh) / 2 + 8, ww, wh);
        }
      }
      // strecha + detaily
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(b.x - 4, b.y - 8, b.w + 8, 10);
      for (const d of b.det) {
        const dx = b.x + b.w * d.p;
        if (d.t === 'tank') {
          ctx.fillStyle = '#2a2f45';
          U.rr(ctx, dx - 15, b.y - 40, 30, 32, 5); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          ctx.fillRect(dx - 13, b.y - 12, 5, 12);
          ctx.fillRect(dx + 8, b.y - 12, 5, 12);
        } else {
          ctx.fillStyle = '#242a3e';
          U.rr(ctx, dx - d.w / 2, b.y - 8 - d.h, d.w, d.h, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.07)';
          ctx.fillRect(dx - d.w / 2, b.y - 8 - d.h, d.w, 2);
        }
      }
      if (b.antenna) {
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.5, b.y - 8);
        ctx.lineTo(b.x + b.w * 0.5, b.y - 52);
        ctx.stroke();
        ctx.fillStyle = Math.sin(t * 0.06) > 0 ? '#ff4d4d' : '#5a1a1a';
        ctx.beginPath();
        ctx.arc(b.x + b.w * 0.5, b.y - 55, 4, 0, 7);
        ctx.fill();
      }
    }

    // ulica
    ctx.fillStyle = '#1b2033';
    ctx.fillRect(left, this.GROUND_Y, right - left, 400);
    ctx.fillStyle = '#242b42';
    ctx.fillRect(left, this.GROUND_Y, right - left, 12);
    ctx.strokeStyle = 'rgba(255,220,120,.45)';
    ctx.lineWidth = 4;
    ctx.setLineDash([40, 36]);
    ctx.beginPath();
    ctx.moveTo(left, this.GROUND_Y + 62);
    ctx.lineTo(right, this.GROUND_Y + 62);
    ctx.stroke();
    ctx.setLineDash([]);

    // bezpečné zóny
    for (const z of this.zones) {
      if (z.x < left - 120 || z.x > right + 120) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);
      ctx.fillStyle = `rgba(60,230,140,${0.12 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(z.x, z.y + 6, 86, 20, 0, 0, 7);
      ctx.fill();
      // sanitka
      ctx.fillStyle = '#f2f5ff';
      U.rr(ctx, z.x - 46, z.y - 52, 92, 46, 7); ctx.fill();
      ctx.fillStyle = '#cfd8ee';
      ctx.fillRect(z.x - 46, z.y - 24, 92, 8);
      ctx.fillStyle = '#e8243a';
      ctx.fillRect(z.x - 6, z.y - 46, 12, 30);
      ctx.fillRect(z.x - 21, z.y - 37, 42, 12);
      ctx.fillStyle = pulse > 0.5 ? '#ff5b6e' : '#3b7bff';
      ctx.fillRect(z.x - 14, z.y - 60, 28, 9);
      ctx.fillStyle = '#20263a';
      ctx.beginPath(); ctx.arc(z.x - 28, z.y - 4, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(z.x + 28, z.y - 4, 9, 0, 7); ctx.fill();
    }
  },
};
