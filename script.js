gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------
   0. SESSION / AUTH — single source of truth
   Fixes: dashboards previously could show a stale or duplicated
   email because multiple things wrote to storage independently.
   Every page now reads through getSession() only, and login is
   the only place that writes it.
--------------------------------------------------------- */
const Session = {
  KEY: 'stackly_expense_session',

  save(user){
    // overwrite completely — never merge/append, so old values can't linger
    sessionStorage.setItem(this.KEY, JSON.stringify({
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      avatar: user.avatar,
      loginAt: Date.now()
    }));
  },

  get(){
    try{
      const raw = sessionStorage.getItem(this.KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data || !data.email) return null;
      return data;
    }catch(e){
      return null;
    }
  },

  clear(){
    sessionStorage.removeItem(this.KEY);
  },

  /* Renders the logged-in user into every [data-user-*] slot on
     the page from the ONE session object — never from cached DOM
     text, never appended, always a full overwrite. */
  hydrate(){
    const user = this.get();
    const nameSlots = document.querySelectorAll('[data-user-name]');
    const emailSlots = document.querySelectorAll('[data-user-email]');
    const avatarSlots = document.querySelectorAll('[data-user-avatar]');
    const roleSlots = document.querySelectorAll('[data-user-role]');

    if(!user){
      // No valid session — bounce protected dashboard pages back to login
      if(document.body.hasAttribute('data-require-auth')){
        window.location.href = 'login.html';
      }
      return;
    }

    nameSlots.forEach(el => { el.textContent = user.name; });
    emailSlots.forEach(el => { el.textContent = user.email; });
    roleSlots.forEach(el => { el.textContent = user.role; });
    avatarSlots.forEach(el => { el.setAttribute('src', user.avatar); });

    if(document.body.hasAttribute('data-require-role')){
      const required = document.body.getAttribute('data-require-role');
      if(user.role !== required){
        window.location.href = 'user-dashboard.html';
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Session.hydrate();

  const logoutBtns = document.querySelectorAll('[data-logout]');
  logoutBtns.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    Session.clear();
    window.location.href = 'login.html';
  }));
});

/* ---------------------------------------------------------
   1. PRELOADER
--------------------------------------------------------- */
window.addEventListener('load', () => {
  const pre = document.querySelector('.preloader');
  if(!pre) return runIntro();
  const bar = pre.querySelector('.bar span');
  gsap.to(bar, {
    width: '100%', duration: 1.05, ease: 'power2.inOut',
    onComplete: () => {
      gsap.to(pre, {
        yPercent: -100, duration: .8, ease: 'power3.inOut', delay: .1,
        onComplete: () => { pre.style.display = 'none'; runIntro(); }
      });
    }
  });
});

/* ---------------------------------------------------------
   2. TEXT SPLIT + REVEAL (gsap.com-style line/word reveal,
      built without the paid SplitText plugin)
--------------------------------------------------------- */
function splitLines(el){
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'split-word';
    span.style.display = 'inline-block';
    span.textContent = w + (i < words.length - 1 ? '\u00A0' : '');
    el.appendChild(span);
  });
  return el.querySelectorAll('.split-word');
}

function runIntro(){
  document.querySelectorAll('.hero .split-line').forEach(line => {
    const words = splitLines(line);
    gsap.set(words, { yPercent: 120, opacity: 0 });
  });

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  document.querySelectorAll('.hero .split-line').forEach((line, i) => {
    tl.to(line.querySelectorAll('.split-word'), {
      yPercent: 0, opacity: 1, duration: 1, stagger: 0.035
    }, i * 0.12);
  });
  tl.from('.hero-eyebrow', { opacity: 0, y: 14, duration: .6 }, 0)
    .from('.hero p.lede', { opacity: 0, y: 18, duration: .8 }, 0.35)
    .from('.hero-actions > *', { opacity: 0, y: 18, duration: .7, stagger: .1 }, 0.5)
    .from('.hero-visual', { opacity: 0, y: 40, scale: .96, duration: 1 }, 0.3)
    .from('.float-chip', { opacity: 0, y: 20, duration: .7, stagger: .12 }, 0.9);
}

/* Generic scroll-triggered heading split reveal for every section */
document.querySelectorAll('[data-split-reveal]').forEach(el => {
  const words = splitLines(el);
  gsap.set(words, { yPercent: 115, opacity: 0 });
  gsap.to(words, {
    yPercent: 0, opacity: 1, duration: 1, stagger: 0.028, ease: 'power4.out',
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});

/* ---------------------------------------------------------
   3. BACKGROUND FIELD — drifting gradient blobs (Webflow-style
      ambient motion) + ledger line parallax
--------------------------------------------------------- */
document.querySelectorAll('.bg-field').forEach(field => {
  const blobs = field.querySelectorAll('.blob');
  blobs.forEach((b, i) => {
    gsap.to(b, {
      x: () => gsap.utils.random(-70, 70),
      y: () => gsap.utils.random(-50, 50),
      duration: () => gsap.utils.random(8, 14),
      repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.4
    });
  });
  const lines = field.querySelector('.ledger-lines');
  if(lines){
    gsap.to(lines, {
      backgroundPositionY: '80px',
      ease: 'none',
      scrollTrigger: { trigger: field.closest('section') || field.parentElement, scrub: 1, start: 'top bottom', end: 'bottom top' }
    });
  }
});

/* ---------------------------------------------------------
   4. NAVBAR state + mobile panel
--------------------------------------------------------- */
const navbar = document.querySelector('.navbar');
if(navbar){
  ScrollTrigger.create({
    start: 'top -60',
    onUpdate: (self) => {
      navbar.classList.toggle('is-scrolled', self.scroll() > 60);
    }
  });
}
const hamburger = document.querySelector('.hamburger');
const mobilePanel = document.querySelector('.mobile-panel');
if(hamburger && mobilePanel){
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('is-open');
    mobilePanel.classList.toggle('is-open');
  });
  mobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hamburger.classList.remove('is-open');
    mobilePanel.classList.remove('is-open');
  }));
}

/* ---------------------------------------------------------
   5. MAGNETIC BUTTONS
--------------------------------------------------------- */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    gsap.to(btn, { x: x * 0.35, y: y * 0.5, duration: .5, ease: 'power3.out' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.4)' });
  });
});

/* ---------------------------------------------------------
   6. SCROLL REVEALS — cards, images, stats
--------------------------------------------------------- */
gsap.utils.toArray('.feature-card, .price-card, .step, .quote-card, .panel, .stat-card').forEach((card, i) => {
  gsap.from(card, {
    opacity: 0, y: 46, duration: .9, ease: 'power3.out',
    scrollTrigger: { trigger: card, start: 'top 90%' },
    delay: (i % 3) * 0.08
  });
});

gsap.utils.toArray('.reveal-img').forEach(wrap => {
  const img = wrap.querySelector('img');
  const curtain = wrap.querySelector('.curtain');
  gsap.set(img, { scale: 1.25 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 85%' } });
  if(curtain){
    tl.to(curtain, { scaleY: 0, duration: 1, ease: 'power4.inOut' }, 0);
  }
  tl.to(img, { scale: 1, duration: 1.3, ease: 'power3.out' }, 0);

  gsap.to(img, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: wrap, scrub: true, start: 'top bottom', end: 'bottom top' }
  });
});

/* ---------------------------------------------------------
   7. ANIMATED COUNTERS (figures)
--------------------------------------------------------- */
document.querySelectorAll('[data-counter]').forEach(el => {
  const target = parseFloat(el.getAttribute('data-counter'));
  const decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals')) : 0;
  const prefix = el.getAttribute('data-prefix') || '';
  const suffix = el.getAttribute('data-suffix') || '';
  const obj = { val: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => {
      gsap.to(obj, {
        val: target, duration: 1.8, ease: 'power2.out',
        onUpdate: () => { el.textContent = prefix + obj.val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix; }
      });
    }
  });
});

/* ---------------------------------------------------------
   8. CATEGORY BARS (dashboard) — animate width on view
--------------------------------------------------------- */
document.querySelectorAll('.cat-bar-fill').forEach(bar => {
  const w = bar.getAttribute('data-width') || '0%';
  ScrollTrigger.create({
    trigger: bar, start: 'top 95%', once: true,
    onEnter: () => gsap.to(bar, { width: w, duration: 1.2, ease: 'power3.out' })
  });
});

/* ---------------------------------------------------------
   9. MARQUEE (testimonials / logos)
--------------------------------------------------------- */
document.querySelectorAll('.marquee-track').forEach(track => {
  const clone = track.innerHTML;
  track.innerHTML += clone;
  const distance = track.scrollWidth / 2;
  gsap.to(track, {
    x: -distance, duration: distance / 60, ease: 'none', repeat: -1
  });
});

/* ---------------------------------------------------------
   10. FAQ ACCORDION
--------------------------------------------------------- */
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.faq-item.is-open').forEach(other => {
      if(other !== item){
        other.classList.remove('is-open');
        gsap.to(other.querySelector('.faq-a'), { height: 0, duration: .45, ease: 'power2.inOut' });
      }
    });
    if(isOpen){
      item.classList.remove('is-open');
      gsap.to(a, { height: 0, duration: .45, ease: 'power2.inOut' });
    } else {
      item.classList.add('is-open');
      gsap.set(a, { height: 'auto' });
      gsap.from(a, { height: 0, duration: .5, ease: 'power2.inOut' });
    }
  });
});

/* ---------------------------------------------------------
   11. PRICING TOGGLE (monthly / annual)
--------------------------------------------------------- */
const pricingToggle = document.querySelector('.toggle[data-pricing-toggle]');
if(pricingToggle){
  pricingToggle.addEventListener('click', () => {
    pricingToggle.classList.toggle('is-on');
    const annual = pricingToggle.classList.contains('is-on');
    document.querySelectorAll('[data-monthly]').forEach(el => {
      el.textContent = annual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
    });
  });
}

/* ---------------------------------------------------------
   12. FORM VALIDATION (contact / auth)
--------------------------------------------------------- */
function validateForm(form){
  let valid = true;
  form.querySelectorAll('[required]').forEach(input => {
    const field = input.closest('.field');
    let ok = input.value.trim().length > 0;
    if(input.type === 'email'){
      ok = ok && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    }
    if(field){
      field.classList.toggle('has-error', !ok);
    }
    if(!ok) valid = false;
  });
  return valid;
}
document.querySelectorAll('form[data-validate]').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if(validateForm(form)){
      const success = form.parentElement.querySelector('.form-success') || form.querySelector('.form-success');
      form.reset();
      if(success){
        success.classList.add('is-visible');
        gsap.from(success, { opacity: 0, y: 10, duration: .5 });
      }
    }
  });
});

/* ---------------------------------------------------------
   13. LOGIN FORM — demo auth, writes the ONE session object
--------------------------------------------------------- */
const loginForm = document.querySelector('#login-form');
if(loginForm){
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!validateForm(loginForm)) return;
    const email = loginForm.querySelector('#login-email').value.trim();
    const roleField = loginForm.querySelector('#login-role');
    const role = roleField ? roleField.value : 'user';
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    Session.save({
      name: name,
      email: email,
      role: role,
      avatar: role === 'admin'
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&q=80&fit=crop&crop=faces'
        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&q=80&fit=crop&crop=faces'
    });
    window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  });
}

const authTabs = document.querySelectorAll('.auth-tabs button');
if(authTabs.length){
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('is-active'));
      document.querySelector(tab.getAttribute('data-panel')).classList.add('is-active');
    });
  });
}

/* ---------------------------------------------------------
   14. DASHBOARD SIDEBAR TOGGLE (mobile)
--------------------------------------------------------- */
const dashToggle = document.querySelector('[data-dash-toggle]');
const dashSidebar = document.querySelector('.dash-sidebar');
if(dashToggle && dashSidebar){
  dashToggle.addEventListener('click', () => dashSidebar.classList.toggle('is-open'));
}

/* ---------------------------------------------------------
   15. CHIP TABS (generic UI toggle, dashboards)
--------------------------------------------------------- */
document.querySelectorAll('.chip-tabs').forEach(group => {
  group.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
});
