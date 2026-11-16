/* Cursos Psyches · portada con tablero vivo, galería con fotos, curso, cuenta, compra y lector.
   El contenido de los cursos llega de la API solo a quien compró. Sin emojis: iconos SVG. */
(function () {
  'use strict';
  var API = 'https://studio.goodcallia.com/api/cursos';
  var LS_TOK = 'cur_tok', LS_PAGO = 'cur_pago', LS_HECHAS = 'cur_hechas_';
  var app = document.getElementById('app');
  var velo = document.getElementById('velo'), modal = document.getElementById('modal');
  var btnCuenta = document.getElementById('btnCuenta');
  var estado = { cat: null, yo: null, curso: {}, filtro: 'todos' };
  var VIAS = ['Antes de empezar', 'Vía 1 · Personal', 'Vía 2 · Negocio', 'Vía 3 · Pro'];
  var NVIA = ['Personal', 'Negocio', 'Pro'];
  var timers = [];

  /* ---------- iconos ---------- */
  var P = {
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    atras: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    bajar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    carro: '<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    libro: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5"/>',
    chispa: '<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z"/>',
    codigo: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>'; }
  document.getElementById('cerrarModal').innerHTML = ic('x');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem(LS_TOK); } catch (e) { return null; } }
  function guardarTok(t) { try { t ? localStorage.setItem(LS_TOK, t) : localStorage.removeItem(LS_TOK); } catch (e) {} }
  function limpiarTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }
  function luego(f, ms) { var t = setTimeout(f, ms); timers.push(t); return t; }
  function cada(sel, f) { Array.prototype.forEach.call(app.querySelectorAll(sel), f); }

  function api(ruta, opc) {
    opc = opc || {};
    var h = { 'Content-Type': 'application/json' }, t = tok();
    if (t) h.Authorization = 'Bearer ' + t;
    return fetch(API + ruta, { method: opc.metodo || 'GET', headers: h, body: opc.cuerpo ? JSON.stringify(opc.cuerpo) : undefined })
      .then(function (r) {
        if (opc.texto) return r.ok ? r.text() : r.json().then(function (d) { throw d; });
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (r.status === 401 && t) { guardarTok(null); estado.yo = null; pintarCuenta(); }
          if (!r.ok) { d = d || {}; d.status = r.status; throw d; }
          return d;
        });
      });
  }

  function tiene(slug) { var c = estado.yo && estado.yo.cursos || []; return c.indexOf('*') >= 0 || c.indexOf(slug) >= 0; }
  function pintarCuenta() {
    if (estado.yo) { var u = estado.yo.cuenta.usuario; btnCuenta.className = 'btn-cuenta dentro'; btnCuenta.innerHTML = '<span class="av">' + esc(u.charAt(0).toUpperCase()) + '</span><span class="nom">' + esc(u) + ' · salir</span>'; }
    else { btnCuenta.className = 'btn-cuenta'; btnCuenta.textContent = 'Entrar'; }
  }
  btnCuenta.addEventListener('click', function () {
    if (estado.yo) { guardarTok(null); estado.yo = null; estado.curso = {}; pintarCuenta(); ruta(); }
    else { compraPendiente = null; abrirCuenta('google'); }
  });

  function viaTxt(v) { var p = v.split(':'); return (p[1] || p[0]).trim(); }
  function foto(slug) { return 'img/' + slug + '.webp'; }

  /* aparición al hacer scroll, escalonada */
  function alVer(sel) {
    var els = app.querySelectorAll(sel);
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(els, function (e) { e.classList.add('vista'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      var n = 0;
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        el.style.transitionDelay = (n++ * 0.07) + 's';
        el.classList.add('vista');
        setTimeout(function () { el.style.transitionDelay = ''; }, 900);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(els, function (e) { io.observe(e); });
  }

  /* inclinación 3D de las tarjetas con el mouse */
  function inclinar(el) {
    if (!window.matchMedia('(hover: hover)').matches) return;
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg) translateY(-6px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  }

  /* ---------- portada ---------- */
  var TAREAS = [
    ['Responder a María: torta para mañana', 'M', '#e2445c'],
    ['Publicar el video en TikTok', 'T', '#a25ddd'],
    ['Agendar cita de las 4 p. m.', 'A', '#579bfc'],
    ['Enviar catálogo a 12 clientes', 'C', '#fdab3d'],
    ['Recordar pago pendiente a Luis', 'L', '#00c875']
  ];
  var CHAT = [
    ['cli', 'Hola, ¿tienen torta de chocolate para mañana?'],
    ['bot', 'Sí, la entera está a S/ 85. ¿Para cuántas personas?'],
    ['cli', 'Para 20, en Surco'],
    ['bot', 'Perfecto, el delivery a Surco es S/ 10. Te paso el Yape para separarla.']
  ];
  function tableroVivo() {
    var cuerpo = document.getElementById('vivoFilas'); if (!cuerpo) return;
    // sin style="" en el HTML: la CSP no deja estilos en línea; se ponen por CSSOM
    cuerpo.innerHTML = TAREAS.map(function (t) {
      return '<div class="vf"><span class="n">' + esc(t[0]) + '</span><span class="p"><i>' + t[1] + '</i></span><span class="st">Trabajando</span></div>';
    }).join('');
    Array.prototype.forEach.call(cuerpo.querySelectorAll('.vf'), function (f, i) { f.style.animationDelay = (0.5 + i * 0.12) + 's'; });
    Array.prototype.forEach.call(cuerpo.querySelectorAll('.p i'), function (f, i) { f.style.background = TAREAS[i][2]; });
    var sts = cuerpo.querySelectorAll('.st'), k = 0;
    (function paso() {
      if (!document.getElementById('vivoFilas')) return;
      if (k < sts.length) {
        var s = sts[k++]; s.classList.add('listo', 'pop'); s.textContent = 'Listo';
        luego(function () { s.classList.remove('pop'); }, 500);
        luego(paso, 1300);
      } else {
        luego(function () { k = 0; Array.prototype.forEach.call(sts, function (x) { x.classList.remove('listo'); x.textContent = 'Trabajando'; }); luego(paso, 1100); }, 2400);
      }
    })();
  }
  function chatVivo() {
    var caja = document.getElementById('chatMsgs'); if (!caja) return;
    var i = 0;
    function poner(m) {
      var b = document.createElement('div'); b.className = 'burbuja' + (m[0] === 'bot' ? ' yo' : ''); b.textContent = m[1]; caja.appendChild(b);
      while (caja.children.length > 4) caja.removeChild(caja.firstChild);
    }
    (function sig() {
      if (!document.getElementById('chatMsgs')) return;
      if (i >= CHAT.length) { luego(function () { caja.innerHTML = ''; i = 0; sig(); }, 3200); return; }
      var m = CHAT[i++];
      if (m[0] === 'bot') {
        var t = document.createElement('div'); t.className = 'burbuja yo escribiendo'; t.innerHTML = '<b></b><b></b><b></b>'; caja.appendChild(t);
        luego(function () { t.remove(); poner(m); luego(sig, 1500); }, 1300);
      } else { poner(m); luego(sig, 1100); }
    })();
  }

  function tarjeta(k, c, i) {
    var pill = !k.listo ? '<span class="pill pr">' + ic('reloj') + 'Pronto</span>' : (tiene(k.slug) ? '<span class="pill tuyo">Tuyo</span>' : '<span class="pill ok">Disponible</span>');
    return '<article class="tarjeta ' + (k.listo ? 'listo' : 'pronto') + (i === 0 && k.listo ? ' destacada' : '') + '" data-slug="' + esc(k.slug) + '" data-listo="' + (k.listo ? 1 : 0) + '"' + (k.listo ? ' tabindex="0" role="link" aria-label="' + esc(k.titulo) + '"' : '') + '>' +
      '<div class="foto"><img src="' + foto(k.slug) + '" alt="" loading="lazy" decoding="async">' + pill +
      '<span class="precio-tag">S/ ' + c.precio + '</span><span class="num">' + String(i + 1).padStart(2, '0') + '</span></div>' +
      '<div class="cuerpo-t"><h3>' + esc(k.titulo) + '</h3><p>' + esc(k.bajada) + '</p>' +
      '<div class="vias">' + k.vias.map(function (v, j) { return '<span class="v' + (j + 1) + '" data-d="' + esc(viaTxt(v)) + '">' + NVIA[j] + '</span>'; }).join('') + '</div>' +
      '<div class="detalle-via">Pasa el mouse por cada vía</div>' +
      (k.listo ? '<span class="ir">' + (tiene(k.slug) ? 'Abrir mi curso' : 'Ver el curso') + ic('flecha') + '</span>' : '<span class="ir">Incluido en el paquete de los 8</span>') +
      '</div></article>';
  }
  function pintarGaleria() {
    var c = estado.cat, g = document.getElementById('galeria'); if (!g) return;
    var lista = c.cursos.map(function (k, i) { return { k: k, i: i }; }).filter(function (x) {
      return estado.filtro === 'todos' || (estado.filtro === 'listos' ? x.k.listo : !x.k.listo);
    });
    g.innerHTML = lista.map(function (x) { return tarjeta(x.k, c, x.i); }).join('');
    var tactil = !window.matchMedia('(hover: hover)').matches;
    Array.prototype.forEach.call(g.querySelectorAll('.tarjeta'), function (el) {
      inclinar(el);
      var det = el.querySelector('.detalle-via'), base = tactil ? 'Toca cada vía para ver qué aprendes' : det.textContent;
      det.textContent = base;
      Array.prototype.forEach.call(el.querySelectorAll('.vias span'), function (s) {
        var ver = function () { det.textContent = s.textContent + ': ' + s.getAttribute('data-d'); };
        s.addEventListener('mouseenter', ver);
        s.addEventListener('mouseleave', function () { det.textContent = base; });
        s.addEventListener('click', function (e) { if (tactil) { e.stopPropagation(); ver(); } });
      });
      if (el.getAttribute('data-listo') === '1') {
        var ir = function () { location.hash = '#/curso/' + el.getAttribute('data-slug'); };
        el.addEventListener('click', ir);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') ir(); });
      }
    });
    alVer('.tarjeta');
  }

  function portada() {
    var c = estado.cat, nListos = c.cursos.filter(function (k) { return k.listo; }).length;
    app.innerHTML =
      '<section class="heroe"><div>' +
      '<h1 class="aparece">Automatiza tu negocio con IA. <span class="resalta">Aunque nunca hayas programado.</span></h1>' +
      '<p class="sub aparece">Cursos de lo que construimos de verdad: bots de WhatsApp, redes que publican solas, vídeos con IA. Cada curso va de tu primer intento a nivel empresa, en tres vías.</p>' +
      '<div class="acciones aparece"><a class="btn" href="#cursos">Ver los cursos ' + ic('flecha') + '</a><button class="btn sec" type="button" data-comprar="pack">Los 8 por S/ ' + c.pack.precio + '</button></div>' +
      '<div class="stats aparece"><div><b>S/ ' + c.precio + '</b><span>por curso, pago único</span></div><div><b>3 vías</b><span>personal, negocio y pro</span></div><div><b>Modo IA</b><span>tu IA te guía paso a paso</span></div></div>' +
      '</div><div class="escena aparece">' +
      '<div class="foto"><img src="img/hero.webp" alt=""></div>' +
      '<div class="vivo"><div class="tit">Tu negocio en automático <span>hoy</span></div><div class="grupo-t">Lo que hace tu bot mientras duermes</div><div id="vivoFilas"></div></div>' +
      '<div class="chat"><div class="cab"><i></i><div>Pastelería Dulce Hogar<small>en línea</small></div></div><div class="msgs" id="chatMsgs"></div></div>' +
      '</div></section>' +

      '<section class="seccion" id="cursos"><div class="encab"><h2 class="grande">Elige tu curso</h2>' +
      '<div class="filtros"><button type="button" data-f="todos">Todos (' + c.cursos.length + ')</button><button type="button" data-f="listos">Disponibles (' + nListos + ')</button><button type="button" data-f="pronto">Próximamente (' + (c.cursos.length - nListos) + ')</button></div></div>' +
      '<div class="galeria" id="galeria"></div></section>' +

      '<section class="seccion"><div class="encab"><h2 class="grande">Cómo funciona</h2><p>Sin mensualidades y sin videos de 40 horas.</p></div><div class="pasos">' +
      '<div class="paso"><div class="ico">' + ic('carro') + '</div><h3>Compras una vez</h3><p>S/ ' + c.precio + ' con tarjeta. El curso queda en tu cuenta para siempre, con sus actualizaciones.</p></div>' +
      '<div class="paso"><div class="ico">' + ic('libro') + '</div><h3>Eliges tu vía</h3><p>Personal para probar gratis, negocio para tu empresa o pro para hacerlo como las agencias.</p></div>' +
      '<div class="paso"><div class="ico">' + ic('robot') + '</div><h3>Tu IA lo arma contigo</h3><p>Descargas el archivo «modo IA», se lo das a Antigravity (gratis) y te guía y escribe el código.</p></div>' +
      '</div></section>' +

      '<section class="paquete"><div class="txt"><h3>Los 8 cursos por <em>S/ ' + c.pack.precio + '</em></h3>' +
      '<p>Incluye los que todavía no salen: te llegan a tu cuenta apenas estén listos.</p><button class="btn claro" type="button" data-comprar="pack">Quiero los 8 ' + ic('flecha') + '</button></div>' +
      '<div class="mosaico">' + c.cursos.map(function (k) { return '<img src="' + foto(k.slug) + '" alt="" loading="lazy">'; }).join('') + '</div></section>';

    cada('.heroe .aparece', function (el, i) { el.style.animationDelay = (0.05 + i * 0.1) + 's'; });
    cada('.filtros button', function (b) {
      b.classList.toggle('on', b.getAttribute('data-f') === estado.filtro);
      b.addEventListener('click', function () {
        estado.filtro = b.getAttribute('data-f');
        cada('.filtros button', function (x) { x.classList.toggle('on', x === b); });
        pintarGaleria();
      });
    });
    var ver = app.querySelector('a[href="#cursos"]');
    ver.addEventListener('click', function (e) { e.preventDefault(); document.getElementById('cursos').scrollIntoView({ behavior: 'smooth' }); });
    pintarGaleria();
    enlazarCompras();
    tableroVivo(); chatVivo();
  }

  /* ---------- demo en vivo del bot modular (página pública y lección 0-1) ---------- */
  var DEMO_MODS = [['catalogo', 'Catálogo'], ['pedidos', 'Pedidos'], ['delivery', 'Delivery'], ['horarios', 'Horarios'], ['reclamos', 'Reclamos']];
  var DEMO_SUG = ['¿Qué tortas tienen y cuánto cuestan?', 'Quiero la de chocolate para el sábado, ¿llegan a San Borja?', '¿Abren el domingo?', 'La torta llegó aplastada, quiero hablar con alguien'];
  function htmlDemo() {
    return '<div class="demo" id="demo"><div class="demo-mods"><p class="demo-t">Módulos del cerebro</p><span class="mod fijo" data-m="identidad"><i></i>Identidad<small>siempre</small></span>' +
      DEMO_MODS.map(function (m) { return '<button type="button" class="mod on" data-m="' + m[0] + '" aria-pressed="true"><i></i>' + m[1] + '<small>encendido</small></button>'; }).join('') +
      '<p class="demo-n">Toca un módulo para apagarlo y pregúntale de ese tema: verás que deja de saberlo y no inventa.</p></div>' +
      '<div class="demo-tel"><div class="tel-cab"><span class="av">D</span><div><b>Pastelería Dulce Hogar</b><small id="demoEstado">en línea</small></div></div>' +
      '<div class="tel-chat" id="demoChat"><div class="burb bot">Hola, soy Carla de Pastelería Dulce Hogar. ¿En qué te ayudo?</div></div>' +
      '<div class="tel-sug" id="demoSug">' + DEMO_SUG.map(function (s) { return '<button type="button">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<form class="tel-in" id="demoForm"><input id="demoTxt" maxlength="300" placeholder="Escribe como cliente…" autocomplete="off"><button type="submit" aria-label="Enviar">' + ic('flecha') + '</button></form></div></div>';
  }
  function activarDemo() {
    var raiz = document.getElementById('demo'); if (!raiz) return;
    var chat = document.getElementById('demoChat'), form = document.getElementById('demoForm'), txt = document.getElementById('demoTxt'), est = document.getElementById('demoEstado');
    var hist = [{ rol: 'bot', texto: 'Hola, soy Carla de Pastelería Dulce Hogar. ¿En qué te ayudo?' }], ocupado = false;
    Array.prototype.forEach.call(raiz.querySelectorAll('button.mod'), function (b) {
      b.addEventListener('click', function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('small').textContent = on ? 'encendido' : 'apagado'; });
    });
    function burbuja(quien, t, mods) {
      var d = document.createElement('div'); d.className = 'burb ' + quien; d.textContent = t;
      if (mods) { var m = document.createElement('div'); m.className = 'usados'; m.innerHTML = mods.length ? mods.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') : '<span class="solo">solo identidad</span>'; d.appendChild(m); }
      chat.appendChild(d); chat.scrollTop = chat.scrollHeight; return d;
    }
    function encender(mods) {
      Array.prototype.forEach.call(raiz.querySelectorAll('.mod'), function (b) { b.classList.remove('usa'); if (mods.indexOf(b.getAttribute('data-m')) >= 0 || b.getAttribute('data-m') === 'identidad') { void b.offsetWidth; b.classList.add('usa'); } });
    }
    function enviar(t) {
      t = String(t || '').trim(); if (!t || ocupado) return;
      ocupado = true; burbuja('cli', t); hist.push({ rol: 'cliente', texto: t }); txt.value = ''; est.textContent = 'escribiendo…';
      var esc2 = document.createElement('div'); esc2.className = 'burb bot escribe'; esc2.innerHTML = '<i></i><i></i><i></i>'; chat.appendChild(esc2); chat.scrollTop = chat.scrollHeight;
      var apagados = Array.prototype.map.call(raiz.querySelectorAll('button.mod:not(.on)'), function (b) { return b.getAttribute('data-m'); });
      api('/demo', { metodo: 'POST', cuerpo: { mensajes: hist.slice(-8), apagados: apagados } }).then(function (d) {
        esc2.remove(); burbuja('bot', d.respuesta, d.modulos); hist.push({ rol: 'bot', texto: d.respuesta }); encender(d.modulos);
      }).catch(function (d) { esc2.remove(); burbuja('bot err', (d && d.error) || 'La demo no respondió. Prueba otra vez.'); })
        .then(function () { ocupado = false; est.textContent = 'en línea'; });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); enviar(txt.value); });
    Array.prototype.forEach.call(document.querySelectorAll('#demoSug button'), function (b) { b.addEventListener('click', function () { enviar(b.textContent); }); });
  }

  /* ---------- página pública del curso ---------- */
  var TIPO_V = { quiz: ['Preguntas', 'check'], mision: ['Misión real', 'robot'], url: ['Verificación en vivo', 'chispa'] };
  function paginaCurso(k) {
    var c = estado.cat, pagoVolvio = /[?&]pago=listo/.test(location.search), tem = k.temario || [];
    var mins = tem.reduce(function (a, t) { return a + (t.min || 0); }, 0);
    var vias = [0, 1, 2, 3].map(function (v) {
      var ls = tem.filter(function (t) { return t.via === v; }); if (!ls.length) return '';
      var lema = v === 0 ? 'Lo que vas a construir, tu asistente y el cerebro de IA' : viaTxt(k.vias[v - 1]);
      return '<div class="via-c v' + v + '"><div class="tope"><small>' + esc(VIAS[v]) + ' · ' + ls.length + (ls.length === 1 ? ' sección' : ' secciones') + '</small><h3>' + esc(lema) + '</h3></div>' +
        '<ol>' + ls.map(function (t) { return '<li><span>' + esc(t.titulo) + '</span><em>' + ic('reloj') + (t.min || 5) + ' min</em></li>'; }).join('') + '</ol></div>';
    }).join('');
    app.innerHTML =
      '<p class="migas"><a href="#/">Cursos</a>' + ic('flecha') + esc(k.titulo) + '</p>' +
      (pagoVolvio ? '<div class="aviso" id="avisoPago">Revisando tu pago…</div>' : '') +
      '<section class="cab-curso"><div>' +
      '<h1 class="aparece">' + esc(k.titulo) + '</h1><p class="bajada aparece">' + esc(k.bajada) + '</p>' +
      '<div class="chips aparece"><span class="chip">' + ic('check') + tem.length + ' secciones con vídeo</span><span class="chip">' + ic('check') + 'Misiones que tu propio bot verifica</span><span class="chip">' + ic('check') + 'Código completo y probado</span><span class="chip">' + ic('check') + 'Cada lección en texto para tu IA</span><span class="chip">' + ic('check') + 'Con el asistente que prefieras</span></div>' +
      '<div class="compra-linea aparece" id="compraLinea"><span class="cifra"><small>S/</small>' + c.precio + '</span>' +
      '<button class="btn verde" type="button" data-comprar="' + esc(k.slug) + '">' + ic('carro') + 'Comprar el curso</button>' +
      '<button class="btn sec" type="button" data-ya="1">Ya lo compré</button>' +
      '<span class="det">Pago único · con tarjeta: US$ ' + c.usd + ' · ' + Math.round(mins / 6) / 10 + ' h de vídeo y práctica</span></div>' +
      '</div><div class="foto-curso aparece"><div class="marco"><img src="' + foto(k.slug) + '" alt=""></div>' +
      '<div class="flotante"><div class="ico">' + ic('robot') + '</div><div><b>Modular</b><span>el bot elige qué sabe en cada mensaje</span></div></div></div></section>' +
      '<section class="seccion"><div class="encab"><h2 class="grande">Pruébalo: este es el bot que vas a construir</h2><p>Es real, no un vídeo. Apaga módulos y mira cómo cambia lo que sabe.</p></div>' + htmlDemo() + '</section>' +
      '<section class="seccion"><div class="encab"><h2 class="grande">Así se aprende aquí</h2><p>No es un PDF. Cada sección tiene vídeo, práctica y una prueba antes de pasar a la siguiente.</p></div>' +
      '<div class="como"><div><b>' + ic('libro') + 'Vídeo de cada pantalla</b><span>Hetzner, Cloudflare, Zernio, Google Cloud, tu proveedor de IA: te mostramos cada clic, no «entra ahí».</span></div>' +
      '<div><b>' + ic('robot') + 'Misiones que tu bot cumple</b><span>Tu bot le avisa al curso cuando responde de verdad. Sin bot funcionando, no avanzas.</span></div>' +
      '<div><b>' + ic('check') + 'Preguntas de situación</b><span>«Tu bot dejó de responder y sale 402, ¿qué pasó?». Nada de memoria tonta.</span></div>' +
      '<div><b>' + ic('codigo') + 'Texto para tu IA</b><span>Cada lección se descarga en texto: se la das a Claude Code, Antigravity, Cursor o ChatGPT y te guía.</span></div></div></section>' +
      '<section class="seccion"><div class="encab"><h2 class="grande">El temario</h2><p>Cada vía termina con algo funcionando. Si te quedas en la primera, ya te sirvió.</p></div>' +
      '<div class="vias-grandes cuatro">' + vias + '</div></section>' +
      '<div class="barra-compra" id="barraCompra"><div><b>' + esc(k.titulo) + '</b><span>S/ ' + c.precio + ' · pago único</span></div><button class="btn verde" type="button" data-comprar="' + esc(k.slug) + '">Comprar</button></div>';
    cada('.aparece', function (el, i) { el.style.animationDelay = (0.05 + i * 0.08) + 's'; });
    alVer('.via-c');
    var ya = app.querySelector('[data-ya]');
    if (ya) ya.addEventListener('click', function () { abrirCuenta('google'); });
    var barra = document.getElementById('barraCompra'), linea = document.getElementById('compraLinea');
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { barra.classList.toggle('ver', !e[0].isIntersecting && e[0].boundingClientRect.top < 0); }).observe(linea);
    enlazarCompras(); activarDemo();
    window.scrollTo(0, 0);
    if (pagoVolvio) revisarPago();
  }

  /* ---------- el curso por dentro ---------- */
  var IAS = [['claude', 'Claude Code'], ['antigravity', 'Antigravity'], ['cursor', 'Cursor'], ['chatgpt', 'ChatGPT / Gemini']];
  function miIA() { try { return localStorage.getItem('cur_ia') || 'claude'; } catch (e) { return 'claude'; } }
  function leerPasos(s) { try { return JSON.parse(localStorage.getItem('cur_pasos_' + s) || '{}'); } catch (e) { return {}; } }
  function guardarPasos(s, h) { try { localStorage.setItem('cur_pasos_' + s, JSON.stringify(h)); } catch (e) {} }
  function copiar(texto, btn) {
    var fin = function () { var t = btn.innerHTML; btn.innerHTML = ic('check') + 'Copiado'; btn.classList.add('ok'); setTimeout(function () { btn.innerHTML = t; btn.classList.remove('ok'); }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(fin, function () {}); else fin();
  }
  function bloque(b, i, lid) {
    if (b.t === 'p') return '<div class="b-p">' + b.h + '</div>';
    if (b.t === 'h') return '<h3 class="b-h">' + esc(b.h) + '</h3>';
    if (b.t === 'ojo') return '<div class="ojo">' + b.h + '</div>';
    if (b.t === 'tabla') return '<div class="b-tabla">' + b.h + '</div>';
    if (b.t === 'demo') return htmlDemo();
    if (b.t === 'flujo') return '<div class="flujo">' + b.pasos.map(function (x, j) { return '<span>' + esc(x) + '</span>' + (j < b.pasos.length - 1 ? ic('flecha') : ''); }).join('') + '</div>';
    if (b.t === 'pasos') return '<ol class="pasos-c">' + b.items.map(function (x, j) { var id = lid + ':' + i + ':' + j; return '<li><label><input type="checkbox" data-paso="' + esc(id) + '"><span class="caja">' + ic('check') + '</span><span><b>' + x.t + '</b><span class="det">' + x.h + '</span></span></label></li>'; }).join('') + '</ol>';
    if (b.t === 'codigo') {
      var largo = b.code.split('\n').length > 28;
      return '<div class="cod' + (largo ? ' largo' : '') + '"><div class="cod-cab"><span>' + ic('codigo') + esc(b.archivo) + '</span><button type="button" class="copiar" data-copiar="' + i + '">' + ic('bajar') + 'Copiar</button></div><pre><code>' + esc(b.code) + '</code></pre>' +
        (largo ? '<button type="button" class="ver-todo">Ver todo el archivo (' + b.code.split('\n').length + ' líneas)</button>' : '') + '</div>';
    }
    if (b.t === 'prompt') return '<div class="prompt"><div class="cod-cab"><span>' + ic('chispa') + 'Pídeselo a tu IA</span><button type="button" class="copiar" data-copiar="' + i + '">' + ic('bajar') + 'Copiar</button></div><p>' + esc(b.texto) + '</p></div>';
    if (b.t === 'ia') return '<div class="ia-tabs"><div class="ia-sel">' + IAS.map(function (x) { return '<button type="button" data-ia="' + x[0] + '" class="' + (x[0] === miIA() ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      IAS.map(function (x) { return '<div class="ia-p" data-iap="' + x[0] + '"' + (x[0] === miIA() ? '' : ' hidden') + '>' + (b.por[x[0]] || '') + '</div>'; }).join('') + '</div>';
    if (b.t === 'opciones') return '<div class="prov">' + b.items.map(function (x) {
      return '<article class="prov-c"><h4>' + esc(x.nombre) + '</h4><p class="para">' + esc(x.para) + '</p>' +
        '<dl><dt>Base</dt><dd><code>' + esc(x.base) + '</code></dd><dt>Modelo</dt><dd><code>' + esc(x.modelo) + '</code></dd><dt>Costo</dt><dd>' + esc(x.costo) + '</dd></dl>' +
        '<p class="caso"><b>Caso real:</b> ' + esc(x.caso) + '</p><p class="bien">' + ic('check') + esc(x.bien) + '</p><p class="mal">' + ic('x') + esc(x.mal) + '</p></article>';
    }).join('') + '</div>';
    return '';
  }

  function verificacion(k, l, d, hecha) {
    var v = l.verificacion || {};
    if (hecha) return '<section class="verif hecha"><div class="sello">' + ic('check') + '</div><div><h3>Sección aprobada</h3><p>' + (v.tipo === 'mision' ? 'Tu bot cumplió la misión.' : v.tipo === 'url' ? 'Tu servidor respondió con tu código.' : 'Respondiste bien.') + ' Ya puedes seguir.</p></div></section>';
    if (v.tipo === 'quiz') return '<section class="verif"><h3>' + ic('check') + 'Comprueba lo que aprendiste</h3><p class="mini">Necesitas todas bien para pasar. Si fallas, te explicamos por qué.</p><form id="quiz">' +
      v.preguntas.map(function (q, i) { return '<fieldset class="preg" data-i="' + i + '"><legend>' + (i + 1) + '. ' + q.p + '</legend>' + q.ops.map(function (o, j) { return '<label class="op"><input type="radio" name="q' + i + '" value="' + j + '" required><span>' + o + '</span></label>'; }).join('') + '<p class="por" hidden></p></fieldset>'; }).join('') +
      '<button class="btn" type="submit">Revisar mis respuestas</button><p class="msg" id="quizMsg"></p></form></section>';
    var cod = '<div class="mi-cod"><span>Tu código de alumno</span><code id="miCod">' + esc(d.codigo) + '</code><button type="button" class="copiar" id="copCod">' + ic('bajar') + 'Copiar</button></div>' +
      '<p class="mini">Va en tu <code>.env</code> como <code>CURSO_CODIGO=' + esc(d.codigo) + '</code></p>';
    if (v.tipo === 'mision') return '<section class="verif mision"><h3>' + ic('robot') + 'Misión: que lo haga tu bot</h3><p>' + esc(v.pide) + '</p>' + cod +
      '<div class="esperando" id="esperando"><span class="pulso"></span>Esperando a tu bot… esta caja se pone en verde sola cuando lo logre.</div></section>';
    if (v.tipo === 'url') return '<section class="verif mision"><h3>' + ic('chispa') + 'Verificación en vivo</h3><p>' + esc(v.pide) + '</p>' + cod +
      '<form class="url-f" id="urlF"><input id="urlIn" type="url" inputmode="url" placeholder="https://bot.tudominio.com" required><button class="btn" type="submit">Comprobar mi servidor</button></form><p class="msg" id="urlMsg"></p></section>';
    return '';
  }

  function curso2(k, d, idLec) {
    limpiarTimers();
    var ls = d.lecciones, ids = ls.map(function (l) { return l.id; });
    var aprob = function (id) { return d.avance[id] === 'aprobado'; };
    var abierta = function (i) { return d.admin || i === 0 || aprob(ids[i - 1]) || aprob(ids[i]); };
    var primeraPendiente = ids.filter(function (id, i) { return abierta(i) && !aprob(id); })[0] || ids[0];
    var actual = ids.indexOf(idLec) >= 0 && abierta(ids.indexOf(idLec)) ? idLec : primeraPendiente;
    var i = ids.indexOf(actual), l = ls[i], hecha = aprob(actual);
    var n = ids.filter(aprob).length, pct = Math.round(100 * n / ids.length);
    var marcados = leerPasos(k.slug);
    var riel = '', viaAnt = -1;
    ls.forEach(function (x, j) {
      if (x.via !== viaAnt) { if (viaAnt >= 0) riel += '</ul>'; riel += '<p class="estacion v' + x.via + '">' + esc(d.vias[x.via] || VIAS[x.via]) + '</p><ul class="paradas">'; viaAnt = x.via; }
      var ok = aprob(x.id), ab = abierta(j);
      riel += '<li>' + (ab ? '<a href="#/curso/' + esc(k.slug) + '/' + esc(x.id) + '"' : '<span') + ' class="' + (x.id === actual ? 'activa ' : '') + (ok ? 'hecha ' : '') + (ab ? '' : 'cerrada') + '"><span class="ck">' + (ok ? ic('check') : ab ? '' : ic('candado')) + '</span><span>' + esc(x.titulo) + '<small>' + (x.min || 5) + ' min · ' + (TIPO_V[(x.verificacion || {}).tipo] || ['', ''])[0] + '</small></span>' + (ab ? '</a>' : '</span>') + '</li>';
    });
    riel += '</ul>';
    var base = API + '/curso/' + k.slug, sig = ids[i + 1], ant = ids[i - 1];
    var video = l.video ? '<video class="video" controls preload="metadata" playsinline src="' + API + '/video/' + esc(k.slug) + '/' + esc(l.id) + '?t=' + encodeURIComponent(d.rec) + '"></video>'
      : '<div class="video vacio"><div class="vv-in"><span class="vv-ico">' + ic('libro') + '</span><b>El vídeo de esta lección se está grabando</b><span>Mientras tanto, abajo tienes los pasos y el texto del vídeo.</span></div></div>';
    var esMovil = window.matchMedia('(max-width: 860px)').matches;
    var tieneDemo = l.bloques.some(function (b) { return b.t === 'demo'; });
    var nPasos = l.bloques.reduce(function (a, b) { return a + (b.t === 'pasos' ? b.items.length : 0); }, 0);
    var nCod = l.bloques.filter(function (b) { return b.t === 'codigo'; }).length;
    app.innerHTML =
      '<div class="curso-top"><p class="migas"><a href="#/">Cursos</a>' + ic('flecha') + esc(k.titulo) + '</p>' +
      '<div class="ct-der"><label class="sel-ia">Trabajo con <select id="selIA">' + IAS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === miIA() ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
      '<a class="btn sec chico" href="' + base + '/proyecto?t=' + encodeURIComponent(d.rec) + '">' + ic('bajar') + 'Proyecto (.zip)</a>' +
      '<a class="btn sec chico" href="' + base + '/texto?t=' + encodeURIComponent(d.rec) + '">' + ic('bajar') + 'Todo el curso para mi IA</a></div></div>' +
      '<div class="lector v2"><aside class="riel"><p class="avance">' + n + ' de ' + ids.length + ' lecciones aprobadas · ' + pct + ' %<span class="bateria"><span id="barra"></span></span></p>' +
      (esMovil ? '<details><summary>Ver todas las secciones</summary>' + riel + '</details>' : riel) + '</aside>' +
      '<article class="leccion"><span class="etq v' + l.via + '">' + esc(d.vias[l.via] || VIAS[l.via]) + '</span><h2>' + esc(l.titulo) + '</h2>' + video +
      '<div class="obj"><span>' + ic('chispa') + '<b>Al terminar:</b> ' + esc(l.objetivo) + '</span>' +
      '<a class="btn sec chico" href="' + base + '/texto?t=' + encodeURIComponent(d.rec) + '&amp;l=' + esc(l.id) + '">' + ic('bajar') + 'Esta lección para mi IA</a></div>' +
      (tieneDemo ? '<div class="cuerpo">' + htmlDemo() + '</div>' : '') +
      '<details class="material"' + (l.video ? '' : ' open') + '><summary>' + ic('codigo') + 'Pasos, código y texto del vídeo<small>' + nPasos + ' pasos · ' + nCod + ' archivos</small></summary>' +
      '<div class="cuerpo">' + l.bloques.map(function (b, j) { return b.t === 'demo' ? '' : bloque(b, j, l.id); }).join('') +
      '<details class="guion"><summary>' + ic('libro') + 'Leer lo que dice el vídeo</summary><p>' + esc(l.guion) + '</p></details></div></details>' +
      verificacion(k, l, d, hecha) +
      '<nav class="navl">' + (ant ? '<a class="btn sec" href="#/curso/' + esc(k.slug) + '/' + esc(ant) + '">' + ic('atras') + 'Anterior</a>' : '<span></span>') +
      (sig ? (hecha || d.admin ? '<a class="btn" href="#/curso/' + esc(k.slug) + '/' + esc(sig) + '">Siguiente' + ic('flecha') + '</a>' : '<span class="btn bloq">' + ic('candado') + 'Aprueba esta lección para seguir</span>')
        : (hecha ? '<span class="btn verde">' + ic('check') + 'Terminaste el curso</span>' : '<span></span>')) + '</nav></article></div>';

    requestAnimationFrame(function () { requestAnimationFrame(function () { var b = document.getElementById('barra'); if (b) b.style.width = pct + '%'; }); });
    // asistente elegido
    document.getElementById('selIA').addEventListener('change', function () { try { localStorage.setItem('cur_ia', this.value); } catch (e) {} curso2(k, d, actual); });
    cada('.ia-sel button', function (b) { b.addEventListener('click', function () { try { localStorage.setItem('cur_ia', b.getAttribute('data-ia')); } catch (e) {} curso2(k, d, actual); }); });
    // pasos marcables
    cada('[data-paso]', function (c) { c.checked = !!marcados[c.getAttribute('data-paso')]; c.addEventListener('change', function () { marcados[c.getAttribute('data-paso')] = c.checked ? 1 : 0; guardarPasos(k.slug, marcados); }); });
    // copiar código y prompts
    cada('[data-copiar]', function (b) { b.addEventListener('click', function () { var x = l.bloques[Number(b.getAttribute('data-copiar'))]; copiar(x.code || x.texto, b); }); });
    cada('.ver-todo', function (b) { b.addEventListener('click', function () { b.parentNode.classList.remove('largo'); b.remove(); }); });
    var cc = document.getElementById('copCod'); if (cc) cc.addEventListener('click', function () { copiar('CURSO_CODIGO=' + d.codigo, cc); });
    if (app.querySelector('#demo')) activarDemo();
    // preguntas
    var qf = document.getElementById('quiz');
    if (qf) qf.addEventListener('submit', function (e) {
      e.preventDefault();
      var resp = l.verificacion.preguntas.map(function (q, j) { var r = qf.querySelector('input[name=q' + j + ']:checked'); return r ? Number(r.value) : -1; });
      var btn = qf.querySelector('button[type=submit]'); btn.disabled = true;
      api('/curso/' + k.slug + '/quiz', { metodo: 'POST', cuerpo: { leccion: l.id, respuestas: resp } }).then(function (r) {
        r.resultado.forEach(function (x, j) {
          var fs = qf.querySelector('.preg[data-i="' + j + '"]'), por = fs.querySelector('.por');
          fs.classList.toggle('bien', x.bien); fs.classList.toggle('mal', !x.bien);
          por.hidden = x.bien; if (!x.bien) por.textContent = x.por;
        });
        var m = document.getElementById('quizMsg');
        if (r.aprobado) { d.avance[l.id] = 'aprobado'; m.textContent = 'Todo bien. Sección aprobada.'; m.className = 'msg bien'; luego(function () { curso2(k, d, l.id); }, 900); }
        else { m.textContent = 'Revisa las marcadas en rojo: te dejamos la explicación. Corrige y vuelve a enviar.'; m.className = 'msg mal'; }
      }).catch(function (x) { var m = document.getElementById('quizMsg'); m.textContent = (x && x.error) || 'No se pudo revisar. Prueba otra vez.'; m.className = 'msg mal'; })
        .then(function () { btn.disabled = false; });
    });
    // URL del servidor
    var uf = document.getElementById('urlF');
    if (uf) uf.addEventListener('submit', function (e) {
      e.preventDefault(); var m = document.getElementById('urlMsg'), btn = uf.querySelector('button'); btn.disabled = true; m.textContent = 'Entrando a tu servidor…'; m.className = 'msg';
      api('/curso/' + k.slug + '/url', { metodo: 'POST', cuerpo: { leccion: l.id, url: document.getElementById('urlIn').value } }).then(function (r) {
        if (r.ok) { d.avance[l.id] = 'aprobado'; m.textContent = 'Tu servidor respondió con tu código. Aprobado.'; m.className = 'msg bien'; luego(function () { curso2(k, d, l.id); }, 900); }
        else { m.textContent = r.error; m.className = 'msg mal'; }
      }).catch(function (x) { m.textContent = (x && x.error) || 'No se pudo comprobar.'; m.className = 'msg mal'; }).then(function () { btn.disabled = false; });
    });
    // misión: preguntamos cada 5 s si el bot ya avisó
    if (!hecha && (l.verificacion || {}).tipo === 'mision') (function mirar() {
      luego(function () {
        api('/curso/' + k.slug + '/avance').then(function (r) { d.avance = r.avance; d.misiones = r.misiones; if (r.avance[l.id] === 'aprobado') curso2(k, d, l.id); else mirar(); }).catch(mirar);
      }, 5000);
    })();
    window.scrollTo(0, 0);
  }

  /* ---------- lector antiguo (cursos en HTML) ---------- */
  function lector(k, datos, idLec) {
    if (datos.formato === 2) return curso2(k, datos, idLec);
    var doc = new DOMParser().parseFromString('<div>' + datos.html + '</div>', 'text/html');
    var secs = Array.prototype.slice.call(doc.querySelectorAll('section[data-id]'));
    var ids = secs.map(function (s) { return s.getAttribute('data-id'); });
    var actual = ids.indexOf(idLec) >= 0 ? idLec : ids[0];
    var sec = secs[ids.indexOf(actual)], via = Number(sec.getAttribute('data-via'));
    var i = ids.indexOf(actual), ant = ids[i - 1], sig = ids[i + 1];
    app.innerHTML = '<p class="migas"><a href="#/">Cursos</a>' + ic('flecha') + esc(k.titulo) + '</p><div class="lector"><aside class="riel"></aside><article class="leccion"><span class="etq v' + via + '">' + esc(VIAS[via]) + '</span><h2>' + esc(sec.getAttribute('data-titulo')) + '</h2><div class="cuerpo">' + sec.innerHTML + '</div>' +
      '<nav class="navl">' + (ant ? '<a class="btn sec" href="#/curso/' + esc(k.slug) + '/' + esc(ant) + '">' + ic('atras') + 'Anterior</a>' : '<span></span>') + (sig ? '<a class="btn" href="#/curso/' + esc(k.slug) + '/' + esc(sig) + '">Siguiente' + ic('flecha') + '</a>' : '') + '</nav></article></div>';
    window.scrollTo(0, 0);
  }

  function leerHechas(s) { try { return JSON.parse(localStorage.getItem(LS_HECHAS + s) || '{}'); } catch (e) { return {}; } }
  function guardarHechas(s, h) { try { localStorage.setItem(LS_HECHAS + s, JSON.stringify(h)); } catch (e) {} }
  function bajarIA(slug, btn) {
    btn.disabled = true; btn.textContent = 'Preparando…';
    api('/curso/' + slug + '/ia', { texto: true }).then(function (md) {
      var url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), a = document.createElement('a');
      a.href = url; a.download = 'curso-' + slug + '-modo-ia.md'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      btn.innerHTML = ic('check') + 'Descargado';
    }).catch(function () { btn.textContent = 'No se pudo, prueba otra vez'; }).then(function () { btn.disabled = false; });
  }

  /* ---------- compra ---------- */
  function enlazarCompras() {
    cada('[data-comprar]', function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); comprar(b.getAttribute('data-comprar'), b); });
    });
  }
  function comprar(producto, btn) {
    if (!estado.yo) { compraPendiente = producto; return abrirCuenta('google', function () { comprar(producto, btn); }); }
    if (producto !== 'pack' && tiene(producto)) { location.hash = '#/curso/' + producto + '/0-1'; return; }
    if (!estado.cat.tarjeta) return mensajeModal('Pago con tarjeta', 'El pago con tarjeta se está activando. Escríbenos a hola@psychesai.com y te damos acceso al toque.');
    var txt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Abriendo el pago…';
    api('/link', { metodo: 'POST', cuerpo: { producto: producto } }).then(function (d) {
      try { localStorage.setItem(LS_PAGO, String(d.pago)); } catch (e) {}
      location.href = d.url;
    }).catch(function (d) { btn.disabled = false; btn.innerHTML = txt; mensajeModal('No se pudo abrir el pago', (d && d.error) || 'Prueba en un momento.'); });
  }
  function revisarPago() {
    var id; try { id = localStorage.getItem(LS_PAGO); } catch (e) {}
    var av = document.getElementById('avisoPago');
    if (!id || !estado.yo) { if (av) av.textContent = 'Entra con tu Gmail para ver tu compra.'; return; }
    var intentos = 0;
    (function mirar() {
      api('/link/verificar', { metodo: 'POST', cuerpo: { pago: Number(id) } }).then(function (d) {
        if (d.pagado) {
          try { localStorage.removeItem(LS_PAGO); } catch (e) {}
          estado.yo = d; pintarCuenta();
          history.replaceState(null, '', location.pathname + location.hash);
          if (av) av.textContent = 'Listo, el curso ya es tuyo.';
          setTimeout(ruta, 900);
        } else if (++intentos < 8) { setTimeout(mirar, 4000); }
        else if (av) av.textContent = 'Tu pago todavía no aparece. Si ya pagaste, recarga en unos minutos: se activa solo.';
      }).catch(function () { if (av) av.textContent = 'No pudimos revisar el pago. Recarga la página en un momento.'; });
    })();
  }

  /* ---------- cuenta (modal) ---------- */
  var despues = null;
  function abrirModal(html) { modal.innerHTML = html; velo.hidden = false; var f = modal.querySelector('input'); if (f) f.focus(); }
  function cerrarModal() { velo.hidden = true; modal.innerHTML = ''; despues = null; }
  document.getElementById('cerrarModal').addEventListener('click', cerrarModal);
  velo.addEventListener('click', function (e) { if (e.target === velo) cerrarModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !velo.hidden) cerrarModal(); });
  function mensajeModal(t, p) { abrirModal('<h2 id="modalTitulo">' + esc(t) + '</h2><p class="mini">' + esc(p) + '</p><button class="btn" type="button" id="okM">Entendido</button>'); document.getElementById('okM').addEventListener('click', cerrarModal); }

  var PUENTE = 'https://canvas.psychesai.com/entrar-cursos/';
  var compraPendiente = null;
  function irAGoogle() {
    var r = (location.hash.replace(/^#/, '') || '/');
    if (!/^\/[a-z0-9\/-]*$/.test(r)) r = '/';
    location.href = PUENTE + '?volver=' + encodeURIComponent(r) + (compraPendiente ? '&compra=' + encodeURIComponent(compraPendiente) : '');
  }
  /* Vuelta del puente de Gmail: #g=<id_token>&r=<ruta>&c=<compra> */
  function vueltaGoogle() {
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('g=') !== 0) return null;
    var q = new URLSearchParams(h), cred = q.get('g'), r = q.get('r') || '/', c = q.get('c') || '';
    if (!/^\/[a-z0-9\/-]*$/.test(r)) r = '/';
    history.replaceState(null, '', location.pathname + location.search + '#' + r);
    return api('/google', { metodo: 'POST', cuerpo: { credencial: cred } }).then(function (d) {
      guardarTok(d.token); delete d.token; return { yo: d, compra: /^[a-z0-9-]{1,30}$/.test(c) ? c : '' };
    }).catch(function (d) { return { error: (d && d.error) || 'No se pudo entrar con Gmail' }; });
  }
  function abrirCuenta(modo, cb) {
    if (cb) despues = cb;
    if (modo === 'crear') modo = 'google';
    if (modo === 'google') {
      abrirModal('<h2 id="modalTitulo">Entra con tu Gmail</h2><p class="mini">Un clic y listo: tu cuenta se crea sola y ahí quedan tus cursos. Sin contraseñas ni códigos.</p>' +
        '<button class="btn-google" type="button" id="irGoogle"><svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continuar con Google</span></button><p class="msg" id="msg"></p>' +
        '<button class="enlace" type="button" data-m="entrar">Tengo usuario y contraseña</button>');
      modal.querySelector('[data-m]').addEventListener('click', function () { abrirCuenta('entrar'); });
      document.getElementById('irGoogle').addEventListener('click', irAGoogle);
      return;
    }
    var pest = '<div class="pest"><button type="button" data-m="entrar" class="' + (modo === 'entrar' ? 'on' : '') + '">Entrar</button><button type="button" data-m="google">Con Gmail</button></div>';
    var cuerpo;
    if (modo === 'entrar') {
      cuerpo = '<h2 id="modalTitulo">Entra</h2><p class="mini">Si te dimos usuario y contraseña. Lo normal es entrar con Gmail.</p>' + pest +
        '<form id="f"><label class="campo"><span>Usuario o correo</span><input name="usuario" autocomplete="username" required></label>' +
        '<label class="campo"><span>Contraseña</span><input name="clave" type="password" autocomplete="current-password" required></label>' +
        '<button class="btn" type="submit">Entrar</button></form><button class="enlace" type="button" data-m="olvide">Olvidé mi contraseña</button>';
    } else if (modo === 'crear') {
      cuerpo = '<h2 id="modalTitulo">Crea tu cuenta</h2><p class="mini">Aquí quedan tus cursos. Te mandamos un código al correo para confirmar que es tuyo.</p>' + pest +
        '<form id="f"><label class="campo"><span>Usuario</span><input name="usuario" autocomplete="username" pattern="[a-z0-9._\\-]{3,30}" title="De 3 a 30: minúsculas, números, punto o guion" required></label>' +
        '<label class="campo"><span>Correo</span><input name="email" type="email" autocomplete="email" required></label>' +
        '<label class="campo"><span>Contraseña (mínimo 8)</span><input name="clave" type="password" minlength="8" autocomplete="new-password" required></label>' +
        '<div id="pasoCodigo" hidden><label class="campo"><span>Código que llegó a tu correo</span><input name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label></div>' +
        '<button class="btn" type="submit" id="enviar">Mandarme el código</button></form>';
    } else {
      cuerpo = '<h2 id="modalTitulo">Nueva contraseña</h2><p class="mini">Te mandamos un código a tu correo.</p>' +
        '<form id="f"><label class="campo"><span>Correo de tu cuenta</span><input name="email" type="email" autocomplete="email" required></label>' +
        '<div id="pasoCodigo" hidden><label class="campo"><span>Código</span><input name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>' +
        '<label class="campo"><span>Contraseña nueva (mínimo 8)</span><input name="clave" type="password" minlength="8" autocomplete="new-password"></label></div>' +
        '<button class="btn" type="submit" id="enviar">Mandarme el código</button></form><button class="enlace" type="button" data-m="entrar">Volver a entrar</button>';
    }
    abrirModal(cuerpo + '<p class="msg" id="msg"></p>');
    Array.prototype.forEach.call(modal.querySelectorAll('[data-m]'), function (b) { b.addEventListener('click', function () { abrirCuenta(b.getAttribute('data-m')); }); });
    var f = document.getElementById('f'), msg = document.getElementById('msg'), codigoPedido = false;
    function decir(t, bien) { msg.textContent = t; msg.className = 'msg ' + (bien ? 'bien' : 'mal'); }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {}; Array.prototype.forEach.call(f.elements, function (x) { if (x.name) v[x.name] = x.value.trim(); });
      if (v.usuario && modo === 'crear') v.usuario = v.usuario.toLowerCase();
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      var p;
      if (modo === 'entrar') p = api('/login', { metodo: 'POST', cuerpo: { usuario: v.usuario, clave: f.elements.clave.value } });
      else if (!codigoPedido) {
        p = api('/codigo', { metodo: 'POST', cuerpo: { email: v.email, fin: modo === 'crear' ? 'registro' : 'recuperar' } }).then(function () {
          codigoPedido = true; document.getElementById('pasoCodigo').hidden = false;
          document.getElementById('enviar').textContent = modo === 'crear' ? 'Crear mi cuenta' : 'Cambiar contraseña';
          f.elements.codigo.required = true; if (f.elements.clave) f.elements.clave.required = true;
          f.elements.codigo.focus(); decir('Te mandamos el código a ' + v.email + '. Revisa también spam.', true);
          return null;
        });
      } else if (modo === 'crear') p = api('/registro', { metodo: 'POST', cuerpo: { usuario: v.usuario, email: v.email, clave: f.elements.clave.value, codigo: v.codigo } });
      else p = api('/recuperar', { metodo: 'POST', cuerpo: { email: v.email, codigo: v.codigo, clave: f.elements.clave.value } });
      p.then(function (d) {
        if (!d) return;
        guardarTok(d.token); delete d.token; estado.yo = d; pintarCuenta();
        var fn = despues; cerrarModal(); if (fn) fn(); else ruta();
      }).catch(function (d) { decir((d && d.error) || 'No se pudo. Revisa tu conexión.'); }).then(function () { btn.disabled = false; });
    });
  }

  /* ---------- rutas ---------- */
  function ruta() {
    if (!estado.cat) return;
    limpiarTimers();
    document.body.classList.toggle('con-barra', /^#\/curso\//.test(location.hash) && !tiene((/^#\/curso\/([a-z0-9-]+)/.exec(location.hash) || [])[1]));
    var m = /^#\/curso\/([a-z0-9-]+)(?:\/([0-9]+-[0-9]+))?/.exec(location.hash);
    if (!m) { document.title = 'Cursos · Psyches AI'; return portada(); }
    var k = estado.cat.cursos.filter(function (x) { return x.slug === m[1]; })[0];
    if (!k || !k.listo) { location.hash = '#/'; return; }
    document.title = k.titulo + ' · Cursos Psyches';
    if (!tiene(k.slug)) return paginaCurso(k);
    if (estado.curso[k.slug]) return lector(k, estado.curso[k.slug], m[2]);
    app.innerHTML = '<p class="cargando">Abriendo tu curso…</p>';
    api('/curso/' + k.slug).then(function (d) { estado.curso[k.slug] = d; lector(k, d, m[2]); })
      .catch(function () { paginaCurso(k); });
  }
  window.addEventListener('hashchange', ruta);

  app.innerHTML = '<p class="cargando">Cargando cursos…</p>';
  var vuelta = vueltaGoogle();
  Promise.all([
    api('/catalogo'),
    vuelta || (tok() ? api('/yo').catch(function () { return null; }) : Promise.resolve(null))
  ]).then(function (r) {
    estado.cat = r[0];
    var v = vuelta ? r[1] : null;
    estado.yo = vuelta ? (v && v.yo) || null : r[1];
    pintarCuenta(); ruta();
    if (v && v.error) mensajeModal('No se pudo entrar', v.error);
    else if (v && v.compra) { var b = app.querySelector('[data-comprar="' + v.compra + '"]') || document.createElement('button'); comprar(v.compra, b); }
  })
    .catch(function () { app.innerHTML = '<p class="cargando">No pudimos cargar los cursos. Recarga la página.</p>'; });
})();
