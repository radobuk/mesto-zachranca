/* Spider-Man: hojdanie, lezenie po stenách, nosenie ľudí */
const PHYS = {
  GRAV: 0.6, RUN: 1.2, MAXRUN: 8.6, AIR: 0.42, FRICT: 0.84,
  JUMP: 15.5, MAXWEB: 640, MINLEN: 70, MAXLEN: 720, MAXV: 27,
};

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hw = 11; this.hh = 22;
    this.onGround = false;
    this.wall = 0;          // -1 = stena vľavo, 1 = stena vpravo
    this.face = 1;
    this.web = { on: false, ax: 0, ay: 0, len: 0 };
    this.carrying = null;
    this.animT = 0;
    this.retry = 0;
    this.hand = { x: 0, y: 0 };
  }

  shoot(tx, ty) {
    const ox = this.x, oy = this.y - 14;
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    let a = World.rayHit(ox, oy, nx, ny, PHYS.MAXWEB);
    if (!a) a = World.assist(ox, oy, nx, ny, PHYS.MAXWEB);
    if (!a) { Snd.miss(); return false; }
    this.web.on = true;
    this.web.ax = a.x; this.web.ay = a.y;
    this.web.len = U.clamp(U.dist(this.x, this.y, a.x, a.y), PHYS.MINLEN, PHYS.MAXLEN);
    this.wall = 0; this.onGround = false;
    FX.web(a.x, a.y);
    Snd.shoot();
    return true;
  }

  release() {
    if (!this.web.on) return;
    this.web.on = false;
    if (this.vy < 0) this.vy -= 1.4;   // malý bonus pri pustení v stúpaní
  }

  update(dt, inp, mouseWorld) {
    this.animT += dt * Math.max(1, Math.abs(this.vx) * 0.5);
    const w = this.web;

    // automatické opakovanie výstrelu, keď držíš myš
    if (inp.mouse && !w.on) {
      this.retry -= dt;
      if (this.retry <= 0) { this.shoot(mouseWorld.x, mouseWorld.y); this.retry = 6; }
    }

    if (w.on) {
      // --- hojdanie ---
      if (inp.left) this.vx -= PHYS.AIR * dt;
      if (inp.right) this.vx += PHYS.AIR * dt;
      if (inp.up) w.len = Math.max(PHYS.MINLEN, w.len - 7.5 * dt);
      if (inp.down) w.len = Math.min(PHYS.MAXLEN, w.len + 6 * dt);
      if (inp.tapped.jump) { this.release(); this.vy -= 6; Snd.jump(); }
      this.vy += PHYS.GRAV * dt;
    } else if (this.onGround) {
      // --- beh po zemi ---
      if (inp.left) this.vx -= PHYS.RUN * dt;
      if (inp.right) this.vx += PHYS.RUN * dt;
      if (!inp.left && !inp.right) this.vx *= Math.pow(PHYS.FRICT, dt);
      this.vx = U.clamp(this.vx, -PHYS.MAXRUN, PHYS.MAXRUN);
      if (inp.tapped.jump) { this.vy = -PHYS.JUMP; this.onGround = false; Snd.jump(); }
      this.vy += PHYS.GRAV * dt;
    } else if (this.wall !== 0) {
      // --- lezenie po stene ---
      this.vx = 0;
      this.vy = 0.9;
      if (inp.up) this.vy = -5.4;
      else if (inp.down) this.vy = 5.4;
      if (inp.tapped.jump) {
        this.vx = -this.wall * 12;
        this.vy = -13.5;
        this.wall = 0;
        Snd.jump();
      } else if ((this.wall === 1 && inp.left) || (this.wall === -1 && inp.right)) {
        this.vx = -this.wall * 4;
        this.wall = 0;
      }
    } else {
      // --- voľný let ---
      if (inp.left) this.vx -= PHYS.AIR * dt;
      if (inp.right) this.vx += PHYS.AIR * dt;
      this.vy += PHYS.GRAV * dt;
    }

    this.vx = U.clamp(this.vx, -PHYS.MAXV, PHYS.MAXV);
    this.vy = U.clamp(this.vy, -PHYS.MAXV, PHYS.MAXV);
    if (Math.abs(this.vx) > 0.4) this.face = this.vx > 0 ? 1 : -1;

    // integrácia v dvoch krokoch (proti pretunelovaniu)
    const steps = 2;
    this.onGround = false;
    this.wall = 0;
    for (let s = 0; s < steps; s++) {
      this.x += (this.vx * dt) / steps;
      this.y += (this.vy * dt) / steps;
      if (w.on) this.rope();
      this.collide();
    }
    if (!this.onGround) this.wall = this.probeWall();

    // hranice sveta
    this.x = U.clamp(this.x, 30, World.W - 30);
    if (this.y + this.hh > World.GROUND_Y) {
      this.y = World.GROUND_Y - this.hh;
      if (this.vy > 14) FX.sparks(this.x, World.GROUND_Y, 10, '#8899bb');
      this.vy = 0;
      this.onGround = true;
      this.wall = 0;
      if (w.on) this.release();
    }
    if (this.y < -2500) { this.y = -2500; this.vy = Math.max(0, this.vy); }

    // nesený človek ide so mnou
    if (this.carrying) {
      this.carrying.x = this.x - this.face * 6;
      this.carrying.y = this.y - 16;
      this.carrying.carried = true;
    }
  }

  // tenká sonda po bokoch – vďaka nej sa Spider-Man udrží na stene
  probeWall() {
    if (this.web.on) return 0;
    const y = this.y - this.hh + 5, h = this.hh * 2 - 10;
    const rr = { x: this.x + this.hw - 1, y, w: 4, h };
    const rl = { x: this.x - this.hw - 3, y, w: 4, h };
    for (const b of World.buildings) {
      if (b.x > this.x + 60 || b.x + b.w < this.x - 60) continue;
      if (U.aabb(rr, b)) return 1;
      if (U.aabb(rl, b)) return -1;
    }
    return 0;
  }

  rope() {
    const w = this.web;
    const dx = this.x - w.ax, dy = this.y - w.ay;
    const d = Math.hypot(dx, dy) || 1;
    if (d > w.len) {
      const nx = dx / d, ny = dy / d;
      this.x = w.ax + nx * w.len;
      this.y = w.ay + ny * w.len;
      const radial = this.vx * nx + this.vy * ny;
      if (radial > 0) { this.vx -= nx * radial; this.vy -= ny * radial; }
    }
  }

  collide() {
    const r = { x: this.x - this.hw, y: this.y - this.hh, w: this.hw * 2, h: this.hh * 2 };
    for (const b of World.buildings) {
      if (!U.aabb(r, b)) continue;
      const pr = b.x + b.w - r.x;      // vytlač doprava
      const pl = r.x + r.w - b.x;      // vytlač doľava
      const pd = b.y + b.h - r.y;      // vytlač dole
      const pu = r.y + r.h - b.y;      // vytlač hore
      const m = Math.min(pr, pl, pd, pu);
      if (m === pu) { this.y -= pu; this.vy = Math.min(0, this.vy); this.onGround = true; }
      else if (m === pd) { this.y += pd; this.vy = Math.max(0, this.vy); }
      else if (m === pr) { this.x += pr; this.vx = Math.max(0, this.vx); if (!this.web.on) this.wall = -1; }
      else { this.x -= pl; this.vx = Math.min(0, this.vx); if (!this.web.on) this.wall = 1; }
      r.x = this.x - this.hw; r.y = this.y - this.hh;
    }
    if (this.wall !== 0 && this.web.on) this.wall = 0;
  }

  draw(ctx) {
    const w = this.web;

    // pavučina
    if (w.on) {
      const hx = this.x + this.face * 5, hy = this.y - 16;
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      const mx = (hx + w.ax) / 2 + this.vx * 1.2;
      const my = (hy + w.ay) / 2 + 6;
      ctx.quadraticCurveTo(mx, my, w.ax, w.ay);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(w.ax, w.ay, 4, 0, 7); ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    let ang = 0;
    if (w.on) ang = Math.atan2(this.y - w.ay, this.x - w.ax) - Math.PI / 2;
    else if (this.wall === 0) ang = U.clamp(this.vx * 0.022, -0.45, 0.45);
    ctx.rotate(ang);
    ctx.scale(this.face, 1);
    this.body(ctx);
    ctx.restore();
  }

  body(ctx) {
    const t = this.animT;
    const swing = this.web.on;
    const run = this.onGround && Math.abs(this.vx) > 0.6;
    const climb = this.wall !== 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // nohy
    ctx.strokeStyle = '#1f3fa8';
    ctx.lineWidth = 7;
    let a1, a2;
    if (swing) { a1 = 2.5; a2 = 1.9; }
    else if (climb) { a1 = 1.9 + Math.sin(t * 0.25) * 0.4; a2 = 1.2 - Math.sin(t * 0.25) * 0.3; }
    else if (run) { a1 = 1.57 + Math.sin(t * 0.42) * 0.8; a2 = 1.57 - Math.sin(t * 0.42) * 0.8; }
    else if (!this.onGround) { a1 = 2.2; a2 = 1.1; }
    else { a1 = 1.65; a2 = 1.48; }
    U.limb(ctx, -3, 4, a1, 11, 11, swing ? -0.9 : -0.5);
    U.limb(ctx, 3, 4, a2, 11, 11, swing ? -0.7 : 0.4);

    // ruky
    ctx.strokeStyle = '#d0202f';
    ctx.lineWidth = 6;
    if (swing) {
      U.limb(ctx, -2, -14, -1.45, 10, 10, -0.25);
      U.limb(ctx, 4, -14, -1.0, 10, 10, 0.5);
    } else if (climb) {
      U.limb(ctx, -2, -14, -1.2 + Math.sin(t * 0.25) * 0.5, 10, 10, 0.2);
      U.limb(ctx, 4, -14, -1.6 - Math.sin(t * 0.25) * 0.4, 10, 10, 0.2);
    } else if (run) {
      U.limb(ctx, -2, -13, 1.4 - Math.sin(t * 0.42) * 1.1, 9, 9, 0.7);
      U.limb(ctx, 4, -13, 1.4 + Math.sin(t * 0.42) * 1.1, 9, 9, -0.7);
    } else {
      U.limb(ctx, -2, -13, 1.9, 9, 9, 0.4);
      U.limb(ctx, 4, -13, 1.0, 9, 9, -0.4);
    }

    // trup
    ctx.fillStyle = '#d0202f';
    U.rr(ctx, -9, -20, 18, 26, 7); ctx.fill();
    ctx.fillStyle = '#1f3fa8';
    U.rr(ctx, -9, -4, 18, 10, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); // pavúk na hrudi
    ctx.ellipse(0, -11, 2.4, 3.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-7, -14 + i * 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, -14 + i * 4); ctx.stroke();
    }
    // sieť na trupe
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    for (let i = -8; i <= 8; i += 5) {
      ctx.beginPath(); ctx.moveTo(i, -20); ctx.lineTo(i, -4); ctx.stroke();
    }

    // hlava
    ctx.fillStyle = '#d0202f';
    ctx.beginPath(); ctx.arc(1, -27, 9, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.arc(1, -27, 9, 0.2, 2.9); ctx.stroke();
    // oči
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(5, -28, 4.6, 3.1, -0.35, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-3, -28.5, 3.4, 2.5, 0.35, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(5, -28, 4.6, 3.1, -0.35, 0, 7); ctx.stroke();
  }
}
