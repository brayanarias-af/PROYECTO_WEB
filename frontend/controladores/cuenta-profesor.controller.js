/* ===== VISTA (profesor): MI CUENTA =====
   Sección bloqueada: hay que escribir la contraseña actual para poder editar
   el usuario (correo de inicio de sesión) y la contraseña.
   Se vuelve a bloquear al salir de la vista, al guardar o a los 5 minutos.*/

(() => {
  if (typeof NovaPro === "undefined" || !NovaPro) return;
  const { U, esc } = NovaPro;
  const $ = (id) => document.getElementById(id);

  const MAX_INTENTOS = 5;
  const ESPERA_MS = 30 * 1000;
  const DESBLOQUEO_MS = 5 * 60 * 1000;

  const el = {
    bloqueo: $("ea-cta-bloqueo"),
    formBloqueo: $("ea-cta-form-bloqueo"),
    claveActual: $("ea-cta-clave-actual"),
    verActual: $("ea-cta-ver-actual"),
    errorBloqueo: $("ea-cta-error-bloqueo"),
    edicion: $("ea-cta-edicion"),
    btnBloquear: $("ea-cta-bloquear"),
    form: $("ea-cta-form"),
    usuario: $("ea-cta-usuario"),
    nueva: $("ea-cta-nueva"),
    verNueva: $("ea-cta-ver-nueva"),
    repetir: $("ea-cta-repetir"),
    error: $("ea-cta-error"),
  };

  let intentos = 0;
  let bloqueadoHasta = 0;
  let timerBloqueo;

  U.activarVerClave(el.verActual, el.claveActual);
  U.activarVerClave(el.verNueva, el.nueva);

  const error = (nodo, msg) => {
    nodo.textContent = msg;
    nodo.hidden = !msg;
  };

  function bloquear() {
    clearTimeout(timerBloqueo);
    el.edicion.hidden = true;
    el.bloqueo.hidden = false;
    el.formBloqueo.reset();
    el.form.reset();
    error(el.errorBloqueo, "");
    error(el.error, "");
    // Si el campo estaba visible, vuelve a ocultarse
    [el.claveActual, el.nueva].forEach((i) => (i.type = "password"));
    [el.verActual, el.verNueva].forEach((b) => (b.querySelector("span").textContent = "visibility"));
  }

  function desbloquear() {
    const e = NovaPro.profesor();
    $("ea-dato-nombre").textContent = e.nombre;
    $("ea-dato-documento").textContent = e.documento || "—";
    const mats = NovaPro.misMaterias().map((m) => m.nombre);
    $("ea-dato-materias").textContent = mats.length ? mats.join(", ") : "Sin asignar";
    el.usuario.value = e.correo;
    el.bloqueo.hidden = true;
    el.edicion.hidden = false;
    el.usuario.focus();
    clearTimeout(timerBloqueo);
    timerBloqueo = setTimeout(bloquear, DESBLOQUEO_MS);
  }

  /* ---------- Confirmar con la contraseña actual ---------- */
  el.formBloqueo.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    error(el.errorBloqueo, "");

    const espera = bloqueadoHasta - Date.now();
    if (espera > 0) return error(el.errorBloqueo, `Demasiados intentos. Espera ${Math.ceil(espera / 1000)} segundos.`);
    if (!el.claveActual.value) return error(el.errorBloqueo, "Escribe tu contraseña actual.");

    const e = NovaPro.profesor();
    if (!e.claveHash) {
      return error(el.errorBloqueo, "Tu cuenta no tiene contraseña. Pídele al administrador que te la asigne.");
    }

    const hash = await U.hashClave(el.claveActual.value);
    if (hash !== e.claveHash) {
      intentos++;
      el.claveActual.select();
      if (intentos >= MAX_INTENTOS) {
        intentos = 0;
        bloqueadoHasta = Date.now() + ESPERA_MS;
        return error(el.errorBloqueo, "Contraseña incorrecta. Por seguridad, espera 30 segundos para volver a intentarlo.");
      }
      return error(el.errorBloqueo, "La contraseña no es correcta.");
    }

    intentos = 0;
    desbloquear();
  });

  el.btnBloquear.addEventListener("click", bloquear);

  /* ---------- Guardar cambios ---------- */
  el.form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    error(el.error, "");

    const actual = NovaPro.profesor();
    const correo = el.usuario.value.trim();
    const nueva = el.nueva.value;
    const repetir = el.repetir.value;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      el.usuario.focus();
      return error(el.error, "Escribe un correo válido, por ejemplo nombre@correo.com.");
    }
    const enUso = (u) => String(u.correo || "").toLowerCase() === correo.toLowerCase();
    const repetido =
      U.leer("nova_profesores").some((p) => p.id !== actual.id && enUso(p)) || U.leer("nova_estudiantes").some(enUso);
    if (repetido) {
      el.usuario.focus();
      return error(el.error, "Ese usuario ya está en uso. Elige otro correo.");
    }
    if (nueva && nueva.length < 6) {
      el.nueva.focus();
      return error(el.error, "La nueva contraseña debe tener mínimo 6 caracteres.");
    }
    if (nueva && nueva !== repetir) {
      el.repetir.focus();
      return error(el.error, "Las contraseñas nuevas no coinciden.");
    }

    const cambiaCorreo = correo !== actual.correo;
    if (!cambiaCorreo && !nueva) return error(el.error, "No hiciste ningún cambio.");

    const claveHash = nueva ? await U.hashClave(nueva) : null;
    const lista = U.leer("nova_profesores").map((e) =>
      e.id === actual.id ? { ...e, correo, ...(claveHash && { claveHash }) } : e
    );
    NovaModelo.guardar("nova_profesores", lista);
    NovaPro.recargar();

    bloquear(); // vuelve a quedar protegida
    NovaPro.toast(
      cambiaCorreo && nueva
        ? "Actualizaste tu usuario y tu contraseña."
        : nueva
        ? "Actualizaste tu contraseña."
        : "Actualizaste tu usuario."
    );
  });

  // Al salir de la vista, se bloquea de nuevo
  window.addEventListener("ea:vista", (ev) => {
    if (ev.detail !== "cuenta") bloquear();
  });
})();
