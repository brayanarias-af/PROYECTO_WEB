/* ===== VISTA (profesor): MIS MATERIAS =====
   Muestra las materias que el administrador le asignó (materia.profesorId = su id)
   y los estudiantes matriculados en cada una. */

(() => {
  if (typeof NovaPro === "undefined" || !NovaPro) return;
  const { esc, iniciales } = NovaPro;
  const $ = (id) => document.getElementById(id);

  const el = {
    info: $("ep-mat-info"),
    lista: $("ep-mat-lista"),
    vacio: $("ep-mat-vacio"),
    modal: $("ep-est-modal"),
    titulo: $("ep-est-titulo"),
    sub: $("ep-est-sub"),
    estudiantes: $("ep-est-lista"),
    cerrar: $("ep-est-cerrar"),
  };

  function tarjeta(m) {
    const n = NovaPro.estudiantesDe(m.id).length;
    const activa = m.estado === "Activa";
    return `
      <article class="ea-materia">
        <div class="ea-materia-cab">
          <span class="ea-materia-icono"><span class="material-icons-sharp">menu_book</span></span>
          <span class="ea-chip ${activa ? "ea-chip--ok" : "ea-chip--curso"}">${esc(m.estado)}</span>
        </div>
        <h3>${esc(m.nombre)}</h3>
        <ul class="ea-materia-datos">
          <li><span class="material-icons-sharp">tag</span> ${esc(m.codigo)}</li>
          <li><span class="material-icons-sharp">school</span> ${esc(m.grado)}</li>
          <li><span class="material-icons-sharp">groups</span> ${n} ${n === 1 ? "estudiante matriculado" : "estudiantes matriculados"}</li>
        </ul>
        <div class="ea-materia-acciones">
          <button type="button" class="ea-btn ea-btn--primario" data-accion="notas" data-id="${esc(m.id)}">
            <span class="material-icons-sharp">grade</span> Registrar notas</button>
          <button type="button" class="ea-btn ea-btn--suave" data-accion="estudiantes" data-id="${esc(m.id)}">
            <span class="material-icons-sharp">groups</span> Ver estudiantes</button>
        </div>
      </article>`;
  }

  function render() {
    const materias = NovaPro.misMaterias();
    el.lista.innerHTML = materias.map(tarjeta).join("");
    el.lista.hidden = materias.length === 0;
    el.vacio.hidden = materias.length > 0;
    el.info.textContent = materias.length
      ? `Tienes ${materias.length} ${materias.length === 1 ? "materia asignada" : "materias asignadas"}.`
      : "";
  }

  function verEstudiantes(id) {
    const materia = NovaPro.misMaterias().find((m) => m.id === id);
    if (!materia) return render();
    const lista = NovaPro.estudiantesDe(id);
    el.titulo.textContent = materia.nombre;
    el.sub.textContent = `${materia.grado} · ${lista.length} ${lista.length === 1 ? "estudiante" : "estudiantes"}`;
    el.estudiantes.innerHTML = lista.length
      ? lista
          .map(
            (e) => `
        <li>
          <span class="ea-avatar-mini">${esc(iniciales(e.nombre))}</span>
          <div><strong>${esc(e.nombre)}</strong><small>${esc(e.codigo)} · ${esc(e.correo)}</small></div>
        </li>`
          )
          .join("")
      : '<li class="ea-aviso-vacio">Aún no hay estudiantes matriculados en esta materia.</li>';
    el.modal.showModal();
  }

  el.lista.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-accion]");
    if (!b) return;
    if (b.dataset.accion === "estudiantes") return verEstudiantes(b.dataset.id);
    window.dispatchEvent(new CustomEvent("ep:materia", { detail: b.dataset.id }));
    location.hash = "notas";
  });

  el.cerrar.addEventListener("click", () => el.modal.close());
  el.modal.addEventListener("click", (ev) => { if (ev.target === el.modal) el.modal.close(); });

  window.addEventListener("ea:datos", render);
  render();
})();
