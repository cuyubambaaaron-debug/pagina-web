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
    x: '<path d="M6 6l12 12M18 6L6 18"/>'
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
    else abrirCuenta('entrar');
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

  /* ---------- página pública del curso ---------- */
  function paginaCurso(k) {
    var c = estado.cat, pagoVolvio = /[?&]pago=listo/.test(location.search), tem = k.temario || [];
    var antes = tem.filter(function (t) { return t.via === 0; });
    var vias = [1, 2, 3].map(function (v) {
      var ls = tem.filter(function (t) { return t.via === v; }); if (!ls.length) return '';
        var lema = viaTxt(k.vias[v - 1]);
      return '<div class="via-c v' + v + '"><div class="tope"><small>' + esc(VIAS[v]) + ' · ' + ls.length + (ls.length === 1 ? ' lección' : ' lecciones') + '</small><h3>' + esc(lema) + '</h3></div>' +
        '<ol>' + ls.map(function (t) { return '<li>' + esc(t.titulo) + '</li>'; }).join('') + '</ol></div>';
    }).join('');
    app.innerHTML =
      '<p class="migas"><a href="#/">Cursos</a>' + ic('flecha') + esc(k.titulo) + '</p>' +
      (pagoVolvio ? '<div class="aviso" id="avisoPago">Revisando tu pago…</div>' : '') +
      '<section class="cab-curso"><div>' +
      '<h1 class="aparece">' + esc(k.titulo) + '</h1><p class="bajada aparece">' + esc(k.bajada) + '</p>' +
      '<div class="chips aparece"><span class="chip">' + ic('check') + tem.length + ' lecciones</span><span class="chip">' + ic('check') + 'Código completo</span><span class="chip">' + ic('check') + 'Archivo modo IA</span><span class="chip">' + ic('check') + 'Con Antigravity, gratis</span></div>' +
      '<div class="compra-linea aparece" id="compraLinea"><span class="cifra"><small>S/</small>' + c.precio + '</span>' +
      '<button class="btn verde" type="button" data-comprar="' + esc(k.slug) + '">' + ic('carro') + 'Comprar el curso</button>' +
      '<button class="btn sec" type="button" data-ya="1">Ya lo compré</button>' +
      '<span class="det">Pago único · con tarjeta: US$ ' + c.usd + ' · sin mensualidades</span></div>' +
      '</div><div class="foto-curso aparece"><div class="marco"><img src="' + foto(k.slug) + '" alt=""></div>' +
      '<div class="flotante"><div class="ico">' + ic('codigo') + '</div><div><b>' + tem.length + '</b><span>lecciones con código listo</span></div></div></div></section>' +
      '<section class="seccion"><div class="encab"><h2 class="grande">Lo que vas a construir</h2><p>Cada vía termina con algo funcionando. Si te quedas en la primera, ya te sirvió.</p></div>' +
      (antes.length ? '<div class="antes-de"><div class="ico">' + ic('chispa') + '</div><div><b>Antes de empezar: ' + esc(antes[0].titulo.replace(/^Antes de empezar:\s*/i, '')) + '</b><span>Cómo usar Antigravity y el archivo modo IA para que tu IA te arme todo.</span></div></div>' : '') +
      '<div class="vias-grandes">' + vias + '</div></section>' +
      '<div class="barra-compra" id="barraCompra"><div><b>' + esc(k.titulo) + '</b><span>S/ ' + c.precio + ' · pago único</span></div><button class="btn verde" type="button" data-comprar="' + esc(k.slug) + '">Comprar</button></div>';
    cada('.aparece', function (el, i) { el.style.animationDelay = (0.05 + i * 0.08) + 's'; });
    alVer('.via-c');
    var ya = app.querySelector('[data-ya]');
    if (ya) ya.addEventListener('click', function () { abrirCuenta('entrar'); });
    var barra = document.getElementById('barraCompra'), linea = document.getElementById('compraLinea');
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { barra.classList.toggle('ver', !e[0].isIntersecting && e[0].boundingClientRect.top < 0); }).observe(linea);
    enlazarCompras();
    window.scrollTo(0, 0);
    if (pagoVolvio) revisarPago();
  }

  /* ---------- lector (con acceso) ---------- */
  function lector(k, datos, idLec) {
    var doc = new DOMParser().parseFromString('<div>' + datos.html + '</div>', 'text/html');
    var secs = Array.prototype.slice.call(doc.querySelectorAll('section[data-id]'));
    var ids = secs.map(function (s) { return s.getAttribute('data-id'); });
    var actual = ids.indexOf(idLec) >= 0 ? idLec : ids[0];
    var hechas = leerHechas(k.slug);
    var sec = secs[ids.indexOf(actual)], via = Number(sec.getAttribute('data-via'));
    hechas[actual] = 1; guardarHechas(k.slug, hechas);
    var riel = '', viaAnt = -1;
    secs.forEach(function (s) {
      var v = Number(s.getAttribute('data-via')), id = s.getAttribute('data-id');
      if (v !== viaAnt) { if (viaAnt >= 0) riel += '</ul>'; riel += '<p class="estacion v' + v + '">' + esc(VIAS[v]) + '</p><ul class="paradas">'; viaAnt = v; }
      riel += '<li><a href="#/curso/' + esc(k.slug) + '/' + esc(id) + '" class="' + (id === actual ? 'activa ' : '') + (hechas[id] ? 'hecha' : '') + '"><span class="ck">' + (hechas[id] ? ic('check') : '') + '</span><span>' + esc(s.getAttribute('data-titulo')) + '</span></a></li>';
    });
    riel += '</ul>';
    var n = Object.keys(hechas).filter(function (x) { return ids.indexOf(x) >= 0; }).length, pct = Math.round(100 * n / ids.length);
    var i = ids.indexOf(actual), ant = ids[i - 1], sig = ids[i + 1];
    var esMovil = window.matchMedia('(max-width: 860px)').matches;
    app.innerHTML =
      '<p class="migas"><a href="#/">Cursos</a>' + ic('flecha') + esc(k.titulo) + '</p>' +
      '<div class="lector"><aside class="riel">' +
      '<div class="acc"><button class="btn" type="button" id="bajarIA">' + ic('bajar') + 'Descargar modo IA</button></div>' +
      '<p class="avance">' + n + ' de ' + ids.length + ' lecciones vistas · ' + pct + ' %<span class="bateria"><span id="barra"></span></span></p>' +
      (esMovil ? '<details><summary>Ver todas las lecciones</summary>' + riel + '</details>' : riel) +
      '</aside><article class="leccion"><span class="etq v' + via + '">' + esc(VIAS[via]) + '</span><h2>' + esc(sec.getAttribute('data-titulo')) + '</h2>' +
      '<div class="cuerpo">' + sec.innerHTML + '</div>' +
      '<nav class="navl">' + (ant ? '<a class="btn sec" href="#/curso/' + esc(k.slug) + '/' + esc(ant) + '">' + ic('atras') + 'Anterior</a>' : '<span></span>') +
      (sig ? '<a class="btn" href="#/curso/' + esc(k.slug) + '/' + esc(sig) + '">Siguiente' + ic('flecha') + '</a>' : '<a class="btn" href="#/">Ver los otros cursos</a>') + '</nav></article></div>';
    requestAnimationFrame(function () { requestAnimationFrame(function () { var b = document.getElementById('barra'); if (b) b.style.width = pct + '%'; }); });
    document.getElementById('bajarIA').addEventListener('click', function () { bajarIA(k.slug, this); });
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
    if (!estado.yo) return abrirCuenta('crear', function () { comprar(producto, btn); });
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
    if (!id || !estado.yo) { if (av) av.textContent = 'Entra con tu cuenta para ver tu compra.'; return; }
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

  function abrirCuenta(modo, cb) {
    if (cb) despues = cb;
    var pest = '<div class="pest"><button type="button" data-m="entrar" class="' + (modo === 'entrar' ? 'on' : '') + '">Entrar</button><button type="button" data-m="crear" class="' + (modo === 'crear' ? 'on' : '') + '">Crear cuenta</button></div>';
    var cuerpo;
    if (modo === 'entrar') {
      cuerpo = '<h2 id="modalTitulo">Entra</h2><p class="mini">Con tu usuario o correo.</p>' + pest +
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
  Promise.all([
    api('/catalogo'),
    tok() ? api('/yo').catch(function () { return null; }) : Promise.resolve(null)
  ]).then(function (r) { estado.cat = r[0]; estado.yo = r[1]; pintarCuenta(); ruta(); })
    .catch(function () { app.innerHTML = '<p class="cargando">No pudimos cargar los cursos. Recarga la página.</p>'; });
})();
