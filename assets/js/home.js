/* ─── ASBKI Covilhã — página inicial ──────────────────────────────────── */
(function () {
  const { esc, svg, ICONS, fmtDate, parseDate, sessionCardHTML, renderFilterPills, setMeta } = ASBKI;

  let fighterOffset = 0;

  function upcoming(items, n) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return items
      .filter(e => { const d = parseDate(e.date); return d && d >= today; })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, n);
  }

  function newsCard(n, c) {
    const cat = (c.news.categories || []).find(k => k.key === n.category);
    const d = fmtDate(n.date);
    return `
      <article class="card" data-group="${esc(n.category)}">
        <a href="/noticias/${esc(n.slug)}" class="card-img" tabindex="-1" aria-hidden="true">
          ${n.image ? `<img src="${esc(n.image)}" alt="${esc(n.title)}" loading="lazy">`
                    : `<div class="card-img-placeholder">${svg(ICONS.shield, 36)}<span>ASBKI</span></div>`}
        </a>
        <div class="card-body">
          <div class="card-meta"><span class="tag">${esc(cat ? cat.label : n.category)}</span><span>${esc(d.short)}</span></div>
          <h3 class="card-title"><a href="/noticias/${esc(n.slug)}">${esc(n.title)}</a></h3>
          <p class="card-text">${esc(n.excerpt)}</p>
          <div class="card-foot"><a href="/noticias/${esc(n.slug)}" class="link-arrow">${esc(c.news.readMore || 'Ler artigo')} →</a></div>
        </div>
      </article>`;
  }

  function renderHome(c) {
    const { site, hero, benefits, classes, about, schedule, events, news, trial } = c;
    setMeta(`${site.name} — ${site.tagline}`);

    /* --- HERO --- */
    document.querySelector('#hero-badge').textContent = hero.badge || '';
    document.querySelector('#hero-line1').textContent = hero.line1 || '';
    document.querySelector('#hero-line2').textContent = hero.line2 || '';
    document.querySelector('#hero-sub').textContent   = hero.subtext || '';
    if (hero.backgroundImage)
      document.querySelector('#hero-bg-img').style.backgroundImage = `url(${hero.backgroundImage})`;
    if (hero.foregroundImage) {
      const hImg = document.querySelector('#hero-image');
      hImg.style.backgroundImage = `url(${hero.foregroundImage})`;
      hImg.style.backgroundSize  = 'auto ' + (hero.fighterSize ?? 88) + '%';
    }
    document.querySelector('#hero-actions').innerHTML = `
      <a href="${esc(hero.cta1Href)}" class="btn btn-accent">${esc(hero.cta1Label)}</a>
      ${hero.cta2Label ? `<a href="${esc(hero.cta2Href)}" class="btn btn-outline-ghost">${esc(hero.cta2Label)}</a>` : ''}`;

    /* --- TREINOS --- */
    document.querySelector('#schedule-title').textContent = schedule.title;
    const viewAll = document.querySelector('#schedule-view-all');
    viewAll.textContent = schedule.viewAllLabel + ' →';
    viewAll.href = schedule.viewAllHref;
    document.querySelector('#session-grid').innerHTML = schedule.sessions.map(s => sessionCardHTML(s)).join('');
    renderFilterPills('#session-filters', schedule.filters, '#session-grid');

    /* --- EVENTOS --- */
    document.querySelector('#events-home-title').textContent = events.homeTitle || 'Próximos eventos';
    const next = upcoming(events.items, 3);
    document.querySelector('#events-list').innerHTML = next.length
      ? next.map(e => `
        <div class="event-item">
          <span class="event-date">${esc(fmtDate(e.date).short)}</span>
          <span class="event-label">${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}${e.location ? ` · ${esc(e.location)}` : ''}</span>
        </div>`).join('')
      : `<p class="panel-text">${esc(events.emptyText || 'Sem eventos marcados.')}</p>`;

    /* --- BENEFÍCIOS --- */
    document.querySelector('#benefits-grid').innerHTML = benefits.map((b, i) => `
      <div class="benefit-item fade-in fade-in-delay-${Math.min(i + 1, 3)}">
        <div class="benefit-icon">${svg(ICONS[b.icon] || ICONS.target)}</div>
        <div>
          <div class="benefit-title">${esc(b.title)}</div>
          <div class="benefit-text">${esc(b.text)}</div>
        </div>
      </div>`).join('');

    /* --- MODALIDADES --- */
    document.querySelector('#classes-subtitle').textContent = classes.subtitle;
    document.querySelector('#classes-title').textContent    = classes.title;
    const classesCta = document.querySelector('#classes-cta');
    classesCta.textContent = classes.ctaLabel;
    classesCta.href = classes.ctaHref;
    document.querySelector('#classes-grid').innerHTML = ASBKI.classCards(classes.items);

    /* --- SOBRE --- */
    document.querySelector('#about-subtitle').textContent = about.subtitle;
    document.querySelector('#about-title').textContent    = about.title;
    document.querySelector('#about-text').textContent     = about.text;
    const aboutCta = document.querySelector('#about-cta');
    aboutCta.textContent = about.ctaLabel;
    aboutCta.href = about.ctaHref;
    document.querySelector('#about-features').innerHTML = about.features.map(f => `
      <li class="about-feature"><div class="about-feature-dot"></div><span>${esc(f)}</span></li>`).join('');
    if (about.image) {
      document.querySelector('#about-img').style.backgroundImage = `url(${about.image})`;
      const ph = document.querySelector('#about-img-placeholder');
      if (ph) ph.style.display = 'none';
    }
    document.querySelector('#stats-subtitle').textContent = about.statsSubtitle;
    document.querySelector('#stats-title').textContent    = about.statsTitle;
    document.querySelector('#stats-grid').innerHTML = about.stats.map(s => `
      <div class="stat-item">
        <div class="stat-value" data-target="${esc(s.value)}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`).join('');

    /* --- NOTÍCIAS --- */
    document.querySelector('#news-subtitle').textContent   = news.subtitle || '';
    document.querySelector('#news-home-title').textContent = news.homeTitle || 'Últimas notícias';
    document.querySelector('#news-view-all').textContent   = (news.homeViewAll || 'Ver todas') + ' →';
    const latest = [...news.items].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3);
    document.querySelector('#news-grid').innerHTML = latest.length
      ? latest.map(n => newsCard(n, c)).join('')
      : `<p class="empty">Ainda não há notícias publicadas.</p>`;

    /* --- CTA --- */
    document.querySelector('#trial-title').textContent = trial.title;
    document.querySelector('#trial-sub').textContent   = trial.subtext;
    const trialCta = document.querySelector('#trial-cta');
    trialCta.textContent = trial.ctaLabel;
    trialCta.href = trial.ctaHref;

    /* --- Lutador do hero --- */
    fighterOffset = hero.fighterOffset ?? 0;
    positionHeroFighter();
    window.addEventListener('resize', positionHeroFighter, { passive: true });
  }

  /* Alinha o lutador com o botão CTA da navbar (só em desktop) */
  function positionHeroFighter() {
    const heroImg = document.querySelector('#hero-image');
    if (!heroImg) return;
    if (window.innerWidth <= 768) { heroImg.style.right = ''; heroImg.style.left = ''; return; }
    const navCta = document.querySelector('.nav-cta');
    if (!navCta) return;
    const rect = navCta.getBoundingClientRect();
    if (!rect.width) return;
    heroImg.style.right = (window.innerWidth - (rect.left + rect.width / 2) - fighterOffset) + 'px';
    heroImg.style.left  = '0';
  }

  ASBKI.boot(renderHome);
})();
