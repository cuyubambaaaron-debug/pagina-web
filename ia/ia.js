// PsychesAi — sección IA: copiar con un toque y filtrar prompts. Sin librerías ni rastreo.
(function () {
  // Menú del móvil
  var menu = document.querySelector('.menu'), nav = document.getElementById('nav');
  if (menu && nav) {
    menu.addEventListener('click', function () {
      var abierto = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', abierto); menu.textContent = abierto ? 'Cerrar' : 'Menú';
    });
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, mal) {
      var t = document.createElement('textarea');
      t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? ok() : mal(); } catch (e) { mal(e); }
      t.remove();
    });
  }
  document.querySelectorAll('[data-copiar]').forEach(function (btn) {
    var original = btn.textContent;
    btn.addEventListener('click', function () {
      var origen = document.querySelector(btn.getAttribute('data-copiar'));
      if (!origen) return;
      copiarTexto(origen.textContent).then(function () {
        btn.textContent = 'Copiado ✓'; btn.classList.add('ok');
        setTimeout(function () { btn.textContent = original; btn.classList.remove('ok'); }, 1800);
      }, function () { btn.textContent = 'Selecciónalo y cópialo a mano'; });
    });
  });

  // Filtro por tema en la página de prompts
  var botones = document.querySelectorAll('.filtros button');
  botones.forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-c');
      botones.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.pr').forEach(function (p) { p.hidden = c !== 'todos' && p.getAttribute('data-c') !== c; });
      document.querySelectorAll('.grupo').forEach(function (g) { g.hidden = !g.querySelector('.pr:not([hidden])'); });
    });
  });
})();
