/* Modo alumno / modo docente, compartido por todas las páginas del sitio.
   Se carga en <head> sin defer para que el modo se aplique antes de pintar. */
(function () {
  var CLAVE = 'uq:modo';
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var modo = leer(CLAVE) === 'docente' ? 'docente' : 'alumno';
  document.documentElement.dataset.modo = modo;

  function aplicar(nuevo) {
    modo = nuevo;
    document.documentElement.dataset.modo = modo;
    guardar(CLAVE, modo);
    document.querySelectorAll('.modo-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.modo === modo ? 'true' : 'false');
    });
    // En modo docente las respuestas de la ejercitación quedan abiertas.
    document.querySelectorAll('details.respuesta').forEach(function (d) { d.open = modo === 'docente'; });
    document.dispatchEvent(new CustomEvent('modo-cambio', { detail: modo }));
  }

  function armarInterruptor() {
    var nav = document.querySelector('nav.indice, .barra-estudio');
    if (!nav || nav.querySelector('.modo-switch')) return;
    var caja = document.createElement('div');
    caja.className = 'modo-switch';
    caja.setAttribute('role', 'group');
    caja.setAttribute('aria-label', 'Modo de uso');
    [['alumno', 'Alumno'], ['docente', 'Docente']].forEach(function (par) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.modo = par[0];
      b.textContent = par[1];
      b.setAttribute('aria-pressed', par[0] === modo ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (par[0] === 'alumno') return aplicar('alumno');
        // El modo docente pide sesión: sin ella, al login y de vuelta a esta página.
        sesion().then(function (s) {
          if (s && s.configurado && !s.docente) return irALogin();
          if (s && s.docente) location.reload(); // el servidor recién ahí entrega el contenido docente
          aplicar('docente');
        });
      });
      caja.appendChild(b);
    });
    nav.appendChild(caja);
  }

  // Casillas de repaso: se recuerdan en el navegador del alumno.
  function armarRepaso() {
    document.querySelectorAll('input[data-repaso]').forEach(function (c) {
      var k = 'uq:repaso:' + c.dataset.repaso;
      c.checked = leer(k) === '1';
      c.addEventListener('change', function () { guardar(k, c.checked ? '1' : '0'); contar(c); });
      contar(c);
    });
  }
  function contar(c) {
    var lista = c.closest('.repaso');
    if (!lista) return;
    var todas = lista.querySelectorAll('input[data-repaso]');
    var hechas = lista.querySelectorAll('input[data-repaso]:checked');
    var salida = lista.querySelector('.repaso-cuenta');
    if (salida) salida.textContent = hechas.length + ' de ' + todas.length;
  }

  // Raíz del sitio: las páginas viven en "/" o en una subcarpeta (estudio/, docente/).
  var RAIZ = (document.currentScript && document.currentScript.src)
    ? new URL('.', document.currentScript.src).pathname.replace(/\/$/, '') : '';
  function sesion() {
    if (!/^https?:$/.test(location.protocol)) return Promise.resolve(null);
    return fetch(RAIZ + '/api/sesion', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function irALogin() {
    location.href = RAIZ + '/docente/?volver=' + encodeURIComponent(location.pathname + location.hash);
  }

  document.addEventListener('DOMContentLoaded', function () {
    armarInterruptor();
    armarRepaso();
    aplicar(modo);
    // Si quedó guardado "docente" pero la sesión venció, se vuelve a alumno.
    if (modo === 'docente') sesion().then(function (s) { if (s && s.configurado && !s.docente) aplicar('alumno'); });
  });
  window.ModoUQ = { get: function () { return modo; }, set: aplicar };
})();
