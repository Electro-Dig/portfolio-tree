// Portfolio Tree — page interactions: pan / zoom, open a work, play videos, the growth animation, settings, poster wall, covers.
// Reads window.CONTENT (content/content.js) and window.__GROW (assets/engine/tree.js).
//
// URL parameters (handy for testing and for making cover images):
//   ?view=x,y,z      start at this camera position          ?at=SEC       freeze the growth animation at that second
//   ?cover           hide the UI (for screenshots)          ?cover=title  … and show the cover title (landscape)
//   ?cover=title-v   portrait cover title                   ?wall         open the poster wall
//   ?theme=NAME      try a visual style ("sketch", "crayon")  ?tick       drive frames with a timer (hidden preview panes)
(function () {
  const C = window.CONTENT || {}, SITECFG = C.site || {}, UI = Object.assign({
    play: "▶ 流动观看", stop: "■ 停止", film: "▶ 播放视频", wall: "海报墙", fit: "全图", count: n => `${n} 个项目`,
    tryIt: "▶ ", link: "原文链接 ↗", hint: "拖动查看 · 滚轮或双指缩放 · 鼠标停在作品上播放 · 点开放大",
  }, C.ui || {});
  const G = window.__GROW, root = document.getElementById("root"), $ = id => document.getElementById(id);
  const MDIR = (C.mediaDir || "content/media/").replace(/\/?$/, "/"), MEDIA = window.MEDIA || {};
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  // ---------- text from the content file ----------
  document.title = SITECFG.name || SITECFG.title || "Portfolio Tree";
  const range = SITECFG.start && SITECFG.end ? `${SITECFG.start}–${SITECFG.end}` : "";
  $("bar").querySelector(".name").textContent = [SITECFG.name || range, UI.count(G.COUNT)].filter(Boolean).join(" · ");
  $("hint").textContent = UI.hint;
  $("play").textContent = UI.play; $("all").textContent = UI.film; $("wallbtn").textContent = UI.wall; $("fit").textContent = UI.fit;
  const T1 = document.querySelector("#title .t1"), T2 = document.querySelector("#title .t2");
  T1.textContent = SITECFG.title || ""; T2.textContent = SITECFG.subtitle || range;
  document.querySelector("#end .e1").textContent = SITECFG.ending || SITECFG.title || "";
  document.querySelector("#end .e2").textContent = SITECFG.subtitle || range;
  const lines = SITECFG.coverTitle || [SITECFG.title || ""];
  document.querySelector("#ctitle .a").innerHTML = lines.map((l, i) => `<span class="l${i + 1}">${esc(l)}</span>`).join("<br>");
  document.querySelector("#ctitle .b").textContent = SITECFG.subtitle || range;

  // ---------- canvas + camera ----------
  const cvs = [...document.querySelectorAll("canvas.layer")];
  // resizing clears the canvases, so the next frame must redraw even if the camera has not moved
  const size = () => { const D = window.__DPR || 1; cvs.forEach(c => { c.width = innerWidth * D; c.height = innerHeight * D; }); G.invalidate(); };
  size();
  const B = G.BOUNDS;
  const fitView = () => { const z = Math.min(innerWidth / (B.maxX - B.minX), innerHeight / (B.maxY - B.minY)) * 0.92;
    return { x: (B.minX + B.maxX) / 2, y: (B.minY + B.maxY) / 2, z }; };
  let view = fitView(), target = { ...view };
  { const m = /[?&]view=([-\d.]+),([-\d.]+),([\d.]+)/.exec(location.search);
    if (m) { view = { x: +m[1], y: +m[2], z: +m[3] }; target = { ...view }; }
    else if (/[?&]cover/.test(location.search)) {
      // covers frame the whole tree; a portrait cover with a title keeps the bottom ~22 % free for it
      const pv = /cover=title-v/.test(location.search), bw = B.maxX - B.minX, bh = B.maxY - B.minY;
      const z = Math.min(innerWidth * 0.94 / bw, innerHeight * (pv ? 0.72 : 0.93) / bh);
      view = { x: (B.minX + B.maxX) / 2, y: (B.minY + B.maxY) / 2 + (pv ? innerHeight * 0.11 / z : 0), z }; target = { ...view }; } }
  G.setView(view);

  // ---------- settings (remembered in this browser) ----------
  const music = $("music"), hasMusic = !!SITECFG.music;
  if (hasMusic) music.src = SITECFG.music; else document.querySelectorAll(".needs-music").forEach(e => (e.style.display = "none"));
  const DEF = { bg: true, bgVol: 0.8, voice: false, voiceVol: 0.9, zoom: 1, vmode: "center" };
  let S = { ...DEF };
  try { S = { ...DEF, ...JSON.parse(localStorage.getItem("portfolioTreeSettings") || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem("portfolioTreeSettings", JSON.stringify(S)); } catch (e) {} };
  let zoomNow = S.zoom; window.__PLAYZOOM = zoomNow;
  function syncPanel() {
    $("s-bg").checked = S.bg; $("s-bgvol").value = S.bgVol; $("s-voice").checked = S.voice; $("s-voicevol").value = S.voiceVol;
    $("s-zoom").value = S.zoom; $("s-zoomv").textContent = S.zoom.toFixed(1) + "×";
    document.querySelectorAll('#set input[name="vmode"]').forEach(r => (r.checked = r.value === S.vmode));
  }
  syncPanel();
  $("s-bg").onchange = e => { S.bg = e.target.checked; save(); };
  $("s-bgvol").oninput = e => { S.bgVol = +e.target.value; save(); };
  $("s-voice").onchange = e => { S.voice = e.target.checked; save(); };
  $("s-voicevol").oninput = e => { S.voiceVol = +e.target.value; save(); };
  $("s-zoom").oninput = e => { S.zoom = +e.target.value; $("s-zoomv").textContent = S.zoom.toFixed(1) + "×"; save(); };
  document.querySelectorAll('#set input[name="vmode"]').forEach(r => (r.onchange = () => { S.vmode = r.value; save(); lastVis = 0; }));
  $("gear").onclick = () => $("set").classList.toggle("on");
  $("set").addEventListener("pointerdown", e => e.stopPropagation());
  $("set").addEventListener("wheel", e => e.stopPropagation());

  // ---------- the growth animation, live in the page ----------
  let playing = false, held = false, t = 0, last = performance.now();
  function stopPlay() { playing = false; held = false; $("nav").style.display = ""; music.pause(); window.__EXPLORE = true; $("play").textContent = UI.play;
    ["#title div", "#end div"].forEach(q => document.querySelectorAll(q).forEach(e => (e.style.opacity = 0)));
    $("veil").style.opacity = 0; lastVis = 0; G.invalidate(); }
  $("play").onclick = () => {
    if (playing) return stopPlay();
    playing = true; held = false; nav.style.display = "none"; t = 0; window.__EXPLORE = false;
    if (hasMusic) { music.currentTime = 0; music.volume = S.bg ? S.bgVol : 0; music.play().catch(() => {}); }
    $("play").textContent = UI.stop; lastVis = 0;
  };
  $("fit").onclick = () => { if (playing) stopPlay(); target = fitView(); };

  // ---------- jump to a branch ----------
  const nav = $("nav");
  G.REGIONS.forEach(r => { const b = document.createElement("button"); b.style.color = r.color; b.innerHTML = `${esc(r.label)}<small>${r.n}</small>`;
    b.onclick = () => { if (playing) stopPlay(); const z = Math.min(innerWidth / (r.maxX - r.minX), innerHeight / (r.maxY - r.minY)) * 0.9;
      target = { x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2, z: clamp(z) }; };
    nav.appendChild(b); });

  // ---------- pan / zoom (while the animation plays, wheel / pinch only change how close the camera follows) ----------
  const ptrs = new Map(); let moved = 0, downAt = null, pinch0 = null;
  const setPlayZoom = z => { S.zoom = Math.min(2.5, Math.max(0.5, z)); $("s-zoom").value = S.zoom; $("s-zoomv").textContent = S.zoom.toFixed(1) + "×"; save(); };
  root.addEventListener("pointerdown", e => { try { root.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; downAt = [e.clientX, e.clientY, e.target];
    root.classList.add("dragging"); $("set").classList.remove("on");
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: playing ? S.zoom : target.z }; } });
  root.addEventListener("pointermove", e => { if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1];
    ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 1 && !playing) { target.x -= dx / target.z; target.y -= dy / target.z; view.x = target.x; view.y = target.y; }
    else if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()], f = Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0.d;
      if (playing) setPlayZoom(pinch0.z * f); else target.z = clamp(pinch0.z * f); } });
  const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) root.classList.remove("dragging");
    if (moved < 6 && downAt) { const card = downAt[2].closest && downAt[2].closest(".card"); if (card && card._card) openBox(card._card); } downAt = null; };
  root.addEventListener("pointerup", end); root.addEventListener("pointercancel", end);
  const fz = fitView().z, clamp = z => Math.min(2.2, Math.max(fz * 0.6, z));
  root.addEventListener("wheel", e => { e.preventDefault();
    const k = Math.exp(-e.deltaY * 0.0015);
    if (playing) return setPlayZoom(S.zoom * k);
    const nz = clamp(target.z * k);
    const wx = target.x + (e.clientX - innerWidth / 2) / target.z, wy = target.y + (e.clientY - innerHeight / 2) / target.z;
    target.x = wx - (e.clientX - innerWidth / 2) / nz; target.y = wy - (e.clientY - innerHeight / 2) / nz; target.z = nz; }, { passive: false });
  addEventListener("resize", size);

  // ---------- lightbox: a work, large, with its own sound; pauses the animation while open ----------
  const box = $("box");
  function openBox(c) {
    const m = box.querySelector(".m"); m.innerHTML = "";
    if (c.src) { const el = document.createElement(c.isV ? "video" : "img");
      el.className = "media"; el.src = MDIR + c.src;
      if (c.isV) { el.controls = true; el.loop = true; el.muted = !c.hasAudio; el.volume = 1; el.autoplay = true; el.playsInline = true; }
      m.appendChild(el); }
    box.querySelector(".tt").textContent = c.title || ""; box.querySelector(".tt").style.color = c.color || "";
    box.querySelector(".dt").textContent = c.date || ""; box.querySelector(".nt").textContent = c.note || "";
    const acts = box.querySelector(".acts"); acts.innerHTML = "";
    (c.play || []).forEach(([label, url]) => { const a = document.createElement("a"); a.className = "play"; a.target = "_blank"; a.rel = "noopener"; a.href = url; a.textContent = UI.tryIt + label; acts.appendChild(a); });
    if (c.link) { const a = document.createElement("a"); a.className = "go"; a.target = "_blank"; a.rel = "noopener"; a.href = c.link; a.textContent = UI.link; acts.appendChild(a); }
    box.classList.add("on");
    if (playing) { held = true; music.pause(); }
    lastVis = 0;
  }
  function closeBox() { box.classList.remove("on"); box.querySelector(".m").innerHTML = ""; if (playing && held) { held = false; if (hasMusic) music.play().catch(() => {}); } lastVis = 0; }
  box.addEventListener("click", e => { if (e.target === box || e.target.classList.contains("x")) closeBox(); });

  // ---------- an optional pre-rendered film (content: site.film) ----------
  const film = $("film"), fv = film.querySelector("video"), allBtn = $("all");
  if (!SITECFG.film) allBtn.style.display = "none";
  allBtn.onclick = () => { if (playing) stopPlay(); if (!fv.src) fv.src = SITECFG.film; film.classList.add("on"); lastVis = 0; fv.currentTime = 0; fv.play().catch(() => {}); };
  const closeFilm = () => { fv.pause(); film.classList.remove("on"); lastVis = 0; };
  film.querySelector(".x").onclick = closeFilm;
  film.addEventListener("click", e => { if (e.target === film) closeFilm(); });
  addEventListener("keydown", e => { if (e.key !== "Escape") return;
    if (box.classList.contains("on")) closeBox(); else if (film.classList.contains("on")) closeFilm(); else $("wall").classList.remove("on"); });

  // ---------- poster wall (its own panel; every poster on one page) ----------
  const wall = $("wall"), wgrid = wall.querySelector(".grid"), POSTERS = C.posters || [];
  if (!POSTERS.length) $("wallbtn").style.display = "none";
  wall.querySelector("h2").textContent = (C.posterWall && C.posterWall.title) || UI.wall;
  wall.querySelector("small").textContent = (C.posterWall && C.posterWall.subtitle) || "";
  POSTERS.forEach(po => { const d = document.createElement("div"); d.className = "po";
    d.innerHTML = `<div class="tp"></div><img loading="lazy" decoding="async" src="${MDIR + esc(po.media)}" alt=""><div class="cap">${esc(po.title)}${po.date ? `<small>${esc(po.date)}</small>` : ""}</div>`;
    d.onclick = () => openBox({ src: po.media, isV: false, title: po.title, date: po.date, note: po.note, link: po.link }); wgrid.appendChild(d); });
  // pick the fewest columns whose rows still fit the window (falls back to scrolling on phones)
  function layWall() { const n = wgrid.children.length, W = wgrid.clientWidth - 48, Hh = wgrid.clientHeight - 40;
    let cols = 10; for (let c = 3; c <= 10; c++) { const w = (W - 18 * (c - 1)) / c, h = w * 4 / 3 + 90; if (Math.ceil(n / c) * (h + 22) <= Hh) { cols = c; break; } }
    if (innerWidth < 640) cols = 2;
    wgrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`; }
  addEventListener("resize", () => { if (wall.classList.contains("on")) layWall(); });
  $("wallbtn").onclick = () => { if (playing) stopPlay(); wall.classList.add("on"); layWall(); };
  if (/[?&]wall/.test(location.search)) setTimeout(() => $("wallbtn").click(), 0);
  wall.querySelector(".x").onclick = () => wall.classList.remove("on");
  wall.addEventListener("wheel", e => e.stopPropagation(), { passive: true });

  // ---------- videos: still by default; hover plays one; during the animation only the few big ones near the centre ----------
  let hovered = null, lastVis = 0, voiceV = null;
  G.ITEMS.forEach(({ c }) => { if (c.play && c.play.length) c.el.classList.add("canplay"); });
  G.VIDS.forEach(({ v, c }) => { c.el.classList.add("isv");
    c.el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hovered = v; lastVis = 0; } });
    c.el.addEventListener("pointerleave", () => { if (hovered === v) { hovered = null; lastVis = 0; } }); });
  function manageVideos(now) {
    if (now - lastVis < (playing ? 200 : 400)) return; lastVis = now;
    const blocked = box.classList.contains("on") || film.classList.contains("on"), cx = innerWidth / 2, cy = innerHeight * 0.45, vis = [];
    G.VIDS.forEach(o => { const r = o.c.el.getBoundingClientRect();
      if (!blocked && o.c.el.style.visibility === "visible" && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && r.width > 60)
        vis.push({ o, w: r.width, d: Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) }); });
    vis.sort((a, b) => a.d - b.d);
    const want = playing ? (S.vmode === "off" ? [] : S.vmode === "all" ? vis : vis.filter(x => x.w >= 240).slice(0, 4)) : vis.filter(x => x.o.v === hovered);
    const on = new Set(want.map(x => x.o.v));
    // while the animation plays and "original sound" is on, the biggest highlighted work near the centre may speak
    const vc = playing && !held && S.voice ? want.find(x => x.o.c.tier === "F" && x.w >= 300 && x.o.c.hasAudio) : null;
    voiceV = vc ? vc.o.v : null;
    G.VIDS.forEach(({ v, c }) => { const w = on.has(v);
      if (w && v.paused) { v.preload = "auto"; v.play().catch(() => {}); } else if (!w && !v.paused) v.pause();
      if (v !== voiceV && !v.muted && v.volume < 0.02) v.muted = true;
      c.el.classList.toggle("live", w); });
    if (playing) G.ITEMS.forEach(({ c, t0 }) => { if (c.isV && t0 > t && t0 < t + 3) { const v = c.el.querySelector("video"); if (v && v.preload !== "auto") { v.preload = "auto"; v.load(); } } });
  }
  // volumes glide toward their targets; the music ducks while a work speaks
  function mixAudio(dt) {
    const k = 1 - Math.exp(-dt / 0.12), duck = voiceV && !voiceV.paused ? 0.3 : 1;
    if (hasMusic) { const mt = playing && S.bg ? S.bgVol * duck : 0; music.volume = Math.max(0, Math.min(1, music.volume + (mt - music.volume) * k)); }
    G.VIDS.forEach(({ v }) => { const tv = v === voiceV ? S.voiceVol : 0;
      if (v === voiceV && v.muted) { v.volume = 0; v.muted = false; }
      if (!v.muted) v.volume = Math.max(0, Math.min(1, v.volume + (tv - v.volume) * k)); });
  }
  // the map is one composited layer while it moves; re-rastered only when the zoom drifts > ~25 % and once after it settles
  const world = $("world"); let rz = 0, restAt = 0, reraster = false;
  function layer(now, moving) {
    const z = window.__CAMZ || 1;
    if (reraster) { world.style.willChange = "transform"; reraster = false; rz = z; return; }
    if (moving) { restAt = now;
      if (world.style.willChange !== "transform") { world.style.willChange = "transform"; rz = z; }
      else if (Math.abs(Math.log(z / rz)) > 0.22) { world.style.willChange = "auto"; reraster = true; } }
    else if (world.style.willChange === "transform" && now - restAt > 250) world.style.willChange = "auto";
  }
  // ?at=SEC freezes the animation (testing / stills)
  const atM = /[?&]at=([\d.]+)/.exec(location.search), AT = atM ? +atM[1] : null;
  if (AT !== null) { window.__EXPLORE = false; nav.style.display = "none"; }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    zoomNow += (S.zoom - zoomNow) * (1 - Math.exp(-dt * 6)); window.__PLAYZOOM = zoomNow;
    if (AT !== null) G.draw(AT);
    else if (playing) { if (!held) { t = (hasMusic && music.currentTime) || t + dt; if (t >= G.TOTAL - 0.05) stopPlay(); } G.draw(t); }
    else { const k = 1 - Math.exp(-dt * 10); view.x += (target.x - view.x) * k; view.y += (target.y - view.y) * k; view.z += (target.z - view.z) * k; G.setView(view); G.draw(G.TOTAL); }
    layer(now, (playing && !held) || ptrs.size > 0 || Math.abs(view.z - target.z) > target.z * 0.002 || Math.abs(view.x - target.x) * view.z > 0.5 || Math.abs(view.y - target.y) * view.z > 0.5);
    manageVideos(now); mixAudio(dt); requestAnimationFrame(frame);
  }
  document.fonts.ready.then(() => requestAnimationFrame(frame));
})();
