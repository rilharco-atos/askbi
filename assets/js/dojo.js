/* ASBKI · dojo.js · A página inicial é o próprio dojo.
   Sala 3D em CSS a partir das faces desdobradas da fotografia. O scroll entra, o rato olha em volta,
   cada porta shoji é uma página do site: abre-se, a câmara voa até ela, a luz inunda, e navega-se.
   Motor: lerp normalizado por dt que descansa, escritas no DOM só quando muda, bandas ritmadas em
   distância de scroll, gates do hero estático vivos (o de movimento reduzido pode ser levantado). */
(function () {
  'use strict';

  // Unidades: 1 unidade = 1 pixel da fotografia (1376x768) à profundidade da parede do fundo.
  const U = { F: 1340, VPX: 693, VPY: 198, BX0: 455, BX1: 920, BY0: 150, BY1: 468, DEPTH: 705, FRAME_Z: 619, DW: 92, DH: 214 };
  const CAM_MAX = 600;                     // quanto a câmara avança (unidades): pára já dentro da porta
  const PERSP_IN = 1000;                   // a lente alarga ao entrar (grande angular) para as paredes laterais caberem no ecrã;
                                           // a sala recua a mesma distância que a perspectiva encurta, por isso o observador não se move
  const FRAME_FADE = [430, 540];           // a moldura desvanece antes de passar pela câmara
  const BLOOM_AT = 470;                    // a luz floresce ao cruzar a soleira
  const DEVICE_GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)'
  ];
  const REDUCE = '(prefers-reduced-motion: reduce)';
  const html = document.documentElement;

  const hero = document.querySelector('.dojo');
  const stage = document.getElementById('dj-stage');
  const room = document.getElementById('dj-room');
  if (!hero || !stage || !room) return;
  const photo = stage.querySelector('.dj-photo');
  const frame = room.querySelector('.dj-frame');
  const bloom = stage.querySelector('.dj-bloom');
  const flash = stage.querySelector('.dj-flash');
  const bandEls = [...stage.querySelectorAll('.dj-band')];
  const doors = [...room.querySelectorAll('.dj-door')];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ── Divisão do texto das bandas, uma vez, com aleatoriedade determinística ── */
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function splitLine(el, mode, seed, spread) {
    const text = el.textContent, r = rng(seed);
    const sr = document.createElement('span'); sr.className = 'dj-sr'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    const words = text.split(' '), total = text.replace(/ /g, '').length; let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span'); w.className = 'w';
      if (mode === 'chars') {
        [...word].forEach(ch => {
          const c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
          c.style.setProperty('--th', (ci / total * spread + r() * 0.06).toFixed(3));
          c.style.setProperty('--jx', (-(18 + r() * 26)).toFixed(1) + 'px');
          w.appendChild(c); ci++;
        });
      } else { w.textContent = word; w.style.setProperty('--th', (wi / Math.max(1, words.length) * spread + r() * 0.05).toFixed(3)); }
      vis.appendChild(w);
      if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.textContent = ''; el.appendChild(sr); el.appendChild(vis);
  }
  bandEls.forEach((b, i) => {
    const mode = b.dataset.entrance, spread = parseFloat(b.dataset.spread || '0.5');
    if (mode === 'grid') b.querySelectorAll('.dj-line').forEach((l, j) => splitLine(l, 'chars', 101 + i * 7 + j, spread));
    if (mode === 'rise') b.querySelectorAll('.dj-line').forEach((l, j) => splitLine(l, 'words', 303 + i * 7 + j, spread));
  });
  const bands = bandEls.map((el, idx) => ({ el, a: +el.dataset.a, b: +el.dataset.b, ramp: el.dataset.ramp ? +el.dataset.ramp : null, first: idx === 0, last: idx === bandEls.length - 1, op: -1, k: -1 }));

  let loadK = 0, loadStart = 0;
  function updateCaptions(p, now) {
    if (loadStart && loadK < 1) { const t = clamp((now - loadStart) / 1400, 0, 1); loadK = t * t * (3 - 2 * t); }
    for (const bd of bands) {
      const f = Math.min(0.02, (bd.b - bd.a) / 3);
      let op = smoothstep(p, bd.a, bd.a + f) * (1 - smoothstep(p, bd.b - f, bd.b));
      if (bd.first) op = 1 - smoothstep(p, bd.b - f, bd.b);
      if (bd.last) op = smoothstep(p, bd.a, bd.a + f);
      const ramp = bd.ramp || Math.min(0.025, (bd.b - bd.a) * 0.35);
      let k = clamp((p - bd.a) / ramp, 0, 1);
      if (bd.first) k = Math.max(k, loadK);
      if (Math.abs(op - bd.op) > 0.01 || (op === 0 && bd.op !== 0) || (op === 1 && bd.op !== 1)) { bd.op = op; bd.el.style.opacity = op.toFixed(3); }
      if (Math.abs(k - bd.k) > 0.008 || (k === 1 && bd.k !== 1) || (k === 0 && bd.k !== 0)) { bd.k = k; bd.el.style.setProperty('--k', k.toFixed(3)); }
    }
  }

  /* ── Câmara ─────────────────────────────────────────────────────────────── */
  const scene = stage.querySelector('.dj-scene');
  const cam = { z: 0, yaw: 0, pitch: 0, persp: U.F };
  const target = { z: 0, yaw: 0, pitch: 0, persp: U.F };
  let scrollP = 0, mouseX = 0, mouseY = 0;
  let flying = false, rafId = null, lastTick = 0, heroOnScreen = true, scrubOn = false;
  let lastTransform = '', photoOp = -1, frameOp = -1, bloomOp = -1, perspShown = -1, litState = false, pastState = false;

  function heroProgress() {
    const range = hero.offsetHeight - innerHeight;
    if (range <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / range, 0, 1);
  }
  function scrollTargets() {
    const p = scrollP;
    target.z = easeInOut(p) * CAM_MAX;
    target.persp = U.F - (U.F - PERSP_IN) * smoothstep(p, 0.28, 0.86);
    // olhar com o rato: amplo durante a caminhada, discreto lá dentro para as portas não fugirem do cursor
    const amp = 1 - 0.6 * smoothstep(p, 0.6, 0.9);
    target.yaw = mouseX * 3.6 * amp;
    target.pitch = -mouseY * 1.8 * amp;
  }
  function writeScene() {
    const zc = cam.z - (U.F - cam.persp);  // compensação da perspectiva: a distância ao observador mantém-se
    // ordem de câmara: primeiro guinada (eixo vertical), depois inclinação em torno do eixo horizontal do observador; o horizonte fica nivelado
    const t = 'rotateX(' + cam.pitch.toFixed(3) + 'deg) rotateY(' + cam.yaw.toFixed(3) + 'deg) translateZ(calc(' + zc.toFixed(2) + ' * var(--u)))';
    if (t !== lastTransform) { lastTransform = t; room.style.transform = t; }
    if (Math.abs(cam.persp - perspShown) > 0.5) { perspShown = cam.persp; scene.style.setProperty('--persp', cam.persp.toFixed(1)); }
    const po = 1 - smoothstep(scrollP, 0.02, 0.13);                 // a fotografia entrega à sala 3D
    if (Math.abs(po - photoOp) > 0.01 || (po === 0 && photoOp !== 0)) { photoOp = po; photo.style.opacity = po.toFixed(3); }
    const fo = 1 - smoothstep(cam.z, FRAME_FADE[0], FRAME_FADE[1]);   // a moldura desvanece antes de passar pela câmara
    if (Math.abs(fo - frameOp) > 0.01 || (fo === 0 && frameOp !== 0)) { frameOp = fo; frame.style.opacity = fo.toFixed(3); }
    const x = (cam.z - BLOOM_AT) / 90;                                 // a luz floresce ao cruzar a soleira
    const bo = Math.exp(-x * x) * 0.6;
    if (Math.abs(bo - bloomOp) > 0.01 || (bo === 0 && bloomOp !== 0)) { bloomOp = bo; bloom.style.opacity = bo.toFixed(3); }
    const lit = scrollP > 0.82;
    if (lit !== litState) { litState = lit; room.classList.toggle('lit', lit); stage.classList.toggle('inside', lit); }
    const past = scrollP > 0.05;
    if (past !== pastState) { pastState = past; stage.classList.toggle('past', past); }
  }
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    const a = 1 - Math.pow(1 - (flying ? 0.07 : 0.16), dt / 16.667);
    if (!flying) scrollTargets();
    cam.z += (target.z - cam.z) * a;
    cam.yaw += (target.yaw - cam.yaw) * a;
    cam.pitch += (target.pitch - cam.pitch) * a;
    cam.persp += (target.persp - cam.persp) * a;
    const settled = Math.abs(target.z - cam.z) < 0.05 && Math.abs(target.yaw - cam.yaw) < 0.002 && Math.abs(target.pitch - cam.pitch) < 0.002 && Math.abs(target.persp - cam.persp) < 0.2 && !(loadStart && loadK < 1);
    writeScene();
    updateCaptions(scrollP, now);
    if (settled) { cam.z = target.z; cam.yaw = target.yaw; cam.pitch = target.pitch; cam.persp = target.persp; rafId = null; lastTick = 0; return; }
    rafId = requestAnimationFrame(tick);
  }
  function wake() { if (rafId === null && (heroOnScreen || flying)) rafId = requestAnimationFrame(tick); }
  function onScroll() { scrollP = heroProgress(); wake(); }
  let overDoor = false;                                  // com o cursor sobre uma porta, a sala pára de girar
  doors.forEach(d => { d.addEventListener('pointerenter', () => { overDoor = true; }); d.addEventListener('pointerleave', () => { overDoor = false; }); });
  function onMouse(e) {
    if (flying || overDoor) return;
    mouseX = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
    mouseY = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
    wake();
  }
  new IntersectionObserver(en => { heroOnScreen = en[0].isIntersecting; if (heroOnScreen && scrubOn) onScroll(); }, { threshold: 0 }).observe(hero);

  /* ── Portas: posição no mundo e voo até elas ────────────────────────────── */
  function doorWorld(door) {
    const dx = parseFloat(door.style.getPropertyValue('--dx')) || 0;
    const cx = dx + U.DW / 2, cy = (U.BY1 - U.BY0 - U.DH) + U.DH / 2;
    switch (door.dataset.face) {
      case 'back': return { X: U.BX0 + cx, Y: U.BY0 + cy, Z: 0 };
      case 'left': return { X: U.BX0, Y: U.BY0 + cy, Z: U.DEPTH - cx };
      case 'right': return { X: U.BX1, Y: U.BY0 + cy, Z: cx };
    }
    return { X: U.VPX, Y: U.VPY, Z: 0 };
  }
  let busy = false;
  function flyTo(door, done) {
    if (busy) return; busy = true;
    const w = doorWorld(door);
    const dx = w.X - U.VPX, dy = w.Y - U.VPY;
    const dz = U.F - (w.Z + cam.z);                // distância à frente (a compensação da perspectiva não altera distâncias)
    const stop = 300;
    const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
    const pitch = Math.atan2(-dy, Math.hypot(dx, dz)) * 180 / Math.PI;
    const ahead = Math.sqrt(Math.max(stop * stop - dx * dx - dy * dy, 900));
    flying = true;
    target.z = cam.z + Math.max(0, dz - ahead);
    target.yaw = yaw;
    target.pitch = pitch * 0.6;
    wake();
    door.classList.add('open');
    setTimeout(() => flash.classList.add('on'), 950);
    setTimeout(() => { if (done) done(); }, 1350);
  }
  doors.forEach(door => door.addEventListener('click', e => {
    if (!scrubOn || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const href = door.getAttribute('href');
    flyTo(door, () => { location.href = href; });
  }));
  // O botão da banda final voa pela porta vermelha.
  stage.querAll = null;
  stage.querySelectorAll('[data-fly]').forEach(a => a.addEventListener('click', e => {
    if (!scrubOn) return;
    const door = doors.find(d => d.getAttribute('href') === a.getAttribute('href'));
    if (!door) return;
    e.preventDefault();
    flyTo(door, () => { location.href = a.getAttribute('href'); });
  }));
  // Se o visitante voltar com o botão de retroceder, a página vem do cache com a porta aberta.
  addEventListener('pageshow', e => { if (e.persisted) { busy = false; flying = false; doors.forEach(d => d.classList.remove('open')); flash.classList.remove('on'); scrollTargets(); wake(); } });

  /* ── Rótulos das portas a partir do content.json (opcional) ────────────── */
  function applyNav(nav) {
    if (!nav) return;
    const all = [...(nav.links || [])];
    if (nav.ctaHref) all.push({ href: nav.ctaHref, label: nav.ctaLabel });
    doors.forEach(d => {
      const link = all.find(l => l.href === d.getAttribute('href'));
      const plate = d.querySelector('.dj-plate');
      if (link && plate && plate.firstChild && plate.firstChild.nodeType === 3) plate.firstChild.textContent = link.label;
    });
  }

  /* ── Pó a flutuar (nível de sussurro; descansa fora de ecrã e em separadores escondidos) ── */
  const dust = stage.querySelector('.dj-dust');
  let dustOn = false, dustRaf = null, motes = [];
  function dustResize() { const dpr = Math.min(2, devicePixelRatio || 1); dust.width = Math.floor(dust.clientWidth * dpr); dust.height = Math.floor(dust.clientHeight * dpr); }
  function dustInit() { dustResize(); const r = rng(7); motes = Array.from({ length: 34 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.6, v: 0.00004 + r() * 0.00008, d: r() * 6.28, a: 0.25 + r() * 0.45 })); }
  function dustTick(now) {
    if (!dustOn) { dustRaf = null; return; }
    const ctx = dust.getContext('2d'), W = dust.width, H = dust.height;
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.y -= m.v * 16; m.x += Math.sin(now / 4000 + m.d) * 0.00006;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      ctx.beginPath(); ctx.fillStyle = 'rgba(232,214,186,' + (m.a * (0.6 + 0.4 * Math.sin(now / 1500 + m.d))).toFixed(3) + ')';
      ctx.arc(m.x * W, m.y * H, m.s * (W / 1400), 0, 6.283); ctx.fill();
    }
    dustRaf = requestAnimationFrame(dustTick);
  }
  function dustStart() { if (!dust || dustOn) return; dustOn = true; if (!motes.length) dustInit(); if (dustRaf === null) dustRaf = requestAnimationFrame(dustTick); }
  function dustStop() { dustOn = false; }
  if (dust) new IntersectionObserver(e => { if (scrubOn) (e[0].isIntersecting && !document.hidden ? dustStart() : dustStop()); }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) dustStop(); else if (scrubOn && heroOnScreen) dustStart(); });
  addEventListener('resize', () => { if (dustOn) dustResize(); }, { passive: true });

  /* ── O gate vivo ────────────────────────────────────────────────────────── */
  let inited = false;
  function initOnce() { if (inited) return; inited = true; photo.style.backgroundImage = "url('/assets/dojo/hero-poster.jpg')"; loadStart = performance.now(); }
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    initOnce();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pointermove', onMouse, { passive: true });
    bands.forEach(b => { b.op = -1; b.k = -1; });
    lastTransform = ''; photoOp = -1; frameOp = -1; bloomOp = -1;
    onScroll();
    if (heroOnScreen) dustStart();
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    removeEventListener('scroll', onScroll);
    removeEventListener('pointermove', onMouse);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    dustStop();
  }
  const reduceActive = () => false; // decisão do cliente: o movimento está sempre activo no desktop
  function applyHeroMode() {
    if (DEVICE_GATES.some(q => matchMedia(q).matches) || reduceActive()) disableScrub(); else enableScrub();
  }
  const MQLS = DEVICE_GATES.map(q => matchMedia(q));
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode));

  applyHeroMode();

  window.__dojo = { get scrubOn() { return scrubOn; }, cam, target, bands, doors, heroProgress, flyTo, applyNav };
})();
