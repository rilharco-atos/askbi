/* ─── ASBKI Covilhã — Main JS ─────────────────────────────────────────── */

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
};

function svg(d, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

/* ─── Fetch content ───────────────────────────────────────────────────── */
async function loadContent() {
  try {
    const res = await fetch('content.json?v=' + Date.now());
    return await res.json();
  } catch {
    console.error('Não foi possível carregar content.json');
    return null;
  }
}

/* ─── Session card HTML ───────────────────────────────────────────────── */
function sessionCardHTML(s, selectable = false) {
  return `
    <div class="session-card" data-session-id="${s.id}" data-group="${s.group}">
      <div class="session-days">${s.daysShort}</div>
      <div class="session-time">${s.time}</div>
      <div class="session-label">${s.label} · ${s.location}</div>
      <div class="session-slots ${s.status}">${s.slotsText}</div>
    </div>`;
}

/* ─── Render ──────────────────────────────────────────────────────────── */
function render(c) {
  const { site, nav, hero, benefits, classes, about, schedule, events,
          inscription, trial, contact, footer } = c;

  /* --- META & TITLE --- */
  document.title = `${site.name} ${site.tagline} — Karate Shotokan`;

  /* --- NAV --- */
  document.querySelector('#nav-brand-name').textContent = site.name;
  document.querySelector('#nav-brand-sub').textContent  = site.tagline;
  document.querySelector('#footer-brand-name').textContent = site.name;
  document.querySelector('#footer-brand-sub').textContent  = site.tagline;

  if (site.logo) {
    document.querySelectorAll('.nav-star').forEach(el => {
      el.innerHTML = `<img src="${site.logo}" alt="${site.name}" style="width:100%;height:100%;object-fit:contain;border-radius:50%">`;
      el.style.background = 'transparent';
      el.style.padding = '2px';
    });
  }

  const navLinks = document.querySelector('#nav-links');
  navLinks.innerHTML = nav.links.map(l =>
    `<li><a href="${l.href}">${l.label}</a></li>`
  ).join('');
  document.querySelector('#nav-cta').textContent = nav.ctaLabel;
  document.querySelector('#nav-cta').href = nav.ctaHref;

  /* --- HERO --- */
  if (hero.badge)      document.querySelector('#hero-badge').textContent = hero.badge;
  document.querySelector('#hero-line1').textContent = hero.line1 || '';
  document.querySelector('#hero-line2').textContent = hero.line2 || '';
  document.querySelector('#hero-sub').textContent   = hero.subtext;

  if (hero.backgroundImage)
    document.querySelector('#hero-bg-img').style.backgroundImage = `url(${hero.backgroundImage})`;
  if (hero.foregroundImage)
    document.querySelector('#hero-image').style.backgroundImage = `url(${hero.foregroundImage})`;

  document.querySelector('#hero-actions').innerHTML = `
    <a href="${hero.cta1Href}" class="btn btn-accent">${hero.cta1Label}</a>
    <a href="${hero.cta2Href}" class="btn btn-outline-ghost">${hero.cta2Label}</a>`;

  /* --- SCHEDULE (homepage preview) --- */
  document.querySelector('#schedule-title').textContent = schedule.title;
  document.querySelector('#schedule-view-all').textContent = schedule.viewAllLabel + ' →';
  document.querySelector('#schedule-view-all').href = schedule.viewAllHref;

  /* Session cards (homepage) — must render before filter pills apply initial state */
  document.querySelector('#session-grid').innerHTML =
    schedule.sessions.map(s => sessionCardHTML(s)).join('');

  /* Filters (homepage) */
  renderFilterPills('#session-filters', schedule.filters, '#session-grid');

  /* Events */
  if (events && events.length) {
    document.querySelector('#events-list').innerHTML = events.map(e => `
      <div class="event-item">
        <span class="event-date">${e.date}</span>
        <span class="event-label">${e.label}</span>
      </div>`).join('');
  }

  /* --- BENEFITS --- */
  document.querySelector('#benefits-grid').innerHTML = benefits.map((b, i) => `
    <div class="benefit-item fade-in fade-in-delay-${i + 1}">
      <div class="benefit-icon">${svg(ICONS[b.icon] || ICONS.target)}</div>
      <div>
        <div class="benefit-title">${b.title}</div>
        <div class="benefit-text">${b.text}</div>
      </div>
    </div>`).join('');

  /* --- CLASSES --- */
  document.querySelector('#classes-subtitle').textContent = classes.subtitle;
  document.querySelector('#classes-title').textContent    = classes.title;
  document.querySelector('#classes-cta').textContent      = classes.ctaLabel;
  document.querySelector('#classes-cta').href             = classes.ctaHref;

  const classIcons = ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z','M17 12h-5v5h5v-5zM17 7h-5v4h5V7z','M6 4v16M18 4v16M4 8h4m8 0h4M4 16h4m8 0h4M8 4h8','M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',ICONS.shield];
  document.querySelector('#classes-grid').innerHTML = classes.items.map((cl, i) => `
    <div class="class-card">
      <div class="class-img" data-class="${i}">
        ${cl.image
          ? `<img src="${cl.image}" alt="${cl.name}" loading="lazy">`
          : `<div class="class-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${classIcons[i] || ICONS.shield}"/></svg></div>`}
        <div class="class-icon-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#140908" stroke-width="2">
            <path d="${classIcons[i] || ICONS.shield}"/>
          </svg>
        </div>
      </div>
      <div class="class-info">
        <div class="class-name">${cl.name}</div>
        <div class="class-desc">${cl.description}</div>
      </div>
    </div>`).join('');

  /* --- ABOUT --- */
  document.querySelector('#about-subtitle').textContent = about.subtitle;
  document.querySelector('#about-title').textContent    = about.title;
  document.querySelector('#about-text').textContent     = about.text;
  document.querySelector('#about-cta').textContent      = about.ctaLabel;
  document.querySelector('#about-cta').href             = about.ctaHref;
  document.querySelector('#about-features').innerHTML   = about.features.map(f => `
    <li class="about-feature">
      <div class="about-feature-dot"></div>
      <span>${f}</span>
    </li>`).join('');

  const centerImg = document.querySelector('#about-img');
  if (about.image) {
    centerImg.style.backgroundImage = `url(${about.image})`;
    const ph = document.querySelector('#about-img-placeholder');
    if (ph) ph.style.display = 'none';
  }

  document.querySelector('#stats-subtitle').textContent = about.statsSubtitle;
  document.querySelector('#stats-title').textContent    = about.statsTitle;
  document.querySelector('#stats-grid').innerHTML = about.stats.map(s => `
    <div class="stat-item">
      <div class="stat-value" data-target="${s.value}" data-suffix="${s.suffix}">0${s.suffix}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  /* --- INSCRIPTION WIZARD --- */
  if (inscription) {
    document.querySelector('#inscription-badge').textContent = inscription.badge;
    document.querySelector('#inscription-title').textContent = inscription.title;
    document.querySelector('#wizard-step1-title').textContent = inscription.step1Title;
    document.querySelector('#wizard-step2-title').textContent = inscription.step2Title;
    document.querySelector('#wizard-step3-title').textContent = inscription.step3Title;
    document.querySelector('#wizard-step3-text').textContent  = inscription.step3Text;
    document.querySelector('#wiz-lbl-name').textContent  = inscription.fields.name;
    document.querySelector('#wiz-lbl-phone').textContent = inscription.fields.phone;
    document.querySelector('#wiz-lbl-email').innerHTML   =
      inscription.fields.email.replace('(opcional)', '<span class="optional">(opcional)</span>');
    document.querySelector('#wiz-name').placeholder  = inscription.fields.namePlaceholder;
    document.querySelector('#wiz-phone').placeholder = inscription.fields.phonePlaceholder;
    document.querySelector('#wiz-email').placeholder = inscription.fields.emailPlaceholder;
    document.querySelector('#wizard-btn-1').textContent = inscription.nextLabel;
    document.querySelector('#wizard-btn-2').textContent = inscription.nextLabel;
    document.querySelector('#wizard-back-2').textContent = inscription.backLabel;

    /* Wizard progress dots */
    document.querySelector('#wizard-progress').innerHTML = inscription.steps.map((label, i) => `
      <div class="wizard-step-dot ${i === 0 ? 'active' : ''}" data-step="${i + 1}">
        <div class="wizard-dot">${i + 1}</div>
        <span class="wizard-dot-label">${label}</span>
      </div>`).join('');

    /* Wizard session cards — must render before filter pills apply initial state */
    document.querySelector('#wizard-session-grid').innerHTML =
      schedule.sessions.map(s => sessionCardHTML(s, true)).join('');
    renderFilterPills('#wizard-filters', schedule.filters, '#wizard-session-grid');

    initWizard(schedule.sessions, inscription);
  }

  /* --- CONTACT --- */
  document.querySelector('#contact-title').textContent      = contact.title;
  document.querySelector('#contact-form-title').textContent = contact.formTitle;
  document.querySelector('#label-name').textContent    = contact.fields.name;
  document.querySelector('#label-email').textContent   = contact.fields.email;
  document.querySelector('#label-phone').textContent   = contact.fields.phone;
  document.querySelector('#label-message').textContent = contact.fields.message;
  document.querySelector('#label-submit').textContent  = contact.fields.submit;

  document.querySelector('#contact-details').innerHTML = [
    site.address && `<div class="contact-detail">
      <div class="contact-detail-icon">${svg(ICONS.pin)}</div>
      <div><div class="contact-detail-label">Morada</div><div class="contact-detail-value">${site.address}</div></div>
    </div>`,
    site.phone && `<div class="contact-detail">
      <div class="contact-detail-icon">${svg(ICONS.phone)}</div>
      <div><div class="contact-detail-label">Telefone</div><div class="contact-detail-value">${site.phone}</div></div>
    </div>`,
    site.email && `<div class="contact-detail">
      <div class="contact-detail-icon">${svg(ICONS.mail)}</div>
      <div><div class="contact-detail-label">E-mail</div><div class="contact-detail-value">${site.email}</div></div>
    </div>`,
  ].filter(Boolean).join('');

  /* --- FOOTER --- */
  document.querySelector('#footer-desc').textContent             = footer.description;
  document.querySelector('#footer-links-title').textContent      = footer.quickLinksTitle;
  document.querySelector('#footer-schedule-title').textContent   = footer.scheduleTitle;
  document.querySelector('#footer-contact-title').textContent    = footer.contactTitle;
  document.querySelector('#footer-copy').textContent             = footer.copyright;

  document.querySelector('#footer-links').innerHTML = nav.links.map(l =>
    `<li><a href="${l.href}">${l.label}</a></li>`
  ).join('');

  document.querySelector('#footer-schedule').innerHTML = schedule.days.map(d => `
    <div class="schedule-row${d.hours === 'Fechado' ? ' closed' : ''}">
      <span class="schedule-day">${d.day}</span>
      <span class="schedule-hours">${d.hours}</span>
    </div>`).join('');

  document.querySelector('#footer-contact').innerHTML = [
    site.address && `<div class="footer-contact-item">${svg(ICONS.pin, 16)}<span>${site.address}</span></div>`,
    site.phone   && `<div class="footer-contact-item">${svg(ICONS.phone, 16)}<span>${site.phone}</span></div>`,
    site.email   && `<div class="footer-contact-item">${svg(ICONS.mail, 16)}<span>${site.email}</span></div>`,
  ].filter(Boolean).join('');

  const socials = [
    { key: 'facebook', icon: ICONS.facebook },
    { key: 'instagram', icon: ICONS.instagram },
    { key: 'youtube', icon: ICONS.youtube },
    { key: 'tiktok', icon: ICONS.tiktok },
  ].filter(s => site[s.key]);

  document.querySelector('#footer-social').innerHTML = socials.map(s =>
    `<a href="${site[s.key]}" class="social-link" target="_blank" rel="noopener">${svg(s.icon, 18)}</a>`
  ).join('');

  initObserver();
  initCounters();
}

/* ─── Filter pills ────────────────────────────────────────────────────── */
function renderFilterPills(filtersSelector, filters, gridSelector) {
  const container = document.querySelector(filtersSelector);
  if (!container || !filters) return;

  container.innerHTML = filters.map((f, i) => `
    <button class="filter-pill${i === 0 ? ' active' : ''}" data-filter="${f.key}"
      aria-pressed="${i === 0}">${f.label}</button>
  `).join('');

  container.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    container.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-pressed', 'false');
    });
    pill.classList.add('active');
    pill.setAttribute('aria-pressed', 'true');
    filterSessions(pill.dataset.filter, gridSelector);
  });

  /* Apply initial filter */
  filterSessions(filters[0].key, gridSelector);
}

function filterSessions(groupKey, gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  let visible = 0;
  grid.querySelectorAll('.session-card').forEach(card => {
    const show = card.dataset.group === groupKey;
    card.hidden = !show;
    if (show) visible++;
  });

  /* Empty state */
  const existing = grid.querySelector('.session-empty');
  if (existing) existing.remove();
  if (visible === 0) {
    const el = document.createElement('p');
    el.className = 'session-empty';
    el.textContent = 'Não há turmas disponíveis nesta faixa etária.';
    grid.appendChild(el);
  }
}

/* ─── Wizard ──────────────────────────────────────────────────────────── */
function initWizard(sessions, inscription) {
  let selectedSessionId = null;
  let currentStep = 1;

  const panels   = [1, 2, 3].map(n => document.querySelector(`#wizard-panel-${n}`));
  const dots     = document.querySelectorAll('#wizard-progress .wizard-step-dot');
  const btn1     = document.querySelector('#wizard-btn-1');
  const btn2     = document.querySelector('#wizard-btn-2');
  const back2    = document.querySelector('#wizard-back-2');
  const selGrid  = document.querySelector('#wizard-session-grid');

  function goToStep(n) {
    currentStep = n;
    panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
    dots.forEach((d, i) => {
      d.classList.toggle('active', i + 1 === n);
      d.classList.toggle('done', i + 1 < n);
    });
    document.querySelector('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* Session card selection */
  selGrid.addEventListener('click', e => {
    const card = e.target.closest('.session-card');
    if (!card || card.hidden) return;
    selGrid.querySelectorAll('.session-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedSessionId = card.dataset.sessionId;
    btn1.disabled = false;
  });

  btn1.addEventListener('click', () => {
    if (!selectedSessionId) return;
    const session = sessions.find(s => s.id === selectedSessionId);
    if (session) {
      document.querySelector('#wizard-selected').innerHTML = `
        <div class="wizard-selected-label">Turma selecionada</div>
        <div class="wizard-selected-value">${session.label} · ${session.daysShort} · ${session.time}</div>`;
    }
    goToStep(2);
  });

  back2.addEventListener('click', () => goToStep(1));

  btn2.addEventListener('click', () => {
    const name  = document.querySelector('#wiz-name').value.trim();
    const phone = document.querySelector('#wiz-phone').value.trim();
    if (!name || !phone) {
      if (!name)  document.querySelector('#wiz-name').focus();
      else        document.querySelector('#wiz-phone').focus();
      return;
    }
    goToStep(3);
  });
}

/* ─── Intersection Observer ───────────────────────────────────────────── */
function initObserver() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
}

/* ─── Counter animation ───────────────────────────────────────────────── */
function initCounters() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const target = parseInt(el.dataset.target, 10);
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const step = Math.ceil(target / 60);
        const tick = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current + suffix;
          if (current >= target) clearInterval(tick);
        }, 25);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => io.observe(el));
}

/* ─── Navbar ──────────────────────────────────────────────────────────── */
function initNavbar() {
  const nav = document.querySelector('#navbar');
  const bt  = document.querySelector('#back-top');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 60);
    bt.classList.toggle('visible', y > 400);

    const sections = document.querySelectorAll('section[id], footer[id]');
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) current = s.id; });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }, { passive: true });

  bt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ─── Mobile nav ──────────────────────────────────────────────────────── */
function initMobileNav() {
  const toggle = document.querySelector('#nav-toggle');
  const links  = document.querySelector('#nav-links');
  toggle.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    links.classList.toggle('mobile-open', open);
  });
  links.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      toggle.classList.remove('open');
      links.classList.remove('mobile-open');
    }
  });
}

/* ─── Contact form ────────────────────────────────────────────────────── */
window.handleContactForm = function(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  btn.textContent = 'A enviar…';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '✓ Mensagem enviada!';
    btn.style.background = '#22c55e';
    e.target.reset();
    setTimeout(() => {
      btn.textContent = 'Enviar';
      btn.style.background = '';
      btn.disabled = false;
    }, 4000);
  }, 1200);
};

/* ─── Boot ────────────────────────────────────────────────────────────── */
(async function init() {
  initNavbar();
  initMobileNav();
  const content = await loadContent();
  if (content) render(content);
})();
