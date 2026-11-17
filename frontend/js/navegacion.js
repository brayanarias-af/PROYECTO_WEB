/* ===== Navegación del panel de administración (SPA con hash) =====
   - El sidebar, el tema y los datos de la cuenta no se tocan.
   - Cada vista vive en Vistas/admin/vistas/<nombre>/ con estos archivos:
       vista-<nombre>.html   <nombre>.css   <nombre>.js
   - Para activar una vista nueva (por ejemplo "profesores"), crea sus tres
     archivos y agrega su nombre a CON_ARCHIVOS. */

(() => {
  const TITULOS = {
    dashboard: "Panel de administración",
    estudiantes: "Estudiantes",
    profesores: "Profesores",
    usuarios: "Gestión de usuarios",
    materias: "Materias",
    notas: "Notas",
    mensajes: "Mensajes",
    reportes: "Reportes",
    configuracion: "Configuración",
  };

  // Vistas que ya tienen sus archivos listos
  const CON_ARCHIVOS = ["estudiantes", "profesores", "materias", "usuarios", "notas"];

  const contenedor = document.getElementById("contenedor-vistas");
  const titulo = document.getElementById("titulo-vista");
  const enlaces = document.querySelectorAll(".sidebar a[href^='#']:not([data-agregar])");
  const cargando = {}; // evita cargar dos veces la misma vista

  const vistaActual = () => {
    const nombre = location.hash.slice(1);
    return TITULOS[nombre] ? nombre : "dashboard";
  };

  function cargarScript(src) {
    return new Promise((ok, fallo) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = () => fallo(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(s);
    });
  }

  async function cargarVista(nombre) {
    // Vistas sin archivos todavía: aviso temporal
    if (!CON_ARCHIVOS.includes(nombre)) {
      contenedor.insertAdjacentHTML("beforeend", `
        <section class="vista" id="vista-${nombre}" aria-label="${TITULOS[nombre]}">
          <div class="recent-orders">
            <h2>${TITULOS[nombre]}</h2>
            <p>Esta vista aún no está lista.</p>
          </div>
        </section>`);
      return;
    }

    const base = `../admin/vistas/${nombre}/`; // relativo a db.admin.html

    // 1) HTML
    const res = await fetch(`${base}vista-${nombre}.html`);
    if (!res.ok) throw new Error(`No se encontró ${base}vista-${nombre}.html`);
    contenedor.insertAdjacentHTML("beforeend", await res.text());

    // 2) CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${base}${nombre}.css`;
    document.head.appendChild(link);

    // 3) JS (después del HTML, para que sus IDs ya existan)
    await cargarScript(`../../controladores/${nombre}.controller.js`);
  }

  async function mostrarVista(nombre) {
    if (nombre !== "dashboard") {
      try {
        cargando[nombre] ??= cargarVista(nombre);
        await cargando[nombre];
      } catch (e) {
        console.error(e);
        delete cargando[nombre];
        document.querySelectorAll("main .vista").forEach((v) => v.classList.remove("activa"));
        contenedor.insertAdjacentHTML("beforeend", `
          <section class="vista activa" id="vista-error">
            <div class="recent-orders">
              <h2>No se pudo cargar la vista</h2>
              <p>Abre el proyecto con Live Server y revisa la consola (F12).</p>
            </div>
          </section>`);
        return;
      }
      // Si el usuario cambió de vista mientras cargaba, no pisar la actual
      if (vistaActual() !== nombre) return;
    }

    document.getElementById("vista-error")?.remove();

    document.querySelectorAll("main .vista").forEach((v) =>
      v.classList.toggle("activa", v.id === `vista-${nombre}`)
    );
    enlaces.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === `#${nombre}`)
    );
    titulo.textContent = TITULOS[nombre];

    // En móvil, cerrar el menú al navegar
    document.querySelector("aside").classList.remove("abierto");
    window.scrollTo(0, 0);
  }

  // Botones "Agregar ..." del panel derecho
  document.querySelectorAll("[data-vista]").forEach((el) =>
    el.addEventListener("click", () => {
      location.hash = el.dataset.vista;
    })
  );

  window.addEventListener("hashchange", () => mostrarVista(vistaActual()));
  mostrarVista(vistaActual());
})();
