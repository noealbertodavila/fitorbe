/* Fitorbe · página de inicio (estática). */
(function () {
  "use strict";
  // Testimonios: solo reales y con permiso. Mientras esté vacío, la sección no aparece.
  // Ejemplo: { texto: "…", nombre: "Ana T.", negocio: "Bienestar con Ana" }
  var TESTIMONIOS = [];

  document.documentElement.classList.add("js");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Si ya inició sesión, los botones de "Iniciar sesión" llevan a su panel.
  try {
    var token = localStorage.getItem("nahofit_auth_token");
    if (token) {
      var datos = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      var vence = datos.exp ? datos.exp * 1000 : 0;
      if (!vence || vence > Date.now()) {
        var panel = datos.rol === "admin" ? "/admin" : datos.rol === "coach" ? "/coach" : "/cliente";
        $$("[data-entrar]").forEach(function (a) { a.href = panel; a.textContent = "Ir a mi panel"; });
      }
    }
  } catch (e) { /* sin sesión */ }

  // Menú en celular
  var menu = $("#menu"), ham = $("#hamburguesa");
  function marcar() {
    var abierto = menu.classList.contains("abierto");
    ham.setAttribute("aria-expanded", String(abierto));
    ham.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  }
  ham.addEventListener("click", function () { menu.classList.toggle("abierto"); marcar(); });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { menu.classList.remove("abierto"); marcar(); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("abierto")) { menu.classList.remove("abierto"); marcar(); ham.focus(); } });

  // Mensual / anual
  $$(".periodo button").forEach(function (b) {
    b.addEventListener("click", function () {
      var p = b.getAttribute("data-periodo");
      $$(".periodo button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$("[data-mes]").forEach(function (el) { el.textContent = el.getAttribute(p === "anio" ? "data-anio" : "data-mes"); });
      $$("[data-anio-texto]").forEach(function (el) { el.textContent = p === "anio" ? el.getAttribute("data-anio-texto") : ""; });
      $$(".plan a[href^='/registro']").forEach(function (a) { var u = new URL(a.href, location.href); u.searchParams.set("periodo", p); a.href = u.pathname + u.search; });
    });
  });

  // Testimonios
  if (TESTIMONIOS.length) {
    var cont = $("#lista-testimonios");
    TESTIMONIOS.forEach(function (t) {
      var fig = document.createElement("figure"); fig.className = "testimonio";
      var q = document.createElement("blockquote"); var p = document.createElement("p"); p.textContent = "“" + t.texto + "”"; q.appendChild(p);
      var cap = document.createElement("figcaption"); var c = document.createElement("cite"); c.textContent = t.nombre + (t.negocio ? " · " + t.negocio : "");
      cap.appendChild(c); fig.appendChild(q); fig.appendChild(cap); cont.appendChild(fig);
    });
    $("#testimonios").hidden = false;
  }

  // Aparece al bajar
  var bloques = $$(".beneficio, .funcion, .pasos li, .plan, .dos > div");
  bloques.forEach(function (el) { el.classList.add("aparece"); });
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    bloques.forEach(function (el) { obs.observe(el); });
  } else {
    bloques.forEach(function (el) { el.classList.add("visible"); });
  }

  var anio = $("#anio"); if (anio) anio.textContent = String(new Date().getFullYear());
})();
