/* ===== Utilidades compartidas (notas, contraseñas, localStorage) ===== */
const NovaUtils = (() => {
  // Pesos de la nota final
  const PESOS = { auto: 0.1, tareas: 0.3, parcial: 0.6 };
  const NOTA_MINIMA = 3.0;

  const leer = (clave) => NovaModelo.leer(clave);

  // Acepta "4,5" o "4.5"; devuelve null si está vacío o no es número
  const num = (v) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  /* Calcula la nota de un registro:
     { autoevaluacion, actividades: [{nombre, nota}, ...], parcial } */
  function calcular(reg) {
    const auto = num(reg.autoevaluacion);
    const parcial = num(reg.parcial);
    const notasAct = (reg.actividades || []).map((a) => num(a.nota)).filter((n) => n !== null);
    const sumaTareas = notasAct.reduce((a, b) => a + b, 0);
    const promTareas = notasAct.length ? sumaTareas / notasAct.length : null;

    const acumulado =
      (auto ?? 0) * PESOS.auto + (promTareas ?? 0) * PESOS.tareas + (parcial ?? 0) * PESOS.parcial;
    const completo = auto !== null && promTareas !== null && parcial !== null;

    return { auto, parcial, cantidad: notasAct.length, sumaTareas, promTareas, acumulado, completo };
  }

  /* Contraseña: nunca se guarda en texto plano.
     OJO: esto es solo para el prototipo. Con un backend real la contraseña
     se debe hashear en el servidor (bcrypt/argon2) y nunca en localStorage. */
  async function hashClave(texto) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
      return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; // respaldo si el navegador no permite crypto.subtle (p. ej. http sin https)
    for (const c of texto) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return "djb2:" + h.toString(16);
  }

  // Botón "ojo" para mostrar/ocultar una contraseña
  function activarVerClave(boton, input) {
    boton.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      boton.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
      boton.querySelector("span").textContent = visible ? "visibility" : "visibility_off";
    });
  }

  return { PESOS, NOTA_MINIMA, leer, num, calcular, hashClave, activarVerClave };
})();
