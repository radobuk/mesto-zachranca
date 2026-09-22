/* Misie: horiace auto, horiaca budova, padajúci človek, zlodej */
const SHIRTS = ['#ffd45c', '#59d9a4', '#7ab8ff', '#ff8fb1', '#c69bff', '#ff9d5c'];
const SKINS = ['#f0c39a', '#d89b72', '#a9714a', '#8a5636', '#f7d9bd'];

function makeVictim(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    shirt: U.pick(SHIRTS), skin: U.pick(SKINS),
    carried: false, anim: U.rnd(0, 10), falling: false,
  };
}

function drawPerson(ctx, p, t, scale = 1) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  if (p.carried) ctx.rotate(0.35);
  const wob = Math.sin(t * 0.18 + p.anim) * (p.carried ? 0.15 : 0.55);
  ctx.lineCap = 'round';
  // nohy
  ctx.strokeStyle = '#2f3a55';
  ctx.lineWidth = 5;
  U.limb(ctx, -2, 2, 1.57 + wob * 0.4, 8, 8, -0.2);
  U.limb(ctx, 2, 2, 1.57 - wob * 0.4, 8, 8, 0.2);
  // ruky (mávanie o pomoc)
  ctx.strokeStyle = p.shirt;
  ctx.lineWidth = 4.5;
  const up = p.carried ? 0.9 : -1.9;
  U.limb(ctx, -3, -9, up + wob, 7, 7, 0.4);
  U.limb(ctx, 3, -9, up - wob, 7, 7, -0.4);
  // telo
  ctx.fillStyle = p.shirt;
  U.rr(ctx, -6, -13, 12, 17, 5); ctx.fill();
  // hlava
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(0, -19, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2a22';
  ctx.beginPath(); ctx.arc(0, -22, 6.5, Math.PI, 0); ctx.fill();
  ctx.restore();
}

function drawWing(ctx, x, y, ang, len) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len, -len * 0.32);
  ctx.lineTo(-len * 0.92, -len * 0.04);
  ctx.lineTo(-len * 0.52, len * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const Missions = {
  list: [],
  spawnTimer: 120,
  reset() { this.list.length = 0; this.spawnTimer = 90; },

  active() { return this.list.length; },

  spawn(type, game) {
    const G = World.GROUND_Y;
    if (!type) {
      const r = Math.random();
      // Supavec sa objaví až po minúte hry a vždy len jeden naraz
      const canV = game.time > 3600 && !this.list.some((x) => x.v);
      if (canV && r < 0.2) type = 'vulture';
      else if (r < 0.38) type = 'car';
      else if (r < 0.62) type = 'building';
      else if (r < 0.84) type = 'fall';
      else type = 'thief';
    }
    const m = { type, time: 0, rescued: false, done: false };

    if (type === 'car') {
      m.x = World.randomStreet();
      m.y = G;
      m.max = 32 * 60;
      m.victim = makeVictim(m.x + 46, G - 4);
      m.label = 'Horiace auto!';
      m.color = '#ff7a3c';
      m.pts = 150;
    } else if (type === 'building') {
      const b = World.randomBuilding(320);
      m.b = b;
      m.x = b.x + b.w / 2;
      m.y = b.y;
      m.max = 42 * 60;
      m.victim = makeVictim(U.clamp(b.x + U.rnd(25, b.w - 25), b.x + 20, b.x + b.w - 20), b.y - 2);
      m.label = 'Požiar v budove!';
      m.color = '#ff4d4d';
      m.pts = 200;
    } else if (type === 'fall') {
      const b = World.randomBuilding(420);
      m.x = Math.random() < 0.5 ? b.x - 20 : b.x + b.w + 20;
      m.y = b.y - 10;
      m.max = 14 * 60;
      m.victim = makeVictim(m.x, m.y);
      m.victim.falling = true;
      m.victim.vx = U.rnd(-1, 1);
      m.label = 'Človek padá!';
      m.color = '#ffe14d';
      m.pts = 250;
    } else if (type === 'vulture') {
      m.dir = Math.random() < 0.5 ? -1 : 1;
      const px = game.player ? game.player.x : 1200;
      m.x = U.clamp(px - m.dir * 900, 500, World.W - 500);
      m.y = World.roofAbove(m.x, 300) - U.rnd(150, 210);
      m.v = { x: m.x, y: m.y, hp: 3, stun: 0, hurt: 0, gone: false };
      m.speed = 2.4;
      m.max = 45 * 60;
      m.victim = makeVictim(m.x, m.y + 50);
      m.label = 'Supavec uniesol človeka!';
      m.color = '#6ee7b0';
      m.pts = 400;
    } else {
      m.dir = Math.random() < 0.5 ? -1 : 1;
      m.x = World.randomStreet();
      m.y = G;
      m.max = 26 * 60;
      m.thief = { x: m.x, y: G, anim: 0 };
      m.label = 'Zlodej uteká!';
      m.color = '#b07cff';
      m.pts = 120;
    }
    m.tx = m.x; m.ty = m.y;
    this.list.push(m);
    game.toast(m.label, m.color);
    Snd.tone(620, 380, 0.22, 'triangle', 0.05);
  },

  update(dt, game, p) {
    // objavovanie nových misií (postupne rýchlejšie)
    this.spawnTimer -= dt;
    const maxActive = game.time < 3600 ? 2 : game.time < 10800 ? 3 : 4;
    if (this.spawnTimer <= 0 && this.list.length < maxActive) {
      this.spawn(null, game);
      const speedUp = U.clamp(1 - game.time / 60 / 6, 0.45, 1);
      this.spawnTimer = U.rnd(430, 640) * speedUp;
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      m.time += dt;

      // porazený supavec odlieta preč
      if (m.v && m.v.hp <= 0 && !m.v.gone) {
        m.v.x += m.dir * 5 * dt;
        m.v.y -= 2.4 * dt;
        if (m.v.y < World.GROUND_Y - 1700) m.v.gone = true;
      }

      if (m.type === 'car') {
        FX.fire(m.x - 24, m.y - 40, 1.1);
        if (m.time > m.max * 0.6) FX.fire(m.x + 20, m.y - 34, 0.9);
        if (!m.rescued) {
          m.victim.x = m.x + 46;
          m.victim.y = m.y - 4;
          m.ty = m.y - 30;
          if (m.time >= m.max) { this.fail(m, game, true); this.list.splice(i, 1); continue; }
        }
      } else if (m.type === 'building') {
        FX.fire(m.b.x + m.b.w * 0.25, m.b.y + 10, 1.2);
        FX.fire(m.b.x + m.b.w * 0.75, m.b.y + 4, 1.0);
        if (m.time > m.max * 0.5) FX.fire(m.b.x + m.b.w * 0.5, m.b.y + 70, 0.9);
        if (!m.rescued) {
          m.tx = m.victim.x; m.ty = m.victim.y - 26;
          if (m.time >= m.max) { this.fail(m, game, true); this.list.splice(i, 1); continue; }
        }
      } else if (m.type === 'fall') {
        const v = m.victim;
        if (!m.rescued) {
          v.vy += 0.42 * dt;
          v.x += v.vx * dt;
          v.y += v.vy * dt;
          m.tx = v.x; m.ty = v.y;
          if (Math.random() < 0.06) FX.text(v.x, v.y - 34, '!', '#ffe14d', 16);
          // chytenie
          if (U.dist(p.x, p.y, v.x, v.y) < 52) {
            m.rescued = true; m.done = true;
            game.score += m.pts + 60;
            game.saved++;
            game.trust = Math.min(100, game.trust + 8);
            FX.text(v.x, v.y - 40, 'CHYTENÝ! +' + (m.pts + 60), '#ffe14d', 26);
            FX.sparks(v.x, v.y, 22, '#ffe14d');
            game.toast('Skvelý chyt!', '#ffe14d');
            Snd.catch_();
            this.list.splice(i, 1);
            continue;
          }
          const onRoof = m.time > 24 && v.y > 0 && World.pointIn(v.x, v.y + 6);
          if (v.y >= World.GROUND_Y - 6 || onRoof) {
            this.fail(m, game, false);
            this.list.splice(i, 1);
            continue;
          }
        }
      } else if (m.type === 'vulture') {
        const v = m.v;
        if (v.stun > 0) {
          v.stun -= dt;
          if (Math.random() < 0.4) FX.sparks(v.x + U.rnd(-18, 18), v.y + U.rnd(-12, 12), 1, '#bfffe4');
        } else {
          v.x += m.dir * m.speed * dt;
        }
        // drž sa nad strechami – inak by bol nedosiahnuteľný v budove
        const roofY = World.roofAbove(v.x, 300) - 175;
        v.y = U.lerp(v.y, roofY + Math.sin(m.time * 0.03) * 26, 0.06 * dt);
        if (v.hurt > 0) v.hurt -= dt;
        m.x = v.x; m.y = v.y;
        m.victim.x = v.x + 2; m.victim.y = v.y + 54;
        m.tx = v.x; m.ty = v.y - 16;

        if (U.dist(p.x, p.y, v.x, v.y) < 62 && v.hurt <= 0) {
          const spd = Math.hypot(p.vx, p.vy);
          if (spd > 6) {
            // poriadny zásah v rozlete
            v.hp--; v.stun = 50; v.hurt = 42;
            game.shake = 12;
            FX.sparks(v.x, v.y, 26, '#bfffe4');
            Snd.tone(520, 140, 0.18, 'square', 0.07);
            p.vx = -p.vx * 0.5; p.vy = -7;
            if (v.hp <= 0) {
              FX.text(v.x, v.y - 54, 'PUSTIL HO!', '#6ee7b0', 24);
              game.toast('Chyť ho, kým nedopadne!', '#ffe14d');
              game.score += 120;
              m.type = 'fall';          // odteraz je to chytanie padajúceho
              m.time = 0; m.max = 14 * 60; m.rescued = false;
              m.color = '#ffe14d';
              m.victim.falling = true; m.victim.vx = m.dir * 1.6; m.victim.vy = -7;
            } else {
              FX.text(v.x, v.y - 50, 'ZÁSAH! ešte ' + v.hp + '×', '#ffffff', 20);
            }
          } else {
            // priblížil si sa pomaly – odhodí ťa
            v.hurt = 34;
            const a = Math.atan2(p.y - v.y, p.x - v.x);
            p.release();
            p.vx = Math.cos(a) * 13;
            p.vy = Math.sin(a) * 13 - 4;
            game.shake = 8;
            FX.text(p.x, p.y - 44, 'AU!', '#ff5b6e', 20);
            Snd.tone(220, 90, 0.2, 'sawtooth', 0.05);
          }
        }

        if (v.x < 70 || v.x > World.W - 70 || m.time >= m.max) {
          this.fail(m, game, false, 'Supavec ušiel s rukojemníkom!');
          this.list.splice(i, 1);
          continue;
        }
      } else if (m.type === 'thief') {
        const th = m.thief;
        th.x += m.dir * 3.4 * dt;
        th.anim += dt;
        m.tx = th.x; m.ty = th.y - 30;
        if (th.x < 80 || th.x > World.W - 80 || m.time >= m.max) {
          this.fail(m, game, false, 'Zlodej ušiel!');
          this.list.splice(i, 1);
          continue;
        }
      }

      // doručenie zachráneného do bezpečnej zóny
      if (m.rescued && m.victim && p.carrying === m.victim) {
        const z = World.nearestZone(p.x);
        if (Math.abs(p.x - z.x) < 92 && p.y > World.GROUND_Y - 170) {
          p.carrying = null;
          game.score += m.pts;
          game.saved++;
          game.trust = Math.min(100, game.trust + 6);
          FX.text(z.x, z.y - 100, 'ZACHRÁNENÝ! +' + m.pts, '#5ef0a0', 26);
          FX.sparks(z.x, z.y - 60, 24, '#5ef0a0');
          game.toast('Zachránený! +' + m.pts, '#5ef0a0');
          Snd.rescue();
          this.list.splice(i, 1);
          continue;
        }
      }
    }
  },

  fail(m, game, explode, msg) {
    game.trust -= 15;
    game.shake = 16;
    if (explode) { FX.boom(m.x, m.y - 30); }
    FX.text(m.x, m.y - 90, msg || 'NESTIHOL SI TO!', '#ff5b6e', 24);
    game.toast(msg || 'Nestihol si to…', '#ff5b6e');
    Snd.fail();
    if (m.victim) m.victim.dead = true;
  },

  // E = interakcia
  interact(p, game) {
    if (p.carrying) {           // polož človeka – len na zemi alebo na streche
      if (!p.onGround) return;
      p.carrying.carried = false;
      p.carrying.y = p.y;
      p.carrying = null;
      return;
    }
    for (const m of this.list) {
      if (m.type === 'thief') {
        const th = m.thief;
        if (U.dist(p.x, p.y, th.x, th.y - 20) < 60) {
          m.done = true;
          game.score += m.pts;
          game.trust = Math.min(100, game.trust + 4);
          FX.text(th.x, th.y - 60, 'CHYTENÝ ZLODEJ! +' + m.pts, '#c9a6ff', 24);
          FX.web(th.x, th.y - 20);
          FX.sparks(th.x, th.y - 20, 18, '#ffffff');
          game.toast('Zlodej chytený!', '#c9a6ff');
          Snd.rescue();
          this.list.splice(this.list.indexOf(m), 1);
          return;
        }
      } else if (m.victim && !m.victim.carried && !m.victim.falling) {
        if (U.dist(p.x, p.y, m.victim.x, m.victim.y - 14) < 62) {
          p.carrying = m.victim;
          if (!m.rescued) {
            m.rescued = true;
            FX.text(m.victim.x, m.victim.y - 50, 'Máš ho! Do zóny 🚑', '#ffffff', 20);
            game.toast('Odnes ho do zelenej zóny!', '#7ab8ff');
          }
          Snd.pickup();
          return;
        }
      }
    }
  },

  draw(ctx, t) {
    for (const m of this.list) {
      if (m.type === 'car') this.drawCar(ctx, m, t);
      if (m.type === 'thief') this.drawThief(ctx, m, t);
      if (m.v && !m.v.gone) this.drawVulture(ctx, m, t);
      if (m.victim && !m.victim.carried) drawPerson(ctx, m.victim, t);
      // ukazovateľ nad cieľom
      if (!m.rescued) {
        const bob = Math.sin(t * 0.1) * 5;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.moveTo(m.tx, m.ty - 40 + bob);
        ctx.lineTo(m.tx - 10, m.ty - 56 + bob);
        ctx.lineTo(m.tx + 10, m.ty - 56 + bob);
        ctx.closePath();
        ctx.fill();
        // časomiera
        if (m.type !== 'fall') {
          const f = 1 - m.time / m.max;
          ctx.fillStyle = 'rgba(0,0,0,.55)';
          U.rr(ctx, m.tx - 30, m.ty - 72 + bob, 60, 7, 3); ctx.fill();
          ctx.fillStyle = f > 0.4 ? '#5ef0a0' : f > 0.18 ? '#ffd45c' : '#ff5b6e';
          U.rr(ctx, m.tx - 30, m.ty - 72 + bob, 60 * U.clamp(f, 0, 1), 7, 3); ctx.fill();
        }
        ctx.restore();
      }
    }
  },

  drawCar(ctx, m, t) {
    const x = m.x, y = m.y;
    ctx.save();
    ctx.fillStyle = '#20242f';
    ctx.beginPath(); ctx.ellipse(x, y + 4, 64, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d2b30';
    U.rr(ctx, x - 58, y - 34, 116, 30, 8); ctx.fill();
    ctx.fillStyle = '#93343a';
    U.rr(ctx, x - 34, y - 54, 62, 24, 8); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,255,.45)';
    U.rr(ctx, x - 28, y - 50, 24, 16, 4); ctx.fill();
    U.rr(ctx, x + 1, y - 50, 22, 16, 4); ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x + 52, y - 26, 8, 7);
    ctx.fillStyle = '#12151d';
    ctx.beginPath(); ctx.arc(x - 34, y - 3, 11, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 34, y - 3, 11, 0, 7); ctx.fill();
    ctx.restore();
  },

  drawVulture(ctx, m, t) {
    const v = m.v;
    ctx.save();
    ctx.translate(v.x, v.y);
    if (v.stun > 0) ctx.rotate(Math.sin(t * 0.8) * 0.2);
    ctx.scale(m.dir, 1);
    const flap = Math.sin(t * 0.13);
    const wa = -0.45 + flap * 0.5;

    // zadné krídlo
    ctx.fillStyle = '#1d5340';
    drawWing(ctx, -4, -4, wa - 0.3, 52);
    // pazúry držiace človeka
    if (v.hp > 0) {
      ctx.strokeStyle = '#2a6e54';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      U.limb(ctx, -4, 6, 1.5, 16, 16, 0.25);
      U.limb(ctx, 5, 6, 1.6, 16, 16, -0.25);
    }
    // telo
    ctx.fillStyle = '#2f8461';
    U.rr(ctx, -12, -16, 26, 26, 9); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    U.rr(ctx, -12, -4, 26, 8, 4); ctx.fill();
    // predné krídlo
    ctx.fillStyle = '#3aa87a';
    drawWing(ctx, -2, -8, wa, 60);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    drawWing(ctx, -2, -8, wa, 34);
    // hlava s okuliarmi
    ctx.fillStyle = '#2a6e54';
    ctx.beginPath(); ctx.arc(7, -22, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#12352a';
    U.rr(ctx, 2, -27, 16, 9, 4); ctx.fill();
    ctx.fillStyle = v.stun > 0 ? '#ffd45c' : '#ff5b6e';
    ctx.beginPath(); ctx.arc(9, -23, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -23, 3, 0, 7); ctx.fill();
    ctx.restore();

    // ukazovateľ životov
    if (v.hp > 0) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < v.hp ? '#6ee7b0' : 'rgba(255,255,255,.18)';
        ctx.beginPath();
        ctx.arc(v.x - 16 + i * 16, v.y - 44, 5, 0, 7);
        ctx.fill();
      }
    }
  },

  drawThief(ctx, m, t) {
    const th = m.thief;
    ctx.save();
    ctx.translate(th.x, th.y);
    ctx.scale(m.dir, 1);
    const w = Math.sin(th.anim * 0.42);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b1f2e';
    ctx.lineWidth = 6;
    U.limb(ctx, -2, 2, 1.57 + w * 0.9, 9, 9, -0.4);
    U.limb(ctx, 2, 2, 1.57 - w * 0.9, 9, 9, 0.4);
    ctx.strokeStyle = '#2d3348';
    ctx.lineWidth = 5;
    U.limb(ctx, -2, -10, 1.3 - w, 8, 8, 0.6);
    ctx.fillStyle = '#2d3348';
    U.rr(ctx, -7, -15, 14, 19, 5); ctx.fill();
    ctx.fillStyle = '#e8c56a';   // vrece s lupom
    ctx.beginPath(); ctx.arc(10, -14, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(6, -24, 8, 5);
    ctx.strokeStyle = '#2d3348'; ctx.lineWidth = 5;
    U.limb(ctx, 3, -10, -0.5, 8, 6, 0.2);
    ctx.fillStyle = '#d9a97e';
    ctx.beginPath(); ctx.arc(0, -21, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1f2e';
    ctx.fillRect(-7, -24, 14, 5);
    ctx.restore();
  },
};
