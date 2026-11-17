/* ===== VISTA: ESTUDIANTES =====
   CRUD en localStorage + búsqueda + filtros + resumen.
   Datos: localStorage["nova_estudiantes"]
   Promedios: se calculan desde localStorage["matriculas"] si existe
              (cada matrícula: { estudianteId, materiaId, nota, estado }). */

(() => {
  const CLAVE = "nova_estudiantes";
  const CLAVE_MATRICULAS = "matriculas";
  const PROMEDIO_BAJO = 3.0;
  const COLORES = ["#7380ec", "#1fb89a", "#ff7782", "#e8a33d", "#5b6bd6"];

  const $ = (id) => document.getElementById(id);
  const tbody = $("est-tbody");
  if (!tbody) return; // la vista no está en esta página

  const el = {
    total: $("est-total"),
    activos: $("est-activos"),
    bajos: $("est-bajos"),
    buscar: $("est-buscar"),
    filtroEstado: $("est-filtro-estado"),
    filtroGrado: $("est-filtro-grado"),
    btnNuevo: $("est-btn-nuevo"),
    tablaWrap: $("est-tabla-wrap"),
    vacio: $("est-vacio"),
    vacioTitulo: $("est-vacio-titulo"),
    vacioTexto: $("est-vacio-texto"),
    modal: $("est-modal"),
    modalTitulo: $("est-modal-titulo"),
    form: $("est-form"),
    nombre: $("est-nombre"),
    documento: $("est-documento"),
    grado: $("est-grado"),
    correo: $("est-correo"),
    clave: $("est-clave"),
    verClave: $("est-ver-clave"),
    claveAyuda: $("est-clave-ayuda"),
    estado: $("est-estado"),
    error: $("est-error"),
    cerrar: $("est-cerrar"),
    cancelar: $("est-cancelar"),
  };

  let estudiantes = leer(CLAVE);
  let editandoId = null;

  /* ---------- Utilidades ---------- */
  function leer(clave) { return NovaModelo.leer(clave); }

  function guardar() {
    try {
      NovaModelo.guardar(CLAVE, estudiantes);
    } catch (e) {
      console.error("No se pudo guardar en localStorage", e);
    }
    // Actualiza las tarjetas del dashboard (db.admin.js)
    if (typeof refreshDashboard === "function") refreshDashboard();
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const normalizar = (s) =>
    String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const iniciales = (nombre) =>
    nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  function colorDe(texto) {
    let h = 0;
    for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORES[h % COLORES.length];
  }

  function siguienteCodigo() {
    const max = estudiantes.reduce((m, e) => Math.max(m, parseInt(String(e.codigo).replace(/\D/g, ""), 10) || 0), 0);
    return "EST-" + String(max + 1).padStart(3, "0");
  }

  function mapaPromedios() {
    const notas = {};
    const agregar = (id, n) => {
      if (id && Number.isFinite(n)) (notas[id] ||= []).push(n);
    };
    leer(CLAVE_MATRICULAS).forEach((m) => {
      if (m.nota === null || m.nota === "" || m.nota === undefined) return;
      agregar(m.estudianteId, parseFloat(m.nota));
    });
    // Notas finales completas de la vista Notas (10% + 30% + 60%)
    leer("nova_notas").forEach((r) => {
      const c = NovaUtils.calcular(r);
      if (c.completo) agregar(r.estudianteId, c.acumulado);
    });
    const res = {};
    for (const id in notas) res[id] = notas[id].reduce((a, b) => a + b, 0) / notas[id].length;
    return res;
  }

  /* ---------- Render ---------- */
  function actualizarGrados() {
    const actual = el.filtroGrado.value;
    const grados = [...new Set(estudiantes.map((e) => e.grado))].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true })
    );
    el.filtroGrado.innerHTML =
      '<option value="Todos">Todos los grados</option>' +
      grados.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
    el.filtroGrado.value = grados.includes(actual) ? actual : "Todos";
  }

  function filaHTML(e, promedio) {
    let prom = '<span class="est-prom est-prom--nulo">Sin notas</span>';
    if (promedio !== undefined) {
      const clase = promedio < PROMEDIO_BAJO ? "est-prom--bajo" : "est-prom--ok";
      prom = `<span class="est-prom ${clase}">${promedio.toFixed(1)}</span>`;
    }
    const claseEstado = e.estado === "Activo" ? "est-chip--activo" : "est-chip--retirado";
    return `
      <tr data-id="${esc(e.id)}">
        <td class="est-celda-persona">
          <div class="est-persona">
            <span class="est-avatar" style="background:${colorDe(e.nombre)}">${esc(iniciales(e.nombre))}</span>
            <div><strong>${esc(e.nombre)}</strong><small>${esc(e.correo)}</small></div>
          </div>
        </td>
        <td data-label="Código">${esc(e.codigo)}</td>
        <td data-label="Grado">${esc(e.grado)}</td>
        <td data-label="Promedio">${prom}</td>
        <td data-label="Estado"><span class="est-chip ${claseEstado}">${esc(e.estado)}</span></td>
        <td class="est-acciones" data-label="Acciones">
          <button type="button" class="est-icono-btn" data-accion="editar" aria-label="Editar a ${esc(e.nombre)}">
            <span class="material-icons-sharp">edit</span>
          </button>
          <button type="button" class="est-icono-btn" data-accion="eliminar" aria-label="Eliminar a ${esc(e.nombre)}">
            <span class="material-icons-sharp">delete_outline</span>
          </button>
        </td>
      </tr>`;
  }

  function render() {
    const promedios = mapaPromedios();
    actualizarGrados();

    const q = normalizar(el.buscar.value.trim());
    const lista = estudiantes.filter((e) => {
      const coincide =
        !q || [e.nombre, e.codigo, e.documento].some((campo) => normalizar(campo).includes(q));
      const okEstado = el.filtroEstado.value === "Todos" || e.estado === el.filtroEstado.value;
      const okGrado = el.filtroGrado.value === "Todos" || e.grado === el.filtroGrado.value;
      return coincide && okEstado && okGrado;
    });

    tbody.innerHTML = lista.map((e) => filaHTML(e, promedios[e.id])).join("");

    // Estado vacío
    const sinResultados = lista.length === 0;
    el.tablaWrap.hidden = sinResultados;
    el.vacio.hidden = !sinResultados;
    if (sinResultados) {
      const hayDatos = estudiantes.length > 0;
      el.vacioTitulo.textContent = hayDatos ? "Sin resultados" : "Aún no hay estudiantes";
      el.vacioTexto.textContent = hayDatos
        ? "Prueba con otro nombre o cambia los filtros."
        : "Agrega el primer estudiante para empezar a gestionar sus notas.";
    }

    // Resumen
    const activos = estudiantes.filter((e) => e.estado === "Activo");
    el.total.textContent = estudiantes.length;
    el.activos.textContent = activos.length;
    el.bajos.textContent = activos.filter((e) => promedios[e.id] !== undefined && promedios[e.id] < PROMEDIO_BAJO).length;
  }

  /* ---------- Modal ---------- */
  function mostrarError(msg, campo) {
    el.error.textContent = msg;
    el.error.hidden = false;
    [el.nombre, el.documento, el.grado, el.correo, el.clave].forEach((i) => i.removeAttribute("aria-invalid"));
    if (campo) {
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }
  }

  function limpiarError() {
    el.error.hidden = true;
    [el.nombre, el.documento, el.grado, el.correo, el.clave].forEach((i) => i.removeAttribute("aria-invalid"));
  }

  function abrirModal(estudiante = null) {
    editandoId = estudiante ? estudiante.id : null;
    el.form.reset();
    limpiarError();
    el.modalTitulo.textContent = estudiante ? "Editar estudiante" : "Agregar estudiante";
    if (estudiante) {
      el.nombre.value = estudiante.nombre;
      el.documento.value = estudiante.documento;
      el.grado.value = estudiante.grado;
      el.correo.value = estudiante.correo;
      el.estado.value = estudiante.estado;
    }
    el.clave.type = "password";
    el.verClave.querySelector("span").textContent = "visibility";
    el.claveAyuda.textContent = estudiante ? "Déjala vacía para conservar la contraseña actual." : "La usará el estudiante para iniciar sesión.";
    el.modal.showModal();
    el.nombre.focus();
  }

  const cerrarModal = () => el.modal.close();

  function validar() {
    const nombre = el.nombre.value.trim();
    const documento = el.documento.value.trim();
    const grado = el.grado.value.trim();
    const correo = el.correo.value.trim();

    if (nombre.length < 3) return mostrarError("Escribe el nombre completo (mínimo 3 letras).", el.nombre);
    if (!/^\d{5,12}$/.test(documento)) return mostrarError("El documento debe tener entre 5 y 12 números.", el.documento);
    if (!grado) return mostrarError("Indica el grado del estudiante.", el.grado);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mostrarError("Escribe un correo válido, por ejemplo nombre@correo.com.", el.correo);

    const clave = el.clave.value;
    const editando = Boolean(editandoId);
    if (!editando && clave.length < 6) return mostrarError("La contraseña debe tener mínimo 6 caracteres.", el.clave);
    if (editando && clave && clave.length < 6) return mostrarError("La nueva contraseña debe tener mínimo 6 caracteres.", el.clave);

    const repetido = estudiantes.some((e) => e.documento === documento && e.id !== editandoId);
    if (repetido) return mostrarError("Ya hay un estudiante con ese documento.", el.documento);

    return { nombre, documento, grado, correo, clave, estado: el.estado.value };
  }

  /* ---------- Eventos ---------- */
  el.btnNuevo.addEventListener("click", () => abrirModal());
  el.cerrar.addEventListener("click", cerrarModal);
  el.cancelar.addEventListener("click", cerrarModal);

  // Cerrar al hacer clic fuera del cuadro
  el.modal.addEventListener("click", (ev) => {
    if (ev.target === el.modal) cerrarModal();
  });

  el.form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = validar();
    if (!datos) return;

    const { clave, ...resto } = datos;
    const claveHash = clave ? await NovaUtils.hashClave(clave) : null;

    if (editandoId) {
      estudiantes = estudiantes.map((e) =>
        e.id === editandoId ? { ...e, ...resto, ...(claveHash && { claveHash }) } : e
      );
    } else {
      estudiantes.push({
        id: "est-" + Date.now().toString(36),
        codigo: siguienteCodigo(),
        ...resto,
        claveHash,
      });
    }
    guardar();
    cerrarModal();
    render();
  });

  tbody.addEventListener("click", (ev) => {
    const boton = ev.target.closest("button[data-accion]");
    if (!boton) return;
    const id = boton.closest("tr").dataset.id;
    const estudiante = estudiantes.find((e) => e.id === id);
    if (!estudiante) return;

    if (boton.dataset.accion === "editar") {
      abrirModal(estudiante);
    } else if (boton.dataset.accion === "eliminar") {
      if (confirm(`¿Eliminar a ${estudiante.nombre}? Esta acción no se puede deshacer.`)) {
        estudiantes = estudiantes.filter((e) => e.id !== id);
        guardar();
        render();
      }
    }
  });

  NovaUtils.activarVerClave(el.verClave, el.clave);

  el.buscar.addEventListener("input", render);
  el.filtroEstado.addEventListener("change", render);
  el.filtroGrado.addEventListener("change", render);

  window.addEventListener("nova:datos", () => {
    estudiantes = leer(CLAVE);
    render();
  });

  render();
})();
