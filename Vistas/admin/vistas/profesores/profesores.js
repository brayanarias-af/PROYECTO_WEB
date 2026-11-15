/* ===== VISTA: PROFESORES =====
   CRUD en localStorage + búsqueda + filtro + resumen.
   Datos: localStorage["nova_profesores"] (la contraseña se guarda con hash). */

(() => {
  const CLAVE = "nova_profesores";
  const COLORES = ["#7380ec", "#1fb89a", "#ff7782", "#e8a33d", "#5b6bd6"];

  const $ = (id) => document.getElementById(id);
  const tbody = $("pro-tbody");
  if (!tbody) return;

  const el = {
    total: $("pro-total"),
    activos: $("pro-activos"),
    buscar: $("pro-buscar"),
    filtroEstado: $("pro-filtro-estado"),
    btnNuevo: $("pro-btn-nuevo"),
    tablaWrap: $("pro-tabla-wrap"),
    vacio: $("pro-vacio"),
    vacioTitulo: $("pro-vacio-titulo"),
    vacioTexto: $("pro-vacio-texto"),
    modal: $("pro-modal"),
    modalTitulo: $("pro-modal-titulo"),
    form: $("pro-form"),
    nombre: $("pro-nombre"),
    documento: $("pro-documento"),
    materia: $("pro-materia"),
    correo: $("pro-correo"),
    clave: $("pro-clave"),
    verClave: $("pro-ver-clave"),
    claveAyuda: $("pro-clave-ayuda"),
    estado: $("pro-estado"),
    error: $("pro-error"),
    cerrar: $("pro-cerrar"),
    cancelar: $("pro-cancelar"),
  };
  const campos = [el.nombre, el.documento, el.materia, el.correo, el.clave];

  let profesores = NovaUtils.leer(CLAVE);
  let editandoId = null;

  /* ---------- Utilidades ---------- */
  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(profesores));
    } catch (e) {
      console.error("No se pudo guardar en localStorage", e);
    }
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

  /* ---------- Render ---------- */
  function filaHTML(p) {
    const claseEstado = p.estado === "Activo" ? "pro-chip--activo" : "pro-chip--retirado";
    return `
      <tr data-id="${esc(p.id)}">
        <td class="pro-celda-persona">
          <div class="pro-persona">
            <span class="pro-avatar" style="background:${colorDe(p.nombre)}">${esc(iniciales(p.nombre))}</span>
            <div><strong>${esc(p.nombre)}</strong><small>${esc(p.correo)}</small></div>
          </div>
        </td>
        <td data-label="Documento">${esc(p.documento)}</td>
        <td data-label="Materia">${esc(p.materia)}</td>
        <td data-label="Estado"><span class="pro-chip ${claseEstado}">${esc(p.estado)}</span></td>
        <td class="pro-acciones" data-label="Acciones">
          <button type="button" class="pro-icono-btn" data-accion="editar" aria-label="Editar a ${esc(p.nombre)}">
            <span class="material-icons-sharp">edit</span>
          </button>
          <button type="button" class="pro-icono-btn" data-accion="eliminar" aria-label="Eliminar a ${esc(p.nombre)}">
            <span class="material-icons-sharp">delete_outline</span>
          </button>
        </td>
      </tr>`;
  }

  function render() {
    const q = normalizar(el.buscar.value.trim());
    const lista = profesores.filter((p) => {
      const coincide = !q || [p.nombre, p.materia, p.documento].some((c) => normalizar(c).includes(q));
      const okEstado = el.filtroEstado.value === "Todos" || p.estado === el.filtroEstado.value;
      return coincide && okEstado;
    });

    tbody.innerHTML = lista.map(filaHTML).join("");

    const sinResultados = lista.length === 0;
    el.tablaWrap.hidden = sinResultados;
    el.vacio.hidden = !sinResultados;
    if (sinResultados) {
      const hayDatos = profesores.length > 0;
      el.vacioTitulo.textContent = hayDatos ? "Sin resultados" : "Aún no hay profesores";
      el.vacioTexto.textContent = hayDatos
        ? "Prueba con otro nombre o cambia el filtro."
        : "Agrega el primer profesor para empezar.";
    }

    el.total.textContent = profesores.length;
    el.activos.textContent = profesores.filter((p) => p.estado === "Activo").length;
  }

  /* ---------- Modal ---------- */
  function limpiarError() {
    el.error.hidden = true;
    campos.forEach((i) => i.removeAttribute("aria-invalid"));
  }

  function mostrarError(msg, campo) {
    limpiarError();
    el.error.textContent = msg;
    el.error.hidden = false;
    if (campo) {
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }
  }

  function abrirModal(profesor = null) {
    editandoId = profesor ? profesor.id : null;
    el.form.reset();
    limpiarError();
    el.modalTitulo.textContent = profesor ? "Editar profesor" : "Agregar profesor";
    if (profesor) {
      el.nombre.value = profesor.nombre;
      el.documento.value = profesor.documento;
      el.materia.value = profesor.materia;
      el.correo.value = profesor.correo;
      el.estado.value = profesor.estado;
    }
    el.clave.type = "password";
    el.verClave.querySelector("span").textContent = "visibility";
    el.claveAyuda.textContent = profesor
      ? "Déjala vacía para conservar la contraseña actual."
      : "La usará el profesor para iniciar sesión.";
    el.modal.showModal();
    el.nombre.focus();
  }

  const cerrarModal = () => el.modal.close();

  function validar() {
    const nombre = el.nombre.value.trim();
    const documento = el.documento.value.trim();
    const materia = el.materia.value.trim();
    const correo = el.correo.value.trim();
    const clave = el.clave.value;

    if (nombre.length < 3) return mostrarError("Escribe el nombre completo (mínimo 3 letras).", el.nombre);
    if (!/^\d{5,12}$/.test(documento)) return mostrarError("El documento debe tener entre 5 y 12 números.", el.documento);
    if (!materia) return mostrarError("Indica la materia que dicta el profesor.", el.materia);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mostrarError("Escribe un correo válido, por ejemplo nombre@correo.com.", el.correo);
    if (!editandoId && clave.length < 6) return mostrarError("La contraseña debe tener mínimo 6 caracteres.", el.clave);
    if (editandoId && clave && clave.length < 6) return mostrarError("La nueva contraseña debe tener mínimo 6 caracteres.", el.clave);

    if (profesores.some((p) => p.documento === documento && p.id !== editandoId))
      return mostrarError("Ya hay un profesor con ese documento.", el.documento);

    return { nombre, documento, materia, correo, clave, estado: el.estado.value };
  }

  /* ---------- Eventos ---------- */
  el.btnNuevo.addEventListener("click", () => abrirModal());
  el.cerrar.addEventListener("click", cerrarModal);
  el.cancelar.addEventListener("click", cerrarModal);
  el.modal.addEventListener("click", (ev) => {
    if (ev.target === el.modal) cerrarModal();
  });
  NovaUtils.activarVerClave(el.verClave, el.clave);

  el.form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = validar();
    if (!datos) return;

    const { clave, ...resto } = datos;
    const claveHash = clave ? await NovaUtils.hashClave(clave) : null;

    if (editandoId) {
      profesores = profesores.map((p) =>
        p.id === editandoId ? { ...p, ...resto, ...(claveHash && { claveHash }) } : p
      );
    } else {
      profesores.push({ id: "pro-" + Date.now().toString(36), ...resto, claveHash });
    }
    guardar();
    cerrarModal();
    render();
  });

  tbody.addEventListener("click", (ev) => {
    const boton = ev.target.closest("button[data-accion]");
    if (!boton) return;
    const id = boton.closest("tr").dataset.id;
    const profesor = profesores.find((p) => p.id === id);
    if (!profesor) return;

    if (boton.dataset.accion === "editar") {
      abrirModal(profesor);
    } else if (confirm(`¿Eliminar a ${profesor.nombre}? Esta acción no se puede deshacer.`)) {
      profesores = profesores.filter((p) => p.id !== id);
      guardar();
      render();
    }
  });

  el.buscar.addEventListener("input", render);
  el.filtroEstado.addEventListener("change", render);

  window.addEventListener("nova:datos", () => {
    profesores = NovaUtils.leer(CLAVE);
    render();
  });

  render();
})();
