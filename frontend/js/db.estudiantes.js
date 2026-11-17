/* ===== Panel del estudiante: sesión, datos compartidos, navegación, tema y avisos =====
   Datos (localStorage):
     nova_estudiantes  -> el estudiante que inició sesión
     nova_materias     -> { id, codigo, nombre, grado, profesorId, estado }
     matriculas        -> { id, estudianteId, materiaId, materia, estado: "Matriculada" | "Cancelada", fecha, fechaCancelacion }
     nova_notas        -> registros por estudiante + materia + periodo (los sube el profesor / admin)
   Los controladores de cada vista usan el objeto global NovaEst. */

const NovaEst = (() => {
  const U = NovaUtils;
  const sesion = NovaSesion.actual();
  const salir = () => {
    NovaSesion.cerrar();
    location.replace("../autenticacion/login.html");
  };

  const leerEstudiante = () => U.leer("nova_estudiantes").find((e) => e.id === (sesion && sesion.id)) || null;
  let est = leerEstudiante();
  if (!sesion || sesion.rol !== "estudiante" || !est || est.estado !== "Activo") {
    salir();
    return null;
  }

  /* ---------- Utilidades ---------- */
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) =>
    String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(1));

  /* ---------- Datos del estudiante ---------- */
  const estudiante = () => est;
  const materias = () => U.leer("nova_materias");
  const profesorDe = (materia) => U.leer("nova_profesores").find((p) => p.id === materia.profesorId) || null;
  const matriculas = () => U.leer("matriculas").filter((m) => m.estudianteId === est.id);
  const notas = () => U.leer("nova_notas").filter((r) => r.estudianteId === est.id);

  const nombreMateria = (m) => {
    const mat = materias().find((x) => x.id === m.materiaId);
    return mat ? mat.nombre : m.materia || "Materia";
  };

  // Materias en las que está matriculado ahora (con el objeto materia)
  function matriculadas() {
    const lista = materias();
    return matriculas()
      .filter((m) => m.estado === "Matriculada")
      .map((m) => ({ matricula: m, materia: lista.find((x) => x.id === m.materiaId) }))
      .filter((x) => x.materia);
  }

  // Materias activas de su grado en las que todavía no está matriculado
  function disponibles() {
    const ya = new Set(matriculas().filter((m) => m.estado === "Matriculada").map((m) => m.materiaId));
    return materias().filter((m) => m.estado === "Activa" && norm(m.grado) === norm(est.grado) && !ya.has(m.id));
  }

  /* ---------- Cambios ---------- */
  function emitir() {
    window.dispatchEvent(new Event("ea:datos"));
  }

  function guardarMatriculas(todas) {
    NovaModelo.guardar("matriculas", todas);
    emitir();
  }

  function recargar() {
    const actualizado = leerEstudiante();
    if (!actualizado || actualizado.estado !== "Activo") return salir();
    est = actualizado;
    pintarPerfil();
    emitir();
  }

  /* ---------- Aviso emergente ---------- */
  const toastEl = document.getElementById("ea-toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
  }

  /* ---------- Perfil (arriba a la derecha) ---------- */
  function pintarPerfil() {
    const partes = est.nombre.trim().split(/\s+/);
    document.getElementById("ea-nombre-corto").textContent = partes[0];
    document.getElementById("ea-rol").textContent = `Estudiante · ${est.grado}`;
    document.getElementById("ea-avatar").textContent = partes.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }

  return {
    U, esc, norm, fmt, estudiante, materias, profesorDe, matriculas, notas, nombreMateria,
    matriculadas, disponibles, guardarMatriculas, recargar, emitir, toast, pintarPerfil,
  };
})();

if (NovaEst) {
  /* ===== Navegación por hash (SPA) ===== */
  (() => {
    const TITULOS = { notas: "Notas", materias: "Materias", cuenta: "Mi cuenta" };
    const titulo = document.getElementById("titulo-vista");
    const enlaces = document.querySelectorAll(".sidebar a[href^='#']");
    const aside = document.querySelector("aside");

    const vistaActual = () => (TITULOS[location.hash.slice(1)] ? location.hash.slice(1) : "notas");

    function mostrar() {
      const nombre = vistaActual();
      document.querySelectorAll("main .vista").forEach((v) => v.classList.toggle("activa", v.id === `vista-${nombre}`));
      enlaces.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${nombre}`));
      titulo.textContent = TITULOS[nombre];
      aside.classList.remove("abierto");
      window.scrollTo(0, 0);
      window.dispatchEvent(new CustomEvent("ea:vista", { detail: nombre }));
    }

    window.addEventListener("hashchange", mostrar);
    mostrar();

    document.getElementById("menu-btn").addEventListener("click", () => aside.classList.add("abierto"));
    document.getElementById("close-btn").addEventListener("click", () => aside.classList.remove("abierto"));
    document.getElementById("cerrar-sesion").addEventListener("click", () => NovaSesion.cerrar());
  })();

  /* ===== Tema claro / oscuro (misma clave que el resto del proyecto) ===== */
  (() => {
    const toggler = document.querySelector(".theme-toggler");
    const setTheme = (oscuro) => {
      document.body.classList.toggle("dark-theme-variables", oscuro);
      toggler.querySelector("span:nth-child(1)").classList.toggle("active", !oscuro);
      toggler.querySelector("span:nth-child(2)").classList.toggle("active", oscuro);
      try { localStorage.setItem("tema", oscuro ? "oscuro" : "claro"); } catch {}
    };
    toggler.addEventListener("click", () => setTheme(!document.body.classList.contains("dark-theme-variables")));
    try { if (localStorage.getItem("tema") === "oscuro") setTheme(true); } catch {}
  })();

  /* ===== Avisos =====
     Se calculan solos a partir de los datos:
       - "Ya están tus notas del Periodo N": todas tus materias matriculadas ya tienen la nota completa de ese periodo.
       - "Ya puedes matricular X": hay una materia activa de tu grado en la que aún no estás matriculado.
     Los avisos leídos se recuerdan por estudiante en localStorage. */
  (() => {
    const { U, esc, norm, estudiante } = NovaEst;
    const $ = (id) => document.getElementById(id);
    const campana = $("ea-campana");
    const panel = $("ea-avisos-panel");
    const lista = $("ea-avisos-lista");
    const badge = $("ea-badge");
    const claveLeidos = () => `nova_avisos_${estudiante().id}`;

    const leidos = () => {
      try { return new Set(JSON.parse(localStorage.getItem(claveLeidos())) || []); } catch { return new Set(); }
    };
    const guardarLeidos = (set) => {
      try { localStorage.setItem(claveLeidos(), JSON.stringify([...set])); } catch {}
    };

    function calcular() {
      const avisos = [];

      const activas = NovaEst.matriculadas();
      if (activas.length) {
        const registros = NovaEst.notas();
        for (const p of ["1", "2", "3", "4"]) {
          const completo = activas.every(({ materia }) =>
            registros.some(
              (r) => String(r.periodo || "1") === p && norm(r.materia) === norm(materia.nombre) && U.calcular(r).completo
            )
          );
          if (completo) {
            avisos.push({
              id: `notas-${p}`, icono: "grade", destino: "notas", periodo: p,
              titulo: `Ya están tus notas del Periodo ${p}`,
              texto: "Tus profesores ya las publicaron. Revísalas en Notas.",
            });
          }
        }
      }

      NovaEst.disponibles().forEach((m) =>
        avisos.push({
          id: `mat-${m.id}`, icono: "menu_book", destino: "materias",
          titulo: `Ya puedes matricular ${m.nombre}`,
          texto: `Materia disponible para ${estudiante().grado}.`,
        })
      );
      return avisos;
    }

    function pintar() {
      const avisos = calcular();
      const vistos = leidos();
      const sinLeer = avisos.filter((a) => !vistos.has(a.id)).length;

      badge.hidden = sinLeer === 0;
      badge.textContent = sinLeer > 9 ? "9+" : sinLeer;
      campana.setAttribute("aria-label", sinLeer ? `Avisos (${sinLeer} sin leer)` : "Avisos");

      lista.innerHTML = avisos.length
        ? avisos
            .map(
              (a) => `
          <li>
            <button type="button" class="ea-aviso ${vistos.has(a.id) ? "" : "ea-aviso--nuevo"}"
                    data-id="${esc(a.id)}" data-destino="${a.destino}" data-periodo="${a.periodo || ""}">
              <span class="ea-aviso-icono"><span class="material-icons-sharp">${a.icono}</span></span>
              <span><strong>${esc(a.titulo)}</strong><small>${esc(a.texto)}</small></span>
            </button>
          </li>`
            )
            .join("")
        : '<li class="ea-aviso-vacio">No tienes avisos por ahora.</li>';
    }

    const abrir = (si) => {
      panel.hidden = !si;
      campana.setAttribute("aria-expanded", String(si));
    };

    campana.addEventListener("click", () => abrir(panel.hidden));
    document.addEventListener("click", (e) => {
      if (!panel.hidden && !e.target.closest(".ea-avisos")) abrir(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) { abrir(false); campana.focus(); }
    });

    lista.addEventListener("click", (e) => {
      const b = e.target.closest(".ea-aviso");
      if (!b) return;
      const vistos = leidos();
      vistos.add(b.dataset.id);
      guardarLeidos(vistos);
      abrir(false);
      if (b.dataset.periodo) window.dispatchEvent(new CustomEvent("ea:periodo", { detail: b.dataset.periodo }));
      if (location.hash === `#${b.dataset.destino}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
      else location.hash = b.dataset.destino;
      pintar();
    });

    $("ea-avisos-leer").addEventListener("click", () => {
      const vistos = leidos();
      calcular().forEach((a) => vistos.add(a.id));
      guardarLeidos(vistos);
      pintar();
    });

    window.addEventListener("ea:datos", pintar);
    // Si el administrador o un profesor cambia algo en otra pestaña, se actualiza solo
    window.addEventListener("storage", () => NovaEst.recargar());
    NovaEst.pintarPerfil();
    pintar();
  })();
}
