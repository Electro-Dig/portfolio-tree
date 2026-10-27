// Portfolio Tree — "growth map" mode (the default): layout, growth animation and drawing.
//
// Your first work is a ring in the middle. Each big branch (a field you work in) leaves the ring in its own direction and
// its works grow along it, one after another in time, alternating sides; highlights are big, passing works small. Events
// sit on a hand-wobbled timeline above everything, joined to the ring by a vine. Everything is hand-drawn on canvas and laid
// out deterministically from content/content.js (+ content/media.js for media sizes).
//
// Exposes window.__GROW for assets/engine/site.js: { BOUNDS, OVER, VIDS, ITEMS, REGIONS, setView, draw, invalidate, TOTAL, COUNT }.
(function () {
  const C = window.CONTENT || {}, SITECFG = C.site || {}, MEDIA = window.MEDIA || {};
  let EXPLORE = !!window.__EXPLORE;
  const TOTAL = SITECFG.duration || 120;
  // animation sections (seconds): cover → rewind into the ring → the first work → branches grow → the timeline → overview
  const SEC = { cover: [0, 8], rewind: [8, 10], origin: [10, 16], growth: [16, TOTAL - 24], places: [TOTAL - 24, TOTAL - 9], finale: [TOTAL - 9, TOTAL] };
  const BEATS = Array.isArray(SITECFG.beats) ? SITECFG.beats.slice().sort((a, b) => a - b) : null;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u;
  const E = { io: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), out: u => 1 - Math.pow(1 - u, 3), in: u => u * u * u,
    back: u => { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
  const ramp = (t, a, b, e = "io") => E[e](clamp((t - a) / (b - a)));
  function lastBefore(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  const pulse = t => { if (!BEATS) return 0; const i = lastBefore(BEATS, t); return i < 0 ? 0 : Math.exp(-(t - BEATS[i]) / 0.12); };
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const INK = "#2a2623", RED = "#d9483b", PAL = ["#F2B42C", "#E8743B", "#E9627E", "#3DA37A", "#2F6FB0"];
  const EVC_COLOR = SITECFG.eventColor || "#c2541f";
  // default look of up to six branches: direction (degrees, 0 = right, clockwise), how much it curls, colour
  const ANG = [-24, 46, 138, -150, 92, -90], CURL = [0.04, -0.06, 0.06, -0.05, 0.05, -0.04];
  const COLORS = ["#2F6FB0", "#c2541f", "#2e7d5b", "#7a4fb0", "#b0742f", "#2f8fa0"];
  const MDIR = (C.mediaDir || "content/media/").replace(/\/?$/, "/");
  const info = f => MEDIA[f] || {};
  const ar = f => { const m = info(f); return m.w && m.h ? m.w / m.h : 16 / 9; };
  const isVideo = f => /\.(mp4|webm|mov|m4v)$/i.test(f || "");
  const ym = d => { const m = /(\d{4})\.(\d{1,2})/.exec(d || ""); return m ? +m[1] * 12 + (+m[2] - 1) : 0; };
  const RR = 190, GAP = 24;
  const SINGLE = { F: 720, N: 540, P: 360 }, MULTI = { F: 470, N: 400, P: 280 };
  const DURW = { F: 4.2, N: 2.4, P: 1.25 };
  const tierOf = it => (it.tier === "F" || it.tier === "P" ? it.tier : "N");
  const playOf = it => (it.play || []).map(p => (Array.isArray(p) ? p : [p.label || "Try it", p.url])).filter(p => p[1]);

  // ======================= layout (world px) =======================
  const BOXES = [[-RR - 80, -RR - 160, RR + 80, RR + 80]];
  const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  // a branch's sub-branches (groups) are read as one line here, in time order
  const SRC = (C.branches || []).map((b, bi) => ({ ...b, id: b.id || "b" + bi, label: b.label || "", color: b.color || COLORS[bi % COLORS.length],
    angle: b.angle ?? (bi < ANG.length ? ANG[bi] : -24 + bi * 360 / (C.branches.length)), curl: b.curl ?? CURL[bi % CURL.length],
    items: (b.groups || [{ items: b.items || [] }]).flatMap(g => g.items || []).map((it, k) => ({ ...it, tier: tierOf(it), _k: k }))
      .sort((x, y) => ym(x.date) - ym(y.date) || x._k - y._k) })).filter(b => b.items.length);
  const LAB = SRC.map(b => { const a = b.angle * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)];
    const lp = [u[0] * (RR + 430) - n[0] * 170, u[1] * (RR + 430) - n[1] * 170], lw = b.label.length * 112, right = u[0] >= 0;
    BOXES.push(right ? [lp[0] + 20, lp[1] - 90, lp[0] + 60 + lw, lp[1] + 90] : [lp[0] - 60 - lw, lp[1] - 90, lp[0] - 20, lp[1] + 90]); return lp; });
  const BR = SRC.map((b, bi) => {
    const a0 = b.angle * Math.PI / 180;
    let pos = [RR * Math.cos(a0), RR * Math.sin(a0)]; const pts = [pos.slice()];
    let prevHalf = 300;
    const items = b.items.map((it, k) => {
      const ang = a0 + b.curl * Math.min(k, 14) + 0.18 * Math.sin(k * 0.55 + bi * 1.3), u = [Math.cos(ang), Math.sin(ang)], n = [-Math.sin(ang), Math.cos(ang)];
      const files = it.media && it.media.length ? it.media : [null], multi = files.length > 1, cw0 = multi ? MULTI[it.tier] : SINGLE[it.tier];
      const cards = files.map(src => { const a = src ? ar(src) : 4 / 3, w = a < 0.9 ? cw0 * 0.62 : cw0; return { src, w, h: w / a }; });
      const cols = cards.length >= 3 ? 2 : cards.length, rows = Math.ceil(cards.length / cols);
      const colW = Array.from({ length: cols }, (_, c) => Math.max(...cards.filter((_, i) => i % cols === c).map(x => x.w)));
      const rowH = Array.from({ length: rows }, (_, r) => Math.max(...cards.filter((_, i) => Math.floor(i / cols) === r).map(x => x.h)));
      const W = colW.reduce((s, x) => s + x, 0) + (cols - 1) * GAP, H = rowH.reduce((s, x) => s + x, 0) + (rows - 1) * GAP;
      const half = Math.abs(u[0]) * W / 2 + Math.abs(u[1]) * (H + 200) / 2;
      let d = (prevHalf + half) * 0.5 + 60;
      const place = P => [k % 2 ? -1 : 1, k % 2 ? 1 : -1].map((side, si) => {
        const off = Math.abs(n[0]) * W / 2 + Math.abs(n[1]) * (H + 200) / 2 + 70;
        const Cc = [P[0] + n[0] * side * off, P[1] + n[1] * side * off + 30];
        const box = [Cc[0] - W / 2 - 30, Cc[1] - H / 2 - (it.tier === "P" ? 70 : 120), Cc[0] + W / 2 + 30, Cc[1] + H / 2 + (it.note ? 120 : 40)];
        return { C: Cc, box, cost: BOXES.reduce((s, q) => s + overlap(box, q), 0) + si }; }).sort((x, y) => x.cost - y.cost);
      let P = [pos[0] + u[0] * d, pos[1] + u[1] * d], cand = place(P);
      for (let tries = 0; tries < 10 && cand[0].cost > 1; tries++) { d += 160; P = [pos[0] + u[0] * d, pos[1] + u[1] * d]; cand = place(P); }
      pos = P; pts.push(P.slice()); prevHalf = half;
      const Cc = cand[0].C; BOXES.push(cand[0].box);
      let y = Cc[1] - H / 2;
      for (let r = 0; r < rows; r++) { let x = Cc[0] - W / 2;
        for (let c = 0; c < cols; c++) { const cd = cards[r * cols + c]; if (!cd) continue; cd.x = x + colW[c] / 2; cd.y = y + rowH[r] / 2; x += colW[c] + GAP; }
        y += rowH[r] + GAP; }
      cards.forEach((cd, i) => (cd.rot = (hash(bi * 53 + k * 7 + i) - 0.5) * 4.5));
      return { ...it, P, C: Cc, W, H, cards };
    });
    return { ...b, pts, items, labelAt: LAB[bi], u0: [Math.cos(a0), Math.sin(a0)] };
  });
  // events: a hand-wobbled line above all the branches, read left → right in time; entries alternate above / below it
  const EV = { label: (C.events && C.events.label) || "", items: ((C.events && C.events.items) || []).slice().sort((a, b) => ym(a.date) - ym(b.date)) }, SP = 720;
  const HAS_EV = EV.items.length > 0;
  const topY = Math.min(...BOXES.map(b => b[1])), midX = (Math.min(...BOXES.map(b => b[0])) + Math.max(...BOXES.map(b => b[2]))) / 2;
  const YT = topY - 720, EX0 = midX - (EV.items.length - 1) * SP / 2, EX1 = EX0 + Math.max(0, EV.items.length - 1) * SP;
  const wob = x => YT + 120 * Math.sin(x / 470 + 0.7) + 48 * Math.sin(x / 160 + 2.1) + 18 * Math.sin(x / 61 + 0.4);
  const EVLINE = []; if (HAS_EV) for (let x = EX0 - 320; x <= EX1 + 320; x += 30) EVLINE.push([x, wob(x)]);
  const evNodes = EV.items.map((e, i) => {
    const x = EX0 + i * SP, y = wob(x), up = i % 2 === 0;
    const files = e.media && e.media.length ? e.media : [null];
    const cards = files.map(src => { const a = src ? ar(src) : 4 / 3, w = a < 0.9 ? Math.min(290, 400 * a) : 450; return { src, w, h: w / a }; });
    const W = cards.reduce((s, c) => s + c.w, 0) + (cards.length - 1) * 18, H = Math.max(...cards.map(c => c.h));
    // keep labels and photos clear of the wobble: measure the line's highest / lowest point under this entry
    const span = []; for (let xx = x - Math.max(W, 520) / 2; xx <= x + Math.max(W, 520) / 2 + 200; xx += 20) span.push(wob(xx));
    const lineTop = Math.min(...span), lineBot = Math.max(...span);
    const cy = up ? lineTop - 70 - H / 2 : lineBot + 120 + H / 2, ly = up ? cy - H / 2 - 92 : lineBot + 40;
    let cx = x - W / 2; cards.forEach((c, j) => { c.x = cx + c.w / 2; c.y = cy; c.rot = (hash(i * 7 + j + 90) - 0.5) * 7; cx += c.w + 18; });
    return { ...e, x, y, up, cards, W, H, cy, ly };
  });
  const ALL = [[-RR, -RR - 120], [RR, RR]]; BR.forEach(b => b.items.forEach(it => { ALL.push([it.C[0] - it.W / 2, it.C[1] - it.H / 2 - 130], [it.C[0] + it.W / 2, it.C[1] + it.H / 2 + 120]); }));
  evNodes.forEach(n => ALL.push([n.x - Math.max(n.W, 520) / 2, n.cy - n.H / 2 - (n.up ? 100 : 0)], [n.x + Math.max(n.W, 520) / 2, n.cy + n.H / 2 + 10]));
  if (HAS_EV) ALL.push([EX0 - 300 - EV.label.length * 128, YT - 100]);
  const minX = Math.min(...ALL.map(p => p[0])), maxX = Math.max(...ALL.map(p => p[0])), minY = Math.min(...ALL.map(p => p[1])), maxY = Math.max(...ALL.map(p => p[1]));
  const BOUNDS = { minX, maxX, minY, maxY };

  // ======================= timeline =======================
  const OY = 470;
  const zAll = Math.min(1880 / (maxX - minX), 1040 / (maxY - minY));
  const OVER = [(minX + maxX) / 2, (minY + maxY) / 2 + (540 - OY) / zAll, zAll];
  const KEYS = [];
  // camera keys: [t, x, y, log z, hold]. hold = 0 → glide (non-uniform Catmull-Rom tangent); hold = 1 → settle (zero tangent);
  // a hold pair (2 on the first key) drifts slowly between its two keys.
  const key = (t, x, y, z, h = 0) => KEYS.push([t, x, y, Math.log(z), h]);
  const hold = (t0, t1, x, y, z, dx = 0, dy = 0, dz = 1.03) => { key(t0, x, y, z, 2); key(t1, x + dx, y + dy, z * dz, 1); };
  hold(0, SEC.cover[1], OVER[0], OVER[1], OVER[2] * 0.96, 0, 0, 1 / 0.96);
  const REW = SEC.rewind;
  key(REW[1], 0, 0, 1.0, 1);
  const ORIGIN = { dot: REW[1], ring: [REW[1] + 0.5, REW[1] + 2], card: REW[1] + 2 };
  key(SEC.origin[1] - 0.5, 0, 0, 1.06, 1);
  const INTRO = 3.6;
  // durations by tier, scaled to fill the growth section; an item with `at: <seconds>` pops exactly on that second
  // (e.g. on a beat of your music)
  let raw = 0, rawA = null, atA = null;
  BR.forEach(b => { raw += INTRO; b.items.forEach(it => { if (atA === null && typeof it.at === "number" && it.at > SEC.growth[0] + 2 && it.at < SEC.growth[1] - 2) { rawA = raw; atA = it.at; } raw += DURW[it.tier]; }); });
  const G0 = SEC.growth[0], G1 = SEC.growth[1], TA = atA ? atA - 0.68 : null;
  const facOf = r => (rawA === null ? (G1 - G0) / raw : r < rawA ? (TA - G0) / rawA : (G1 - TA) / (raw - rawA));
  let T = G0, R = 0, fac = facOf(0);
  // the camera rides along the growing line (not card to card): it leans a little toward the current work, one zoom per tier,
  // and the whole growth stretch is low-pass filtered below so nothing jerks up and down
  const BIAS = { F: 0.92, N: 0.25, P: 0.12 }, ZT = { F: 0.74, N: 0.64, P: 0.6 };
  const zOf = it => it.tier === "F" ? Math.min(ZT.F, 1500 / (it.W + 200), 760 / (it.H + 330)) : ZT[it.tier];
  const aim = it => [lerp(it.P[0], it.C[0], BIAS[it.tier]), lerp(it.P[1], it.C[1], BIAS[it.tier])];
  BR.forEach((b, bi) => {
    const lp = b.labelAt, a0 = aim(b.items[0]);
    fac = facOf(R); b.t0 = T; b.tLabel = T + 0.5;
    if (bi > 0) key(T + INTRO * fac * 0.4, lp[0] * 0.5, lp[1] * 0.5, 0.2);       // drift back over the ring between branches
    key(T + INTRO * fac * 0.9, lp[0] * 0.4 + a0[0] * 0.6, lp[1] * 0.4 + a0[1] * 0.6, 0.52);
    T += INTRO * fac; R += INTRO;
    b.items.forEach(it => {
      fac = facOf(R); if (rawA !== null && R === rawA + INTRO * 0 && it.at === atA) T = TA; R += DURW[it.tier];
      const dur = DURW[it.tier] * fac;
      it.tLine = [T, T + Math.min(0.8, dur * 0.55)]; it.tPop = it.tLine[1] - 0.12; it.tLbl = it.tLine[1] + 0.05; it.tStamp = it.tLine[1] + 0.45;
      const [ax, ay] = aim(it), tk = T + dur * (it.tier === "F" ? 0.25 : 0.5); key(tk, ax, ay, zOf(it));
      if (it.tier === "F") key(T + dur * 0.8, ax + b.u0[0] * 50, ay + b.u0[1] * 50, zOf(it) * 1.02);   // settle on a highlight before moving on
      T += dur;
    });
    b.t1 = T;
  });
  const tPl = SEC.places[0], ET0 = tPl + 1.9, ET1 = SEC.places[1] - 0.3;
  const EZ = 0.55, EHALF = 1920 / 2 / EZ;
  let EXS = EX0 + EHALF - 260, EXE = EX1 - EHALF + 260;
  if (EXE <= EXS) EXS = EXE = (EX0 + EX1) / 2;                                    // a short timeline fits on one screen
  if (HAS_EV) { const last = BR.length ? BR[BR.length - 1].items.slice(-1)[0] : { C: [0, 0] }; key(tPl + 0.3, (last.C[0] + EXS) / 2, (last.C[1] + YT) / 2, 0.26);
    hold(ET0, ET1, EXS, YT - 10, EXE > EXS ? EZ : Math.min(EZ, 1800 / (EX1 - EX0 + 1400)), EXE - EXS, 0, 1.0); }
  const camAtX = (x, i) => (EXE > EXS ? ET0 + (x - EXS) / (EXE - EXS) * (ET1 - ET0) : ET0 + i * 0.5);
  evNodes.forEach((n, i) => { n.tPop = clamp(camAtX(n.x - EHALF * 0.85, i), tPl + 1.0 + i * 0.12, ET1 - 0.6); n.cards.forEach((c, j) => (c.tPop = n.tPop + j * 0.12)); });
  const EV_TL = evNodes.map(n => [n.tPop - 0.35, n.x]);
  const evTip = t => { if (t <= tPl + 1.0) return EX0 - 320; const k = EV_TL.findIndex(q => q[0] > t);
    if (k === 0) return lerp(EX0 - 320, EX0, clamp((t - tPl - 1.0) / (EV_TL[0][0] - tPl - 1.0)));
    if (k < 0) return lerp(EX1, EX1 + 320, clamp((t - EV_TL[EV_TL.length - 1][0]) / 0.6));
    return lerp(EV_TL[k - 1][1], EV_TL[k][1], clamp((t - EV_TL[k - 1][0]) / (EV_TL[k][0] - EV_TL[k - 1][0]))); };
  EV.tLabel = tPl + 0.8;
  hold(SEC.finale[0] + 2.4, SEC.finale[1], OVER[0], OVER[1], OVER[2]);
  const tTitle2 = SEC.finale[0] + 1.8;
  KEYS.sort((a, b) => a[0] - b[0]);
  // cubic Hermite through the keys: glide keys get a non-uniform Catmull-Rom tangent, hold keys settle or drift
  const TAN = KEYS.map((k, i) => {
    if (k[4] === 2) { const n = KEYS[i + 1]; return [1, 2, 3].map(j => (n[j] - k[j]) / (n[0] - k[0])); }
    if (k[4] === 1) { const p = KEYS[i - 1]; return p && p[4] === 2 ? [1, 2, 3].map(j => (k[j] - p[j]) / (k[0] - p[0])) : [0, 0, 0]; }
    const p = KEYS[Math.max(0, i - 1)], n = KEYS[Math.min(KEYS.length - 1, i + 1)];
    return [1, 2, 3].map(j => (n[0] > p[0] ? (n[j] - p[j]) / (n[0] - p[0]) : 0));
  });
  function camRaw(t) {
    if (t <= KEYS[0][0]) return [KEYS[0][1], KEYS[0][2], KEYS[0][3]];
    const i = KEYS.findIndex(k => k[0] > t); if (i < 0) { const L = KEYS[KEYS.length - 1]; return [L[1], L[2], L[3]]; }
    const k1 = KEYS[i - 1], k2 = KEYS[i], m1 = TAN[i - 1], m2 = TAN[i], dt = k2[0] - k1[0], u = (t - k1[0]) / dt, u2 = u * u, u3 = u2 * u;
    const h = j => (2 * u3 - 3 * u2 + 1) * k1[j] + (u3 - 2 * u2 + u) * dt * m1[j - 1] + (-2 * u3 + 3 * u2) * k2[j] + (u3 - u2) * dt * m2[j - 1];
    return [h(1), h(2), h(3)];
  }
  // low-pass the growth stretch (Gaussian, σ 1.1 s for position, 1.6 s for zoom), blended in and out so the edges stay continuous
  const FPS = 30, NS = Math.ceil(TOTAL * FPS) + 1, RAWS = Array.from({ length: NS }, (_, i) => camRaw(i / FPS));
  const ZS = SEC.origin[1] - 0.5, ZE = tPl + 1.9;
  const gauss = (sig, j) => { const r = Math.ceil(sig * 3 * FPS), out = new Float64Array(NS);
    for (let i = 0; i < NS; i++) { let s = 0, w = 0; for (let d = -r; d <= r; d++) { const k = i + d; if (k < 0 || k >= NS) continue; const g = Math.exp(-0.5 * (d / (sig * FPS)) ** 2); s += g * RAWS[k][j]; w += g; } out[i] = s / w; }
    return out; };
  const SX = gauss(1.1, 0), SY = gauss(1.1, 1), SZ = gauss(1.6, 2);
  function cam(t) {
    const r = camRaw(t), w = Math.min(ramp(t, ZS, ZS + 2.0), 1 - ramp(t, ZE - 2.0, ZE));
    if (w <= 0) return { x: r[0], y: r[1], z: Math.exp(r[2]) };
    const f = clamp(t * FPS, 0, NS - 1), i = Math.min(NS - 2, Math.floor(f)), u = f - i, sm = A => A[i] * (1 - u) + A[i + 1] * u;
    return { x: lerp(r[0], sm(SX), w), y: lerp(r[1], sm(SY), w), z: Math.exp(lerp(r[2], sm(SZ), w)) };
  }

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
  if (SEED.media) mkCard({ src: SEED.media, w: 2 * RR - 24, h: 2 * RR - 24, x: 0, y: 0, rot: 0, title: SEED.title, note: SEED.note, date: SEED.date, link: SEED.link, play: playOf(SEED), tier: "F", color: EVC_COLOR }, ORIGIN.card, true);
  BR.forEach(b => b.items.forEach(it => it.cards.forEach((c, i) => { Object.assign(c, { title: it.title, note: it.note, date: it.date, color: b.color, tier: it.tier, play: playOf(it), link: it.link });
    if (c.src) mkCard(c, it.tPop + i * 0.12); })));
  evNodes.forEach(n => n.cards.forEach(c => { Object.assign(c, { title: n.title, date: n.date, note: n.note, color: EVC_COLOR, tier: "P", link: n.link, play: playOf(n) }); if (c.src) mkCard(c, c.tPop); }));
  BR.forEach(b => b.items.forEach(it => {
    const x0 = it.C[0] - it.W / 2, big = it.tier === "F", mid = it.tier === "N";
    mkLbl(`<span class="tt ${it.tier}" style="color:${b.color}">${esc(it.title)}</span>${it.date ? `<span class="dt ${it.tier}">${esc(it.date)}</span>` : ""}`, x0, it.C[1] - it.H / 2 - (big ? 96 : mid ? 76 : 56), it.tLbl);
    if (it.note) { const nl = mkLbl(`<div class="nt ${it.tier}">${esc(it.note)}</div>`, x0, it.C[1] + it.H / 2 + 24, it.tLbl + 0.2); nl.style.whiteSpace = "normal"; nl.style.width = Math.max(it.W, 600) + "px"; }
    if (it.stamp) { const s = mkLbl(esc(it.stamp), it.C[0] + it.W / 2 - 50, it.C[1] - it.H / 2 - 46, it.tStamp, "stamp" + (it.tier === "P" ? " small" : "")); s.dataset.stamp = 1; }
  }));
  if (SEED.title) mkLbl(`<span class="tt F" style="color:${EVC_COLOR}">${esc(SEED.title)}</span><span class="dt F">${esc(SEED.date)}</span>`, -200, -RR - 120, ORIGIN.card + 0.4);
  if (SEED.stamp) { const st = mkLbl(esc(SEED.stamp), RR - 30, RR - 10, ORIGIN.card + 1.0, "stamp"); st.dataset.stamp = 1; }
  BR.forEach(b => { const d = mkLbl(esc(b.label), 0, 0, b.tLabel, "branch"); d.style.color = b.color;
    const [lx, ly] = b.labelAt, right = b.u0[0] >= 0; d.style.left = (lx + (right ? 40 : -40)) + "px"; d.style.top = (ly - 70) + "px"; if (!right) d.style.transform = "translateX(-100%)"; d.dataset.branch = right ? "r" : "l"; });
  if (HAS_EV && EV.label) { const d = mkLbl(esc(EV.label), EX0 - 380, YT - 80, EV.tLabel, "branch"); d.style.color = EVC_COLOR; d.style.transform = "translateX(-100%)"; d.dataset.branch = "l"; }
  evNodes.forEach(n => mkLbl(`<span class="dt ev">${esc(n.date)}</span><span class="tt ev" style="color:${EVC_COLOR}">${esc(n.title)}</span>`, n.x - Math.max(n.W, 200) / 2, n.ly, n.tPop + 0.05));

  // ======================= drawing =======================
  const ink = document.getElementById("ink").getContext("2d");
  const boil = t => Math.floor(t * 6) % 3;
  function sketch(ctx, pts, prog, col, w, c, t) {
    if (prog <= 0 || pts.length < 2) return;
    const n = Math.max(2, Math.floor((pts.length - 1) * prog) + 1), b = boil(t), j = 1.4 / c.z;
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = pass ? 0.35 : 1; ctx.lineWidth = (pass ? w * 0.6 : w) / Math.max(0.3, c.z) * Math.min(1, c.z * 1.6);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { let [x, y] = pts[i];
        if (i === n - 1 && prog < 1) { const f = (pts.length - 1) * prog - (n - 1); if (f > 0 && pts[i + 1]) { x = lerp(x, pts[i + 1][0], f); y = lerp(y, pts[i + 1][1], f); } }
        const jx = (hash(i * 3 + b * 17 + pass * 5) - 0.5) * 2 * j, jy = (hash(i * 5 + b * 13 + pass * 7) - 0.5) * 2 * j;
        i ? ctx.lineTo(x + jx, y + jy) : ctx.moveTo(x + jx, y + jy); }
      ctx.stroke(); }
    ctx.restore();
  }
  function curve(a, b, bend, n = 24) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend; const o = []; for (let i = 0; i <= n; i++) { const u = i / n; o.push([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cy + u * u * b[1]]); } return o; }
  BR.forEach(b => { b.segs = b.items.map((it, k) => curve(b.pts[k], b.pts[k + 1], (k % 2 ? 0.1 : -0.1))); });
  // the vine from the ring up to the timeline: S-bends straight up first, then runs left through the band between the highest
  // works and the lowest timeline photos, and hooks into the start of the line from below (Catmull-Rom through waypoints)
  const EVROOT = !HAS_EV ? [] : (() => { const A = [0, -RR], Ee = [EX0 - 320, wob(EX0 - 320)];
    const inRun = x => x > Ee[0] - 400 && x < 600;
    const tops = BR.flatMap(b => b.items.filter(it => inRun(it.C[0])).map(it => it.C[1] - it.H / 2 - 130));
    const bots = evNodes.filter(n => !n.up && inRun(n.x)).map(n => n.cy + n.H / 2);
    const brTop = tops.length ? Math.min(...tops) : topY, evBot = bots.length ? Math.max(...bots) : YT + 200;
    const yb = Math.min((brTop + evBot) / 2, A[1] - 300);
    const f = u => A[1] + (yb - A[1]) * u;
    const W = [[0, -RR + 40], A, [140, f(0.12)], [-130, f(0.3)], [330, f(0.5)], [-60, f(0.7)], [260, f(0.88)], [-200, yb],
      [Ee[0] + 700, yb - 60], [Ee[0] + 60, yb - 30], [Ee[0] - 220, Ee[1] + 260], Ee, [Ee[0] + 90, wob(Ee[0] + 90)]];
    const out = [];
    for (let i = 1; i < W.length - 2; i++) { const [p0, p1, p2, p3] = [W[i - 1], W[i], W[i + 1], W[i + 2]];
      for (let k = 0; k < 24; k++) { const u = k / 24, u2 = u * u, u3 = u2 * u;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3))); } }
    out.push(Ee); return out; })();
  // a short tick from the line to each cluster
  BR.forEach(b => b.items.forEach(it => { const dx = it.C[0] - it.P[0], dy = it.C[1] - it.P[1], L = Math.hypot(dx, dy) || 1;
    const edge = Math.min(it.W / 2 / Math.abs(dx / L || 1e-6), (it.H / 2 + 20) / Math.abs(dy / L || 1e-6)); it.tick = [it.P, [it.C[0] - dx / L * edge, it.C[1] - dy / L * edge]]; }));
  const coverVis = t => (t < REW[0] ? 1 : 1 - ramp(t, REW[0], REW[0] + 1.6, "in"));
  function vis(t0, t) { if (EXPLORE) return 1; if (t < REW[1]) return coverVis(t); return ramp(t, t0 - 0.1, t0 + 0.3, "out"); }
  const sty = (el, k, v) => { const m = el._sty || (el._sty = {}); if (m[k] !== v) { m[k] = v; el.style[k] = v; } };
  const dotsEl = document.getElementById("dots");
  let VIEW = null, lastExplore = null;
  const RING = []; for (let i = 0; i <= 90; i++) { const a = -Math.PI / 2 + i / 90 * Math.PI * 2; RING.push([RR * Math.cos(a), RR * Math.sin(a)]); }

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
    const cover = !EXPLORE && t < REW[1], full = EXPLORE || cover;
    // the ring: a red dot opens into a circle with a fringe of colour
    { const r = EXPLORE ? 1 : cover ? coverVis(t) : ramp(t, ORIGIN.ring[0], ORIGIN.ring[1]);
      const d = full ? 1 : ramp(t, ORIGIN.dot - 0.4, ORIGIN.dot, "out");
      if (full || t > ORIGIN.dot - 0.4) { ink.fillStyle = RED; ink.beginPath(); ink.arc(0, 0, 11 * d * (1 - r * 0.7) + (cover ? 14 * (1 - coverVis(t)) : 0), 0, 7); ink.fill(); }
      if (r > 0) sketch(ink, RING, r, INK, 6, c, t);
      const sp = EXPLORE ? 1 : cover ? coverVis(t) : ramp(t, ORIGIN.ring[1], ORIGIN.ring[1] + 0.5);
      if (sp > 0) for (let i = 0; i < 48; i++) { const a = -Math.PI / 2 + i * Math.PI / 24, h = (12 + 40 * hash(i) * (0.4 + 0.6 * pulse(t))) * sp;
        ink.strokeStyle = PAL[i % 5]; ink.lineWidth = 4; ink.beginPath(); ink.moveTo((RR + 10) * Math.cos(a), (RR + 10) * Math.sin(a)); ink.lineTo((RR + 10 + h) * Math.cos(a), (RR + 10 + h) * Math.sin(a)); ink.stroke(); } }
    BR.forEach(b => b.items.forEach((it, k) => {
      const p = EXPLORE ? 1 : cover ? coverVis(t) : ramp(t, it.tLine[0], it.tLine[1]);
      sketch(ink, b.segs[k], p, k === 0 ? b.color : INK, k === 0 ? 7 : 5, c, t);
      if (p > 0.95) sketch(ink, it.tick, full ? p : ramp(t, it.tLine[1] - 0.1, it.tLine[1] + 0.2), b.color, 3, c, t);
    }));
    if (HAS_EV) { const p = EXPLORE ? 1 : cover ? coverVis(t) : ramp(t, tPl - 0.4, tPl + 1.0); sketch(ink, EVROOT, p, EVC_COLOR, 5, c, t);
      const tip = full ? EX1 + 320 : evTip(t), q = clamp((tip - (EX0 - 320)) / (EX1 - EX0 + 640));
      if (full || t >= tPl + 0.9) sketch(ink, EVLINE, cover ? p : q, EVC_COLOR, 6, c, t);
      evNodes.forEach(n => { const v = EXPLORE ? 1 : cover ? p : ramp(t, n.tPop - 0.3, n.tPop);
        if (v > 0) { sketch(ink, [[n.x, n.y], [n.x, n.up ? n.cy + n.H / 2 + 6 : n.cy - n.H / 2 - 6]], v, EVC_COLOR, 3, c, t);
          ink.fillStyle = EVC_COLOR; ink.beginPath(); ink.arc(n.x, n.y, 9 * v, 0, 7); ink.fill(); } }); }
    ITEMS.forEach(({ c: cd, t0 }) => { const v = vis(t0, t), el = cd.el;
      if (v <= 0.001) { sty(el, "opacity", "0"); sty(el, "visibility", "hidden"); return; }
      sty(el, "visibility", "visible"); sty(el, "opacity", clamp(v * 2).toFixed(3));
      sty(el, "transform", `rotate(${((cd.rot || 0) * clamp(v)).toFixed(2)}deg) scale(${lerp(0.55, 1, E.back(clamp(v))).toFixed(4)})`); });
    LBL.forEach(L => { const v = vis(L.t0, t), el = L.el; sty(el, "opacity", clamp(v).toFixed(3));
      if (el.dataset.stamp) sty(el, "transform", `rotate(-8deg) scale(${lerp(2.2, 1, E.out(clamp(v))).toFixed(3)})`);
      else if (el.dataset.branch) sty(el, "clipPath", el.dataset.branch === "l" ? `inset(0 0 0 ${((1 - clamp(v)) * 100).toFixed(1)}%)` : `inset(0 ${((1 - clamp(v)) * 100).toFixed(1)}% 0 0)`);
      else sty(el, "clipPath", `inset(0 ${((1 - clamp(v)) * 100).toFixed(1)}% 0 0)`); });
    if (EXPLORE) return;
    const veil = document.getElementById("veil"); sty(veil, "opacity", ((1 - ramp(t, REW[0] - 0.5, REW[0] + 0.2)) + ramp(t, SEC.finale[0] + 1.0, SEC.finale[0] + 2.2)).toFixed(3));
    ["t1", "t2"].forEach((cl, n) => { const e = document.querySelector("#title ." + cl); if (!e) return;
      const u = Math.min(ramp(t, 0.3 + n * 0.35, 1.0 + n * 0.35, "out"), 1 - ramp(t, REW[0] - 0.4, REW[0])); sty(e, "opacity", u.toFixed(3)); });
    ["e0", "e1", "e2"].forEach((cl, n) => { const e = document.querySelector("#end ." + cl); if (!e) return;
      const u = ramp(t, tTitle2 + n * 0.5, tTitle2 + 0.9 + n * 0.5, "out"); sty(e, "opacity", u.toFixed(3)); });
  }
  const box4 = rs => ({ minX: Math.min(...rs.map(r => r[0])), minY: Math.min(...rs.map(r => r[1])), maxX: Math.max(...rs.map(r => r[2])), maxY: Math.max(...rs.map(r => r[3])) });
  const REGIONS = BR.map(b => ({ label: b.label, color: b.color, n: b.items.length, ...box4(b.items.map(it => [it.C[0] - it.W / 2, it.C[1] - it.H / 2 - 110, it.C[0] + it.W / 2, it.C[1] + it.H / 2 + 110])) }))
    .concat(HAS_EV ? [{ label: EV.label || "Events", color: EVC_COLOR, n: evNodes.length, ...box4(evNodes.map(n => [n.x - n.W / 2 - 60, n.cy - n.H / 2 - 90, n.x + n.W / 2 + 60, n.cy + n.H / 2 + 20])) }] : []);
  window.__GROW = { BOUNDS, OVER, VIDS, ITEMS, REGIONS, setView: v => { VIEW = v; }, draw, invalidate: () => { lastExplore = null; }, TOTAL,
    COUNT: BR.reduce((s, b) => s + b.items.length, 0) + (SEED.media ? 1 : 0) };
})();
