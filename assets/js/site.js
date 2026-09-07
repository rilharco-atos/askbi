/* ─── ASBKI Covilhã — layout partilhado + utilitários ─────────────────── */
/* Carregado em todas as páginas. Cada página chama ASBKI.boot(renderFn). */

/* ─── Shoji: a linguagem do dojo nas páginas interiores ─────────────────
   Ao chegar, duas folhas de shoji abrem-se sobre a página com o kanji da porta;
   ao sair para outra página, fecham-se antes de navegar. Ao voltar ao início, o
   dojo começa por dentro com essa porta a fechar-se (sessionStorage asbki-door).
   O cabeçalho de cada página ganha o kanji em grande (tokonoma) e um raio de luz. */
window.ASBKIShoji = (function () {
  const DOORS = [
    { test: /^\/associacao/, href: '/associacao', kanji: '会', label: 'Quem Somos' },
    { test: /^\/karate/,     href: '/karate',     kanji: '空手', label: 'Karate' },
    { test: /^\/dojos/,      href: '/dojos',      kanji: '道場', label: 'Dojos' },
    { test: /^\/noticias/,   href: '/noticias',   kanji: '報',  label: 'Notícias' },
    { test: /^\/contacto/,   href: '/contacto',   kanji: '連絡', label: 'Contactos' },
    { test: /^\/inscricao/,  href: '/inscricao',  kanji: '入門', label: 'Aula grátis' }
  ];
  const DOJO = { href: '/', kanji: '道', label: 'Dojo' };
  const doorFor = path => DOORS.find(d => d.test.test(path)) || DOJO;
  const here = location.pathname.replace(/\/+$/, '') || '/';
  const isHome = document.body.dataset.page === 'home' || here === '/';
  const current = doorFor(here);
  let overlay = null, opened = false, t0 = performance.now();

  // A folha de estilos completa vem do ficheiro; o essencial para pintar as folhas
  // fechadas antes de esse ficheiro chegar segue inline.
  if (!isHome) {
    const st = document.createElement('style');
    st.textContent = '.shoji{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;overflow:hidden}.shoji-leaf{position:absolute;top:0;bottom:0;width:50.6%;background:#eee3cf}.shoji-leaf.l{left:0}.shoji-leaf.r{right:0}';
    document.head.appendChild(st);
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/css/shoji.css';
    document.head.appendChild(link);
  }

  function build(door, state) {
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'shoji ' + state;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="shoji-leaf l"></div><div class="shoji-leaf r"></div><div class="shoji-kanji">' + door.kanji + '<small>' + door.label + '</small></div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  function open() {
    if (opened || !overlay) return; opened = true;
    // deixa as folhas visíveis um instante, para se verem, e depois abre
    const wait = Math.max(0, 420 - (performance.now() - t0));
    setTimeout(() => {
      overlay.classList.remove('closed'); overlay.classList.add('open');
      setTimeout(() => { if (overlay) { overlay.remove(); overlay = null; } }, 1100);
    }, wait);
  }
  let leaving = false;
  function closeTo(href, door) {
    if (leaving) return; leaving = true;
    const o = build(door, 'open');
    void o.offsetWidth;                       // força o estado inicial (folhas abertas) antes de fechar
    o.classList.remove('open'); o.classList.add('closing');
    setTimeout(() => { location.href = href; }, 760);
  }
  function internal(a) {
    if (!a || a.hasAttribute('download') || a.target && a.target !== '_self' || a.dataset.noShoji !== undefined) return null;
    let u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return null;
    const path = u.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/admin') || path.startsWith('/api')) return null;
    if (path === here) return null;           // âncoras e recargas da mesma página não fecham nada
    return { href: u.pathname + u.search + u.hash, path };
  }
  if (!isHome) {
    build(current, 'closed');
    setTimeout(open, 2600);                   // se o conteúdo demorar, as folhas abrem na mesma
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      const dest = internal(a);
      if (!dest) return;
      e.preventDefault();
      if (dest.path === '/') { try { sessionStorage.setItem('asbki-door', current.href); } catch (err) {} }
      closeTo(dest.href, dest.path === '/' ? current : doorFor(dest.path));
    }, true);
    addEventListener('pageshow', e => { if (e.persisted) { leaving = false; if (overlay) { overlay.remove(); overlay = null; } } });
  }
  function decorateHero() {
    const hero = document.querySelector('.page-hero');
    if (!hero || hero.classList.contains('ph-tokonoma') || isHome) return;
    hero.classList.add('ph-tokonoma');
    const k = document.createElement('span'); k.className = 'ph-kanji'; k.setAttribute('aria-hidden', 'true'); k.textContent = current.kanji;
    const s = document.createElement('span'); s.className = 'ph-shaft'; s.setAttribute('aria-hidden', 'true');
    hero.appendChild(s); hero.appendChild(k);
  }
  return { open, decorateHero, closeTo, doorFor };
})();

/* ─── Efeitos das páginas interiores ────────────────────────────────────
   História: o cinto desenha-se ao longo da linha do tempo com o scroll.
   Filtros (notícias, horários): um indicador vermelho desliza para a opção activa.
   Inscrição: um carimbo "Oss" cai quando a marcação fica confirmada. */
window.ASBKIFx = (function () {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const BELTS = ['#f3ece2', '#e6c04a', '#e07b2a', '#3f8f5a', '#2f6db5', '#6b4a2b', '#0d0b0a'];

  function beltTimeline() {
    const tl = document.getElementById('timeline');
    if (!tl || tl.querySelector('.tl-belt')) return;
    const items = [...tl.querySelectorAll('.tl-item')];
    if (!items.length) return;
    const belt = document.createElement('div'); belt.className = 'tl-belt'; belt.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div'); fill.className = 'tl-belt-fill';
    belt.appendChild(fill); tl.appendChild(belt);
    let last = -1;
    function update() {
      const r = tl.getBoundingClientRect(), line = innerHeight * 0.68;
      const p = clamp((line - r.top) / r.height, 0, 1);
      if (Math.abs(p - last) < 0.004 && p !== 0 && p !== 1) return;
      last = p;
      fill.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      items.forEach(it => {
        const ir = it.getBoundingClientRect();
        const passed = ir.top + 14 < line;
        if (passed !== it.classList.contains('tl-passed')) {
          const idx = Math.min(BELTS.length - 1, Math.floor(((ir.top + 14 - r.top) / r.height) * BELTS.length));
          it.style.setProperty('--belt', BELTS[idx]);
          it.classList.toggle('tl-passed', passed);
        }
      });
    }
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  function filterInk() {
    document.querySelectorAll('.session-filters, #news-filters, .filter-pills').forEach(box => {
      if (!box.querySelector('.filter-pill') || box.querySelector('.pill-ink')) return;
      box.classList.add('has-ink');
      const ink = document.createElement('span'); ink.className = 'pill-ink'; ink.setAttribute('aria-hidden', 'true');
      box.appendChild(ink);
      let first = true;
      const move = () => {
        const a = box.querySelector('.filter-pill.active');
        if (!a) return;
        const br = box.getBoundingClientRect(), ar = a.getBoundingClientRect();
        if (first) { ink.style.transition = 'none'; }
        ink.style.transform = 'translate(' + (ar.left - br.left) + 'px,' + (ar.top - br.top) + 'px)';
        ink.style.width = ar.width + 'px'; ink.style.height = ar.height + 'px';
        if (first) { first = false; requestAnimationFrame(() => { ink.style.transition = ''; }); }
      };
      box.addEventListener('click', () => requestAnimationFrame(move));
      addEventListener('resize', move);
      move();
    });
  }

  function hanko() {
    const p3 = document.getElementById('wizard-panel-3');
    if (!p3) return;
    const stamp = () => {
      if (!p3.classList.contains('active') || p3.querySelector('.hanko')) return;
      const h = document.createElement('div'); h.className = 'hanko'; h.setAttribute('aria-hidden', 'true');
      h.textContent = '押忍';
      p3.appendChild(h);
    };
    new MutationObserver(stamp).observe(p3, { attributes: true, attributeFilter: ['class'] });
    stamp();
  }

  function init() { beltTimeline(); filterInk(); hanko(); }
  return { init, beltTimeline, filterInk, hanko };
})();

window.ASBKI = (function () {

  const ICONS = {
    shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    lock:     'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
    dumbbell: 'M6 4v16M18 4v16M4 8h4m8 0h4M4 16h4m8 0h4M8 4h8',
    target:   'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    instagram:'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z',
    youtube:  'M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z',
    tiktok:   'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.68a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z',
    phone:    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
    mail:     'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
    pin:      'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    play:     'M5 3l14 9-14 9V3z',
    clock:    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
    calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    arrow:    'M5 12h14M13 6l6 6-6 6',
    external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
    chevron:  'M6 9l6 6 6-6',
  };

  const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const MONTHS_LONG  = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  /* ─── Helpers ───────────────────────────────────────────────────────── */
  function svg(d, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return isNaN(d) ? null : d;
  }

  function fmtDate(iso) {
    const d = parseDate(iso);
    if (!d) return { day: '', mon: '', long: iso || '', short: iso || '', iso: iso || '' };
    const day = String(d.getDate()).padStart(2, '0');
    return {
      day,
      mon:   MONTHS_SHORT[d.getMonth()],
      year:  d.getFullYear(),
      short: `${day} ${MONTHS_SHORT[d.getMonth()]}`,
      long:  `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`,
      iso:   d.toISOString().slice(0, 10),
    };
  }

  /* Texto com parágrafos (linha em branco), "## " títulos, "- " listas, **negrito** */
  function richText(text) {
    if (!text) return '';
    const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
    return blocks.map(b => {
      const t = b.trim();
      if (!t) return '';
      const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (t.startsWith('## ')) return `<h2>${inline(t.slice(3))}</h2>`;
      if (t.startsWith('### ')) return `<h3>${inline(t.slice(4))}</h3>`;
      const lines = t.split('\n');
      if (lines.every(l => /^[-•] /.test(l.trim())))
        return `<ul>${lines.map(l => `<li>${inline(l.trim().slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    }).join('');
  }

  function sessionCardHTML(s) {
    return `
    <div class="session-card" data-session-id="${esc(s.id)}" data-group="${esc(s.group)}">
      <div class="session-days">${esc(s.daysShort)}</div>
      <div class="session-time">${esc(s.time)}</div>
      <div class="session-label">${esc(s.label)} · ${esc(s.location)}</div>
      <div class="session-slots ${esc(s.status)}">${esc(s.slotsText)}</div>
    </div>`;
  }

  function renderFilterPills(filtersSelector, filters, gridSelector, opts = {}) {
    const container = document.querySelector(filtersSelector);
    if (!container || !filters) return;
    const withAll = opts.allLabel ? [{ key: '__all', label: opts.allLabel }, ...filters] : filters;
    const initial = opts.initial && withAll.some(f => f.key === opts.initial) ? opts.initial : withAll[0].key;

    container.innerHTML = withAll.map(f => `
      <button class="filter-pill${f.key === initial ? ' active' : ''}" data-filter="${esc(f.key)}"
        aria-pressed="${f.key === initial}">${esc(f.label)}</button>`).join('');

    container.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      container.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.remove('active'); p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active'); pill.setAttribute('aria-pressed', 'true');
      filterCards(pill.dataset.filter, gridSelector, opts);
    });
    filterCards(initial, gridSelector, opts);
  }

  function filterCards(key, gridSelector, opts = {}) {
    const grid = document.querySelector(gridSelector);
    if (!grid) return;
    const sel = opts.cardSelector || '.session-card';
    let visible = 0;
    grid.querySelectorAll(sel).forEach(card => {
      const show = key === '__all' || card.dataset.group === key;
      card.hidden = !show;
      if (show) visible++;
    });
    const existing = grid.querySelector('.session-empty');
    if (existing) existing.remove();
    if (visible === 0) {
      const el = document.createElement('p');
      el.className = 'session-empty';
      el.textContent = opts.emptyText || 'Não há turmas disponíveis nesta faixa etária.';
      grid.appendChild(el);
    }
  }

  /* ─── Conteúdo ──────────────────────────────────────────────────────── */
  async function loadContent() {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error(res.status);
      return normalize(await res.json());
    } catch (err) {
      console.error('Não foi possível carregar o conteúdo', err);
      return null;
    }
  }

  /* Defesa contra conteúdo antigo que possa chegar sem migração */
  function normalize(c) {
    if (Array.isArray(c.events)) c.events = { title: 'Eventos', types: [], items: [] };
    c.events.items = c.events.items || [];
    c.news = c.news || { items: [], categories: [] };
    c.news.items = (c.news.items || []).map(n => ({ ...n, slug: n.slug || slugify(n.title) }));
    c.dojos = c.dojos || { items: [] };
    c.dojos.items = (c.dojos.items || []).map(d => ({ ...d, slug: d.slug || d.id || slugify(d.name) }));
    c.karate = c.karate || { disciplines: [] };
    c.karate.disciplines = (c.karate.disciplines || []).map(d => ({ ...d, slug: d.slug || slugify(d.name), points: d.points || [] }));
    c.nav.links = (c.nav.links || []).map(l => ({ ...l, children: l.children || [] }));
    return c;
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = () => (reducedMotion() ? 'auto' : 'smooth');

  /* ─── Layout: header + footer ───────────────────────────────────────── */
  function isActive(href) {
    const p = location.pathname.replace(/\/+$/, '') || '/';
    const h = (href || '').split('#')[0].replace(/\/+$/, '') || '/';
    if (h === '/') return p === '/';
    return p === h || p.startsWith(h + '/');
  }

  function brandHTML(site, idPrefix) {
    const logo = site.logo
      ? `<img src="${esc(site.logo)}" alt="${esc(site.name)}" style="width:100%;height:100%;object-fit:contain;border-radius:50%">`
      : '★';
    return `
      <div class="nav-star" ${site.logo ? 'style="background:transparent;padding:2px"' : ''}>${logo}</div>
      <div>
        <span class="nav-brand-name" id="${idPrefix}-brand-name">${esc(site.name)}</span>
        <span class="nav-brand-sub" id="${idPrefix}-brand-sub">${esc(site.tagline)}</span>
      </div>`;
  }

  /* A página actual: aria-current="page" só no link exacto; o pai de uma
     subpágina fica com a classe .active (sublinhado) sem aria-current. */
  function isCurrent(href) {
    const p = location.pathname.replace(/\/+$/, '') || '/';
    const h = (href || '').split('#')[0].replace(/\/+$/, '') || '/';
    return p === h;
  }
  function linkAttrs(href, active) {
    return `${active ? ' class="active"' : ''}${isCurrent(href) ? ' aria-current="page"' : ''}`;
  }

  function navLinksHTML(links) {
    return links.map((l, i) => {
      const kids = l.children || [];
      const active = isActive(l.href) || kids.some(k => isActive(k.href));
      if (!kids.length)
        return `<li class="nav-item"><a href="${esc(l.href)}"${linkAttrs(l.href, active)}>${esc(l.label)}</a></li>`;
      const id = `nav-sub-${i}`;
      return `
        <li class="nav-item has-children${active ? ' is-active' : ''}">
          <a href="${esc(l.href)}"${linkAttrs(l.href, active)}>${esc(l.label)}</a>
          <button class="nav-caret" type="button" aria-label="Submenu ${esc(l.label)}"
                  aria-haspopup="true" aria-expanded="false" aria-controls="${id}">${svg(ICONS.chevron, 14)}</button>
          <ul class="nav-dropdown" id="${id}" aria-label="${esc(l.label)}">
            ${kids.map(k => `<li><a href="${esc(k.href)}"${linkAttrs(k.href, isActive(k.href) && k.href.split('#')[0] !== l.href)}>${esc(k.label)}</a></li>`).join('')}
          </ul>
        </li>`;
    }).join('');
  }

  function renderHeader(c) {
    const el = document.querySelector('#site-header');
    if (!el) return;
    el.innerHTML = `
      <nav class="navbar" id="navbar" aria-label="Principal">
        <div class="container">
          <div class="nav-inner">
            <a href="/" class="nav-brand">${brandHTML(c.site, 'nav')}</a>
            <ul class="nav-links" id="nav-links">
              ${navLinksHTML(c.nav.links)}
              <li class="nav-item nav-cta-mobile"><a href="${esc(c.nav.ctaHref)}" class="btn btn-accent"${isCurrent(c.nav.ctaHref) ? ' aria-current="page"' : ''}>${esc(c.nav.ctaLabel)}</a></li>
            </ul>
            <a href="${esc(c.nav.ctaHref)}" class="btn btn-accent nav-cta" id="nav-cta"${isCurrent(c.nav.ctaHref) ? ' aria-current="page"' : ''}>${esc(c.nav.ctaLabel)}</a>
            <button class="nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="nav-links">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>`;
  }

  function renderFooter(c) {
    const el = document.querySelector('#site-footer');
    if (!el) return;
    const { site, footer, nav, schedule } = c;
    const socials = ['facebook', 'instagram', 'youtube', 'tiktok'].filter(k => site[k]);
    el.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="footer-brand-logo">${brandHTML(site, 'footer')}</div>
              <p class="footer-desc">${esc(footer.description)}</p>
              <div class="footer-social">
                ${socials.map(k => `<a href="${esc(site[k])}" class="social-link" target="_blank" rel="noopener" aria-label="${k}">${svg(ICONS[k], 18)}</a>`).join('')}
              </div>
            </div>
            <div>
              <div class="footer-col-title">${esc(footer.quickLinksTitle)}</div>
              <ul class="footer-links">
                ${nav.links.filter(l => l.href !== '/').map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}
                <li><a href="${esc(nav.ctaHref)}">${esc(nav.ctaLabel)}</a></li>
              </ul>
            </div>
            <div>
              <div class="footer-col-title">${esc(footer.scheduleTitle)}</div>
              <div class="footer-schedule">
                ${(schedule.days || []).map(d => `
                  <div class="schedule-row${d.hours === 'Fechado' ? ' closed' : ''}">
                    <span class="schedule-day">${esc(d.day)}</span>
                    <span class="schedule-hours">${esc(d.hours)}</span>
                  </div>`).join('')}
              </div>
            </div>
            <div>
              <div class="footer-col-title">${esc(footer.contactTitle)}</div>
              <div class="footer-contact">
                ${site.address ? `<div class="footer-contact-item">${svg(ICONS.pin, 16)}<span>${esc(site.address)}</span></div>` : ''}
                ${site.phone   ? `<div class="footer-contact-item">${svg(ICONS.phone, 16)}<a href="tel:${esc(site.phone.replace(/\s/g, ''))}">${esc(site.phone)}</a></div>` : ''}
                ${site.email   ? `<div class="footer-contact-item">${svg(ICONS.mail, 16)}<a href="mailto:${esc(site.email)}">${esc(site.email)}</a></div>` : ''}
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <span class="footer-copy">${esc(footer.copyright)}</span>
            <a href="/admin" class="footer-admin-link">Área Reservada</a>
          </div>
        </div>
      </footer>
      <button class="back-top" id="back-top" aria-label="Voltar ao topo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>`;
  }

  /* ─── Comportamento da navbar ───────────────────────────────────────── */
  function initNavbar() {
    const nav = document.querySelector('#navbar');
    const bt  = document.querySelector('#back-top');
    if (!nav) return;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);
      if (bt) bt.classList.toggle('visible', y > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (bt) bt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior() }));
  }

  function initMobileNav() {
    const toggle = document.querySelector('#nav-toggle');
    const links  = document.querySelector('#nav-links');
    if (!toggle || !links) return;

    const setSub = (li, open) => {
      li.classList.toggle('open', open);
      const caret = li.querySelector('.nav-caret');
      if (caret) caret.setAttribute('aria-expanded', String(open));
    };
    const closeAllSubs = except => links.querySelectorAll('.nav-item.has-children').forEach(li => { if (li !== except) setSub(li, false); });
    const setMenu = open => {
      toggle.classList.toggle('open', open);
      links.classList.toggle('mobile-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('nav-open', open);
      if (!open) closeAllSubs();
    };

    toggle.addEventListener('click', () => setMenu(!toggle.classList.contains('open')));

    /* Submenus: o caret abre/fecha (toque e teclado) */
    links.addEventListener('click', e => {
      const caret = e.target.closest('.nav-caret');
      if (caret) {
        e.preventDefault();
        const li = caret.closest('.nav-item');
        const open = !li.classList.contains('open');
        closeAllSubs(li);
        setSub(li, open);
        if (open) { const first = li.querySelector('.nav-dropdown a'); if (first && !isTouchLayout()) first.focus(); }
        return;
      }
      if (e.target.closest('a')) setMenu(false);
    });

    /* Teclado: ao entrar por Tab o submenu abre (CSS :focus-within) — reflectir em aria-expanded.
       O caret fica de fora: o seu click é que decide. */
    links.addEventListener('focusin', e => {
      if (e.target.closest('.nav-caret')) return;
      const li = e.target.closest('.nav-item.has-children');
      if (li && !isTouchLayout()) setSub(li, true);
    });
    links.addEventListener('focusout', e => {
      const li = e.target.closest('.nav-item.has-children');
      if (li && !isTouchLayout() && !li.contains(e.relatedTarget)) setSub(li, false);
    });
    /* Rato (desktop): hover abre via CSS; aqui só se mantém o aria-expanded coerente */
    links.querySelectorAll('.nav-item.has-children').forEach(li => {
      li.addEventListener('mouseenter', () => { if (!isTouchLayout()) setSub(li, true); });
      li.addEventListener('mouseleave', () => { if (!isTouchLayout() && !li.contains(document.activeElement)) setSub(li, false); });
    });

    /* Escape fecha o submenu aberto (e devolve o foco ao caret) ou o menu mobile */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const openLi = links.querySelector('.nav-item.open');
      if (openLi) {
        setSub(openLi, false);
        const caret = openLi.querySelector('.nav-caret');
        if (caret && openLi.contains(document.activeElement)) caret.focus();
        return;
      }
      if (toggle.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-item.has-children')) closeAllSubs();
    });
  }

  /* O menu está em modo hamburger (accordion) quando o toggle é visível */
  function isTouchLayout() {
    const t = document.querySelector('#nav-toggle');
    return !!t && getComputedStyle(t).display !== 'none';
  }

  /* ─── Animações ─────────────────────────────────────────────────────── */
  function initObserver() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
  }

  function initCounters() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.target, 10) || 0;
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 60));
        const tick = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current + suffix;
          if (current >= target) clearInterval(tick);
        }, 25);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-target]').forEach(el => io.observe(el));
  }

  /* ─── Meta ──────────────────────────────────────────────────────────── */
  function setMeta(title, description) {
    if (title) document.title = title;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = description;
    }
  }

  /* Formulário de contacto (simulado — sem backend de e-mail) */
  window.handleContactForm = function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'A enviar…';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = '✓ Mensagem enviada!';
      btn.style.background = '#22c55e';
      e.target.reset();
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    }, 1200);
  };

  /* ─── Boot ──────────────────────────────────────────────────────────── */
  async function boot(renderPage) {
    const c = await loadContent();
    if (!c) {
      const main = document.querySelector('main');
      if (main) main.innerHTML = '<div class="container" style="padding:160px 0"><p>Não foi possível carregar o conteúdo. Tenta recarregar a página.</p></div>';
      if (window.ASBKIShoji) ASBKIShoji.open();
      return;
    }
    renderHeader(c);
    renderFooter(c);
    initNavbar();
    initMobileNav();
    try {
      if (typeof renderPage === 'function') await renderPage(c);
    } catch (err) {
      console.error('Erro ao renderizar a página', err);
    }
    if (window.ASBKIShoji) { ASBKIShoji.decorateHero(); ASBKIShoji.open(); }
    if (window.ASBKIFx) ASBKIFx.init();
    initObserver();
    initCounters();
    /* Âncora na URL (ex.: /inscricao#horarios) depois do render */
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }), 60);
    }
  }

  /* ─── Cartões de turma (home + /karate) ─────────────────────────────── */
  const CLASS_ICONS = ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M17 12h-5v5h5v-5zM17 7h-5v4h5V7z', 'M6 4v16M18 4v16M4 8h4m8 0h4M4 16h4m8 0h4M8 4h8', 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z', ICONS.shield];
  function classCards(items) {
    return (items || []).map((cl, i) => `
    <div class="class-card">
      <div class="class-img" data-class="${i % 5}">
        ${cl.image
          ? `<img src="${esc(cl.image)}" alt="${esc(cl.name)}" loading="lazy">`
          : `<div class="class-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${CLASS_ICONS[i % 5]}"/></svg></div>`}
        <div class="class-icon-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#140908" stroke-width="2"><path d="${CLASS_ICONS[i % 5]}"/></svg>
        </div>
      </div>
      <div class="class-info">
        <div class="class-name">${esc(cl.name)}</div>
        <div class="class-desc">${esc(cl.description)}</div>
      </div>
    </div>`).join('');
  }

  return {
    ICONS, svg, esc, slugify, fmtDate, parseDate, richText,
    sessionCardHTML, renderFilterPills, filterCards, classCards,
    loadContent, setMeta, boot, isActive, isCurrent, scrollBehavior,
  };
})();
