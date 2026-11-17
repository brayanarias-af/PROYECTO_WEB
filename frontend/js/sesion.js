/* ===== Sesión (prototipo) =====
   Guarda quién inició sesión en sessionStorage (se borra al cerrar la pestaña).
   Con un backend real esto sería un token/cookie emitido por el servidor. */
const NovaSesion = (() => {
  const CLAVE = "nova_sesion";

  const iniciar = (rol, id) => {
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ rol, id })); } catch {}
  };
  const actual = () => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; }
  };
  const cerrar = () => {
    try { sessionStorage.removeItem(CLAVE); } catch {}
  };

  return { iniciar, actual, cerrar };
})();
