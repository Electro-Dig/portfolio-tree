// Portfolio Tree — layout, growth animation and drawing.
//
// A seed (your first work) sits at the root. The trunk is time: the higher, the later. Each big branch (a field you work in)
// leaves the trunk in the month it started; it forks into sub-branches (themes); works hang at the ends of thin twigs; events
// ripen as fruit beside the trunk in their month. Everything is hand-drawn on canvas and laid out deterministically from
// content/content.js (+ content/media.js for media sizes), so the same content always grows the same tree.
//
// Exposes window.__GROW for assets/engine/site.js: { BOUNDS, OVER, VIDS, ITEMS, REGIONS, setView, draw, invalidate, TOTAL, COUNT }.
(function () {
  const C = window.CONTENT || {}, SITECFG = C.site || {}, MEDIA = window.MEDIA || {};
  let EXPLORE = !!window.__EXPLORE;
  const TOTAL = SITECFG.duration || 120;
  // film sections (seconds): cover → rewind into the seed → growth → closing overview
  const SEC = { cover: [0, 8], rewind: [8, 10], origin: [10, 16], finale: [TOTAL - 7, TOTAL] };
  const BEATS = Array.isArray(SITECFG.beats) ? SITECFG.beats.slice().sort((a, b) => a - b) : null;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u;
  const E = { io: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), out: u => 1 - Math.pow(1 - u, 3), in: u => u * u * u,
    back: u => { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = "io") => E[e](clamp((t - a) / (b - a)));
  function lastBefore(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  const pulse = t => { if (!BEATS) return 0; const i = lastBefore(BEATS, t); return i < 0 ? 0 : Math.exp(-(t - BEATS[i]) / 0.12); };
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const INK = "#2a2623", BARK = SITECFG.barkColor || "#5b4636", FRUIT_C = SITECFG.fruitColor || "#c2541f";
  const PAL = ["#F2B42C", "#E8743B", "#E9627E", "#3DA37A", "#2F6FB0"];
  // the tree has its own greens; a branch's `treeColor` (or `color`) overrides them
  const GREENS = ["#23704f", "#6b8e23", "#22777c", "#4e6b2a", "#3f8f5f", "#7a8f2a"];
  const MDIR = (C.mediaDir || "content/media/").replace(/\/?$/, "/");
  const info = f => MEDIA[f] || {};
  const ar = f => { const m = info(f); return m.w && m.h ? m.w / m.h : 16 / 9; };
  const isVideo = f => /\.(mp4|webm|mov|m4v)$/i.test(f || "");
  // dates are "YYYY.MM" (or "YYYY.MM.DD"); months count from site.start
  const ym = d => { const m = /(\d{4})\.(\d{1,2})/.exec(d || ""); return m ? +m[1] * 12 + (+m[2] - 1) : null; };
  const M0 = ym(SITECFG.start) ?? 0;
  const month = d => { const v = ym(d); return v === null ? 0 : Math.max(0, v - M0); };
  const MONTHS = Math.max(1, month(SITECFG.end) + 1);
  const SINGLE = { F: 640, N: 460, P: 320 }, MULTI = { F: 420, N: 340, P: 250 }, GAP = 22, RR = 170;
  const tierOf = it => (it.tier === "F" || it.tier === "P" ? it.tier : "N");
  const playOf = it => (it.play || []).map(p => (Array.isArray(p) ? p : [p.label || "Try it", p.url])).filter(p => p[1]);

  // ======================= layout (world px; y grows downward, the tree grows toward −y) =======================
  const MH = 330, TH = MONTHS * MH + 500;                                   // one month ≈ 330 px of trunk
  const tx = y => 70 * Math.sin(-y / 1100 + 0.6) + 26 * Math.sin(-y / 330 + 1.4); // the trunk leans a little as it grows
  const yOf = m => -260 - m * MH;
  const BOXES = [];
  const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const cost = box => BOXES.reduce((s, q) => s + overlap(box, q), 0);
  for (let y = 0; y > -TH; y -= 200) BOXES.push([tx(y) - 170, y - 200, tx(y) + 170, y]);   // keep the trunk clear
  BOXES.push([-RR - 120, -RR - 200, RR + 120, RR + 60]);                                  // the seed

  const cardsOf = (media, tier) => { const files = media && media.length ? media : [null], cw0 = (files.length > 1 ? MULTI : SINGLE)[tier];
    const cards = files.map(src => { const a = src ? ar(src) : 4 / 3, w = a < 0.9 ? cw0 * 0.62 : cw0; return { src, w, h: w / a }; });
    const cols = cards.length >= 3 ? 2 : cards.length, rows = Math.ceil(cards.length / cols);
    const colW = Array.from({ length: cols }, (_, c) => Math.max(...cards.filter((_, i) => i % cols === c).map(x => x.w)));
    const rowH = Array.from({ length: rows }, (_, r) => Math.max(...cards.filter((_, i) => Math.floor(i / cols) === r).map(x => x.h)));
    return { cards, cols, rows, colW, rowH, W: colW.reduce((s, x) => s + x, 0) + (cols - 1) * GAP, H: rowH.reduce((s, x) => s + x, 0) + (rows - 1) * GAP }; };
  const dirOf = deg => { const a = deg * Math.PI / 180; return [Math.sin(a), -Math.cos(a)]; };   // 0° = straight up, + = to the right

  // fruit: events hang beside the trunk at their month, alternating sides
  const EVC = C.events || { items: [] };
  const FRUIT = (EVC.items || []).map((e, i) => {
    const y0 = yOf(month(e.date)) - 40, side = i % 2 ? -1 : 1;
    const files = e.media && e.media.length ? e.media : [null];
    const cards = files.map(src => { const a = src ? ar(src) : 4 / 3, w = a < 0.9 ? Math.min(220, 300 * a) : 330; return { src, w, h: w / a }; });
    const W = cards.reduce((s, c) => s + c.w, 0) + (cards.length - 1) * 14, H = Math.max(...cards.map(c => c.h));
    let best = null;
    for (const s of [side, -side]) for (let k = 0; k < 8; k++) {
      const cx = tx(y0) + s * (250 + W / 2 + k * 140), cy = y0 - k * 60;
      const box = [cx - W / 2 - 20, cy - H / 2 - 80, cx + W / 2 + 20, cy + H / 2 + 20], c = cost(box) + k * 10;
      if (!best || c < best.c) best = { cx, cy, box, c, s }; if (c < 1) break; }
    BOXES.push(best.box);
    let x = best.cx - W / 2; cards.forEach((c, j) => { c.x = x + c.w / 2; c.y = best.cy; c.rot = (hash(i * 5 + j + 300) - 0.5) * 8; x += c.w + 14; });
    return { ...e, cards, W, H, cx: best.cx, cy: best.cy, side: best.s, stem: [[tx(y0), y0], [best.cx - best.s * (W / 2 + 6), best.cy + H * 0.1]] };
  });

  // big branch → sub-branch → works. Pass 1 fixes every limb (fork points, directions) and reserves its path and name label,
  // so no card is placed on top of a limb; pass 2 hangs the works along each sub-branch, alternating sides, pushing outward on overlap.
  const lineBoxes = (a, b, r) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 160); for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / n), y = lerp(a[1], b[1], i / n); BOXES.push([x - r, y - r, x + r, y + r]); } };
  const BR = (C.branches || []).map((tb, bi) => {
    const side = bi % 2 ? -1 : 1, groupsIn = (tb.groups || []).filter(g => g.items && g.items.length);
    const firstDate = groupsIn.flatMap(g => g.items.map(it => month(it.date))).reduce((a, b) => Math.min(a, b), MONTHS);
    const m0 = tb.from ? month(tb.from) : Math.max(0, firstDate - 1), y0 = yOf(m0), P0 = [tx(y0), y0];
    const ang = side * (62 - bi * 6), u = dirOf(ang), ng = groupsIn.length;
    let along = 560;
    const groups = groupsIn.map((g, gi) => {
      const S0 = [P0[0] + u[0] * along, P0[1] + u[1] * along];
      // sub-branches fan upward like a crown: the one nearest the trunk points most to the sky, the last one follows the limb
      const ga = ang - side * (44 - 34 * gi / Math.max(1, ng - 1)), gu = dirOf(ga);
      along += 380 + 70 * g.items.length;
      const lab = [S0[0] + gu[0] * 150, S0[1] + gu[1] * 150], lw = String(g.label || "").length * 66;
      return { label: g.label || "", items: g.items, S0, ga, gu, lab, lw, n: g.items.length };
    });
    const tip = [P0[0] + u[0] * (along - 260), P0[1] + u[1] * (along - 260)];
    const label = tb.label || "", lp = [P0[0] + u[0] * 300, P0[1] + u[1] * 300 - 160], llw = label.length * 120;
    return { id: tb.id || "b" + bi, m0, label, color: tb.treeColor || GREENS[bi % GREENS.length], side, ang, u, P0, tip, groups, lp, llw, n: groups.reduce((s, g) => s + g.n, 0) };
  });
  BR.forEach(b => (b.text = b.color));
  BR.forEach(b => { lineBoxes(b.P0, b.tip, 90);
    BOXES.push(b.side > 0 ? [b.lp[0] + 30, b.lp[1] - 10, b.lp[0] + 50 + b.llw, b.lp[1] + 150] : [b.lp[0] - 50 - b.llw, b.lp[1] - 10, b.lp[0] - 30, b.lp[1] + 150]);
    b.groups.forEach(g => { lineBoxes(g.S0, [g.S0[0] + g.gu[0] * 260, g.S0[1] + g.gu[1] * 260], 70);
      const lx = g.lab[0] + (g.ga < 0 ? -20 - g.lw : 20); BOXES.push([lx - 10, g.lab[1] - 50, lx + g.lw + 10, g.lab[1] + 40]); }); });
  BR.forEach((b, bi) => b.groups.forEach((g, gi) => {
    const gu = g.gu, gn = [-gu[1], gu[0]];
    let pos = g.S0.slice(), prevHalf = 200; g.pts = [g.S0.slice()];
    g.items = g.items.slice().sort((x, y) => month(x.date) - month(y.date)).map((src, k) => {
      const tier = tierOf(src), L = cardsOf(src.media, tier), it = { ...src, tier };
      const half = Math.abs(gu[0]) * L.W / 2 + Math.abs(gu[1]) * (L.H + 160) / 2;
      let d = (prevHalf + half) * 0.5 + 90 + (k ? 0 : 300);
      const wob = 0.16 * Math.sin(k * 0.9 + gi * 1.7 + bi), ga = g.ga * Math.PI / 180 + wob;
      const step = [Math.sin(ga), -Math.cos(ga)];
      const place = P => [k % 2 ? -1 : 1, k % 2 ? 1 : -1].map((sd, si) => {
        const off = Math.abs(gn[0]) * L.W / 2 + Math.abs(gn[1]) * (L.H + 160) / 2 + 60;
        const Cc = [P[0] + gn[0] * sd * off, P[1] + gn[1] * sd * off];
        const box = [Cc[0] - L.W / 2 - 26, Cc[1] - L.H / 2 - (tier === "P" ? 70 : 110), Cc[0] + L.W / 2 + 26, Cc[1] + L.H / 2 + (it.note ? 110 : 36)];
        return { C: Cc, box, c: cost(box) + si }; }).sort((x, y) => x.c - y.c);
      let P = [pos[0] + step[0] * d, pos[1] + step[1] * d], cand = place(P);
      for (let tries = 0; tries < 16 && cand[0].c > 1; tries++) { d += 150; P = [pos[0] + step[0] * d, pos[1] + step[1] * d]; cand = place(P); }
      lineBoxes(pos, P, 40); pos = P; g.pts.push(P.slice()); prevHalf = half; BOXES.push(cand[0].box);
      const Cc = cand[0].C; let yy = Cc[1] - L.H / 2;
      for (let r = 0; r < L.rows; r++) { let xx = Cc[0] - L.W / 2;
        for (let c = 0; c < L.cols; c++) { const cd = L.cards[r * L.cols + c]; if (!cd) continue; cd.x = xx + L.colW[c] / 2; cd.y = yy + L.rowH[r] / 2; xx += L.colW[c] + GAP; }
        yy += L.rowH[r] + GAP; }
      L.cards.forEach((cd, i) => (cd.rot = (hash(bi * 97 + gi * 13 + k * 7 + i) - 0.5) * 4));
      return { ...it, P, C: Cc, W: L.W, H: L.H, cards: L.cards };
    });
  }));

  // bounds / overview
  const ALL = [[-RR, -RR - 150], [RR, 400]];
  BR.forEach(b => b.groups.forEach(g => g.items.forEach(it => ALL.push([it.C[0] - it.W / 2, it.C[1] - it.H / 2 - 130], [it.C[0] + it.W / 2, it.C[1] + it.H / 2 + 120]))));
  FRUIT.forEach(f => ALL.push([f.cx - f.W / 2, f.cy - f.H / 2 - 90], [f.cx + f.W / 2, f.cy + f.H / 2]));
  ALL.push([tx(-TH), -TH - 200]);
  const minX = Math.min(...ALL.map(p => p[0])), maxX = Math.max(...ALL.map(p => p[0])), minY = Math.min(...ALL.map(p => p[1])), maxY = Math.max(...ALL.map(p => p[1]));
  const BOUNDS = { minX, maxX, minY, maxY };
  const OY = 470, zAll = Math.min(1880 / (maxX - minX), 1040 / (maxY - minY));
  const OVER = [(minX + maxX) / 2, (minY + maxY) / 2 + (540 - OY) / zAll, zAll];

  // ======================= growth timeline =======================
  // Time = height: every work grows in its own month. Busy months get more screen time (each month gets 1 + its number of works
  // + half its events), so the animation never rushes a crowded month or idles through an empty one.
  const G0 = 15, G1 = SEC.finale[0] - 1;
  const ALLIT = BR.flatMap(b => b.groups.flatMap(g => g.items));
  const busy = Array.from({ length: MONTHS }, (_, m) => 1 + ALLIT.filter(it => month(it.date) === m).length + 0.5 * FRUIT.filter(f => month(f.date) === m).length);
  const cum = [0]; busy.forEach(w => cum.push(cum[cum.length - 1] + w));
  const tOfM = m => { const i = clamp(Math.floor(m), 0, MONTHS - 1), f = clamp(m - i, 0, 1); return G0 + (G1 - G0) * (cum[i] + f * busy[i]) / cum[MONTHS]; };
  const mOfT = t => { const x = clamp((t - G0) / (G1 - G0)) * cum[MONTHS]; let i = 0; while (i < MONTHS - 1 && cum[i + 1] < x) i++; return i + clamp((x - cum[i]) / busy[i]); };
  let unwarpFn = t => t;
  const trunkP = t => clamp((-yOf(mOfT(unwarpFn(t))) + 160) / TH);
  // within a month, works and fruits take turns across the month's slot
  const slot = {}; const popAt = d => { const m = month(d), k = slot[m] = (slot[m] || 0) + 1, n = busy[m] || 1;
    return tOfM(m) + (tOfM(m + 1) - tOfM(m)) * clamp((k - 0.5) / n, 0, 0.95); };
  BR.forEach(b => { b.t0 = Math.min(tOfM(b.m0), Math.min(...b.groups.map(g => tOfM(month(g.items[0].date)))) - 1); b.dur = 1.8;
    b.groups.forEach(g => { g.items.forEach(it => { it.tPop = Math.max(popAt(it.date), b.t0 + 1.2); });
      g.t0 = Math.max(b.t0 + 0.6, g.items[0].tPop - 1.2); g.t1 = g.items[g.items.length - 1].tPop;
      // the sub-branch reaches its k-th work exactly when that work pops
      g.prog = t => { if (t < g.t0) return 0; const n = g.pts.length - 1; let prevT = g.t0, prevF = 0;
        for (let k = 0; k < g.items.length; k++) { const f = (k + 1) / n, tk = g.items[k].tPop - 0.15; if (t < tk) return lerp(prevF, f, clamp((t - prevT) / Math.max(0.2, tk - prevT))); prevT = tk; prevF = f; }
        return 1; }; });
    b.t1 = Math.max(...b.groups.map(g => g.t1)); });
  FRUIT.forEach(f => (f.tPop = popAt(f.date)));
  // optional: a work with `at: <seconds>` lands exactly on that second (e.g. on a beat of your music); all growth times are warped
  // piecewise-linearly around it
  const anchor = ALLIT.find(it => typeof it.at === "number" && it.at > G0 && it.at < G1);
  const W0 = anchor ? anchor.tPop : null, W1 = anchor ? anchor.at : null;
  const warp = t => (W0 === null || t <= G0 || t >= G1 ? t : t < W0 ? G0 + (t - G0) * (W1 - G0) / (W0 - G0) : W1 + (t - W0) * (G1 - W1) / (G1 - W0));
  const unwarp = t => (W0 === null || t <= G0 || t >= G1 ? t : t < W1 ? G0 + (t - G0) * (W0 - G0) / (W1 - G0) : W0 + (t - W1) * (G1 - W0) / (G1 - W1));
  BR.forEach(b => { b.t0 = warp(b.t0); b.t1 = warp(b.t1); b.groups.forEach(g => { g.t0 = warp(g.t0); g.t1 = warp(g.t1); g.items.forEach(it => (it.tPop = warp(it.tPop))); }); });
  FRUIT.forEach(f => (f.tPop = warp(f.tPop)));
  unwarpFn = unwarp;

  // camera: rise with the trunk tip, lean part of the way toward whatever is growing, then smooth everything
  const FPS = 30, NS = Math.ceil(TOTAL * FPS) + 1;
  const trunkTipY = t => -TH * trunkP(t);
  function rawCam(t) {
    if (t < SEC.cover[1]) return [OVER[0], OVER[1], Math.log(OVER[2])];
    if (t < SEC.origin[1]) { const u = ramp(t, SEC.rewind[0], SEC.origin[0] + 0.5); return [lerp(OVER[0], 0, u), lerp(OVER[1], -60, u), Math.log(lerp(OVER[2], 0.9, u))]; }
    if (t > SEC.finale[0] + 1) { const u = ramp(t, SEC.finale[0] + 1, SEC.finale[0] + 3.5); return [OVER[0], OVER[1], Math.log(lerp(0.36, OVER[2], u))]; }
    const ty = trunkTipY(t), pts = [];
    ALLIT.forEach(it => { const d = t - it.tPop; if (d > -3 && d < 3) pts.push([it.C[0], it.C[1], (it.tier === "F" ? 3 : it.tier === "N" ? 2 : 1) * Math.exp(-(d * d) / 4)]); });
    FRUIT.forEach(f => { const d = t - f.tPop; if (d > -3 && d < 3) pts.push([f.cx, f.cy, 0.8 * Math.exp(-(d * d) / 4)]); });
    const w = pts.reduce((s, p) => s + p[2], 0) || 1;
    const ax = pts.length ? pts.reduce((s, p) => s + p[0] * p[2], 0) / w : tx(ty), ay = pts.length ? pts.reduce((s, p) => s + p[1] * p[2], 0) / w : ty + 300;
    return [lerp(tx(ty), ax, 0.55), lerp(ty + 300, ay, 0.6), Math.log(0.34)];
  }
  const RAWS = Array.from({ length: NS }, (_, i) => rawCam(i / FPS));
  const gauss = (sig, j) => { const r = Math.ceil(sig * 3 * FPS), out = new Float64Array(NS);
    for (let i = 0; i < NS; i++) { let s = 0, w = 0; for (let d = -r; d <= r; d += 2) { const k = i + d; if (k < 0 || k >= NS) continue; const g = Math.exp(-0.5 * (d / (sig * FPS)) ** 2); s += g * RAWS[k][j]; w += g; } out[i] = s / w; }
    return out; };
  const SX = gauss(2.2, 0), SY = gauss(2.0, 1), SZ = gauss(1.2, 2);
  function cam(t) { const f = clamp(t * FPS, 0, NS - 1), i = Math.min(NS - 2, Math.floor(f)), u = f - i, sm = A => A[i] * (1 - u) + A[i + 1] * u;
    return { x: sm(SX), y: sm(SY), z: Math.exp(sm(SZ)) }; }

  // ======================= DOM =======================
  const world = document.getElementById("world");
  const VIDS = [], ITEMS = [], LBL = [];
  function mkCard(c, t0, round) {
    const d = document.createElement("div"); d.className = "card" + (round ? " round" : "") + (c.tier ? " t" + c.tier : "");
    const pad = round ? 0 : (c.tier === "P" ? 7 : 10);
    d.style.left = (c.x - c.w / 2 - pad) + "px"; d.style.top = (c.y - c.h / 2 - pad) + "px"; d.style.width = (c.w + 2 * pad) + "px"; d.style.height = (c.h + 2 * pad + (round ? 0 : 2)) + "px";
    if (!round) d.style.padding = `${pad}px ${pad}px ${pad + 2}px`;
    const ph = document.createElement("div"); ph.className = "ph"; d.appendChild(ph);
    const isV = isVideo(c.src), poster = isV ? info(c.src).poster : c.src;
    if (poster) { const im = document.createElement("img"); im.decoding = "async"; im.src = MDIR + poster; im.alt = ""; ph.appendChild(im); }
    if (isV) { const v = document.createElement("video"); v.src = MDIR + c.src; v.muted = true; v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.loop = true; v.preload = poster ? "none" : "metadata";
      ph.appendChild(v); VIDS.push({ v, c }); }
    if (!round) { const tp = document.createElement("div"); tp.className = "tape"; d.appendChild(tp); }
    c.isV = isV; c.hasAudio = isV && !!info(c.src).audio; world.appendChild(d); c.el = d; c.t0 = t0; d._card = c; ITEMS.push({ c, t0 }); return d;
  }
  function mkLbl(html, x, y, t0, cls = "lbl") { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; d.style.left = x + "px"; d.style.top = y + "px"; world.appendChild(d); LBL.push({ el: d, t0 }); return d; }
  const SEED = C.seed || {};
  const tSeed = SEC.origin[0] + 1.5;
  if (SEED.media) mkCard({ src: SEED.media, w: 2 * RR - 24, h: 2 * RR - 24, x: 0, y: 0, rot: 0, title: SEED.title, note: SEED.note, date: SEED.date, link: SEED.link, play: playOf(SEED), tier: "F", color: FRUIT_C }, tSeed, true);
  if (SEED.title) mkLbl(`<span class="tt F" style="color:${FRUIT_C}">${esc(SEED.title)}</span><span class="dt F">${esc(SEED.date)}</span>`, -180, -RR - 110, tSeed + 0.4);
  BR.forEach(b => b.groups.forEach(g => g.items.forEach(it => {
    it.cards.forEach((c, i) => { Object.assign(c, { title: it.title, note: it.note, date: it.date, color: b.color, tier: it.tier, play: playOf(it), link: it.link }); if (c.src) mkCard(c, it.tPop + i * 0.1); });
    const x0 = it.C[0] - it.W / 2, big = it.tier === "F", mid = it.tier === "N";
    mkLbl(`<span class="tt ${it.tier}" style="color:${b.text}">${esc(it.title)}</span>${it.date ? `<span class="dt ${it.tier}">${esc(it.date)}</span>` : ""}`, x0, it.C[1] - it.H / 2 - (big ? 96 : mid ? 76 : 56), it.tPop + 0.1);
    if (it.note) { const nl = mkLbl(`<div class="nt ${it.tier}">${esc(it.note)}</div>`, x0, it.C[1] + it.H / 2 + 22, it.tPop + 0.3); nl.style.whiteSpace = "normal"; nl.style.width = Math.max(it.W, 560) + "px"; }
    if (it.stamp) { const s = mkLbl(esc(it.stamp), it.C[0] + it.W / 2 - 50, it.C[1] - it.H / 2 - 46, it.tPop + 0.5, "stamp" + (it.tier === "P" ? " small" : "")); s.dataset.stamp = 1; }
  })));
  // big-branch names sit along the branch near the trunk; sub-branch names at their fork
  BR.forEach(b => { const d = mkLbl(esc(b.label), b.lp[0] + (b.side > 0 ? 40 : -40), b.lp[1], b.t0 + 0.4, "branch"); d.style.color = b.text; if (b.side < 0) d.style.transform = "translateX(-100%)"; d.dataset.branch = b.side < 0 ? "l" : "r";
    b.groups.forEach(g => { if (!g.label) return; const e = mkLbl(`<span class="sub-l" style="color:${b.text}">${esc(g.label)}</span>`, g.lab[0] + (g.ga < 0 ? -20 : 20), g.lab[1] - 40, g.t0 + 0.3); if (g.ga < 0) e.style.transform = "translateX(-100%)"; }); });
  FRUIT.forEach(f => { f.cards.forEach((c, j) => { Object.assign(c, { title: f.title, date: f.date, note: f.note, color: FRUIT_C, tier: "P", link: f.link, play: playOf(f) }); if (c.src) mkCard(c, f.tPop + j * 0.1); });
    mkLbl(`<span class="dt ev">${esc(f.date)}</span><span class="tt ev" style="color:${FRUIT_C}">${esc(f.title)}</span>`, f.cx - Math.max(f.W, 240) / 2, f.cy - f.H / 2 - 70, f.tPop + 0.1); });

  // ======================= drawing =======================
  const ink = document.getElementById("ink").getContext("2d");
  const boil = t => Math.floor(t * 6) % 3;
  function curvePts(a, b, bend, n = 28) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], cx = mx - dy * bend, cy = my + dx * bend, o = [];
    for (let i = 0; i <= n; i++) { const u = i / n; o.push([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]); } return o; }
  function smoothPts(P, n = 14) { if (P.length < 2) return P; const W = [P[0], ...P, P[P.length - 1]], o = [];
    for (let i = 1; i < W.length - 2; i++) { const [p0, p1, p2, p3] = [W[i - 1], W[i], W[i + 1], W[i + 2]];
      for (let k = 0; k < n; k++) { const u = k / n, u2 = u * u, u3 = u2 * u; o.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3))); } }
    o.push(P[P.length - 1]); return o; }
  // a hand-drawn tapered limb: a filled ribbon from width w0 to w1, jittered at 6 fps, plus a thin ink edge
  function limb(ctx, pts, prog, col, w0, w1, c, t, seed = 0) {
    if (prog <= 0 || pts.length < 2) return;
    const n = Math.max(2, Math.ceil((pts.length - 1) * prog) + 1), b = boil(t), j = 1.2 / c.z, L = [], R = [];
    for (let i = 0; i < n; i++) { const p = pts[Math.min(i, pts.length - 1)], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const u = i / (pts.length - 1), w = lerp(w0, w1, u) / 2 * (1 + 0.08 * Math.sin(i * 1.7 + seed));
      const jx = (hash(i * 3 + b * 17 + seed) - 0.5) * 2 * j, jy = (hash(i * 5 + b * 13 + seed) - 0.5) * 2 * j;
      L.push([p[0] - dy * w + jx, p[1] + dx * w + jy]); R.push([p[0] + dy * w + jx, p[1] - dx * w + jy]); }
    ctx.save(); ctx.fillStyle = col; ctx.beginPath(); L.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1.6 / c.z * Math.min(1, c.z * 1.4)); ctx.stroke(); ctx.restore();
  }
  // geometry, built once
  const TRUNK = []; for (let y = 0; y >= -TH; y -= 60) TRUNK.push([tx(y), y]);
  const ROOTS = [[-1, 0.9], [1, 0.7], [-1, 0.35], [1, 0.25]].map(([s, k], i) => curvePts([s * 30, 120], [s * (260 + 220 * k), 300 + 140 * k], s * 0.18 * (i % 2 ? 1 : -1), 20));
  BR.forEach(b => { b.limb = curvePts(b.P0, b.tip, b.side * -0.08, 36);
    b.groups.forEach(g => { g.limb = smoothPts(g.pts, 12);
      g.items.forEach(it => { const dx = it.C[0] - it.P[0], dy = it.C[1] - it.P[1], L = Math.hypot(dx, dy) || 1;
        const edge = Math.min(it.W / 2 / Math.abs(dx / L || 1e-6), (it.H / 2 + 16) / Math.abs(dy / L || 1e-6)); it.twig = curvePts(it.P, [it.C[0] - dx / L * edge, it.C[1] - dy / L * edge], 0.12, 10); }); });
    b.wBase = 16 + 4.2 * Math.sqrt(b.n) * 2;
  });
  const coverVis = t => (t < SEC.rewind[0] ? 1 : 1 - ramp(t, SEC.rewind[0], SEC.rewind[0] + 1.6, "in"));
  function vis(t0, t) { if (EXPLORE) return 1; if (t < SEC.rewind[1]) return coverVis(t); return ramp(t, t0 - 0.1, t0 + 0.3, "out"); }
  const sty = (el, k, v) => { const m = el._sty || (el._sty = {}); if (m[k] !== v) { m[k] = v; el.style[k] = v; } };
  const dotsEl = document.getElementById("dots");
  let VIEW = null, lastExplore = null;

  function draw(t) {
    EXPLORE = !!window.__EXPLORE;
    let c = EXPLORE && VIEW ? VIEW : cam(t), W2, H2;
    if (EXPLORE && VIEW) { W2 = innerWidth / 2; H2 = innerHeight / 2; }
    else { const k = Math.min(innerWidth / 1920, innerHeight / 1080) * (window.__PLAYZOOM || 1); c = { x: c.x, y: c.y, z: c.z * k }; W2 = innerWidth / 2; H2 = innerHeight * OY / 1080; }
    const camKey = `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(5)},${W2},${H2}`;
    if (EXPLORE && lastExplore === camKey) return;            // browsing and the view has not moved: nothing changes
    lastExplore = EXPLORE ? camKey : null; window.__CAMZ = c.z;
    world.style.transform = `translate(${(W2 - c.x * c.z).toFixed(2)}px, ${(H2 - c.y * c.z).toFixed(2)}px) scale(${c.z.toFixed(5)})`;
    dotsEl.style.transform = `translate(${(((-c.x * c.z) % 34) + 34) % 34}px, ${(((-c.y * c.z) % 34) + 34) % 34}px)`;
    const D = window.__DPR || 1;
    ink.setTransform(1, 0, 0, 1, 0, 0); ink.clearRect(0, 0, ink.canvas.width, ink.canvas.height); ink.setTransform(c.z * D, 0, 0, c.z * D, (W2 - c.x * c.z) * D, (H2 - c.y * c.z) * D);
    const cover = !EXPLORE && t < SEC.rewind[1], full = EXPLORE || cover, cv = cover ? coverVis(t) : 1;
    const pr = (a, d) => (full ? cv : ramp(t, a, a + d));
    // ground, roots
    { const g = full ? cv : ramp(t, tSeed - 1, tSeed + 0.6);
      if (g > 0) { ink.save(); ink.globalAlpha = 0.5 * g; ink.strokeStyle = INK; ink.lineWidth = 3 / Math.max(0.3, c.z); ink.beginPath(); ink.moveTo(-1400 * g, 150); for (let x = -1400; x <= 1400; x += 80) ink.lineTo(x * g, 150 + 8 * Math.sin(x / 90)); ink.stroke(); ink.restore();
        ROOTS.forEach((r, i) => limb(ink, r, g, BARK, 22 - i * 3, 3, c, t, 70 + i)); } }
    // trunk: grows with time
    const tp = full ? cv : trunkP(t);
    if (tp > 0) limb(ink, TRUNK, tp, BARK, 64, 18, c, t, 5);
    // branches → sub-branches → twigs
    BR.forEach((b, bi) => {
      limb(ink, b.limb, pr(b.t0, b.dur), b.color, b.wBase, Math.max(8, b.wBase * 0.35), c, t, 20 + bi);
      b.groups.forEach((g, gi) => { const w = 6 + 2.6 * Math.sqrt(g.n) * 2;
        limb(ink, g.limb, full ? cv : g.prog(t), b.color, w, 3.5, c, t, 40 + bi * 10 + gi);
        g.items.forEach((it, k) => { const p = full ? cv : ramp(t, it.tPop - 0.35, it.tPop); if (p > 0) limb(ink, it.twig, p, b.color, 4.5, 2, c, t, 90 + k); }); });
    });
    // fruit stems + the fruit
    FRUIT.forEach((f, i) => { const p = full ? cv : ramp(t, f.tPop - 0.4, f.tPop); if (p <= 0) return;
      limb(ink, curvePts(f.stem[0], f.stem[1], 0.15 * f.side, 12), p, FRUIT_C, 6, 2.5, c, t, 200 + i);
      const fx = f.stem[0][0] + f.side * 26, fy = f.stem[0][1] + 18, fr = 13 * p * (1 + 0.15 * pulse(t));
      ink.fillStyle = "#d9483b"; ink.beginPath(); ink.arc(fx, fy, fr, 0, 7); ink.fill(); });
    // a ring of colour around the seed
    if (SEED.media) { const sp = full ? cv : ramp(t, tSeed + 0.2, tSeed + 0.8);
      if (sp > 0) for (let i = 0; i < 48; i++) { const a = -Math.PI / 2 + i * Math.PI / 24, h = (10 + 34 * hash(i) * (0.4 + 0.6 * pulse(t))) * sp;
        ink.strokeStyle = PAL[i % 5]; ink.lineWidth = 4; ink.beginPath(); ink.moveTo((RR + 6) * Math.cos(a), (RR + 6) * Math.sin(a)); ink.lineTo((RR + 6 + h) * Math.cos(a), (RR + 6 + h) * Math.sin(a)); ink.stroke(); } }
    ITEMS.forEach(({ c: cd, t0 }) => { const v = vis(t0, t), el = cd.el;
      if (v <= 0.001) { sty(el, "opacity", "0"); sty(el, "visibility", "hidden"); return; }
      sty(el, "visibility", "visible"); sty(el, "opacity", clamp(v * 2).toFixed(3));
      sty(el, "transform", `rotate(${((cd.rot || 0) * clamp(v)).toFixed(2)}deg) scale(${lerp(0.55, 1, E.back(clamp(v))).toFixed(4)})`); });
    LBL.forEach(L => { const v = vis(L.t0, t), el = L.el; sty(el, "opacity", clamp(v).toFixed(3));
      if (el.dataset.stamp) sty(el, "transform", `rotate(-8deg) scale(${lerp(2.2, 1, E.out(clamp(v))).toFixed(3)})`); });
    if (EXPLORE) return;
    const veil = document.getElementById("veil"); sty(veil, "opacity", ((1 - ramp(t, SEC.rewind[0] - 0.5, SEC.rewind[0] + 0.2)) + ramp(t, SEC.finale[0] + 1.0, SEC.finale[0] + 2.2)).toFixed(3));
    ["t1", "t2"].forEach((cl, n) => { const e = document.querySelector("#title ." + cl); if (!e) return;
      const u = Math.min(ramp(t, 0.3 + n * 0.35, 1.0 + n * 0.35, "out"), 1 - ramp(t, SEC.rewind[0] - 0.4, SEC.rewind[0])); sty(e, "opacity", u.toFixed(3)); });
    ["e0", "e1", "e2"].forEach((cl, n) => { const e = document.querySelector("#end ." + cl); if (!e) return;
      const u = ramp(t, SEC.finale[0] + 1.8 + n * 0.5, SEC.finale[0] + 2.7 + n * 0.5, "out"); sty(e, "opacity", u.toFixed(3)); });
  }
  const box4 = rs => ({ minX: Math.min(...rs.map(r => r[0])), minY: Math.min(...rs.map(r => r[1])), maxX: Math.max(...rs.map(r => r[2])), maxY: Math.max(...rs.map(r => r[3])) });
  const REGIONS = BR.filter(b => b.n).map(b => ({ label: b.label, color: b.text, n: b.n, ...box4(b.groups.flatMap(g => g.items.map(it => [it.C[0] - it.W / 2, it.C[1] - it.H / 2 - 110, it.C[0] + it.W / 2, it.C[1] + it.H / 2 + 110]))) }))
    .concat(FRUIT.length ? [{ label: EVC.label || "Events", color: FRUIT_C, n: FRUIT.length, ...box4(FRUIT.map(f => [f.cx - f.W / 2 - 40, f.cy - f.H / 2 - 90, f.cx + f.W / 2 + 40, f.cy + f.H / 2 + 20])) }] : []);
  window.__GROW = { BOUNDS, OVER, VIDS, ITEMS, REGIONS, setView: v => { VIEW = v; }, draw, invalidate: () => { lastExplore = null; }, TOTAL, COUNT: ALLIT.length + (SEED.media ? 1 : 0) };
})();
