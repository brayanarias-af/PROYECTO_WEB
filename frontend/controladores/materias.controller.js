/* ===== VISTA: MATERIAS =====
   CRUD en localStorage["nova_materias"]. Cada materia: { id, codigo, nombre, grado, profesorId, estado } */

(() => {
  const CLAVE = "nova_materias";
  const U = NovaUtils;
  const $ = (id) => document.getElementById(id);
  const tbody = $("mat-tbody");
  if (!tbody) return;

  const el = {
    total: $("mat-total"), activas: $("mat-activas"), sinProf: $("mat-sinprof"),
    buscar: $("mat-buscar"), filtroEstado: $("mat-filtro-estado"), filtroGrado: $("mat-filtro-grado"),
    btnNuevo: $("mat-btn-nuevo"), tablaWrap: $("mat-tabla-wrap"),
    vacio: $("mat-vacio"), vacioTitulo: $("mat-vacio-titulo"), vacioTexto: $("mat-vacio-texto"),
    modal: $("mat-modal"), modalTitulo: $("mat-modal-titulo"), form: $("mat-form"),
    nombre: $("mat-nombre"), grado: $("mat-grado"), estado: $("mat-estado"), profesor: $("mat-profesor"),
    error: $("mat-error"), cerrar: $("mat-cerrar"), cancelar: $("mat-cancelar"),
  };

  let materias = U.leer(CLAVE);
  let editandoId = null;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizar = (s) =>
    String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const profesores = () => U.leer("nova_profesores");
  const profesorDe = (m) => profesores().find((p) => p.id === m.profesorId);

  function guardar() {
    try { NovaModelo.guardar(CLAVE, materias); } catch (e) { console.error(e); }
    if (typeof refreshDashboard === "function") refreshDashboard();
  }

  function siguienteCodigo() {
    const max = materias.reduce((m, x) => Math.max(m, parseInt(String(x.codigo).replace(/\D/g, ""), 10) || 0), 0);
    return "MAT-" + String(max + 1).padStart(3, "0");
  }

  /* ---------- Render ---------- */
  function actualizarGrados() {
    const actual = el.filtroGrado.value;
    const grados = [...new Set(materias.map((m) => m.grado))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    el.filtroGrado.innerHTML =
      '<option value="Todos">Todos los grados</option>' + grados.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
    el.filtroGrado.value = grados.includes(actual) ? actual : "Todos";
  }

  function filaHTML(m) {
    const prof = profesorDe(m);
    const clase = m.estado === "Activa" ? "mat-chip--activo" : "mat-chip--retirado";
    return `
      <tr data-id="${esc(m.id)}">
        <td class="mat-celda-persona"><strong>${esc(m.nombre)}</strong></td>
        <td data-label="Código">${esc(m.codigo)}</td>
        <td data-label="Grado">${esc(m.grado)}</td>
        <td data-label="Profesor">${prof ? esc(prof.nombre) : '<span class="mat-sin">Sin asignar</span>'}</td>
        <td data-label="Estado"><span class="mat-chip ${clase}">${esc(m.estado)}</span></td>
        <td class="mat-acciones" data-label="Acciones">
          <button type="button" class="mat-icono-btn" data-accion="editar" aria-label="Editar ${esc(m.nombre)}"><span class="material-icons-sharp">edit</span></button>
          <button type="button" class="mat-icono-btn" data-accion="eliminar" aria-label="Eliminar ${esc(m.nombre)}"><span class="material-icons-sharp">delete_outline</span></button>
        </td>
      </tr>`;
  }

  function render() {
    actualizarGrados();
    const q = normalizar(el.buscar.value.trim());
    const lista = materias.filter((m) => {
      const coincide = !q || [m.nombre, m.codigo].some((c) => normalizar(c).includes(q));
      return coincide &&
        (el.filtroEstado.value === "Todos" || m.estado === el.filtroEstado.value) &&
        (el.filtroGrado.value === "Todos" || m.grado === el.filtroGrado.value);
    });

    tbody.innerHTML = lista.map(filaHTML).join("");
    const sin = lista.length === 0;
    el.tablaWrap.hidden = sin;
    el.vacio.hidden = !sin;
    if (sin) {
      const hay = materias.length > 0;
      el.vacioTitulo.textContent = hay ? "Sin resultados" : "Aún no hay materias";
      el.vacioTexto.textContent = hay ? "Prueba con otro nombre o cambia los filtros." : "Agrega la primera materia para poder asignarle profesor y notas.";
    }
    el.total.textContent = materias.length;
    el.activas.textContent = materias.filter((m) => m.estado === "Activa").length;
    el.sinProf.textContent = materias.filter((m) => m.estado === "Activa" && !profesorDe(m)).length;
  }

  /* ---------- Modal ---------- */
  function mostrarError(msg, campo) {
    el.error.textContent = msg;
    el.error.hidden = false;
    if (campo) campo.focus();
    return null;
  }

  function llenarProfesores(seleccionado) {
    const lista = profesores().filter((p) => p.estado === "Activo" || p.id === seleccionado);
    el.profesor.innerHTML =
      '<option value="">Sin asignar</option>' +
      lista.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}${p.materia ? " · " + esc(p.materia) : ""}</option>`).join("");
    el.profesor.value = seleccionado || "";
  }

  function abrirModal(m = null) {
    editandoId = m ? m.id : null;
    el.form.reset();
    el.error.hidden = true;
    el.modalTitulo.textContent = m ? "Editar materia" : "Agregar materia";
    llenarProfesores(m ? m.profesorId : "");
    if (m) {
      el.nombre.value = m.nombre;
      el.grado.value = m.grado;
      el.estado.value = m.estado;
    }
    el.modal.showModal();
    el.nombre.focus();
  }
  const cerrarModal = () => el.modal.close();

  el.btnNuevo.addEventListener("click", () => abrirModal());
  el.cerrar.addEventListener("click", cerrarModal);
  el.cancelar.addEventListener("click", cerrarModal);
  el.modal.addEventListener("click", (ev) => { if (ev.target === el.modal) cerrarModal(); });

  el.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    el.error.hidden = true;
    const nombre = el.nombre.value.trim();
    const grado = el.grado.value.trim();
    if (nombre.length < 3) return mostrarError("Escribe el nombre de la materia (mínimo 3 letras).", el.nombre);
    if (!grado) return mostrarError("Indica el grado de la materia.", el.grado);
    if (materias.some((m) => normalizar(m.nombre) === normalizar(nombre) && m.grado === grado && m.id !== editandoId))
      return mostrarError("Ya existe esa materia en ese grado.", el.nombre);

    const datos = { nombre, grado, estado: el.estado.value, profesorId: el.profesor.value };
    if (editandoId) materias = materias.map((m) => (m.id === editandoId ? { ...m, ...datos } : m));
    else materias.push({ id: "mat-" + Date.now().toString(36), codigo: siguienteCodigo(), ...datos });
    guardar();
    cerrarModal();
    render();
  });

  tbody.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-accion]");
    if (!b) return;
    const id = b.closest("tr").dataset.id;
    const m = materias.find((x) => x.id === id);
    if (!m) return;
    if (b.dataset.accion === "editar") abrirModal(m);
    else if (confirm(`¿Eliminar la materia ${m.nombre}? Esta acción no se puede deshacer.`)) {
      materias = materias.filter((x) => x.id !== id);
      guardar();
      render();
    }
  });

  el.buscar.addEventListener("input", render);
  el.filtroEstado.addEventListener("change", render);
  el.filtroGrado.addEventListener("change", render);

  // Otros módulos cambiaron datos (p. ej. un profesor editado): recargar
  window.addEventListener("nova:datos", () => { materias = U.leer(CLAVE); render(); });

  render();
})();
