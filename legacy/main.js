/* ═══════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('vis'), i * 55);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


/* ═══════════════════════════════════
   NAV
═══════════════════════════════════ */
const nav = document.getElementById('nav');
const ham = document.getElementById('ham');
const drawer = document.getElementById('drawer');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

ham.addEventListener('click', () => {
  ham.classList.toggle('open');
  drawer.classList.toggle('open');
});

function closeDrawer() {
  ham.classList.remove('open');
  drawer.classList.remove('open');
}
window.closeDrawer = closeDrawer;


/* ═══════════════════════════════════
   SMOOTH SCROLL
═══════════════════════════════════ */
function goto(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
}
window.goto = goto;

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#' && !this.hasAttribute('onclick')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) { window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' }); closeDrawer(); }
    }
  });
});


/* ═══════════════════════════════════
   COUNTER ANIMATION
═══════════════════════════════════ */
function animateCounters() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current);
    }, 22);
  });
}

const statsStrip = document.querySelector('.stats-strip');
if (statsStrip) {
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { animateCounters(); io.disconnect(); }
  }, { threshold: 0.4 });
  io.observe(statsStrip);
}


/* ═══════════════════════════════════
   FAQ
═══════════════════════════════════ */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});


/* ═══════════════════════════════════
   ACTIVE NAV
═══════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 200) current = s.id; });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
});


/* ═══════════════════════════════════
   CONTACT FORM
═══════════════════════════════════ */
const form = document.getElementById('contactForm');
const msg  = document.getElementById('formMsg');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn-submit');
    const txt = btn.querySelector('.bs-txt');
    const orig = txt.textContent;

    btn.disabled = true;
    txt.textContent = 'Enviando...';
    msg.style.display = 'none';

    try {
      // TODO: Replace with real endpoint
      // const res = await fetch('/api/contact', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      await new Promise(r => setTimeout(r, 1500));
      msg.className = 'form-msg ok';
      msg.textContent = '¡Mensaje enviado! Te contactaremos pronto. 🚀';
      msg.style.display = 'block';
      form.reset();
    } catch {
      msg.className = 'form-msg err';
      msg.textContent = 'Hubo un error. Escríbenos a hola@psychesai.com';
      msg.style.display = 'block';
    } finally {
      btn.disabled = false;
      txt.textContent = orig;
    }
  });
}

/* Form input validation feedback */
document.querySelectorAll('.cf input, .cf select, .cf textarea').forEach(inp => {
  inp.addEventListener('blur', () => {
    if (inp.required && !inp.value.trim()) inp.style.borderColor = 'rgba(220,53,69,.45)';
  });
  inp.addEventListener('focus', () => { inp.style.borderColor = ''; });
  inp.addEventListener('input', () => {
    if (inp.required && inp.value.trim()) inp.style.borderColor = 'rgba(5,150,105,.45)';
  });
});


/* ═══════════════════════════════════
   WHATSAPP WIDGET
═══════════════════════════════════ */
const wspBtn    = document.getElementById('wspBtn');
const wspBubble = document.getElementById('wspBubble');
const wspNotif  = document.querySelector('.wsp-notif');
let bubbleOpen  = false;

function toggleBubble() {
  bubbleOpen ? closeBubble() : openBubble();
}

function openBubble() {
  if (!wspBubble || !wspBtn) return;
  bubbleOpen = true;
  wspBubble.classList.add('show');
  wspBtn.classList.add('open');
  if (wspNotif) wspNotif.classList.add('hidden');
}

function closeBubble() {
  if (!wspBubble || !wspBtn) return;
  bubbleOpen = false;
  wspBubble.classList.remove('show');
  wspBtn.classList.remove('open');
}

// Abre automáticamente la burbuja a los 4 segundos
setTimeout(() => {
  if (!bubbleOpen) openBubble();
}, 4000);

window.toggleBubble = toggleBubble;
window.closeBubble  = closeBubble;
