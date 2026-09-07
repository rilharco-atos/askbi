/* ASBKI · dojo.js · A página inicial é o próprio dojo.
   Sala 3D em CSS a partir das faces desdobradas da fotografia. Chega-se à entrada com as portas
   fechadas; o primeiro scroll abre-as e entra-se. Lá dentro o rato olha em volta e cada porta shoji
   é uma página do site: a câmara desce e curva até ficar de frente para ela, a porta abre-se, passa-se
   pela ombreira, a luz inunda, e navega-se.
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
  const GATE_OPEN = [0.02, 0.24];          // as portas de entrada abrem neste troço do scroll, antes da câmara andar
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
  const gate = room.querySelector('.dj-gate');

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
  const cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, persp: U.F };      // x,y: deslocamento lateral/vertical do observador (unidades)
  const target = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, persp: U.F };
  let scrollP = 0, mouseX = 0, mouseY = 0;
  let flying = false, rafId = null, lastTick = 0, heroOnScreen = true, scrubOn = false;
  let lastTransform = '', gateShown = -1, frameOp = -1, bloomOp = -1, flareOp = -1, perspShown = -1, litState = false, pastState = false;
  let roll = 0, fly = null;                 // rolo durante o voo; tween do voo (por tempo, não por lerp)
  const flare = stage.querySelector('.dj-flare');
  const lerp = (a, b, t) => a + (b - a) * t;
  const bez = (a, b, c, t) => { const s = 1 - t; return { x: s * s * a.x + 2 * s * t * b.x + t * t * c.x, y: s * s * a.y + 2 * s * t * b.y + t * t * c.y, z: s * s * a.z + 2 * s * t * b.z + t * t * c.z }; };
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function heroProgress() {
    const range = hero.offsetHeight - innerHeight;
    if (range <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / range, 0, 1);
  }
  function scrollTargets() {
    const p = scrollP;
    target.z = easeInOut(p) * CAM_MAX;
    target.persp = U.F - (U.F - PERSP_IN) * smoothstep(p, 0.28, 0.86);
    // com o cursor numa porta a câmara pára de olhar e de derivar: a porta fica onde está até ao clique
    if (overDoor) return;
    // olhar com o rato: amplo durante a caminhada, discreto lá dentro para as portas não fugirem do cursor
    const amp = 1 - 0.6 * smoothstep(p, 0.6, 0.9);
    target.yaw = mouseX * 3.6 * amp;
    target.pitch = -mouseY * 1.8 * amp;
    // câmara viva: micro-movimento de câmara à mão sempre, e uma deriva em arco lenta quando se está dentro
    const t = performance.now() / 1000, inside = smoothstep(p, 0.8, 0.96);
    // (lá dentro a deriva é curta: as portas laterais são estreitas e têm de ficar debaixo do cursor)
    target.yaw += 0.10 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 2.9 + 1) + inside * 0.8 * Math.sin(t * 0.62);
    target.pitch += 0.06 * Math.sin(t * 1.3 + 2) + inside * 0.3 * Math.sin(t * 0.47 + 1);
    target.z += inside * 5 * Math.sin(t * 0.55);
    target.x = inside * 5 * Math.sin(t * 0.41 + 2);
    target.y = 0;
  }
  function writeScene() {
    const zc = cam.z - (U.F - cam.persp);  // compensação da perspectiva: a distância ao observador mantém-se
    // a vénia: ao cruzar a soleira a câmara baixa um pouco e volta a subir, o rei antes de pisar o tatami
    const bow = flying ? 0 : Math.exp(-Math.pow((cam.z - BLOOM_AT) / 80, 2));
    // ordem de câmara: primeiro guinada (eixo vertical), depois inclinação em torno do eixo horizontal do observador; o horizonte fica nivelado
    const t = 'rotateZ(' + roll.toFixed(3) + 'deg) rotateX(' + (cam.pitch - bow * 3.2).toFixed(3) + 'deg) rotateY(' + cam.yaw.toFixed(3) + 'deg) translate3d(calc(' + (-cam.x).toFixed(2) + ' * var(--u)), calc(' + (-cam.y - bow * 6).toFixed(2) + ' * var(--u)), calc(' + zc.toFixed(2) + ' * var(--u)))';
    if (t !== lastTransform) { lastTransform = t; room.style.transform = t; }
    if (Math.abs(cam.persp - perspShown) > 0.5) { perspShown = cam.persp; scene.style.setProperty('--persp', cam.persp.toFixed(1)); }
    const g = smoothstep(scrollP, GATE_OPEN[0], GATE_OPEN[1]);        // as portas de entrada deslizam para dentro das paredes
    if (gate && (Math.abs(g - gateShown) > 0.004 || (g === 1 && gateShown !== 1) || (g === 0 && gateShown !== 0))) {
      gateShown = g; room.style.setProperty('--gate', g.toFixed(3)); gate.classList.toggle('gone', g >= 1);
    }
    if (flare) {                                                       // flare nas janelas ao cruzar a soleira
      const fx = (cam.z - (BLOOM_AT + 30)) / 110;
      const fo = flying ? 0 : Math.exp(-fx * fx) * 0.9;
      if (Math.abs(fo - flareOp) > 0.01 || (fo === 0 && flareOp !== 0)) { flareOp = fo; flare.style.opacity = fo.toFixed(3); flare.style.transform = 'translate(-50%,-50%) scale(' + (0.7 + 0.6 * fo).toFixed(3) + ')'; }
    }
    const fo = 1 - smoothstep(cam.z, FRAME_FADE[0], FRAME_FADE[1]);   // a moldura desvanece antes de passar pela câmara
    if (Math.abs(fo - frameOp) > 0.01 || (fo === 0 && frameOp !== 0)) { frameOp = fo; frame.style.opacity = fo.toFixed(3); }
    const x = (cam.z - BLOOM_AT) / 90;                                 // a luz floresce ao cruzar a soleira
    const bo = Math.exp(-x * x) * 0.6;
    if (Math.abs(bo - bloomOp) > 0.01 || (bo === 0 && bloomOp !== 0)) { bloomOp = bo; bloom.style.opacity = bo.toFixed(3); }
    const lit = scrollP > 0.82;
    if (lit !== litState) { litState = lit; room.classList.toggle('lit', lit); stage.classList.toggle('inside', lit); if (lit) loadPreviews(); }
    if (lit || flying) positionLabels();
    const past = scrollP > 0.05;
    if (past !== pastState) { pastState = past; stage.classList.toggle('past', past); }
  }
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    if (flying && fly) {
      // voo de cinema: a câmara desce e desliza numa curva até ficar de frente para a porta, sem a perder de vista;
      // rola um pouco na viragem e no fim a lente fecha (crash zoom) enquanto se passa pela ombreira
      const u = clamp((now - fly.t0) / fly.dur, 0, 1), e = easeInOutCubic(u);
      const P = bez(fly.P0, fly.P1, fly.P2, e);
      cam.x = P.x - U.VPX; cam.y = P.y - U.VPY; cam.z = U.F - P.z;
      const dx = fly.C.X - P.x, dy = fly.C.Y - P.y, dz = P.z - fly.C.Z;
      const lookYaw = Math.atan2(dx, dz) * 180 / Math.PI;
      const lookPitch = (Math.atan2(-dy, Math.hypot(dx, dz)) + Math.atan2(fly.vpOff, cam.persp)) * 180 / Math.PI;
      const k = smoothstep(u, 0, 0.45);
      cam.yaw = lerp(fly.from.yaw, lookYaw, k);
      cam.pitch = lerp(fly.from.pitch, lookPitch, k);
      cam.persp = lerp(fly.from.persp, fly.from.persp + 240, smoothstep(u, 0.5, 1));
      roll = Math.sin(u * Math.PI) * 1.4 * fly.dir;
      // quando a porta já enche o ecrã, corta-se para a própria página em 2D nítida (match cut): continua-se a entrar
      // com um leve zoom e a luz sobe, e a página de destino chega com essa mesma luz a dissipar-se
      if (u >= fly.cut) {
        if (!fly.cutDone) { fly.cutDone = true; passage.style.backgroundImage = 'url(' + previewFor(fly.href) + ')'; passage.classList.add('on'); }
        const pu = smoothstep(u, fly.cut, 1);
        passage.style.transform = 'scale(' + (1 + 0.05 * pu).toFixed(4) + ')';
        passage.style.setProperty('--veil', (0.85 * smoothstep(u, 0.82, 1)).toFixed(3));
      }
    } else {
      const a = 1 - Math.pow(1 - 0.24, dt / 16.667);
      scrollTargets();
      cam.x += (target.x - cam.x) * a;
      cam.y += (target.y - cam.y) * a;
      cam.z += (target.z - cam.z) * a;
      cam.yaw += (target.yaw - cam.yaw) * a;
      cam.pitch += (target.pitch - cam.pitch) * a;
      cam.persp += (target.persp - cam.persp) * a;
      roll += (0 - roll) * a;
    }
    writeScene();
    updateCaptions(scrollP, now);
    // a câmara nunca está parada enquanto o dojo está no ecrã; descansa fora dele e em separadores escondidos
    if (!heroOnScreen || document.hidden) { rafId = null; lastTick = 0; return; }
    rafId = requestAnimationFrame(tick);
  }
  function wake() { if (rafId === null && (heroOnScreen || flying)) rafId = requestAnimationFrame(tick); }
  function onScroll() { scrollP = heroProgress(); wake(); }
  let overDoor = false;                                  // com o cursor sobre uma porta, a sala pára de girar
  doors.forEach(d => { d.addEventListener('pointerenter', () => { overDoor = true; speculate(d.getAttribute('href')); }); d.addEventListener('pointerleave', () => { overDoor = false; }); });
  // Ao passar numa porta, o browser pré-carrega (ou pré-renderiza, no Chrome) a página do outro lado: quando a porta abre, a página já lá está.
  const speculated = new Set();
  function speculate(href) {
    if (!href || speculated.has(href)) return; speculated.add(href);
    try {
      if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        const s = document.createElement('script'); s.type = 'speculationrules';
        s.textContent = JSON.stringify({ prerender: [{ urls: [href], eagerness: 'immediate' }] });
        document.head.appendChild(s);
      } else {
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l);
      }
    } catch (e) {}
  }
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
      case 'back': return { X: U.BX0 + cx, Y: U.BY0 + cy, Z: 0, nx: 0, nz: 1 };
      case 'left': return { X: U.BX0, Y: U.BY0 + cy, Z: U.DEPTH - cx, nx: 1, nz: 0 };
      case 'right': return { X: U.BX1, Y: U.BY0 + cy, Z: cx, nx: -1, nz: 0 };
    }
    return { X: U.VPX, Y: U.VPY, Z: 0, nx: 0, nz: 1 };
  }
  let busy = false;
  function flyTo(door, done) {
    if (busy) return; busy = true;
    const C = doorWorld(door);
    const P0 = { x: U.VPX + cam.x, y: U.VPY + cam.y, z: U.F - cam.z };   // a câmara no mundo (Z medido da parede do fundo para a frente)
    const END = 34;                                                        // último fotograma: a ombreira já envolve a câmara
    const P2 = { x: C.X + C.nx * END, y: C.Y - 8, z: C.Z + C.nz * END };
    const side = C.nz === 0;
    // ponto de controlo da curva: nas portas laterais avança-se primeiro e vira-se depois (arco);
    // nas do fundo anda-se em frente e desliza-se para a porta no último terço
    const P1 = side ? { x: P0.x, y: P0.y, z: P2.z } : { x: P0.x, y: P0.y, z: P2.z + (P0.z - P2.z) * 0.35 };
    // olhar a porta põe-na no ponto de fuga; este ângulo extra baixa-a até ao centro do ecrã
    const sr = scene.getBoundingClientRect(), upx = sr.width / 1376;
    const vpOff = (innerHeight / 2 - (sr.top + U.VPY * upx)) / upx;    // unidades entre o ponto de fuga e o centro do ecrã
    const dur = side ? 1900 : 1600;
    flying = true; stage.classList.add('flying');
    fly = { t0: performance.now(), dur, P0, P1, P2, C, vpOff, dir: Math.sign(P2.x - P0.x) || 1, from: { yaw: cam.yaw, pitch: cam.pitch, persp: cam.persp },
            href: door.getAttribute('href'), cut: side ? 0.6 : 0.62, cutDone: false };
    wake();
    setTimeout(() => door.classList.add('open'), dur * 0.28);
    setTimeout(() => { if (done) done(); }, dur);
  }
  // Se ainda estamos à porta, primeiro entra-se (scroll suave até ao fim do hero) e só depois se voa até à porta.
  function heroEndY() { return hero.getBoundingClientRect().top + scrollY + hero.offsetHeight - innerHeight; }
  function approachAndFly(door, href) {
    const go = () => flyTo(door, () => { try { sessionStorage.setItem('asbki-door', href); sessionStorage.setItem('asbki-arrive', 'door'); } catch (e) {} location.href = href; });
    if (scrollP > 0.8) return go();
    window.scrollTo({ top: heroEndY(), behavior: 'smooth' });
    const t0 = performance.now();
    (function waitSettle() {
      onScroll();
      if (scrollP > 0.98 || performance.now() - t0 > 1800) setTimeout(go, 150);
      else requestAnimationFrame(waitSettle);
    })();
  }
  const modified = e => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
  doors.forEach(door => door.addEventListener('click', e => {
    if (!scrubOn || modified(e)) return;
    e.preventDefault();
    approachAndFly(door, door.getAttribute('href'));
  }));
  // O botão da banda final voa pela porta vermelha.
  stage.querySelectorAll('[data-fly]').forEach(a => a.addEventListener('click', e => {
    if (!scrubOn || modified(e)) return;
    const door = doors.find(d => d.getAttribute('href') === a.getAttribute('href'));
    if (!door) return;
    e.preventDefault();
    approachAndFly(door, a.getAttribute('href'));
  }));
  // Entrar: o botão da entrada e as próprias portas de entrada fazem o scroll até lá dentro (as portas abrem no caminho).
  function enter() { window.scrollTo({ top: heroEndY(), behavior: 'smooth' }); }
  if (gate) gate.addEventListener('click', () => { if (scrubOn && scrollP < 0.5) enter(); });
  const cue = stage.querySelector('.dj-cue');
  if (cue) cue.addEventListener('click', () => { if (scrubOn) enter(); });
  // Menu e portas ligados: passar o rato num item do menu acende a porta; clicar no menu voa pela porta.
  let navBound = false;
  function bindNav() {
    if (navBound) return; navBound = true;
    document.querySelectorAll('#site-header a[href]').forEach(a => {
      const door = doors.find(d => d.getAttribute('href') === a.getAttribute('href'));
      if (!door) return;
      a.addEventListener('mouseenter', () => { door.classList.add('hot'); speculate(door.getAttribute('href')); });
      a.addEventListener('mouseleave', () => door.classList.remove('hot'));
      a.addEventListener('click', e => {
        if (!scrubOn || !heroOnScreen || modified(e)) return;
        e.preventDefault();
        approachAndFly(door, a.getAttribute('href'));
      });
      door.addEventListener('pointerenter', () => a.classList.add('dj-hot'));
      door.addEventListener('pointerleave', () => a.classList.remove('dj-hot'));
    });
  }
  // Regressar ao dojo: quem volta de uma página começa lá dentro, com a porta por onde saiu a fechar-se.
  function startInside(href) {
    const door = doors.find(d => d.getAttribute('href') === href);
    window.scrollTo({ top: heroEndY(), behavior: 'auto' });
    scrollP = 1; scrollTargets();
    cam.x = 0; cam.y = 0; cam.z = target.z; cam.persp = target.persp; cam.yaw = 0; cam.pitch = 0; loadK = 1;
    if (door) {
      door.classList.add('snap', 'open');
      flash.classList.add('on');
      requestAnimationFrame(() => { door.classList.remove('snap'); });
      setTimeout(() => flash.classList.remove('on'), 120);
      setTimeout(() => door.classList.remove('open'), 450);
    }
    wake();
  }
  // Se o visitante voltar com o botão de retroceder, a página vem do cache com a porta aberta.
  addEventListener('pageshow', e => { if (e.persisted) { busy = false; flying = false; fly = null; roll = 0; stage.classList.remove('flying'); passage.classList.remove('on'); passage.style.transform = ''; passage.style.setProperty('--veil', '0'); doors.forEach(d => d.classList.remove('open')); flash.classList.remove('on'); scrollTargets(); wake(); } });

  /* ── Arquitectura e legendas das portas ─────────────────────────────────
     Cada porta ganha uma travessa de madeira; o kanji fica marcado no papel (via data-kanji na
     luz, atrás das folhas); o nome em português é uma legenda 2D em ecrã, posicionada por cima
     da porta projectada, visível só quando já se está dentro do dojo. */
  const labelsLayer = document.createElement('div');
  labelsLayer.className = 'dj-labels'; labelsLayer.setAttribute('aria-hidden', 'true');
  stage.appendChild(labelsLayer);
  // Do outro lado de cada porta está a própria página: uma pré-visualização (assets/dojo/preview-*.jpg, gerada por
  // Karate/review/pages-previews.mjs) por trás das folhas, visível quando a porta abre.
  const previewFor = href => '/assets/dojo/preview-' + String(href || '').replace(/^\/+/, '').split(/[\/?#]/)[0] + '.jpg';
  let previewsLoaded = false;
  function loadPreviews() {
    if (previewsLoaded) return; previewsLoaded = true;
    doors.forEach(d => { const url = previewFor(d.getAttribute('href')); const im = new Image(); im.src = url; const pg = d.querySelector('.dj-page'); if (pg) pg.style.backgroundImage = 'url(' + url + ')'; });
  }
  const passage = document.createElement('div');
  passage.className = 'dj-passage'; passage.setAttribute('aria-hidden', 'true');
  stage.appendChild(passage);
  const labels = doors.map(d => {
    const light = d.querySelector('.dj-light');
    if (light) light.dataset.kanji = d.dataset.kanji || '';
    const page = document.createElement('span'); page.className = 'dj-page';
    const leaves = d.querySelector('.dj-leaves');
    if (leaves) d.insertBefore(page, leaves); else d.appendChild(page);
    const lintel = document.createElement('span'); lintel.className = 'dj-lintel'; d.appendChild(lintel);
    const a = document.createElement('a');
    a.className = 'dj-label' + (d.classList.contains('red') ? ' red' : '');
    a.href = d.getAttribute('href'); a.tabIndex = -1;
    const k = document.createElement('i'); k.textContent = d.dataset.kanji || '';
    const n = document.createElement('span'); n.textContent = d.dataset.label || '';
    a.appendChild(k); a.appendChild(n);
    a.addEventListener('mouseenter', () => { d.classList.add('hot'); overDoor = true; speculate(d.getAttribute('href')); });
    a.addEventListener('mouseleave', () => { d.classList.remove('hot'); overDoor = false; });
    d.addEventListener('pointerenter', () => a.classList.add('hot'));
    d.addEventListener('pointerleave', () => a.classList.remove('hot'));
    a.addEventListener('click', e => {
      if (!scrubOn || modified(e)) return;
      e.preventDefault();
      approachAndFly(d, d.getAttribute('href'));
    });
    labelsLayer.appendChild(a);
    return { a, d, x: -1, y: -1 };
  });
  function positionLabels() {
    const sr = stage.getBoundingClientRect();
    for (const L of labels) {
      const r = L.d.getBoundingClientRect();
      if (!r.width) continue;
      const x = Math.round(r.left + r.width / 2 - sr.left), y = Math.round(r.top - sr.top - 14);
      if (Math.abs(x - L.x) > 0.5 || Math.abs(y - L.y) > 0.5) { L.x = x; L.y = y; L.a.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)'; }
    }
  }
  function applyNav(nav) {
    if (!nav) return;
    const all = [...(nav.links || [])];
    if (nav.ctaHref) all.push({ href: nav.ctaHref, label: nav.ctaLabel });
    labels.forEach(L => {
      const link = all.find(l => l.href === L.d.getAttribute('href'));
      if (link) L.a.querySelector('span').textContent = link.label;
    });
  }

  /* ── Pó a flutuar (nível de sussurro; descansa fora de ecrã e em separadores escondidos) ── */
  const dust = stage.querySelector('.dj-dust');
  let dustOn = false, dustRaf = null, motes = [];
  function dustResize() { const dpr = 1; dust.width = Math.floor(dust.clientWidth * dpr); dust.height = Math.floor(dust.clientHeight * dpr); }
  function dustInit() { dustResize(); const r = rng(7); motes = Array.from({ length: 26 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.6, v: 0.00004 + r() * 0.00008, d: r() * 6.28, a: 0.25 + r() * 0.45 })); }
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) dustStop(); else if (scrubOn && heroOnScreen) { dustStart(); wake(); } });
  addEventListener('resize', () => { if (dustOn) dustResize(); }, { passive: true });

  /* ── O gate vivo ────────────────────────────────────────────────────────── */
  let inited = false;
  function initOnce() { if (inited) return; inited = true; loadStart = performance.now(); }
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    initOnce();
    photo.style.opacity = '0';                              // a fotografia fica para o hero estático; aqui a primeira imagem é a sala com a entrada fechada
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pointermove', onMouse, { passive: true });
    bands.forEach(b => { b.op = -1; b.k = -1; });
    lastTransform = ''; gateShown = -1; frameOp = -1; bloomOp = -1;
    onScroll();
    if (heroOnScreen) dustStart();
    let back = null;
    try { back = sessionStorage.getItem('asbki-door'); if (back) sessionStorage.removeItem('asbki-door'); } catch (e) {}
    if (back) startInside(back);
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    removeEventListener('scroll', onScroll);
    removeEventListener('pointermove', onMouse);
    photo.style.opacity = '';
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

  window.__dojo = { get scrubOn() { return scrubOn; }, cam, target, bands, doors, heroProgress, flyTo, applyNav, bindNav, approachAndFly, enter };
})();
