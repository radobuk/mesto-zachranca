/* Hlavná slučka, kamera, vstupy, HUD */
const Game = {
  cv: null, ctx: null, cw: 0, ch: 0,
  state: 'menu',
  player: null,
  cam: { x: 0, y: 0 },
  score: 0, saved: 0, trust: 100, time: 0, shake: 0, t: 0,
  last: 0, toastT: 0,
  webPointer: null, touch: false,

  input: {
    left: false, right: false, up: false, down: false,
    mouse: false, mx: 0, my: 0,
    tapped: { jump: false, action: false },
  },

  init() {
    this.cv = document.getElementById('game');
    this.ctx = this.cv.getContext('2d');
    this.touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    if (this.touch) FX.max = 420;
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));

    const setKey = (e, v) => {
      const k = e.key.toLowerCase();
      const i = this.input;
      if (k === 'a' || k === 'arrowleft') i.left = v;
      else if (k === 'd' || k === 'arrowright') i.right = v;
      else if (k === 'w' || k === 'arrowup') i.up = v;
      else if (k === 's' || k === 'arrowdown') i.down = v;
      else if (k === ' ') { if (v && !e.repeat) i.tapped.jump = true; e.preventDefault(); }
      else if (k === 'e') { if (v && !e.repeat) i.tapped.action = true; }
      else return;
      if (k !== ' ') e.preventDefault();
    };
    addEventListener('keydown', (e) => setKey(e, true));
    addEventListener('keyup', (e) => setKey(e, false));

    // Pointer events = myš aj prst naraz (viacdotykové ovládanie)
    const pos = (e) => {
      const r = this.cv.getBoundingClientRect();
      this.input.mx = e.clientX - r.left;
      this.input.my = e.clientY - r.top;
    };
    this.cv.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      if (this.webPointer !== null) return;      // druhý prst je na tlačidle
      this.webPointer = e.pointerId;
      pos(e);
      this.input.mouse = true;
      Snd.init();
      if (this.state === 'play' && this.player) {
        const w = this.screenToWorld(this.input.mx, this.input.my);
        this.player.shoot(w.x, w.y);
        this.player.retry = 6;
      }
    });
    this.cv.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.pointerId === this.webPointer) pos(e);
    });
    const endPointer = (e) => {
      if (e.pointerId !== this.webPointer) return;
      this.webPointer = null;
      this.input.mouse = false;
      if (this.player) this.player.release();
    };
    addEventListener('pointerup', endPointer);
    addEventListener('pointercancel', endPointer);

    // dotykové tlačidlá
    document.querySelectorAll('#touch [data-k]').forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
        b.classList.add('on');
        Snd.init();
        if (k === 'jump' || k === 'action') this.input.tapped[k] = true;
        else this.input[k] = true;
      };
      const off = (e) => {
        if (e) e.preventDefault();
        b.classList.remove('on');
        if (k !== 'jump' && k !== 'action') this.input[k] = false;
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    this.cv.addEventListener('contextmenu', (e) => e.preventDefault());

    document.getElementById('btnStart').onclick = () => { Snd.init(); this.start(); };
    document.getElementById('btnAgain').onclick = () => { this.start(); };

    // testovací prepínač: index.html?auto rovno spustí hru
    if (typeof location !== 'undefined' && location.search.indexOf('auto') >= 0)
      setTimeout(() => this.start(), 30);

    requestAnimationFrame((ts) => this.loop(ts));
  },

  resize() {
    const d = Math.min(devicePixelRatio || 1, this.touch ? 1.5 : 2);
    this.cw = innerWidth; this.ch = innerHeight;
    this.cv.width = this.cw * d;
    this.cv.height = this.ch * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  },

  screenToWorld(sx, sy) {
    return { x: sx + this.cam.x, y: sy + this.cam.y };
  },

  start() {
    World.generate();
    FX.reset();
    Missions.reset();
    this.player = new Player(600, World.GROUND_Y - 60);
    this.score = 0; this.saved = 0; this.trust = 100; this.time = 0; this.shake = 0;
    this.cam.x = this.player.x - this.cw / 2;
    this.cam.y = this.player.y - this.ch * 0.55;
    this.state = 'play';
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('over').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    if (this.touch) {
      document.getElementById('touch').classList.remove('hidden');
      document.getElementById('hint').innerHTML =
        'Ťukni a drž prst na budove = pavučina &nbsp;·&nbsp; ◀ ▶ = pohyb &nbsp;·&nbsp; ▲▼ = lano &nbsp;·&nbsp; E = zdvihni človeka';
      try { document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
    }
    const hint = document.getElementById('hint');
    hint.style.opacity = 1;
    setTimeout(() => (hint.style.opacity = 0), 14000);
    this.toast('Choď zachraňovať!', '#7ab8ff');
    Missions.spawn('car', this);
  },

  gameOver() {
    this.state = 'over';
    document.getElementById('overText').innerHTML =
      `Skóre: <b>${this.score}</b><br>Zachránených ľudí: <b>${this.saved}</b><br>Čas v akcii: <b>${this.fmt(this.time)}</b>`;
    document.getElementById('over').classList.remove('hidden');
    Snd.fail();
  },

  toast(msg, color) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.color = color || '#fff';
    el.classList.add('show');
    this.toastT = 110;
  },

  fmt(frames) {
    const s = Math.floor(frames / 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },

  loop(ts) {
    const dt = U.clamp((ts - this.last) / 16.667, 0, 2.5) || 1;
    this.last = ts;
    this.t += dt;
    if (this.state === 'play') this.update(dt);
    this.draw();
    this.input.tapped.jump = false;
    this.input.tapped.action = false;
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    const p = this.player;
    this.time += dt;

    if (this.input.tapped.action) Missions.interact(p, this);
    p.update(dt, this.input, this.screenToWorld(this.input.mx, this.input.my));
    Missions.update(dt, this, p);
    FX.update(dt);

    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) document.getElementById('toast').classList.remove('show');
    }

    // kamera s predstihom podľa rýchlosti
    const tx = p.x + p.vx * 14 - this.cw / 2;
    const ty = p.y + p.vy * 8 - this.ch * 0.55;
    this.cam.x = U.lerp(this.cam.x, tx, 0.085 * dt);
    this.cam.y = U.lerp(this.cam.y, ty, 0.07 * dt);
    this.cam.x = U.clamp(this.cam.x, 0, World.W - this.cw);
    this.cam.y = U.clamp(this.cam.y, -1800, World.GROUND_Y + 110 - this.ch);
    if (this.shake > 0) this.shake -= dt * 0.7;

    this.trust = U.clamp(this.trust, 0, 100);
    this.hud();
    if (this.trust <= 0) this.gameOver();
  },

  hud() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('saved').textContent = this.saved;
    document.getElementById('time').textContent = this.fmt(this.time);
    document.getElementById('mcount').textContent = Missions.active();
    const f = document.getElementById('trustFill');
    f.style.width = this.trust + '%';
    f.style.background =
      this.trust > 55 ? 'linear-gradient(90deg,#2ee08a,#8ce64a)'
      : this.trust > 25 ? 'linear-gradient(90deg,#ffc94d,#ff9d3c)'
      : 'linear-gradient(90deg,#ff5b6e,#ff2d46)';
  },

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cw, this.ch);
    if (this.state === 'menu') { this.drawIdleBg(ctx); return; }

    const sh = this.shake > 0 ? this.shake : 0;
    const ox = U.rnd(-sh, sh), oy = U.rnd(-sh, sh);

    World.drawBg(ctx, this.cam, this.cw, this.ch);

    ctx.save();
    ctx.translate(-this.cam.x + ox, -this.cam.y + oy);
    World.drawFg(ctx, this.cam, this.cw, this.ch, this.t);
    Missions.draw(ctx, this.t);
    if (this.player) {
      this.player.draw(ctx);
      if (this.player.carrying) drawPerson(ctx, this.player.carrying, this.t, 0.92);
    }
    FX.draw(ctx);
    ctx.restore();

    this.arrows(ctx);
    this.zoneHint(ctx);
  },

  drawIdleBg(ctx) {
    ctx.fillStyle = '#0a0d1f';
    ctx.fillRect(0, 0, this.cw, this.ch);
  },

  // šípky k misiám mimo obrazovky
  arrows(ctx) {
    const pad = 66;
    for (const m of Missions.list) {
      const sx = m.tx - this.cam.x, sy = m.ty - this.cam.y;
      const inside = sx > pad && sx < this.cw - pad && sy > pad && sy < this.ch - pad;
      if (inside) continue;
      const cx = this.cw / 2, cy = this.ch / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const rx = (this.cw / 2 - pad), ry = (this.ch / 2 - pad);
      const s = Math.min(Math.abs(rx / Math.cos(a)), Math.abs(ry / Math.sin(a)));
      const ax = cx + Math.cos(a) * s, ay = cy + Math.sin(a) * s;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = m.color;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      const d = Math.round(U.dist(this.player.x, this.player.y, m.tx, m.ty) / 10);
      ctx.save();
      ctx.font = '700 13px "Trebuchet MS",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      U.rr(ctx, ax - 26, ay + 16, 52, 18, 9); ctx.fill();
      ctx.fillStyle = m.color;
      ctx.fillText(d + ' m', ax, ay + 29);
      ctx.restore();
    }
  },

  // ukazovateľ na bezpečnú zónu, keď niekoho nesieš
  zoneHint(ctx) {
    const p = this.player;
    if (!p || !p.carrying) return;
    const z = World.nearestZone(p.x);
    const sx = U.clamp(z.x - this.cam.x, 40, this.cw - 40);
    const sy = U.clamp(z.y - 120 - this.cam.y, 40, this.ch - 60);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 0.14);
    ctx.fillStyle = '#5ef0a0';
    ctx.font = '900 15px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚑 BEZPEČNÁ ZÓNA', sx, sy);
    ctx.beginPath();
    ctx.moveTo(sx, sy + 20); ctx.lineTo(sx - 9, sy + 6); ctx.lineTo(sx + 9, sy + 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};

addEventListener('load', () => Game.init());
