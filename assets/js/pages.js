/* ─── ASBKI Covilhã — subpáginas ──────────────────────────────────────── */
/* A página é identificada por <body data-page="…">. */
(function () {
  const { esc, svg, ICONS, fmtDate, parseDate, richText, slugify,
          sessionCardHTML, renderFilterPills, setMeta } = ASBKI;

  const $ = sel => document.querySelector(sel);
  const setText = (sel, v) => { const el = $(sel); if (el) el.textContent = v ?? ''; };
  const setHTML = (sel, v) => { const el = $(sel); if (el) el.innerHTML = v ?? ''; };

  /* Gate de placeholder: um valor por confirmar pelo clube nunca chega ao público.
     Usa ASBKI.isPlaceholder quando existir (site.js); caso contrário, a mesma regex localmente. */
  const isPh = v => (window.ASBKI && typeof ASBKI.isPlaceholder === 'function')
    ? ASBKI.isPlaceholder(v)
    : /a confirmar|a definir|000 000|lorem/i.test(String(v || ''));
  const real = v => v && !isPh(v) ? v : '';

  /* Analytics: nunca falha se window.plausible não existir. */
  function track(name, props) {
    try { if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined); } catch (e) { /* silencioso */ }
  }
  /* Delegação única para toda a página: CTA de aula grátis, chamadas e WhatsApp. */
  document.addEventListener('click', e => {
    if (e.target.closest('a.btn-accent[href^="/inscricao"]')) track('cta_trial');
    if (e.target.closest('a[href^="tel:"]')) track('tel_click');
    if (e.target.closest('a[href*="wa.me"]')) track('whatsapp_click');
  });

  const ICON_WHATSAPP = 'M17.5 6.5A8 8 0 1 0 6 19l-1 3 3.1-1a8 8 0 0 0 9.4-14.5zM12 20a7 7 0 0 1-3.6-1l-.25-.15-2.1.65.65-2-.16-.27A7 7 0 1 1 12 20z M8.9 7.6c.2-.4.4-.4.6-.4h.5c.16 0 .38 0 .55.4.2.5.7 1.7.75 1.8s.1.2 0 .35c-.05.15-.1.25-.2.4l-.3.35c-.1.1-.2.2-.1.4.15.2.6.9 1.3 1.5.9.75 1.6 1 1.8 1.1.2.1.35.1.5-.05s.6-.65.75-.9c.15-.2.3-.2.5-.1s1.3.6 1.5.7c.2.1.35.15.4.25.05.1.05.6-.15 1.2s-1.15 1.1-1.6 1.15c-.4.05-.9.1-2.9-.6-2.4-.9-3.9-3.4-4-3.55-.1-.15-.9-1.2-.9-2.3s.55-1.6.75-1.85z';

  function pageHero(sub, title, intro) {
    setText('#ph-sub', sub);
    setText('#ph-title', title);
    setText('#ph-intro', intro);
  }

  function ctaBar(c) {
    /* O menu diz "Aula grátis"; os botões dizem sempre "Marcar aula experimental" (CTA unificado). */
    return `
      <div class="inscricao-cta-row">
        <a href="${esc(c.nav.ctaHref)}" class="btn btn-accent">${esc(c.trial.ctaLabel || 'Marcar aula experimental')}</a>
        <span class="hint">A primeira aula é gratuita e não precisas de equipamento.</span>
      </div>`;
  }

  /* ─── FAQ (jornada do pai): /inscricao e páginas de dojo ────────────────
     JSON-LD só é gerado no cliente se o servidor ainda não tiver metido um (data-faq). */
  function renderFAQ(sel, items) {
    const el = $(sel);
    if (!el) return;
    if (!items || !items.length) { const sec = el.closest('section'); if (sec) sec.hidden = true; return; }
    el.innerHTML = items.map((f, i) => `
      <div class="faq-item">
        <button class="faq-q" id="faq-q-${i}" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${esc(f.q)}</span>${svg(ICONS.chevron, 18)}
        </button>
        <div class="faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}" hidden>
          <p>${esc(f.a)}</p>
        </div>
      </div>`).join('');
    el.addEventListener('click', e => {
      const btn = e.target.closest('.faq-q');
      if (!btn) return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      const panel = $('#' + btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = open;
    });
    if (!document.querySelector('script[type="application/ld+json"][data-faq]')) {
      const ld = {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      };
      const s = document.createElement('script');
      s.type = 'application/ld+json'; s.setAttribute('data-faq', 'client'); s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    }
  }

  /* ─── Preços: só mostra o bloco quando o clube já preencheu valores ─────── */
  function renderPricingBlock(sel, c) {
    const el = $(sel);
    if (!el) return;
    const items = (c.pricing && c.pricing.items) || [];
    if (items.length) {
      el.innerHTML = `<div class="pricing-grid">${items.map(p => `
        <div class="pricing-card fade-in">
          <div class="pricing-label">${esc(p.label)}</div>
          <div class="pricing-value">${esc(p.value)}</div>
          ${p.note ? `<div class="pricing-note">${esc(p.note)}</div>` : ''}
        </div>`).join('')}</div>`;
    } else {
      el.innerHTML = `
        <div class="pricing-fallback fade-in">
          <p>Os valores das mensalidades variam consoante a turma e o dojo.</p>
          <a href="/contacto" class="btn btn-outline-ghost">Fala connosco sobre valores</a>
        </div>`;
    }
  }

  /* ─── Barra fixa inferior (< 768px): Ligar + WhatsApp, só quando reais ──── */
  function renderStickyBar(sel, c, waText) {
    const el = $(sel);
    if (!el) return;
    const phone = real(c.site.phone);
    const wa = real(c.contact.whatsapp);
    const parts = [];
    if (phone) parts.push(`<a href="tel:${esc(phone.replace(/\s/g, ''))}" class="sticky-cta-btn">${svg(ICONS.phone, 18)}Ligar</a>`);
    if (wa) {
      const digits = wa.replace(/\D/g, '');
      const text = encodeURIComponent(waText || 'Olá! Gostava de marcar uma aula experimental na ASBKI.');
      parts.push(`<a href="https://wa.me/${esc(digits)}?text=${text}" target="_blank" rel="noopener" class="sticky-cta-btn whatsapp">${svg(ICON_WHATSAPP, 18)}WhatsApp</a>`);
    }
    el.hidden = parts.length === 0;
    el.innerHTML = parts.join('');
    document.body.classList.toggle('has-sticky-cta', parts.length > 0);
  }

  /* ─── Cartão de horário como link directo para marcar (fora do wizard) ──── */
  function sessionLinkCardHTML(s) {
    return `
    <a class="session-card" href="/inscricao?turma=${esc(s.id)}#marcar" data-group="${esc(s.group)}">
      <div class="session-days">${esc(s.daysShort)}</div>
      <div class="session-time">${esc(s.time)}</div>
      <div class="session-label">${esc(s.label)} · ${esc(s.location)}</div>
      <div class="session-slots ${esc(s.status)}">${esc(s.slotsText)}</div>
    </a>`;
  }

  /* width/height fixos (16:9, o rácio de .card-img) reservam o espaço antes da imagem
     carregar — a par do aspect-ratio em CSS, evita o salto de layout (CLS). */
  function imgOrPlaceholder(src, alt, icon = ICONS.shield, label = 'ASBKI') {
    return src
      ? `<img src="${esc(src)}" alt="${esc(alt)}" width="800" height="450" loading="lazy">`
      : `<div class="card-img-placeholder">${svg(icon, 36)}<span>${esc(label)}</span></div>`;
  }

  function newsCard(n, c) {
    const cat = (c.news.categories || []).find(k => k.key === n.category);
    return `
      <article class="card" data-group="${esc(n.category)}">
        <a href="/noticias/${esc(n.slug)}" class="card-img" tabindex="-1" aria-hidden="true">${imgOrPlaceholder(n.image, n.title)}</a>
        <div class="card-body">
          <div class="card-meta"><span class="tag">${esc(cat ? cat.label : n.category)}</span><span>${esc(fmtDate(n.date).short)}</span></div>
          <h3 class="card-title"><a href="/noticias/${esc(n.slug)}">${esc(n.title)}</a></h3>
          <p class="card-text">${esc(n.excerpt)}</p>
          <div class="card-foot"><a href="/noticias/${esc(n.slug)}" class="link-arrow">${esc(c.news.readMore || 'Ler artigo')} →</a></div>
        </div>
      </article>`;
  }

  const sortedNews = c => [...c.news.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  /* Enquanto não há fotografias dos dojos, o cartão mostra um mapa. A pesquisa usa a morada,
     sem os apontamentos entre parênteses ("morada a confirmar"), ou o nome da localidade. */
  const mapQuery = dj => {
    const addr = (dj.address || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    return addr || `${dj.short || dj.name} Covilhã`;
  };

  /* ─── Dojos ─────────────────────────────────────────────────────────── */
  function dojos(c) {
    const d = c.dojos;
    pageHero(d.subtitle, d.title, d.intro);
    setMeta(`${d.title} — ${c.site.name}`, d.intro);
    setHTML('#dojos-grid', d.items.map(dj => {
      const sessions = c.schedule.sessions.filter(s => s.location === dj.name);
      return `
        <article class="card dojo-card fade-in">
          ${dj.image
            ? `<a href="/dojos/${esc(dj.slug)}" class="card-img" tabindex="-1" aria-hidden="true">${imgOrPlaceholder(dj.image, dj.name)}</a>`
            : `<div class="card-img card-map"><iframe class="dojo-map" src="https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(dj))}&amp;z=14&amp;hl=pt-PT&amp;output=embed" loading="lazy" title="Mapa: ${esc(dj.name)}" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`}
          <div class="card-body">
            <h3 class="card-title"><a href="/dojos/${esc(dj.slug)}">${esc(dj.name)}</a></h3>
            ${dj.notes ? `<p class="card-text" style="flex:0">${esc(dj.notes)}</p>` : ''}
            <div class="dojo-details">
              ${real(dj.address) ? `<div class="dojo-detail">${svg(ICONS.pin, 16)}<span>${esc(dj.address)}</span></div>` : ''}
              ${real(dj.phone)   ? `<div class="dojo-detail">${svg(ICONS.phone, 16)}<a href="tel:${esc(dj.phone.replace(/\s/g, ''))}">${esc(dj.phone)}</a></div>` : ''}
              ${real(dj.email)   ? `<div class="dojo-detail">${svg(ICONS.mail, 16)}<a href="mailto:${esc(dj.email)}">${esc(dj.email)}</a></div>` : ''}
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
              <a href="/dojos/${esc(dj.slug)}" class="link-arrow">Ver dojo e horário →</a>
            </div>
          </div>
        </article>`;
    }).join(''));
    setHTML('#dojos-cta', ctaBar(c));
  }

  /* ─── Agenda (topo de /noticias): próximos eventos, por data ────────────── */
  function renderAgenda(c) {
    const list = $('#agenda-list');
    if (!list) return;
    const today = new Date().toISOString().slice(0, 10);
    const items = (c.events.items || [])
      .filter(e => e.date >= today)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const sec = list.closest('section');
    if (!items.length) { if (sec) sec.hidden = true; return; }
    if (sec) sec.hidden = false;
    const typeLabel = k => (c.events.types.find(t => t.key === k) || {}).label || k;
    list.innerHTML = items.map(e => {
      const d = fmtDate(e.date);
      return `
      <div class="agenda-row fade-in">
        <div class="agenda-date"><span class="d">${esc(d.day)}</span><span class="m">${esc(d.mon)}</span></div>
        <div class="agenda-body">
          <span class="tag-pill">${esc(typeLabel(e.type))}</span>
          <div class="agenda-title">${esc(e.title)}</div>
          ${e.location ? `<div class="agenda-loc">${svg(ICONS.pin, 14)}${esc(e.location)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  /* ─── Notícias (lista) ──────────────────────────────────────────────── */
  function noticias(c) {
    const n = c.news;
    pageHero(n.subtitle, n.title, n.intro);
    setMeta(`${n.title} — ${c.site.name}`, n.intro);
    renderAgenda(c);
    const items = sortedNews(c);
    if (!items.length) { setHTML('#news-grid', '<p class="empty">Ainda não há notícias publicadas.</p>'); return; }
    const [first, ...rest] = items;
    const cat = k => (n.categories.find(x => x.key === k) || {}).label || k;
    setHTML('#news-featured', `
      <article class="card news-featured fade-in" data-group="${esc(first.category)}">
        <a href="/noticias/${esc(first.slug)}" class="card-img" tabindex="-1" aria-hidden="true">${imgOrPlaceholder(first.image, first.title)}</a>
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
      ${item.image ? `<div class="article-cover"><img src="${esc(item.image)}" alt="${esc(item.title)}" width="800" height="400" loading="lazy"></div>` : ''}
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

  /* ─── Dojo (página individual, /dojos/:slug) ────────────────────────── */
  function dojo(c) {
    const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
    const dj = c.dojos.items.find(d => d.slug === slug || d.id === slug);
    if (!dj) {
      pageHero(c.dojos.subtitle, 'Não encontrámos este dojo.', 'O endereço pode estar errado ou o dojo pode ter mudado de nome.');
      setMeta(`Dojo não encontrado — ${c.site.name}`);
      setHTML('#dojo-switch', `<a href="/dojos" class="btn btn-accent">Ver todos os dojos</a>`);
      return;
    }
    pageHero(c.dojos.subtitle, dj.name, dj.intro || dj.notes || '');
    setText('#ph-crumb', dj.short || dj.name);
    setMeta(`${dj.name} — ${c.site.name}`, dj.intro || dj.notes);
    setHTML('#dojo-hero-meta', [
      real(dj.address) && `<span>${svg(ICONS.pin, 16)}${esc(dj.address)}</span>`,
      real(dj.phone)   && `<span>${svg(ICONS.phone, 16)}<a href="tel:${esc(dj.phone.replace(/\s/g, ''))}">${esc(dj.phone)}</a></span>`,
    ].filter(Boolean).join(''));

    const photo = $('#dojo-photo');
    if (photo) photo.innerHTML = imgOrPlaceholder(dj.image, dj.name, ICONS.pin, dj.short || dj.name);
    setHTML('#dojo-info', [
      real(dj.address) && `<div class="dojo-detail">${svg(ICONS.pin, 18)}<span>${esc(dj.address)}</span></div>`,
      real(dj.phone)   && `<div class="dojo-detail">${svg(ICONS.phone, 18)}<a href="tel:${esc(dj.phone.replace(/\s/g, ''))}">${esc(dj.phone)}</a></div>`,
      real(dj.email)   && `<div class="dojo-detail">${svg(ICONS.mail, 18)}<a href="mailto:${esc(dj.email)}">${esc(dj.email)}</a></div>`,
      dj.notes && dj.intro && `<p class="card-text" style="flex:0">${esc(dj.notes)}</p>`,
      dj.mapUrl  && `<div><a href="${esc(dj.mapUrl)}" target="_blank" rel="noopener" class="btn btn-outline-ghost" style="min-height:48px;padding:10px 20px">Ver no mapa ${svg(ICONS.external, 14)}</a></div>`,
    ].filter(Boolean).join(''));

    /* Horário deste dojo — os cartões são links directos para marcar */
    const sessions = c.schedule.sessions.filter(s => s.location === dj.name);
    setText('#dojo-schedule-title', `Horário · ${dj.short || dj.name}`);
    if (sessions.length) {
      setHTML('#dojo-sessions', sessions.map(s => sessionLinkCardHTML(s)).join(''));
      const used = (c.schedule.filters || []).filter(f => sessions.some(s => s.group === f.key));
      if (used.length > 1) renderFilterPills('#dojo-filters', used, '#dojo-sessions', { allLabel: 'Todas', cardSelector: '.session-card' });
    } else {
      setHTML('#dojo-sessions', '<p class="empty">Horário a anunciar. Contacta-nos para saber mais.</p>');
    }

    /* Outros dojos */
    setHTML('#dojo-switch', c.dojos.items.map(d => `
      <a href="/dojos/${esc(d.slug)}"${d.slug === dj.slug ? ' aria-current="page"' : ''}>${svg(ICONS.pin, 14)}${esc(d.short || d.name)}</a>`).join(''));
    renderFAQ('#faq-list', c.faq);
    setHTML('#dojo-cta', ctaBar(c));
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
    const icons = { historia: ICONS.clock, 'orgaos-sociais': ICONS.user, instrutores: ICONS.shield, 'dojo-kun': ICONS.target };
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
    /* Marcos com "confirmar":true referem dojos que ainda não constam de dojos.items —
       ficam de fora até a direção validar a informação (ver relatório de entrega). */
    setHTML('#timeline', h.timeline.filter(t => !t.confirmar).map(t => `
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
          <div class="board-member"><span class="board-role">${esc(m.role)}</span>${real(m.name) ? `<span class="board-name">${esc(m.name)}</span>` : ''}</div>`).join('')}
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
          ${real(p.name) ? `<h3 class="card-title">${esc(p.name)}</h3>` : ''}
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

  /* ─── Karate: visão geral (Kihon · Kata · Kumite + turmas + infantil) ── */
  function disciplineCard(d) {
    return `
      <a class="card discipline-card fade-in" href="/karate/${esc(d.slug)}">
        <span class="discipline-jp" aria-hidden="true">${esc(d.jp)}</span>
        <div class="card-body">
          <span class="discipline-kicker">${esc(d.kicker || '')}</span>
          <h3 class="card-title">${esc(d.name)}</h3>
          <p class="card-text">${esc(d.excerpt)}</p>
          <div class="card-foot"><span class="link-arrow">Saber mais →</span></div>
        </div>
      </a>`;
  }

  function karate(c) {
    const k = c.karate, cl = c.classes, kids = c.kids;
    pageHero(k.subtitle, k.title, k.intro);
    setMeta(`${k.title} — ${c.site.name}`, k.intro);
    setHTML('#discipline-grid', k.disciplines.map(disciplineCard).join(''));
    setText('#turmas-sub', cl.subtitle);
    setText('#turmas-title', k.turmasTitle || cl.title);
    setText('#turmas-intro', k.turmasIntro || cl.intro);
    setHTML('#classes-grid', ASBKI.classCards(cl.items));
    setText('#kids-sub', kids.subtitle);
    setText('#kids-title', kids.title);
    setText('#kids-intro', kids.intro);
    setHTML('#kids-bullets', (kids.bullets || []).map(b => `<div class="kids-bullet"><div class="about-feature-dot"></div><span>${esc(b)}</span></div>`).join(''));
    setText('#kids-closing', kids.closing);
    const cta = $('#kids-cta'); if (cta) { cta.textContent = kids.ctaLabel; cta.href = kids.ctaHref || '/inscricao'; }
    const vis = $('#kids-visual');
    if (vis && kids.image) vis.innerHTML = `<img src="${esc(kids.image)}" alt="${esc(kids.title)}">`;
    setHTML('#karate-cta', ctaBar(c));
  }

  /* ─── Karate: disciplina (/karate/:slug) ────────────────────────────── */
  function disciplina(c) {
    const k = c.karate;
    const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
    const d = k.disciplines.find(x => x.slug === slug);
    if (!d) {
      pageHero(k.subtitle, 'Não encontrámos esta página.', 'O endereço pode estar errado.');
      setMeta(`Página não encontrada — ${c.site.name}`);
      setHTML('#discipline-nav', `<a href="/karate" class="btn btn-accent">Ver Kihon, Kata e Kumite</a>`);
      return;
    }
    setText('#ph-jp', d.jp || '');
    setText('#ph-crumb', d.name);
    pageHero(d.kicker ? `${k.subtitle} · ${d.kicker}` : k.subtitle, d.name, d.intro);
    setMeta(`${d.name} — ${c.site.name}`, d.intro || d.excerpt);
    setHTML('#discipline-nav', k.disciplines.map(x => `
      <a href="/karate/${esc(x.slug)}"${x.slug === d.slug ? ' aria-current="page"' : ''}>${esc(x.name)}</a>`).join(''));
    setHTML('#discipline-body', richText(d.body));
    setHTML('#discipline-points', (d.points || []).map(p => `
      <div class="discipline-point fade-in"><strong>${esc(p.title)}</strong><span>${esc(p.text)}</span></div>`).join(''));
    const img = $('#discipline-image');
    if (img) {
      if (d.image) img.innerHTML = `<img src="${esc(d.image)}" alt="${esc(d.name)}" loading="lazy">`;
      else img.hidden = true;
    }
    setHTML('#discipline-cta', ctaBar(c));
  }

  /* ─── Inscrição: horários completos + wizard ────────────────────────── */
  function inscricao(c) {
    const s = c.schedule, ins = c.inscription;
    pageHero(ins.badge, ins.title, ins.step3Text);
    setMeta(`${ins.title} — ${c.site.name}`);
    setText('#horarios-sub', s.pageSubtitle || 'Horários');
    setText('#horarios-title', s.pageTitle || s.title);
    setText('#horarios-intro', s.pageIntro || '');
    setHTML('#session-grid', s.sessions.map(x => sessionLinkCardHTML(x)).join(''));
    renderFilterPills('#session-filters', s.filters, '#session-grid', { allLabel: 'Todas', cardSelector: '.session-card' });

    /* Wizard */
    setText('#wizard-step1-title', ins.step1Title);
    setText('#wizard-step2-title', ins.step2Title);
    setText('#wizard-step3-title', ins.step3Title);
    setText('#wizard-step3-text', ins.step3Text);
    setText('#wiz-lbl-name', ins.fields.name);
    setText('#wiz-lbl-phone', ins.fields.phone);
    setHTML('#wiz-lbl-email', esc(ins.fields.email).replace('(opcional)', '<span class="optional">(opcional)</span>'));
    setText('#wiz-lbl-age', ins.fields.age || 'Idade');
    setText('#wiz-lbl-guardian', ins.fields.guardian || 'Encarregado de educação');
    setHTML('#wiz-lbl-consent', `${esc(ins.fields.consent || 'Li e aceito a')} <a href="/privacidade" target="_blank" rel="noopener">${esc(ins.fields.consentLink || 'política de privacidade')}</a>`);
    $('#wiz-name').placeholder     = ins.fields.namePlaceholder || '';
    $('#wiz-phone').placeholder    = ins.fields.phonePlaceholder || '';
    $('#wiz-email').placeholder    = ins.fields.emailPlaceholder || '';
    $('#wiz-age').placeholder      = ins.fields.agePlaceholder || '';
    $('#wiz-guardian').placeholder = ins.fields.guardianPlaceholder || '';
    setText('#wizard-btn-1', ins.nextLabel);
    setText('#wizard-btn-2', ins.submitLabel || ins.nextLabel);
    setText('#wizard-back-2', ins.backLabel);
    setHTML('#wizard-progress', ins.steps.map((label, i) => `
      <div class="wizard-step-dot ${i === 0 ? 'active' : ''}" data-step="${i + 1}">
        <div class="wizard-dot">${i + 1}</div><span class="wizard-dot-label">${esc(label)}</span>
      </div>`).join(''));
    setHTML('#wizard-session-grid', s.sessions.map(x => sessionCardHTML(x)).join(''));
    renderFilterPills('#wizard-filters', s.filters, '#wizard-session-grid');
    initWizard(s.sessions, ins);
    renderFAQ('#faq-list', c.faq);
    renderPricingBlock('#pricing-block', c);
    renderStickyBar('#sticky-cta-bar', c);
  }

  function initWizard(sessions, ins) {
    let selectedSessionId = null;
    const panels  = [1, 2, 3].map(n => $(`#wizard-panel-${n}`));
    const dots    = document.querySelectorAll('#wizard-progress .wizard-step-dot');
    const btn1    = $('#wizard-btn-1'), back2 = $('#wizard-back-2');
    const selGrid = $('#wizard-session-grid');
    const form    = $('#wiz-form');
    const ageInput = $('#wiz-age'), guardianGroup = $('#wiz-guardian-group'), guardianInput = $('#wiz-guardian');
    const statusEl = $('#wiz-form-status');
    if (!selGrid || !form) return;

    function selectSession(id, { focus = false } = {}) {
      const card = selGrid.querySelector(`.session-card[data-session-id="${CSS.escape(id)}"]`);
      if (!card || card.hidden) return false;
      selGrid.querySelectorAll('.session-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      selectedSessionId = id;
      btn1.disabled = false;
      if (focus) card.scrollIntoView({ behavior: ASBKI.scrollBehavior(), block: 'center' });
      return true;
    }

    /* Pré-selecção a partir de /inscricao?turma=<id>, vinda dos cartões de horário. */
    const params = new URLSearchParams(location.search);
    const preselect = params.get('turma');
    if (preselect && sessions.some(x => x.id === preselect)) {
      selectSession(preselect);
      const session = sessions.find(x => x.id === preselect);
      setHTML('#wizard-selected', selectedSummaryHTML(session));
    }

    function goToStep(n) {
      panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
      dots.forEach((d, i) => { d.classList.toggle('active', i + 1 === n); d.classList.toggle('done', i + 1 < n); });
      $('#wizard').scrollIntoView({ behavior: ASBKI.scrollBehavior(), block: 'start' });
      track('wizard_step', { step: n });
    }
    selGrid.addEventListener('click', e => {
      const card = e.target.closest('.session-card');
      if (!card || card.hidden) return;
      selectSession(card.dataset.sessionId);
    });
    btn1.addEventListener('click', () => {
      if (!selectedSessionId) return;
      const session = sessions.find(x => x.id === selectedSessionId);
      if (session) setHTML('#wizard-selected', selectedSummaryHTML(session));
      goToStep(2);
    });
    back2.addEventListener('click', () => goToStep(1));

    /* Encarregado de educação: obrigatório só quando a idade indicada é menor de 18 anos. */
    function syncGuardian() {
      const age = parseInt(ageInput.value, 10);
      const needsGuardian = Number.isFinite(age) && age < 18;
      guardianGroup.hidden = !needsGuardian;
      guardianInput.required = needsGuardian;
      if (!needsGuardian) clearFieldError('guardian');
    }
    ageInput.addEventListener('input', syncGuardian);
    syncGuardian();

    function fieldError(name, msg) {
      const input = $(`#wiz-${name}`);
      const err = $(`#wiz-err-${name}`);
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function clearFieldError(name) { fieldError(name, ''); }

    const PHONE_RE = /^(\+351\s?)?9\d{2}\s?\d{3}\s?\d{3}$/;

    function validateStep2() {
      let ok = true;
      const name = $('#wiz-name').value.trim();
      const phone = $('#wiz-phone').value.trim();
      const email = $('#wiz-email').value.trim();
      const age = ageInput.value.trim();
      const guardian = guardianInput.value.trim();
      const consent = $('#wiz-consent').checked;

      if (!name) { fieldError('name', 'Indica o nome do praticante.'); ok = false; } else clearFieldError('name');
      if (!phone) { fieldError('phone', 'Indica um número de telemóvel.'); ok = false; }
      else if (!PHONE_RE.test(phone)) { fieldError('phone', 'Número de telemóvel português inválido (ex: 912 345 678).'); ok = false; }
      else clearFieldError('phone');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError('email', 'E-mail inválido.'); ok = false; } else clearFieldError('email');
      if (!guardianGroup.hidden && !guardian) { fieldError('guardian', 'Obrigatório para menores de 18 anos.'); ok = false; } else clearFieldError('guardian');
      if (!consent) { fieldError('consent', ins.consentRequired || 'Tens de aceitar a política de privacidade.'); ok = false; } else clearFieldError('consent');
      if (!ok) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
      }
      return ok ? { name, phone, email, age, guardian } : null;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if ($('#wiz-website').value) return; // honeypot: bots preenchem campos invisíveis
      if (!selectedSessionId) { goToStep(1); return; }
      const data = validateStep2();
      if (!data) return;

      const btn2 = $('#wizard-btn-2');
      const originalLabel = btn2.textContent;
      btn2.disabled = true; btn2.textContent = ins.sendingLabel || 'A enviar…';
      if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; }

      try {
        const res = await fetch('/api/inscricao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name, phone: data.phone, email: data.email || undefined,
            sessionId: selectedSessionId,
            age: data.age ? Number(data.age) : undefined,
            guardian: data.guardian || undefined,
            consent: true, website: '',
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          const msg = (body && body.errors && Object.values(body.errors)[0]) || (body && body.error) || ins.errorGeneric || 'Não foi possível enviar o pedido.';
          if (statusEl) { statusEl.textContent = msg; statusEl.hidden = false; statusEl.className = 'form-status error'; }
          return;
        }
        const session = sessions.find(x => x.id === selectedSessionId);
        setHTML('#wizard-summary', selectedSummaryHTML(session, true));
        track('trial_submitted', { sessionId: selectedSessionId });
        goToStep(3);
      } catch (err) {
        if (statusEl) { statusEl.textContent = ins.errorGeneric || 'Não foi possível enviar o pedido. Verifica a ligação e tenta de novo.'; statusEl.hidden = false; statusEl.className = 'form-status error'; }
      } finally {
        btn2.disabled = false; btn2.textContent = originalLabel;
      }
    });
  }

  function selectedSummaryHTML(session, withLabel) {
    if (!session) return '';
    return `
      ${withLabel ? `<div class="wizard-selected-label">Turma escolhida</div>` : `<div class="wizard-selected-label">Turma selecionada</div>`}
      <div class="wizard-selected-value">${esc(session.label)} · ${esc(session.daysShort)} · ${esc(session.time)} · ${esc(session.location)}</div>`;
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
    setHTML('#f-lbl-consent', `${esc(ct.fields.consent || 'Li e aceito a')} <a href="/privacidade" target="_blank" rel="noopener">${esc(ct.fields.consentLink || 'política de privacidade')}</a>`);
    setHTML('#contact-details', [
      real(site.address) && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.pin)}</div><div><div class="contact-detail-label">Morada</div><div class="contact-detail-value">${esc(site.address)}</div></div></div>`,
      real(site.phone)   && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.phone)}</div><div><div class="contact-detail-label">Telefone</div><div class="contact-detail-value"><a href="tel:${esc(site.phone.replace(/\s/g, ''))}">${esc(site.phone)}</a></div></div></div>`,
      real(site.email)   && `<div class="contact-detail"><div class="contact-detail-icon">${svg(ICONS.mail)}</div><div><div class="contact-detail-label">E-mail</div><div class="contact-detail-value"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></div></div></div>`,
    ].filter(Boolean).join(''));
    const dojosWithAddress = c.dojos.items.filter(d => real(d.address) || d.mapUrl);
    setHTML('#contact-dojos', dojosWithAddress.length ? `
      <div class="contact-detail-label" style="margin-bottom:6px">Os nossos dojos</div>
      ${dojosWithAddress.map(d => `
        <div class="contact-dojo">
          <div><strong>${esc(d.name)}</strong>${real(d.address) ? `<span>${esc(d.address)}</span>` : ''}</div>
          ${d.mapUrl ? `<a href="${esc(d.mapUrl)}" target="_blank" rel="noopener" class="link-arrow">Mapa</a>` : ''}
        </div>`).join('')}` : '');
    renderStickyBar('#sticky-cta-bar', c);
    initContactForm(ct);
  }

  function initContactForm(ct) {
    const form = $('#contact-form');
    if (!form) return;
    const statusEl = $('#contact-form-status');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function fieldError(name, msg) {
      const input = $(`#f-${name}`);
      const err = $(`#f-err-${name}`);
      if (err) { err.textContent = msg; err.hidden = !msg; }
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    function validate() {
      let ok = true;
      const name = $('#f-name').value.trim();
      const email = $('#f-email').value.trim();
      const phone = $('#f-phone').value.trim();
      const message = $('#f-message').value.trim();
      const consent = $('#f-consent').checked;
      if (!name) { fieldError('name', 'Indica o teu nome.'); ok = false; } else fieldError('name', '');
      if (!email) { fieldError('email', 'Indica um e-mail.'); ok = false; }
      else if (!EMAIL_RE.test(email)) { fieldError('email', 'E-mail inválido.'); ok = false; }
      else fieldError('email', '');
      if (!message) { fieldError('message', 'Escreve a tua mensagem.'); ok = false; } else fieldError('message', '');
      if (!consent) { fieldError('consent', ct.consentRequired || 'Tens de aceitar a política de privacidade.'); ok = false; } else fieldError('consent', '');
      if (!ok) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); }
      return ok ? { name, email, phone, message } : null;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if ($('#f-website').value) return; // honeypot
      const data = validate();
      if (!data) return;

      const btn = $('#label-submit');
      const original = btn.textContent;
      btn.disabled = true; btn.textContent = ct.sendingLabel || 'A enviar…';
      if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; statusEl.className = 'form-status'; }

      try {
        const res = await fetch('/api/contacto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone || undefined, message: data.message, consent: true, website: '' }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          const msg = (body && body.errors && Object.values(body.errors)[0]) || (body && body.error) || ct.errorGeneric || 'Não foi possível enviar a mensagem.';
          if (statusEl) { statusEl.textContent = msg; statusEl.hidden = false; statusEl.className = 'form-status error'; }
          return;
        }
        if (statusEl) { statusEl.textContent = ct.successLabel || 'Mensagem enviada. Vamos responder em breve.'; statusEl.hidden = false; statusEl.className = 'form-status success'; }
        track('contact_submitted');
        form.reset();
      } catch (err) {
        if (statusEl) { statusEl.textContent = ct.errorGeneric || 'Não foi possível enviar a mensagem. Verifica a ligação e tenta de novo.'; statusEl.hidden = false; statusEl.className = 'form-status error'; }
      } finally {
        btn.disabled = false; btn.textContent = original;
      }
    });
  }

  /* ─── 404 ───────────────────────────────────────────────────────────── */
  function notfound(c) { setMeta(`Página não encontrada — ${c.site.name}`); }

  const PAGES = {
    dojos, dojo, noticias, noticia, associacao, historia,
    'orgaos-sociais': orgaos, instrutores, 'dojo-kun': dojoKun,
    karate, disciplina, inscricao, contacto, '404': notfound,
  };

  const page = document.body.dataset.page;
  if (page !== 'home') ASBKI.boot(PAGES[page]);
})();
