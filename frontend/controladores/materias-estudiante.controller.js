/* ===== VISTA (estudiante): MATERIAS =====
   - "Disponibles": materias activas de su grado en las que aún no está matriculado.
   - "Mis materias": en las que está matriculado ahora.
   Cada matrícula se guarda en localStorage["matriculas"]:
     { id, estudianteId, materiaId, materia, estado: "Matriculada" | "Cancelada", fecha, fechaCancelacion }
   Al cancelar, el registro queda como "Cancelada" (el admin lo ve en sus movimientos);
   si se vuelve a matricular se crea una matrícula nueva. */

(() => {
  if (typeof NovaEst === "undefined" || !NovaEst) return;
  const { U, esc } = NovaEst;
  const $ = (id) => document.getElementById(id);

  const el = {
    tabs: $("ea-mat-tabs"),
    info: $("ea-mat-info"),
    lista: $("ea-mat-lista"),
    vacio: $("ea-mat-vacio"),
    vacioTitulo: $("ea-mat-vacio-titulo"),
    vacioTexto: $("ea-mat-vacio-texto"),
    contDisp: $("ea-cont-disp"),
    contMias: $("ea-cont-mias"),
  };

  let tab = "disponibles"; // "disponibles" | "mias"

  function tarjeta(materia, matriculada) {
    const prof = NovaEst.profesorDe(materia);
    const accion = matriculada
      ? `<button type="button" class="ea-btn ea-btn--peligro" data-accion="cancelar" data-id="${esc(materia.id)}">
           <span class="material-icons-sharp">event_busy</span> Cancelar materia</button>`
      : `<button type="button" class="ea-btn ea-btn--primario" data-accion="matricular" data-id="${esc(materia.id)}">
           <span class="material-icons-sharp">add_circle_outline</span> Matricularme</button>`;
    return `
      <article class="ea-materia">
        <div class="ea-materia-cab">
          <span class="ea-materia-icono"><span class="material-icons-sharp">menu_book</span></span>
          ${matriculada ? '<span class="ea-chip ea-chip--ok">Matriculada</span>' : ""}
        </div>
        <h3>${esc(materia.nombre)}</h3>
        <ul class="ea-materia-datos">
          <li><span class="material-icons-sharp">tag</span> ${esc(materia.codigo)}</li>
          <li><span class="material-icons-sharp">school</span> ${esc(materia.grado)}</li>
          <li><span class="material-icons-sharp">person_outline</span> ${prof ? esc(prof.nombre) : "Sin profesor asignado"}</li>
        </ul>
        ${accion}
      </article>`;
  }

  function render() {
    const disponibles = NovaEst.disponibles();
    const mias = NovaEst.matriculadas();
    el.contDisp.textContent = disponibles.length;
    el.contMias.textContent = mias.length;

    const esMias = tab === "mias";
    const items = esMias ? mias.map((x) => tarjeta(x.materia, true)) : disponibles.map((m) => tarjeta(m, false));

    el.info.textContent = esMias
      ? "Estas son las materias en las que estás matriculado."
      : `Materias de ${NovaEst.estudiante().grado} en las que aún no estás matriculado.`;
    el.lista.innerHTML = items.join("");
    el.lista.hidden = items.length === 0;
    el.vacio.hidden = items.length > 0;
    el.vacioTitulo.textContent = esMias ? "Aún no estás matriculado en ninguna materia" : "No hay materias disponibles";
    el.vacioTexto.textContent = esMias
      ? "Ve a «Disponibles» y matricúlate en las materias de tu grado."
      : "Cuando el administrador agregue una materia de tu grado, te avisaremos aquí.";
  }

  function matricular(materiaId) {
    // Se vuelve a comprobar con los datos actuales por si cambiaron
    const materia = NovaEst.disponibles().find((m) => m.id === materiaId);
    if (!materia) {
      NovaEst.toast("Esa materia ya no está disponible.");
      return render();
    }
    const todas = U.leer("matriculas");
    todas.push({
      id: "mtr-" + Date.now().toString(36),
      estudianteId: NovaEst.estudiante().id,
      materiaId: materia.id,
      materia: materia.nombre,
      estado: "Matriculada",
      fecha: new Date().toISOString(),
    });
    NovaEst.guardarMatriculas(todas);
    NovaEst.toast(`Te matriculaste en ${materia.nombre}.`);
  }

  function cancelar(materiaId) {
    const actual = NovaEst.matriculadas().find((x) => x.materia.id === materiaId);
    if (!actual) return render();
    if (!confirm(`¿Cancelar la matrícula de ${actual.materia.nombre}?`)) return;

    const todas = U.leer("matriculas").map((m) =>
      m.id === actual.matricula.id ? { ...m, estado: "Cancelada", fechaCancelacion: new Date().toISOString() } : m
    );
    NovaEst.guardarMatriculas(todas);
    NovaEst.toast(`Cancelaste ${actual.materia.nombre}.`);
  }

  el.tabs.addEventListener("click", (ev) => {
    const t = ev.target.closest(".ea-tab");
    if (!t) return;
    tab = t.dataset.tab;
    el.tabs.querySelectorAll(".ea-tab").forEach((b) => {
      const activo = b === t;
      b.classList.toggle("activo", activo);
      b.setAttribute("aria-selected", activo);
    });
    render();
  });

  el.lista.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-accion]");
    if (!b) return;
    if (b.dataset.accion === "matricular") matricular(b.dataset.id);
    else cancelar(b.dataset.id);
  });

  window.addEventListener("ea:datos", render);
  render();
})();
