/* ===== VISTA (estudiante): NOTAS =====
   El estudiante solo ve el promedio del 30% (tareas, talleres y quices).
   Las notas completas (10% autoevaluación y 60% parcial) son de admin y profesores.
   Pestañas: Periodo 1-4, General (4 periodos) e Imprimir boletín (solo el botón, sin funcionalidad). */

(() => {
  if (typeof NovaEst === "undefined" || !NovaEst) return;
  const { U, esc, norm, fmt } = NovaEst;
  const $ = (id) => document.getElementById(id);

  const el = {
    tabs: $("ea-not-tabs"),
    periodo: $("ea-not-periodo"),
    general: $("ea-not-general"),
    boletin: $("ea-not-boletin"),
    tbody: $("ea-not-tbody"),
    genTbody: $("ea-gen-tbody"),
    vacio: $("ea-not-vacio"),
    tipoBoletin: $("ea-bol-tipo"),
  };

  const PERIODOS = ["1", "2", "3", "4"];
  let tabActiva = "1"; // "1".."4", "gen" o "bol"

  // Materias del estudiante: las matriculadas + las que tienen notas registradas
  // (sin contar las que canceló)
  function materiasDelEstudiante() {
    const mapa = new Map(); // nombre normalizado -> { nombre, profesor }
    NovaEst.matriculadas().forEach(({ materia }) => {
      const prof = NovaEst.profesorDe(materia);
      mapa.set(norm(materia.nombre), { nombre: materia.nombre, profesor: prof ? prof.nombre : null });
    });

    const canceladas = new Set(
      NovaEst.matriculas().filter((m) => m.estado === "Cancelada").map((m) => norm(NovaEst.nombreMateria(m)))
    );
    NovaEst.notas().forEach((r) => {
      const llave = norm(r.materia);
      if (!mapa.has(llave) && !canceladas.has(llave)) mapa.set(llave, { nombre: r.materia, profesor: null });
    });
    return [...mapa.entries()].map(([llave, m]) => ({ llave, ...m }));
  }

  // Promedio del 30% de una materia en un periodo (null si no hay notas)
  function promedio30(registros, llave, periodo) {
    const reg = registros.find((r) => norm(r.materia) === llave && String(r.periodo || "1") === periodo);
    return reg ? U.calcular(reg).promTareas : null;
  }

  const celda = (valor, etiqueta) =>
    `<td data-label="${etiqueta}">${valor === null ? '<span class="ea-pend">Sin notas</span>' : `<span class="ea-promedio">${fmt(valor)}</span>`}</td>`;

  function render() {
    const materias = materiasDelEstudiante();
    const registros = NovaEst.notas();
    const esBoletin = tabActiva === "bol";
    const esGeneral = tabActiva === "gen";
    const sinMaterias = materias.length === 0;

    el.periodo.hidden = esGeneral || esBoletin || sinMaterias;
    el.general.hidden = !esGeneral || sinMaterias;
    el.boletin.hidden = !esBoletin;
    el.vacio.hidden = esBoletin || !sinMaterias;

    el.tbody.innerHTML = PERIODOS.includes(tabActiva)
      ? materias
          .map(
            (m) => `
      <tr>
        <td class="ea-celda-materia"><strong>${esc(m.nombre)}</strong></td>
        <td data-label="Profesor">${m.profesor ? esc(m.profesor) : '<span class="ea-pend">Sin asignar</span>'}</td>
        ${celda(promedio30(registros, m.llave, tabActiva), "Promedio (30%)")}
      </tr>`
          )
          .join("")
      : "";

    el.genTbody.innerHTML = esGeneral
      ? materias
          .map(
            (m) => `
      <tr>
        <td class="ea-celda-materia"><strong>${esc(m.nombre)}</strong></td>
        ${PERIODOS.map((p) => celda(promedio30(registros, m.llave, p), "Periodo " + p)).join("")}
      </tr>`
          )
          .join("")
      : "";
  }

  function marcarTab() {
    el.tabs.querySelectorAll(".ea-tab").forEach((t) => {
      const activo = t.dataset.tab === tabActiva;
      t.classList.toggle("activo", activo);
      t.setAttribute("aria-selected", activo);
    });
    // El boletín propone el periodo que se está viendo
    if (tabActiva !== "bol") el.tipoBoletin.value = tabActiva;
  }

  el.tabs.addEventListener("click", (ev) => {
    const t = ev.target.closest(".ea-tab");
    if (!t) return;
    tabActiva = t.dataset.tab;
    marcarTab();
    render();
  });

  // Desde un aviso ("Ya están tus notas del Periodo N")
  window.addEventListener("ea:periodo", (ev) => {
    tabActiva = ev.detail;
    marcarTab();
    render();
  });

  window.addEventListener("ea:datos", render);
  render();
})();
