// Pantalla de error si la app no carga. Está en un archivo aparte (no en
// index.html) para que la política de seguridad CSP no tenga que permitir
// scripts en línea.
(function () {
  function pantalla(titulo, mensaje) {
    var el = document.getElementById("root");
    if (!el) return;
    el.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0A0F0D;font-family:Inter,system-ui,sans-serif;text-align:center;padding:20px"><div>' +
      '<h2 style="color:#fff;margin-bottom:8px">' + titulo + "</h2>" +
      '<p style="color:#A8B3AE;margin-bottom:20px">' + mensaje + "</p>" +
      '<button type="button" data-accion="recargar" style="background:#10B981;color:#04130D;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-right:10px">Recargar</button>' +
      '<button type="button" data-accion="login" style="background:transparent;color:#A8B3AE;border:1px solid #2B3632;padding:10px 24px;border-radius:6px;cursor:pointer">Ir al login</button>' +
      "</div></div>";
    var r = el.querySelector('[data-accion="recargar"]');
    var l = el.querySelector('[data-accion="login"]');
    if (r) r.addEventListener("click", function () { location.reload(); });
    if (l) l.addEventListener("click", function () {
      try { localStorage.removeItem("nahofit_auth_token"); } catch (e) {}
      location.href = "/";
    });
  }
  window.fitorbeError = pantalla;
  window.onerror = function () {
    pantalla('Fit<span style="color:#10B981">orbe</span>', "Ocurrió un error al cargar la aplicación.");
    return false;
  };
})();
