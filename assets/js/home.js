/* ─── ASBKI Covilhã — segundo acto da home + hero móvel ───────────────────
   Chamado uma vez a partir do callback ASBKI.boot(function (c) {...}) em
   index.html, depois de site.js já ter o cabeçalho/rodapé prontos. A sala 3D
   (.dojo) é do agente principal — este ficheiro só escreve dentro de
   .dj-static, e do que vem depois de </section> da secção .dojo. */
window.ASBKIHome = (function () {
  const { esc, svg, ICONS, fmtDate, isPlaceholder } = ASBKI;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const isPh = v => (typeof isPlaceholder === 'function') ? isPlaceholder(v) : /a confirmar|a definir|000 000|lorem/i.test(String(v || ''));
  const real = v => (v && !isPh(v)) ? v : '';

  /* Mesmos quatro gates de dj-static (dojo.js/dojo.css) — replicados aqui
     porque dojo.js não os exporta. Ver nota de risco de fusão no relatório. */
  const MOBILE_GATE = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  ].join(', ');
  const isMobileGate = () => window.matchMedia(MOBILE_GATE).matches;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Camada 1: folha shoji do hero móvel ────────────────────────────── */
  function initMobileHeroShoji() {
    const shoji = $('#mhero-shoji');
    const content = $('#mhero-content');
    if (!shoji || !content) return;
    if (!isMobileGate()) { shoji.hidden = true; content.classList.add('revealed'); return; }

    let opened = false;
    function open() {
      if (opened) return; opened = true;
      shoji.classList.add('open');
      content.classList.add('revealed');
      setTimeout(() => { shoji.hidden = true; }, reducedMotion() ? 0 : 950);
    }
    if (reducedMotion()) { open(); return; }
    const onFirstInteraction = () => open();
    addEventListener('scroll', onFirstInteraction, { passive: true, once: true });
    addEventListener('touchstart', onFirstInteraction, { passive: true, once: true });
    shoji.addEventListener('click', onFirstInteraction, { once: true });
    /* Se ninguém tocar, abre sozinha ao fim de uns segundos para não prender o conteúdo. */
    setTimeout(open, 4500);
  }

  /* ─── Camada 2: corredor de seis portas (mobile) ─────────────────────── */
  const RAIL_DOORS = [
    { href: '/inscricao', kanji: '入門', label: 'Aula grátis', desc: 'A primeira aula é gratuita.', red: true },
    { href: '/karate', kanji: '空手', label: 'Karate', desc: 'Kihon, kata e kumite.' },
    { href: '/dojos', kanji: '道場', label: 'Dojos', desc: 'Covilhã e Tortosendo, com horários.' },
    { href: '/associacao', kanji: '会', label: 'Quem Somos', desc: 'História, instrutores e Dojo Kun.' },
    { href: '/noticias', kanji: '報', label: 'Notícias', desc: 'Resultados, exames e artigos.' },
    { href: '/contacto', kanji: '連絡', label: 'Contactos', desc: 'Fala connosco.' },
  ];
  function renderDoorRail() {
    const rail = $('#mdoor-rail');
    if (!rail) return;
    rail.innerHTML = RAIL_DOORS.map(d => `
      <a class="mdoor${d.red ? ' red' : ''}" href="${esc(d.href)}" data-href="${esc(d.href)}">
        <span class="mdoor-leaves" aria-hidden="true"><span class="mdoor-leaf l"></span><span class="mdoor-leaf r"></span></span>
        <span class="dj-kanji" aria-hidden="true">${esc(d.kanji)}</span>
        <b>${esc(d.label)}</b>
        <span>${esc(d.desc)}</span>
      </a>`).join('');
    rail.addEventListener('click', e => {
      const a = e.target.closest('.mdoor');
      if (!a || a.classList.contains('opening')) return;
      e.preventDefault();
      const href = a.dataset.href;
      if (reducedMotion()) { location.href = href; return; }
      a.classList.add('opening');
      setTimeout(() => {
        if (window.ASBKIShoji && typeof ASBKIShoji.closeTo === 'function') {
          const door = typeof ASBKIShoji.doorFor === 'function' ? ASBKIShoji.doorFor(href) : null;
          ASBKIShoji.closeTo(href, door);
        } else {
          location.href = href;
        }
      }, 300);
    });
  }

  /* ─── Estatística real nos seis cartões das portas (todos os ecrãs) ──── */
  function renderPortaStats(c) {
    const stats = {
      associacao: c.instructors && c.instructors.items ? `${c.instructors.items.length} instrutores` : '',
      karate: c.karate && c.karate.disciplines ? `${c.karate.disciplines.length} disciplinas` : '',
      dojos: c.dojos && c.dojos.items ? `${c.dojos.items.length} dojos ativos` : '',
      noticias: c.news && c.news.items ? `${c.news.items.length} notícias publicadas` : '',
      contacto: real(c.site.phone) ? 'Resposta rápida por telefone' : 'Escreve-nos quando quiseres',
      inscricao: 'Sem compromisso',
    };
    $$('.dj-porta[data-stat]').forEach(a => {
      const key = a.dataset.stat;
      const el = a.querySelector('.dj-porta-stat');
      if (el && stats[key]) el.textContent = stats[key];
    });
  }

  /* ─── Esta semana: treinos por dojo + próximo evento ─────────────────── */
  function renderWeek(c) {
    const grid = $('#home-sessions');
    if (grid) {
      const byDojo = new Map();
      (c.dojos.items || []).forEach(d => byDojo.set(d.name, { dojo: d, sessions: [] }));
      (c.schedule.sessions || []).forEach(s => { if (byDojo.has(s.location)) byDojo.get(s.location).sessions.push(s); });
      grid.innerHTML = [...byDojo.values()].map(({ dojo, sessions }) => `
        <div class="home-dojo-block home-reveal">
          <div class="home-dojo-name">${esc(dojo.short || dojo.name)}</div>
          ${sessions.length ? sessions.map(s => `
            <div class="home-week-row">
              <span class="days">${esc(s.daysShort)}</span>
              <span class="what"><b>${esc(s.label)}</b> · ${esc(s.time)}</span>
            </div>`).join('') : `<p class="home-empty">Horário a anunciar.</p>`}
        </div>`).join('');
    }
    const eventBox = $('#home-event');
    if (eventBox) {
      const today = new Date().toISOString().slice(0, 10);
      const next = (c.events.items || []).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (next) {
        const d = fmtDate(next.date);
        eventBox.innerHTML = `
          <div class="home-event-date">${esc(d.long)}</div>
          <div class="home-event-title">${esc(next.title)}</div>
          ${next.location ? `<div class="home-event-loc">${svg(ICONS.pin, 15)} ${esc(next.location)}</div>` : ''}`;
        eventBox.classList.add('home-reveal');
      } else {
        const sec = eventBox.closest('.home-event-wrap');
        if (sec) sec.hidden = true;
      }
    }
  }

  /* ─── Últimas notícias (reutiliza .card/.card-grid já carregados) ────── */
  function renderNews(c) {
    const grid = $('#home-news-grid');
    if (!grid) return;
    const items = [...(c.news.items || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 2);
    if (!items.length) { const sec = grid.closest('section'); if (sec) sec.hidden = true; return; }
    grid.innerHTML = items.map(n => {
      const cat = (c.news.categories || []).find(k => k.key === n.category);
      const d = fmtDate(n.date);
      return `
      <article class="card home-reveal">
        <a href="/noticias/${esc(n.slug)}" class="card-img" tabindex="-1" aria-hidden="true">
          ${n.image ? `<img src="${esc(n.image)}" alt="${esc(n.title)}" width="800" height="450" loading="lazy">`
                    : `<div class="card-img-placeholder">${svg(ICONS.shield, 36)}<span>ASBKI</span></div>`}
        </a>
        <div class="card-body">
          <div class="card-meta"><span class="tag">${esc(cat ? cat.label : n.category)}</span><span>${esc(d.short)}</span></div>
          <h3 class="card-title"><a href="/noticias/${esc(n.slug)}">${esc(n.title)}</a></h3>
          <p class="card-text">${esc(n.excerpt)}</p>
          <div class="card-foot"><a href="/noticias/${esc(n.slug)}" class="link-arrow">${esc(c.news.readMore || 'Ler artigo')} →</a></div>
        </div>
      </article>`;
    }).join('');
  }

  /* ─── Faixa final: CTA de aula experimental ──────────────────────────── */
  function renderFinal(c) {
    const t = c.trial || {};
    const title = $('#home-final-title'), sub = $('#home-final-sub'), btn = $('#home-final-cta-btn');
    if (title) title.textContent = t.title || 'Marca a tua primeira aula.';
    if (sub) sub.textContent = t.subtext || '';
    if (btn) { btn.textContent = t.ctaLabel || 'Marcar aula experimental'; btn.href = t.ctaHref || '/inscricao'; }
  }

  /* ─── Como chegar (mobile): telefone real + mapa do primeiro dojo ────── */
  function renderChegar(c) {
    const box = $('#home-chegar-actions');
    if (!box) return;
    const phone = real(c.site.phone);
    const dojo = (c.dojos.items || [])[0];
    const parts = [];
    if (phone) parts.push(`<a href="tel:${esc(phone.replace(/\s/g, ''))}" class="btn btn-accent">${svg(ICONS.phone, 16)} Ligar</a>`);
    if (dojo && dojo.mapUrl) parts.push(`<a href="${esc(dojo.mapUrl)}" target="_blank" rel="noopener" class="btn btn-outline-ghost">${svg(ICONS.pin, 16)} Como chegar</a>`);
    box.innerHTML = parts.join('') || `<a href="/contacto" class="btn btn-outline-ghost">Fala connosco</a>`;
  }

  function initReveal() {
    if (!('IntersectionObserver' in window)) { $$('.home-reveal').forEach(el => el.classList.add('visible')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    $$('.home-reveal').forEach(el => io.observe(el));
  }

  function render(c) {
    renderPortaStats(c);
    renderWeek(c);
    renderNews(c);
    renderFinal(c);
    renderChegar(c);
    renderDoorRail();
    initMobileHeroShoji();
    initReveal();
  }

  return { render };
})();
