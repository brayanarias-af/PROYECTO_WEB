/* ===== Panel del profesor: sesión, datos compartidos, navegación, tema y avisos =====
   Datos (localStorage):
     nova_profesores  -> el profesor que inició sesión
     nova_materias    -> sus materias son las que tienen profesorId = su id
     matriculas       -> estudiantes matriculados en cada materia (estado "Matriculada")
     nova_notas       -> notas por estudiante + materia + periodo (las mismas que ve el administrador)
   Los controladores de cada vista usan el objeto global NovaPro. */

const NovaPro = (() => {
  const U = NovaUtils;
  const sesion = NovaSesion.actual();
  const salir = () => {
    NovaSesion.cerrar();
    location.replace("../autenticacion/login.html");
  };

  const leerProfesor = () => U.leer("nova_profesores").find((p) => p.id === (sesion && sesion.id)) || null;
  let pro = leerProfesor();
  if (!sesion || sesion.rol !== "profesor" || !pro || pro.estado !== "Activo") {
    salir();
    return null;
  }

  /* ---------- Utilidades ---------- */
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) =>
    String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(1));
  const iniciales = (n) => String(n).trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  /* ---------- Datos ---------- */
  const profesor = () => pro;
  const misMaterias = () => U.leer("nova_materias").filter((m) => m.profesorId === pro.id);

  // Estudiantes matriculados ahora en una materia (solo ellos pueden recibir notas)
  function estudiantesDe(materiaId) {
    const estudiantes = U.leer("nova_estudiantes");
    const ids = new Set(
      U.leer("matriculas").filter((m) => m.materiaId === materiaId && m.estado === "Matriculada").map((m) => m.estudianteId)
    );
    return estudiantes.filter((e) => ids.has(e.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  const todasLasNotas = () => U.leer("nova_notas");
  const notasDe = (materia) => todasLasNotas().filter((r) => norm(r.materia) === norm(materia.nombre));

  /* ---------- Cambios ---------- */
  const emitir = () => window.dispatchEvent(new Event("ea:datos"));

  function guardarNotas(todas) {
    NovaModelo.guardar("nova_notas", todas);
    emitir();
  }

  function recargar() {
    const actualizado = leerProfesor();
    if (!actualizado || actualizado.estado !== "Activo") return salir();
    pro = actualizado;
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

  function pintarPerfil() {
    document.getElementById("ea-nombre-corto").textContent = pro.nombre.trim().split(/\s+/)[0];
    document.getElementById("ea-rol").textContent = "Profesor";
    document.getElementById("ea-avatar").textContent = iniciales(pro.nombre);
  }

  return {
    U, esc, norm, fmt, iniciales, profesor, misMaterias, estudiantesDe, todasLasNotas, notasDe,
    guardarNotas, recargar, emitir, toast, pintarPerfil,
  };
})();

if (NovaPro) {
  /* ===== Navegación por hash (SPA) ===== */
  (() => {
    const TITULOS = { materias: "Mis materias", notas: "Notas", cuenta: "Mi cuenta" };
    const titulo = document.getElementById("titulo-vista");
    const enlaces = document.querySelectorAll(".sidebar a[href^='#']");
    const aside = document.querySelector("aside");

    const vistaActual = () => (TITULOS[location.hash.slice(1)] ? location.hash.slice(1) : "materias");

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

  /* ===== Tema claro / oscuro ===== */
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
     Se calculan solos a partir de las matrículas de tus materias (últimos 14 días):
       - un estudiante se matriculó en tu materia
       - un estudiante canceló tu materia
     Los avisos leídos se recuerdan por profesor en localStorage. */
  (() => {
    const { U, esc, profesor } = NovaPro;
    const VENTANA_MS = 14 * 24 * 60 * 60 * 1000;
    const $ = (id) => document.getElementById(id);
    const campana = $("ea-campana");
    const panel = $("ea-avisos-panel");
    const lista = $("ea-avisos-lista");
    const badge = $("ea-badge");
    const claveLeidos = () => `nova_avisos_${profesor().id}`;

    const leidos = () => {
      try { return new Set(JSON.parse(localStorage.getItem(claveLeidos())) || []); } catch { return new Set(); }
    };
    const guardarLeidos = (set) => {
      try { localStorage.setItem(claveLeidos(), JSON.stringify([...set])); } catch {}
    };

    const reciente = (fecha) => {
      const t = Date.parse(fecha);
      return Number.isFinite(t) && Date.now() - t <= VENTANA_MS;
    };

    function calcular() {
      const materias = NovaPro.misMaterias();
      const ids = new Map(materias.map((m) => [m.id, m]));
      const estudiantes = U.leer("nova_estudiantes");
      const avisos = [];

      U.leer("matriculas").forEach((m) => {
        const materia = ids.get(m.materiaId);
        const est = estudiantes.find((e) => e.id === m.estudianteId);
        if (!materia || !est) return;
        if (m.estado === "Matriculada" && reciente(m.fecha)) {
          avisos.push({ id: `mtr-${m.id}`, fecha: m.fecha, icono: "person_add", materiaId: materia.id,
            titulo: `${est.nombre} se matriculó`, texto: `En ${materia.nombre}. Ya puedes registrarle notas.` });
        }
        if (m.estado === "Cancelada" && reciente(m.fechaCancelacion)) {
          avisos.push({ id: `can-${m.id}`, fecha: m.fechaCancelacion, icono: "event_busy", materiaId: materia.id,
            titulo: `${est.nombre} canceló la materia`, texto: `Salió de ${materia.nombre}.` });
        }
      });
      return avisos.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
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
                    data-id="${esc(a.id)}" data-materia="${esc(a.materiaId)}">
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
      window.dispatchEvent(new CustomEvent("ep:materia", { detail: b.dataset.materia }));
      if (location.hash !== "#notas") location.hash = "notas";
      pintar();
    });

    $("ea-avisos-leer").addEventListener("click", () => {
      const vistos = leidos();
      calcular().forEach((a) => vistos.add(a.id));
      guardarLeidos(vistos);
      pintar();
    });

    window.addEventListener("ea:datos", pintar);
    window.addEventListener("storage", () => NovaPro.recargar()); // cambios hechos en otra pestaña
    NovaPro.pintarPerfil();
    pintar();
  })();
}
