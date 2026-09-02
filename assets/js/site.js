/* ─── ASBKI Covilhã — layout partilhado + utilitários ─────────────────── */
/* Carregado em todas as páginas. Cada página chama ASBKI.boot(renderFn). */

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

  /* Defesa contra conteúdo antigo (v1) que possa chegar sem migração */
  function normalize(c) {
    if (Array.isArray(c.events)) c.events = { title: 'Eventos', types: [], items: [] };
    c.events.items = c.events.items || [];
    c.news = c.news || { items: [], categories: [] };
    c.news.items = (c.news.items || []).map(n => ({ ...n, slug: n.slug || slugify(n.title) }));
    c.dojos = c.dojos || { items: [] };
    c.nav.links = (c.nav.links || []).map(l => ({ ...l, children: l.children || [] }));
    return c;
  }

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

  function navLinksHTML(links) {
    return links.map(l => {
      const kids = l.children || [];
      const active = isActive(l.href) || kids.some(k => isActive(k.href));
      if (!kids.length)
        return `<li class="nav-item"><a href="${esc(l.href)}"${active ? ' class="active"' : ''}>${esc(l.label)}</a></li>`;
      return `
        <li class="nav-item has-children${active ? ' is-active' : ''}">
          <a href="${esc(l.href)}"${active ? ' class="active"' : ''}>${esc(l.label)}</a>
          <button class="nav-caret" type="button" aria-label="Abrir submenu ${esc(l.label)}" aria-expanded="false">${svg(ICONS.chevron, 14)}</button>
          <ul class="nav-dropdown">
            ${kids.map(k => `<li><a href="${esc(k.href)}"${isActive(k.href) && k.href.split('#')[0] !== l.href ? ' class="active"' : ''}>${esc(k.label)}</a></li>`).join('')}
          </ul>
        </li>`;
    }).join('');
  }

  function renderHeader(c) {
    const el = document.querySelector('#site-header');
    if (!el) return;
    el.innerHTML = `
      <nav class="navbar" id="navbar">
        <div class="container">
          <div class="nav-inner">
            <a href="/" class="nav-brand" aria-label="${esc(c.site.name)} — início">${brandHTML(c.site, 'nav')}</a>
            <ul class="nav-links" id="nav-links">${navLinksHTML(c.nav.links)}</ul>
            <a href="${esc(c.nav.ctaHref)}" class="btn btn-accent nav-cta" id="nav-cta">${esc(c.nav.ctaLabel)}</a>
            <button class="nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false">
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
                ${nav.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}
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
    if (bt) bt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function initMobileNav() {
    const toggle = document.querySelector('#nav-toggle');
    const links  = document.querySelector('#nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      links.classList.toggle('mobile-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
    /* Submenus: o caret abre/fecha (mobile e teclado) */
    links.addEventListener('click', e => {
      const caret = e.target.closest('.nav-caret');
      if (caret) {
        e.preventDefault();
        const li = caret.closest('.nav-item');
        const open = li.classList.toggle('open');
        caret.setAttribute('aria-expanded', String(open));
        links.querySelectorAll('.nav-item.open').forEach(o => { if (o !== li) o.classList.remove('open'); });
        return;
      }
      if (e.target.closest('a')) {
        toggle.classList.remove('open');
        links.classList.remove('mobile-open');
        document.body.classList.remove('nav-open');
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-item.has-children'))
        links.querySelectorAll('.nav-item.open').forEach(o => o.classList.remove('open'));
    });
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
    initObserver();
    initCounters();
    /* Âncora na URL (ex.: /inscricao#horarios) depois do render */
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  /* ─── Cartões de modalidade (home + /modalidades) ───────────────────── */
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
    loadContent, setMeta, boot, isActive,
  };
})();
