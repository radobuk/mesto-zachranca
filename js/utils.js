/* Pomocné funkcie */
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rnd: (a, b) => a + Math.random() * (b - a),
  rndi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  aabb: (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,

  rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // dvojdielna končatina (rameno -> lakeť -> dlaň)
  limb(ctx, x, y, ang, l1, l2, bend) {
    const ex = x + Math.cos(ang) * l1;
    const ey = y + Math.sin(ang) * l1;
    const a2 = ang + bend;
    const hx = ex + Math.cos(a2) * l2;
    const hy = ey + Math.sin(a2) * l2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    return { x: hx, y: hy };
  },
};
