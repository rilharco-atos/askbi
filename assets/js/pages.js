/* ─── ASBKI Covilhã — subpáginas ──────────────────────────────────────── */
/* A página é identificada por <body data-page="…">. */
(function () {
  const { esc, svg, ICONS, fmtDate, parseDate, richText, slugify,
          sessionCardHTML, renderFilterPills, setMeta } = ASBKI;

  const $ = sel => document.querySelector(sel);
  const setText = (sel, v) => { const el = $(sel); if (el) el.textContent = v ?? ''; };
  const setHTML = (sel, v) => { const el = $(sel); if (el) el.innerHTML = v ?? ''; };

  function pageHero(sub, title, intro) {
    setText('#ph-sub', sub);
    setText('#ph-title', title);
    setText('#ph-intro', intro);
  }

  function ctaBar(c) {
    return `
      <div class="inscricao-cta-row">
        <a href="${esc(c.nav.ctaHref)}" class="btn btn-accent">${esc(c.nav.ctaLabel)}</a>
        <span class="hint">A primeira aula é gratuita e não precisas de equipamento.</span>
      </div>`;
  }

  function imgOrPlaceholder(src, alt, icon = ICONS.shield, label = 'ASBKI') {
    return src
      ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`
      : `<div class="card-img-placeholder">${svg(icon, 36)}<span>${esc(label)}</span></div>`;
  }

  function newsCard(n, c) {
    const cat = (c.news.categories || []).find(k => k.key === n.category);
    return `
      <article class="card" data-group="${esc(n.category)}">
        <a href="/noticias/${esc(n.slug)}" class="card-img" aria-label="${esc(n.title)}">${imgOrPlaceholder(n.image, n.title)}</a>
        <div class="card-body">
          <div class="card-meta"><span class="tag">${esc(cat ? cat.label : n.category)}</span><span>${esc(fmtDate(n.date).short)}</span></div>
          <h3 class="card-title"><a href="/noticias/${esc(n.slug)}">${esc(n.title)}</a></h3>
          <p class="card-text">${esc(n.excerpt)}</p>
          <div class="card-foot"><a href="/noticias/${esc(n.slug)}" class="link-arrow">${esc(c.news.readMore || 'Ler artigo')} →</a></div>
        </div>
      </article>`;
  }

  const sortedNews = c => [...c.news.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  /* ─── Dojos ─────────────────────────────────────────────────────────── */
  function dojos(c) {
    const d = c.dojos;
    pageHero(d.subtitle, d.title, d.intro);
    setMeta(`${d.title} — ${c.site.name}`, d.intro);
    setHTML('#dojos-grid', d.items.map(dj => {
      const sessions = c.schedule.sessions.filter(s => s.location === dj.name);
      return `
        <article class="card dojo-card fade-in">
          <div class="card-img">${imgOrPlaceholder(dj.image, dj.name, ICONS.pin, dj.name)}</div>
          <div class="card-body">
            <h3 class="card-title">${esc(dj.name)}</h3>
            ${dj.notes ? `<p class="card-text" style="flex:0">${esc(dj.notes)}</p>` : ''}
            <div class="dojo-details">
              ${dj.address ? `<div class="dojo-detail">${svg(ICONS.pin, 16)}<span>${esc(dj.address)}</span></div>` : ''}
              ${dj.phone   ? `<div class="dojo-detail">${svg(ICONS.phone, 16)}<a href="tel:${esc(dj.phone.replace(/\s/g, ''))}">${esc(dj.phone)}</a></div>` : ''}
              ${dj.email   ? `<div class="dojo-detail">${svg(ICONS.mail, 16)}<a href="mailto:${esc(dj.email)}">${esc(dj.email)}</a></div>` : ''}
            </div>
            ${sessions.length ? `
              <div class="dojo-sessions">
                <div class="dojo-sessions-title">Treinos neste dojo</div>
                ${sessions.map(s => `
                  <div class="dojo-session">
                    <span class="days">${esc(s.daysShort)}</span>
                    <span class="what">${esc(s.label)}<small>${esc(s.time)}</small></span>
                  </div>`).join('')}
              </div>` : ''}
            <div class="card-foot">
              ${dj.mapUrl ? `<a href="${esc(dj.mapUrl)}" target="_blank" rel="noopener" class="link-arrow">Ver no mapa ${svg(ICONS.external, 14)}</a>` : '<span></span>'}
              <a href="/inscricao" class="link-arrow">Marcar aula →</a>
            </div>
          </div>
        </article>`;
    }).join(''));
    setHTML('#dojos-cta', ctaBar(c));
  }

  /* ─── Notícias (lista) ──────────────────────────────────────────────── */
  function noticias(c) {
    const n = c.news;
    pageHero(n.subtitle, n.title, n.intro);
    setMeta(`${n.title} — ${c.site.name}`, n.intro);
    const items = sortedNews(c);
    if (!items.length) { setHTML('#news-grid', '<p class="empty">Ainda não há notícias publicadas.</p>'); return; }
    const [first, ...rest] = items;
    const cat = k => (n.categories.find(x => x.key === k) || {}).label || k;
    setHTML('#news-featured', `
      <article class="card news-featured fade-in" data-group="${esc(first.category)}">
        <a href="/noticias/${esc(first.slug)}" class="card-img">${imgOrPlaceholder(first.image, first.title)}</a>
        <div class="card-body">
          <div class="card-meta"><span class="tag">${esc(cat(first.category))}</span><span>${esc(fmtDate(first.date).long)}</span></div>
          <h2 class="card-title"><a href="/noticias/${esc(first.slug)}">${esc(first.title)}</a></h2>
          <p class="card-text">${esc(first.excerpt)}</p>
          <div class="card-foot"><a href="/noticias/${esc(first.slug)}" class="btn btn-accent" style="min-height:48px;padding:12px 22px">${esc(n.readMore || 'Ler artigo')}</a></div>
        </div>
      </article>`);
    setHTML('#news-grid', rest.map(x => newsCard(x, c)).join(''));
    /* Filtro por categoria (só mostra categorias com artigos) */
    const used = n.categories.filter(k => items.some(i => i.category === k.key));
    renderFilterPills('#news-filters', used, '#news-wrap', {
      allLabel: n.allLabel || 'Todos', cardSelector: '.card[data-group]',
      emptyText: 'Sem artigos nesta categoria.',
    });
  }

  /* ─── Notícia (detalhe) ─────────────────────────────────────────────── */
  function noticia(c) {
    const n = c.news;
    const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
    const item = n.items.find(i => (i.slug || slugify(i.title)) === slug);
    if (!item) {
      setMeta(`Artigo não encontrado — ${c.site.name}`);
      setHTML('#article', `
        <div class="article-head">
          <span class="section-label">404</span>
          <h1 class="article-title">Não encontrámos este artigo.</h1>
          <p class="page-intro">Pode ter sido removido ou o endereço estar errado.</p>
        </div>
        <a href="/noticias" class="btn btn-accent">${esc(n.backLabel || 'Voltar às notícias')}</a>`);
      return;
    }
    const cat = (n.categories.find(x => x.key === item.category) || {}).label || item.category;
    const d = fmtDate(item.date);
    setMeta(`${item.title} — ${c.site.name}`, item.excerpt);
    setHTML('#article', `
      <div class="article-head">
        <nav class="breadcrumb"><a href="/">Início</a><span>/</span><a href="/noticias">Notícias</a><span>/</span><span class="tag">${esc(cat)}</span></nav>
        <h1 class="article-title">${esc(item.title)}</h1>
        <div class="article-meta">
          <span>${svg(ICONS.calendar, 15)}<time datetime="${esc(d.iso)}">${esc(d.long)}</time></span>
          ${item.author ? `<span>${svg(ICONS.user, 15)}${esc(item.author)}</span>` : ''}
        </div>
      </div>
      ${item.image ? `<div class="article-cover"><img src="${esc(item.image)}" alt="${esc(item.title)}"></div>` : ''}
      <div class="article-body">${richText(item.body)}</div>
      <div class="article-foot">
        <a href="/noticias" class="link-arrow">← ${esc(n.backLabel || 'Voltar às notícias')}</a>
        <a href="${esc(c.nav.ctaHref)}" class="btn btn-accent" style="min-height:48px;padding:12px 22px">${esc(c.nav.ctaLabel)}</a>
      </div>`);
    /* Relacionados: mesma categoria primeiro, depois os mais recentes */
    const others = sortedNews(c).filter(i => i.slug !== item.slug);
    const related = [...others.filter(i => i.category === item.category), ...others.filter(i => i.category !== item.category)].slice(0, 3);
    if (related.length) {
      setHTML('#related-grid', related.map(x => newsCard(x, c)).join(''));
    } else {
      const sec = $('#related'); if (sec) sec.hidden = true;
    }
  }

  /* ─── Eventos / Competições / Formações ─────────────────────────────── */
  function eventos(c) {
    const ev = c.events;
    const path = location.pathname.replace(/\/+$/, '');
    const type = ev.types.find(t => t.path && t.path === path);
    pageHero(ev.subtitle, type ? (type.pageTitle || type.label) : ev.title, type ? (type.pageIntro || ev.intro) : ev.intro);
    setMeta(`${type ? type.pageTitle || type.label : ev.title} — ${c.site.name}`);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const withDate = ev.items.map(e => ({ ...e, _d: parseDate(e.date) }));
    const future = withDate.filter(e => e._d && e._d >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past   = withDate.filter(e => !e._d || e._d < today).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const label  = k => (ev.types.find(t => t.key === k) || {}).label || k;

    const row = (e, isPast) => {
      const d = fmtDate(e.date);
      return `
        <article class="event-row${isPast ? ' past' : ''}" data-group="${esc(e.type)}">
          <div class="event-date-block"><div class="d">${esc(d.day)}</div><div class="m">${esc(d.mon)}</div><div class="y">${esc(d.year || '')}</div></div>
          <div class="event-main">
            <span class="tag-pill">${esc(label(e.type))}${isPast ? ' · realizado' : ''}</span>
            <h3 class="event-title">${esc(e.title)}</h3>
            ${e.location ? `<div class="event-loc">${svg(ICONS.pin, 14)}${esc(e.location)}</div>` : ''}
            ${e.description ? `<p class="event-desc">${esc(e.description)}</p>` : ''}
          </div>
          <div class="event-side">
            ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener" class="btn btn-outline-ghost">Mais informação ${svg(ICONS.external, 14)}</a>` : ''}
          </div>
        </article>`;
    };
    setHTML('#event-list', [...future.map(e => row(e, false)), ...past.map(e => row(e, true))].join(''));

    renderFilterPills('#event-filters', ev.types.map(t => ({ key: t.key, label: t.label })), '#event-list', {
      allLabel: 'Todos', initial: type ? type.key : '__all',
      cardSelector: '.event-row', emptyText: ev.emptyText || 'Não há eventos nesta categoria.',
    });
    setHTML('#eventos-cta', ctaBar(c));
  }

  /* ─── Associação: sobre nós ─────────────────────────────────────────── */
  function associacao(c) {
    const a = c.about;
    pageHero(a.subtitle, a.title, a.text);
    setMeta(`${a.title} — ${c.site.name}`, a.text);
    setHTML('#about-features', a.features.map(f => `<li class="about-feature"><div class="about-feature-dot"></div><span>${esc(f)}</span></li>`).join(''));
    setText('#stats-subtitle', a.statsSubtitle);
    setText('#stats-title', a.statsTitle);
    setHTML('#stats-grid', a.stats.map(s => `
      <div class="stat-item">
        <div class="stat-value" data-target="${esc(s.value)}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`).join(''));
    const img = $('#about-img');
    if (img && a.image) { img.style.backgroundImage = `url(${a.image})`; const ph = $('#about-img-placeholder'); if (ph) ph.style.display = 'none'; }
    setText('#approach-sub', a.approachSubtitle);
    setText('#approach-title', a.approachTitle);
    setHTML('#approach-text', richText(a.approachText));
    /* Sub-navegação da associação a partir do menu */
    const parent = c.nav.links.find(l => (l.children || []).length && l.children.some(k => k.href.startsWith('/associacao')));
    const kids = (parent ? parent.children : []).filter(k => k.href !== '/associacao');
    const icons = { historia: ICONS.clock, 'orgaos-sociais': ICONS.user, instrutores: ICONS.shield, 'dojo-kun': ICONS.target, modalidades: ICONS.dumbbell };
    setHTML('#assoc-links', kids.map(k => {
      const key = k.href.split('/').filter(Boolean).pop();
      return `
        <a class="card fade-in" href="${esc(k.href)}">
          <div class="card-body" style="flex-direction:row;align-items:center;gap:16px">
            <div class="benefit-icon" style="margin:0">${svg(icons[key] || ICONS.arrow)}</div>
            <div style="flex:1"><div class="card-title" style="font-size:1.05rem">${esc(k.label)}</div></div>
            ${svg(ICONS.arrow, 18)}
          </div>
        </a>`;
    }).join(''));
    setHTML('#assoc-cta', ctaBar(c));
  }

  /* ─── História ──────────────────────────────────────────────────────── */
  function historia(c) {
    const h = c.history;
    pageHero(h.subtitle, h.title, h.intro);
    setMeta(`${h.title} — ${c.site.name}`, h.intro);
    setHTML('#timeline', h.timeline.map(t => `
      <div class="tl-item fade-in">
        <div class="tl-year">${esc(t.year)}</div>
        <div class="tl-title">${esc(t.title)}</div>
        <p class="tl-text">${esc(t.text)}</p>
      </div>`).join(''));
  }

  /* ─── Órgãos sociais ────────────────────────────────────────────────── */
  function orgaos(c) {
    const b = c.board;
    pageHero(b.subtitle, b.title, b.intro);
    setMeta(`${b.title} — ${c.site.name}`, b.intro);
    setText('#mandate', b.mandate);
    setHTML('#board-grid', b.groups.map(g => `
      <div class="board-group fade-in">
        <div class="board-group-name">${esc(g.name)}</div>
        ${(g.members || []).map(m => `
          <div class="board-member"><span class="board-role">${esc(m.role)}</span><span class="board-name">${esc(m.name)}</span></div>`).join('')}
      </div>`).join(''));
  }

  /* ─── Instrutores ───────────────────────────────────────────────────── */
  function instrutores(c) {
    const i = c.instructors;
    pageHero(i.subtitle, i.title, i.intro);
    setMeta(`${i.title} — ${c.site.name}`, i.intro);
    setHTML('#instructors-grid', i.items.map(p => `
      <article class="card instructor-card fade-in">
        <div class="card-img">
          ${imgOrPlaceholder(p.image, p.name, ICONS.user, 'Fotografia')}
          ${p.grade ? `<span class="instructor-grade">${esc(p.grade)}</span>` : ''}
        </div>
        <div class="card-body">
          <span class="instructor-role">${esc(p.role)}</span>
          <h3 class="card-title">${esc(p.name)}</h3>
          <p class="card-text">${esc(p.bio)}</p>
        </div>
      </article>`).join(''));
    setHTML('#lineage', i.lineage ? `<div class="lineage fade-in">${esc(i.lineage)}</div>` : '');
  }

  /* ─── Dojo Kun ──────────────────────────────────────────────────────── */
  function dojoKun(c) {
    const k = c.dojoKun;
    pageHero(k.subtitle, k.title, k.intro);
    setMeta(`${k.title} — ${c.site.name}`, k.intro);
    setHTML('#kun-list', k.principles.map((p, i) => `
      <div class="kun-item fade-in">
        <div class="kun-num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="kun-jp">${esc(p.jp)}</div>
          <div class="kun-pt">${esc(p.pt)}</div>
          ${p.text ? `<p class="kun-text">${esc(p.text)}</p>` : ''}
        </div>
      </div>`).join(''));
    setText('#kun-note', k.note);
    setText('#budo-title', k.budoTitle);
    setHTML('#budo-text', richText(k.budoText));
  }

  /* ─── Modalidades + karate infantil ─────────────────────────────────── */
  function modalidades(c) {
    const cl = c.classes, kids = c.kids;
    pageHero(cl.subtitle, cl.title, cl.intro);
    setMeta(`${cl.title} — ${c.site.name}`, cl.intro);
    setHTML('#classes-grid', ASBKI.classCards(cl.items));
    setText('#kids-sub', kids.subtitle);
    setText('#kids-title', kids.title);
    setText('#kids-intro', kids.intro);
    setHTML('#kids-bullets', (kids.bullets || []).map(b => `<div class="kids-bullet"><div class="about-feature-dot"></div><span>${esc(b)}</span></div>`).join(''));
    setText('#kids-closing', kids.closing);
    const cta = $('#kids-cta'); if (cta) { cta.textContent = kids.ctaLabel; cta.href = kids.ctaHref || '/inscricao'; }
    const vis = $('#kids-visual');
    if (vis && kids.image) vis.innerHTML = `<img src="${esc(kids.image)}" alt="${esc(kids.title)}">`;
    setHTML('#modalidades-cta', ctaBar(c));
  }

  /* ─── Inscrição: horários completos + wizard ────────────────────────── */
  function inscricao(c) {
    const s = c.schedule, ins = c.inscription;
    pageHero(ins.badge, ins.title, ins.step3Text);
    setMeta(`${ins.title} — ${c.site.name}`);
    setText('#horarios-sub', s.pageSubtitle || 'Horários');
    setText('#horarios-title', s.pageTitle || s.title);
    setText('#horarios-intro', s.pageIntro || '');
    setHTML('#session-grid', s.sessions.map(x => sessionCardHTML(x)).join(''));
    renderFilterPills('#session-filters', s.filters, '#session-grid', { allLabel: 'Todas' });

    /* Wizard */
    setText('#wizard-step1-title', ins.step1Title);
    setText('#wizard-step2-title', ins.step2Title);
    setText('#wizard-step3-title', ins.step3Title);
    setText('#wizard-step3-text', ins.step3Text);
    setText('#wiz-lbl-name', ins.fields.name);
    setText('#wiz-lbl-phone', ins.fields.phone);
    setHTML('#wiz-lbl-email', esc(ins.fields.email).replace('(opcional)', '<span class="optional">(opcional)</span>'));
    $('#wiz-name').placeholder  = ins.fields.namePlaceholder || '';
    $('#wiz-phone').placeholder = ins.fields.phonePlaceholder || '';
    $('#wiz-email').placeholder = ins.fields.emailPlaceholder || '';
    setText('#wizard-btn-1', ins.nextLabel);
    setText('#wizard-btn-2', ins.submitLabel || ins.nextLabel);
    setText('#wizard-back-2', ins.backLabel);
    setHTML('#wizard-progress', ins.steps.map((label, i) => `
      <div class="wizard-step-dot ${i === 0 ? 'active' : ''}" data-step="${i + 1}">
        <div class="wizard-dot">${i + 1}</div><span class="wizard-dot-label">${esc(label)}</span>
      </div>`).join(''));
    setHTML('#wizard-session-grid', s.sessions.map(x => sessionCardHTML(x)).join(''));
    renderFilterPills('#wizard-filters', s.filters, '#wizard-session-grid');
    initWizard(s.sessions);
  }

  function initWizard(sessions) {
    let selectedSessionId = null;
    const panels  = [1, 2, 3].map(n => $(`#wizard-panel-${n}`));
    const dots    = document.querySelectorAll('#wizard-progress .wizard-step-dot');
    const btn1    = $('#wizard-btn-1'), btn2 = $('#wizard-btn-2'), back2 = $('#wizard-back-2');
    const selGrid = $('#wizard-session-grid');
    if (!selGrid) return;

    function goToStep(n) {
      panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
      dots.forEach((d, i) => { d.classList.toggle('active', i + 1 === n); d.classList.toggle('done', i + 1 < n); });
      $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    selGrid.addEventListener('click', e => {
      const card = e.target.closest('.session-card');
      if (!card || card.hidden) return;
      selGrid.querySelectorAll('.session-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      selectedSessionId = card.dataset.sessionId;
      btn1.disabled = false;
    });
    btn1.addEventListener('click', () => {
      if (!selectedSessionId) return;
      const session = sessions.find(x => x.id === selectedSessionId);
      if (session) setHTML('#wizard-selected', `
        <div class="wizard-selected-label">Turma selecionada</div>
        <div class="wizard-selected-value">${esc(session.label)} · ${esc(session.daysShort)} · ${esc(session.time)} · ${esc(session.location)}</div>`);
      goToStep(2);
    });
    back2.addEventListener('click', () => goToStep(1));
    btn2.addEventListener('click', () => {
      const name = $('#wiz-name').value.trim(), phone = $('#wiz-phone').value.trim();
      if (!name || !phone) { (!name ? $('#wiz-name') : $('#wiz-phone')).focus(); return; }
      goToStep(3);
    });
  }

  /* ─── Contacto ──────────────────────────────────────────────────────── */
  function contacto(c) {
    const ct = c.contact, site = c.site;
    pageHero(ct.subtitle, ct.title, ct.intro);
    setMeta(`${ct.title} — ${c.site.name}`, ct.intro);
    setText('#contact-form-title', ct.formTitle);
    setText('#label-name', ct.fields.name);
    setText('#label-email', ct.fields.email);
    setText('#label-phone', ct.fields.phone);
    setText('#label-message', ct.fields.message);
    setText('#label-submit', ct.fields.submit);
    setHTML('#contact-details', [
      site.address && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.pin)}</div><div><div class="contact-detail-label">Morada</div><div class="contact-detail-value">${esc(site.address)}</div></div></div>`,
      site.phone   && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.phone)}</div><div><div class="contact-detail-label">Telefone</div><div class="contact-detail-value"><a href="tel:${esc(site.phone.replace(/\s/g, ''))}">${esc(site.phone)}</a></div></div></div>`,
      site.email   && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.mail)}</div><div><div class="contact-detail-label">E-mail</div><div class="contact-detail-value"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></div></div></div>`,
    ].filter(Boolean).join(''));
    setHTML('#contact-dojos', c.dojos.items.length ? `
      <div class="contact-detail-label" style="margin-bottom:6px">Os nossos dojos</div>
      ${c.dojos.items.map(d => `
        <div class="contact-dojo">
          <div><strong>${esc(d.name)}</strong><span>${esc(d.address)}</span></div>
          ${d.mapUrl ? `<a href="${esc(d.mapUrl)}" target="_blank" rel="noopener" class="link-arrow">Mapa</a>` : ''}
        </div>`).join('')}` : '');
  }

  /* ─── 404 ───────────────────────────────────────────────────────────── */
  function notfound(c) { setMeta(`Página não encontrada — ${c.site.name}`); }

  const PAGES = {
    dojos, noticias, noticia, eventos, associacao, historia,
    'orgaos-sociais': orgaos, instrutores, 'dojo-kun': dojoKun,
    modalidades, inscricao, contacto, '404': notfound,
  };

  const page = document.body.dataset.page;
  if (page !== 'home') ASBKI.boot(PAGES[page]);
})();
