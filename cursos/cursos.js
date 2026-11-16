/* Cursos Psyches · catálogo, cuenta, compra y lector. El contenido llega de la API solo a quien compró. */
(function () {
  'use strict';
  var API = 'https://studio.goodcallia.com/api/cursos';
  var LS_TOK = 'cur_tok', LS_PAGO = 'cur_pago', LS_HECHAS = 'cur_hechas_';
  var app = document.getElementById('app');
  var velo = document.getElementById('velo'), modal = document.getElementById('modal');
  var btnCuenta = document.getElementById('btnCuenta');
  var estado = { cat: null, yo: null, curso: {} };
  var VIAS = ['Antes de empezar', 'Vía 1 · Personal', 'Vía 2 · Negocio', 'Vía 3 · Pro'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tok() { try { return localStorage.getItem(LS_TOK); } catch (e) { return null; } }
  function guardarTok(t) { try { t ? localStorage.setItem(LS_TOK, t) : localStorage.removeItem(LS_TOK); } catch (e) {} }

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
  function pintarCuenta() { btnCuenta.textContent = estado.yo ? estado.yo.cuenta.usuario + ' · salir' : 'Entrar'; }
  btnCuenta.addEventListener('click', function () {
    if (estado.yo) { guardarTok(null); estado.yo = null; estado.curso = {}; pintarCuenta(); ruta(); }
    else abrirCuenta('entrar');
  });

  /* ---------- portada ---------- */
  function portada() {
    var c = estado.cat;
    var filas = c.cursos.map(function (k, i) {
      var vias = k.vias.map(function (v) { var p = v.split(':'); return '<li><b>' + esc(p[0]) + '</b>' + esc((p[1] || '').trim()) + '</li>'; }).join('');
      var lado = k.listo
        ? (tiene(k.slug) ? '<span class="pastilla ok">Tuyo</span><br><span class="ir">Abrir →</span>' : '<span class="pastilla ok">Disponible</span><br><span class="ir">S/ ' + c.precio + ' →</span>')
        : '<span class="pastilla pr">Pronto</span>';
      return '<li class="fila ' + (k.listo ? 'listo' : 'pronto') + '" data-slug="' + esc(k.slug) + '"' + (k.listo ? ' tabindex="0" role="link"' : '') + '>' +
        '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div><h2>' + esc(k.titulo) + '</h2><p class="bajada">' + esc(k.bajada) + '</p><ol class="metro">' + vias + '</ol></div>' +
        '<div class="lado">' + lado + '</div></li>';
    }).join('');
    app.innerHTML =
      '<section class="heroe"><div><h1>Cursos que <em>sí</em> terminas.</h1>' +
      '<p class="sub">Lo que construimos de verdad, enseñado en tres vías: personal, negocio y pro. Cada vía termina con algo funcionando, sin depender de la siguiente.</p></div>' +
      '<div class="precio-gigante"><span class="cifra"><small>S/</small>' + c.precio + '</span><span class="nota">por curso · pago único</span></div></section>' +
      '<div class="franja"><span>Los 8 cursos: <b>S/ ' + c.pack.precio + '</b></span><span class="ia">Cada curso trae su archivo «modo IA»: tu IA lo lee y te guía paso a paso.</span></div>' +
      '<ol class="lista">' + filas + '</ol>' +
      '<section class="paquete"><div><h3>Los 8 cursos, <em>S/ ' + c.pack.precio + '</em></h3><p>Incluye los que todavía no salen: te llegan a tu cuenta apenas estén listos.</p></div>' +
      '<button class="btn" type="button" data-comprar="pack">Quiero los 8</button></section>';
    Array.prototype.forEach.call(app.querySelectorAll('.fila'), function (el, i) {
      el.style.animationDelay = (0.08 * i + 0.1) + 's';
      if (el.classList.contains('listo')) {
        var ir = function () { location.hash = '#/curso/' + el.getAttribute('data-slug'); };
        el.addEventListener('click', ir);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') ir(); });
      }
    });
    enlazarCompras();
  }

  /* ---------- página pública del curso ---------- */
  function paginaCurso(k) {
    var c = estado.cat, porVia = { 1: [], 2: [], 3: [] };
    (k.temario || []).forEach(function (t) { if (porVia[t.via]) porVia[t.via].push(t.titulo); });
    var vias = k.vias.map(function (v, i) {
      var p = v.split(':');
      return '<div class="via"><h3>' + esc(p[0]) + '</h3><p class="lema">' + esc((p[1] || '').trim()) + '</p><ol>' +
        porVia[i + 1].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
    }).join('');
    var pagoVolvio = /[?&]pago=listo/.test(location.search);
    app.innerHTML =
      '<p class="migas"><a href="#/">← todos los cursos</a></p>' +
      '<section class="cabeza-curso"><div><h1>' + esc(k.titulo) + '</h1><p class="bajada">' + esc(k.bajada) + '</p></div>' +
      '<aside class="compra"><div class="cifra"><small>S/</small>' + c.precio + '</div>' +
      '<p class="det">pago único · con tarjeta: US$ ' + c.usd + '</p>' +
      '<button class="btn naranja" type="button" data-comprar="' + esc(k.slug) + '">Comprar el curso</button>' +
      '<button class="btn sec" type="button" data-ya="1">Ya lo compré: entrar</button>' +
      '<ul class="incl"><li>' + (k.temario || []).length + ' lecciones en 3 vías</li><li>Archivo «modo IA» para tu Antigravity, ChatGPT o Claude</li><li>Código completo, listo para copiar</li><li>Para siempre, con actualizaciones</li></ul></aside></section>' +
      (pagoVolvio ? '<div class="aviso" id="avisoPago">Revisando tu pago…</div>' : '') +
      '<div class="temario">' + vias + '</div>' +
      '<p class="antes"><b>Antes de empezar:</b> todo el curso se hace con Google Antigravity, que es gratis (y con su promo ronda los S/ 18). No necesitas saber programar: tu IA escribe el código, tú entiendes qué hace.</p>';
    var ya = app.querySelector('[data-ya]');
    if (ya) ya.addEventListener('click', function () { abrirCuenta('entrar'); });
    enlazarCompras();
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
      if (v !== viaAnt) { if (viaAnt >= 0) riel += '</ol>'; riel += '<p class="estacion v' + v + '">' + esc(VIAS[v]) + '</p><ol class="paradas">'; viaAnt = v; }
      riel += '<li><a href="#/curso/' + esc(k.slug) + '/' + esc(id) + '" class="' + (id === actual ? 'activa ' : '') + (hechas[id] ? 'hecha' : '') + '">' + esc(s.getAttribute('data-titulo')) + '</a></li>';
    });
    riel += '</ol>';
    var n = Object.keys(hechas).filter(function (x) { return ids.indexOf(x) >= 0; }).length, pct = Math.round(100 * n / ids.length);
    var i = ids.indexOf(actual), ant = ids[i - 1], sig = ids[i + 1];
    var esMovil = window.matchMedia('(max-width: 860px)').matches;

    app.innerHTML =
      '<p class="migas"><a href="#/">← todos los cursos</a> · ' + esc(k.titulo) + '</p>' +
      '<div class="lector"><aside class="riel">' +
      '<div class="acc"><button class="btn naranja" type="button" id="bajarIA">Descargar modo IA</button></div>' +
      '<p class="avance">' + n + ' de ' + ids.length + ' lecciones vistas<i><span id="barra"></span></i></p>' +
      (esMovil ? '<details><summary>Ver todas las lecciones</summary>' + riel + '</details>' : riel) +
      '</aside><article class="leccion"><span class="etq">' + esc(VIAS[via]) + '</span><h2>' + esc(sec.getAttribute('data-titulo')) + '</h2>' +
      '<div class="cuerpo">' + sec.innerHTML + '</div>' +
      '<nav class="navl">' + (ant ? '<a class="btn sec" href="#/curso/' + esc(k.slug) + '/' + esc(ant) + '">← Anterior</a>' : '<span></span>') +
      (sig ? '<a class="btn" href="#/curso/' + esc(k.slug) + '/' + esc(sig) + '">Siguiente →</a>' : '<a class="btn" href="#/">Ver los otros cursos</a>') + '</nav></article></div>';
    requestAnimationFrame(function () { var b = document.getElementById('barra'); if (b) b.style.width = pct + '%'; });
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
      btn.textContent = 'Descargado ✓';
    }).catch(function () { btn.textContent = 'No se pudo, prueba otra vez'; }).then(function () { btn.disabled = false; });
  }

  /* ---------- compra ---------- */
  function enlazarCompras() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-comprar]'), function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); comprar(b.getAttribute('data-comprar'), b); });
    });
  }
  function comprar(producto, btn) {
    if (!estado.yo) return abrirCuenta('crear', function () { comprar(producto, btn); });
    if (producto !== 'pack' && tiene(producto)) { location.hash = '#/curso/' + producto + '/0-1'; return; }
    if (!estado.cat.tarjeta) return mensajeModal('Pago con tarjeta', 'El pago con tarjeta se está activando. Escríbenos a hola@psychesai.com y te damos acceso al toque.');
    var txt = btn.textContent; btn.disabled = true; btn.textContent = 'Abriendo el pago…';
    api('/link', { metodo: 'POST', cuerpo: { producto: producto } }).then(function (d) {
      try { localStorage.setItem(LS_PAGO, String(d.pago)); } catch (e) {}
      location.href = d.url;
    }).catch(function (d) { btn.disabled = false; btn.textContent = txt; mensajeModal('No se pudo abrir el pago', (d && d.error) || 'Prueba en un momento.'); });
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
          if (av) av.textContent = '¡Listo! El curso ya es tuyo.';
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

  function abrirCuenta(modo, luego) {
    if (luego) despues = luego;
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
        var cb = despues; cerrarModal(); if (cb) cb(); else ruta();
      }).catch(function (d) { decir((d && d.error) || 'No se pudo. Revisa tu conexión.'); }).then(function () { btn.disabled = false; });
    });
  }

  /* ---------- rutas ---------- */
  function ruta() {
    if (!estado.cat) return;
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
