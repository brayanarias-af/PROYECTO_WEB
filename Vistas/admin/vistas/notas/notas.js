/* ===== VISTA: NOTAS =====
   Nota final = 10% autoevaluación + 30% promedio(tareas, talleres y quices) + 60% parcial
   Datos: localStorage["nova_notas"]
   Cada registro: { id, estudianteId, estudianteNombre, materia, autoevaluacion,
                    actividades: [{ nombre, nota }], parcial } */

(() => {
  const CLAVE = "nova_notas";
  const U = NovaUtils;
  const $ = (id) => document.getElementById(id);
  const tbody = $("not-tbody");
  if (!tbody) return;

  const el = {
    total: $("not-total"),
    promedio: $("not-promedio"),
    bajos: $("not-bajos"),
    buscar: $("not-buscar"),
    filtroEstado: $("not-filtro-estado"),
    btnNuevo: $("not-btn-nuevo"),
    tablaWrap: $("not-tabla-wrap"),
    vacio: $("not-vacio"),
    vacioTitulo: $("not-vacio-titulo"),
    vacioTexto: $("not-vacio-texto"),
    modal: $("not-modal"),
    modalTitulo: $("not-modal-titulo"),
    form: $("not-form"),
    estudiante: $("not-estudiante"),
    materia: $("not-materia"),
    auto: $("not-auto"),
    parcial: $("not-parcial"),
    actividades: $("not-actividades"),
    agregarAct: $("not-agregar-act"),
    preview: $("not-preview"),
    error: $("not-error"),
    cerrar: $("not-cerrar"),
    cancelar: $("not-cancelar"),
  };

  let notas = U.leer(CLAVE);
  let editandoId = null;

  /* ---------- Utilidades ---------- */
  const estudiantes = () => U.leer("nova_estudiantes");
  const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(1));

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const normalizar = (s) =>
    String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(notas));
    } catch (e) {
      console.error("No se pudo guardar en localStorage", e);
    }
    if (typeof refreshDashboard === "function") refreshDashboard();
  }

  function nombreDe(reg) {
    const e = estudiantes().find((x) => x.id === reg.estudianteId);
    return e ? e.nombre : reg.estudianteNombre || "Estudiante eliminado";
  }

  function estadoDe(c) {
    if (!c.completo) return "En curso";
    return c.acumulado >= U.NOTA_MINIMA ? "Aprobado" : "Reprobado";
  }

  /* ---------- Render ---------- */
  function filaHTML(reg) {
    const c = U.calcular(reg);
    const estado = estadoDe(c);
    const claseEstado = { Aprobado: "not-chip--aprobado", Reprobado: "not-chip--reprobado", "En curso": "not-chip--curso" }[estado];

    const chips = (reg.actividades || [])
      .filter((a) => U.num(a.nota) !== null)
      .map((a) => `<span class="not-nota" title="${esc(a.nombre || "Nota")}">${U.num(a.nota).toFixed(1)}</span>`)
      .join("");

    const tareas = c.cantidad
      ? `<div class="not-chips">${chips}</div>
         <span class="not-resumen-act">Suma <b>${c.sumaTareas.toFixed(1)}</b> · Promedio <b>${fmt(c.promTareas)}</b> (${c.cantidad} ${c.cantidad === 1 ? "nota" : "notas"})</span>`
      : '<span class="not-pend">Sin notas</span>';

    return `
      <tr data-id="${esc(reg.id)}">
        <td class="not-celda-persona"><strong>${esc(nombreDe(reg))}</strong></td>
        <td data-label="Materia">${esc(reg.materia)}</td>
        <td data-label="Autoeval. (10%)">${c.auto === null ? '<span class="not-pend">Pendiente</span>' : fmt(c.auto)}</td>
        <td data-label="Tareas (30%)" class="not-celda-tareas">${tareas}</td>
        <td data-label="Parcial (60%)">${c.parcial === null ? '<span class="not-pend">Pendiente</span>' : fmt(c.parcial)}</td>
        <td data-label="Nota final">
          <div class="not-final">${c.acumulado.toFixed(1)}<small>${c.completo ? "final" : "acumulado"}</small></div>
          <span class="not-chip ${claseEstado}">${estado}</span>
        </td>
        <td class="not-acciones" data-label="Acciones">
          <button type="button" class="not-icono-btn" data-accion="editar" aria-label="Editar notas">
            <span class="material-icons-sharp">edit</span>
          </button>
          <button type="button" class="not-icono-btn" data-accion="eliminar" aria-label="Eliminar notas">
            <span class="material-icons-sharp">delete_outline</span>
          </button>
        </td>
      </tr>`;
  }

  function render() {
    const q = normalizar(el.buscar.value.trim());
    const lista = notas.filter((r) => {
      const coincide = !q || [nombreDe(r), r.materia].some((x) => normalizar(x).includes(q));
      const okEstado = el.filtroEstado.value === "Todos" || estadoDe(U.calcular(r)) === el.filtroEstado.value;
      return coincide && okEstado;
    });

    tbody.innerHTML = lista.map(filaHTML).join("");

    const sinResultados = lista.length === 0;
    el.tablaWrap.hidden = sinResultados;
    el.vacio.hidden = !sinResultados;
    if (sinResultados) {
      const hayDatos = notas.length > 0;
      el.vacioTitulo.textContent = hayDatos ? "Sin resultados" : "Aún no hay notas registradas";
      el.vacioTexto.textContent = hayDatos
        ? "Prueba con otro nombre o cambia el filtro."
        : "Registra las notas de un estudiante para ver su nota final calculada.";
    }

    // Resumen (solo notas finales completas)
    const finales = notas.map(U.calcular).filter((c) => c.completo).map((c) => c.acumulado);
    el.total.textContent = notas.length;
    el.promedio.textContent = finales.length ? (finales.reduce((a, b) => a + b, 0) / finales.length).toFixed(2) : "—";
    el.bajos.textContent = finales.filter((n) => n < U.NOTA_MINIMA).length;
  }

  /* ---------- Modal ---------- */
  function agregarFilaActividad(nombre = "", nota = "") {
    const fila = document.createElement("div");
    fila.className = "not-fila-act";
    fila.innerHTML = `
      <input type="text" class="not-act-nombre" placeholder="Ej. Quiz 1, Taller 2" value="${esc(nombre)}" autocomplete="off" aria-label="Nombre de la actividad" />
      <input type="text" class="not-act-nota" inputmode="decimal" placeholder="0.0 - 5.0" value="${esc(nota)}" autocomplete="off" aria-label="Nota" />
      <button type="button" class="not-icono-btn" aria-label="Quitar nota"><span class="material-icons-sharp">close</span></button>`;
    el.actividades.appendChild(fila);
    return fila;
  }

  const leerActividades = () =>
    [...el.actividades.querySelectorAll(".not-fila-act")].map((f) => ({
      nombre: f.querySelector(".not-act-nombre").value.trim(),
      nota: f.querySelector(".not-act-nota").value.trim(),
    }));

  const leerFormulario = () => ({
    autoevaluacion: el.auto.value.trim(),
    parcial: el.parcial.value.trim(),
    actividades: leerActividades(),
  });

  function actualizarPreview() {
    const c = U.calcular(leerFormulario());
    el.preview.innerHTML = `
      <div><span>Autoevaluación (10%)</span><strong>${fmt(c.auto)}</strong></div>
      <div><span>Suma tareas (${c.cantidad})</span><strong>${c.cantidad ? c.sumaTareas.toFixed(1) : "—"}</strong></div>
      <div><span>Promedio tareas (30%)</span><strong>${fmt(c.promTareas)}</strong></div>
      <div><span>Parcial (60%)</span><strong>${fmt(c.parcial)}</strong></div>
      <div><span>${c.completo ? "Nota final" : "Acumulado"}</span><strong>${c.acumulado.toFixed(2)}</strong></div>`;
  }

  function mostrarError(msg, campo) {
    el.error.textContent = msg;
    el.error.hidden = false;
    if (campo) campo.focus();
    return null;
  }

  function llenarEstudiantes(seleccionado) {
    const lista = estudiantes().filter((e) => e.estado === "Activo" || e.id === seleccionado);
    el.estudiante.innerHTML = lista.length
      ? '<option value="">Selecciona un estudiante</option>' +
        lista.map((e) => `<option value="${esc(e.id)}">${esc(e.nombre)} (${esc(e.codigo)})</option>`).join("")
      : '<option value="">No hay estudiantes: agrégalos primero</option>';
    el.estudiante.value = seleccionado || "";
  }

  function abrirModal(reg = null) {
    editandoId = reg ? reg.id : null;
    el.form.reset();
    el.error.hidden = true;
    el.actividades.innerHTML = "";
    el.modalTitulo.textContent = reg ? "Editar notas" : "Registrar notas";
    // Sugerencias de materias creadas en la vista Materias
    $("not-materias").innerHTML = U.leer("nova_materias")
      .filter((m) => m.estado === "Activa")
      .map((m) => `<option value="${esc(m.nombre)}"></option>`)
      .join("");
    llenarEstudiantes(reg ? reg.estudianteId : "");
    if (reg) {
      el.materia.value = reg.materia;
      el.auto.value = reg.autoevaluacion ?? "";
      el.parcial.value = reg.parcial ?? "";
      (reg.actividades || []).forEach((a) => agregarFilaActividad(a.nombre, a.nota));
    }
    if (!el.actividades.children.length) agregarFilaActividad();
    actualizarPreview();
    el.modal.showModal();
  }

  const cerrarModal = () => el.modal.close();

  function validar() {
    el.error.hidden = true;
    const estudianteId = el.estudiante.value;
    const materia = el.materia.value.trim();
    if (!estudianteId) return mostrarError("Selecciona el estudiante.", el.estudiante);
    if (!materia) return mostrarError("Escribe la materia.", el.materia);

    const form = leerFormulario();
    const fueraDeRango = (v) => v !== "" && (U.num(v) === null || U.num(v) < 0 || U.num(v) > 5);

    if (fueraDeRango(form.autoevaluacion)) return mostrarError("La autoevaluación debe estar entre 0.0 y 5.0.", el.auto);
    if (fueraDeRango(form.parcial)) return mostrarError("El parcial debe estar entre 0.0 y 5.0.", el.parcial);

    const filas = [...el.actividades.querySelectorAll(".not-act-nota")];
    for (const campo of filas) {
      if (fueraDeRango(campo.value.trim())) return mostrarError("Cada nota de tareas, talleres y quices debe estar entre 0.0 y 5.0.", campo);
    }

    // Se descartan filas vacías
    const actividades = form.actividades.filter((a) => a.nota !== "");
    if (form.autoevaluacion === "" && form.parcial === "" && !actividades.length)
      return mostrarError("Escribe al menos una nota.", el.auto);

    if (notas.some((r) => r.estudianteId === estudianteId && normalizar(r.materia) === normalizar(materia) && r.id !== editandoId))
      return mostrarError("Ese estudiante ya tiene notas en esa materia. Edita el registro existente.", el.materia);

    const est = estudiantes().find((e) => e.id === estudianteId);
    return {
      estudianteId,
      estudianteNombre: est ? est.nombre : "",
      materia,
      autoevaluacion: form.autoevaluacion,
      parcial: form.parcial,
      actividades,
    };
  }

  /* ---------- Eventos ---------- */
  el.btnNuevo.addEventListener("click", () => abrirModal());
  el.cerrar.addEventListener("click", cerrarModal);
  el.cancelar.addEventListener("click", cerrarModal);
  el.modal.addEventListener("click", (ev) => {
    if (ev.target === el.modal) cerrarModal();
  });

  el.agregarAct.addEventListener("click", () => {
    agregarFilaActividad().querySelector(".not-act-nombre").focus();
  });

  el.actividades.addEventListener("click", (ev) => {
    const quitar = ev.target.closest("button");
    if (!quitar) return;
    quitar.closest(".not-fila-act").remove();
    if (!el.actividades.children.length) agregarFilaActividad();
    actualizarPreview();
  });

  el.form.addEventListener("input", actualizarPreview);

  el.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const datos = validar();
    if (!datos) return;

    if (editandoId) {
      notas = notas.map((r) => (r.id === editandoId ? { ...r, ...datos } : r));
    } else {
      notas.push({ id: "not-" + Date.now().toString(36), ...datos });
    }
    guardar();
    cerrarModal();
    render();
  });

  tbody.addEventListener("click", (ev) => {
    const boton = ev.target.closest("button[data-accion]");
    if (!boton) return;
    const id = boton.closest("tr").dataset.id;
    const reg = notas.find((r) => r.id === id);
    if (!reg) return;

    if (boton.dataset.accion === "editar") {
      abrirModal(reg);
    } else if (confirm(`¿Eliminar las notas de ${nombreDe(reg)} en ${reg.materia}? Esta acción no se puede deshacer.`)) {
      notas = notas.filter((r) => r.id !== id);
      guardar();
      render();
    }
  });

  el.buscar.addEventListener("input", render);
  el.filtroEstado.addEventListener("change", render);

  window.addEventListener("nova:datos", () => {
    notas = U.leer(CLAVE);
    render();
  });

  render();
})();
