/* ===== VISTA: GESTIÓN DE USUARIOS =====
   Busca por ID exacto (documento, código EST-001 o id interno) en estudiantes y profesores,
   y guarda los cambios en la lista que corresponda. */

(() => {
  const U = NovaUtils;
  const $ = (id) => document.getElementById(id);
  const cont = $("usr-resultados");
  if (!cont) return;

  const TIPOS = {
    estudiante: { clave: "nova_estudiantes", etiqueta: "Estudiante" },
    profesor: { clave: "nova_profesores", etiqueta: "Profesor" },
  };

  const el = {
    form: $("usr-busqueda"), id: $("usr-id"),
    modal: $("usr-modal"), modalTitulo: $("usr-modal-titulo"), editar: $("usr-form"),
    nombre: $("usr-nombre"), documento: $("usr-documento"), correo: $("usr-correo"),
    grado: $("usr-grado"), materia: $("usr-materia"),
    campoGrado: $("usr-campo-grado"), campoMateria: $("usr-campo-materia"),
    clave: $("usr-clave"), verClave: $("usr-ver-clave"), estado: $("usr-estado"),
    error: $("usr-error"), cerrar: $("usr-cerrar"), cancelar: $("usr-cancelar"),
  };

  let ultimaBusqueda = "";
  let editando = null; // { tipo, id }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  const iniciales = (n) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  function buscar(texto) {
    const q = norm(texto);
    const encontrados = [];
    for (const tipo in TIPOS) {
      U.leer(TIPOS[tipo].clave).forEach((u) => {
        if ([u.documento, u.codigo, u.id].some((v) => v && norm(v) === q)) encontrados.push({ tipo, u });
      });
    }
    return encontrados;
  }

  function tarjeta({ tipo, u }) {
    const detalle =
      tipo === "estudiante"
        ? `<span><b>Código</b> ${esc(u.codigo)}</span><span><b>Grado</b> ${esc(u.grado)}</span>`
        : `<span><b>Materia</b> ${esc(u.materia)}</span>`;
    const clase = u.estado === "Activo" ? "usr-chip--activo" : "usr-chip--retirado";
    return `
      <article class="usr-card" data-tipo="${tipo}" data-id="${esc(u.id)}">
        <span class="usr-avatar">${esc(iniciales(u.nombre))}</span>
        <div class="usr-datos">
          <h3>${esc(u.nombre)} <span class="usr-tipo">${TIPOS[tipo].etiqueta}</span></h3>
          <div class="usr-linea"><span><b>Documento</b> ${esc(u.documento)}</span>${detalle}</div>
          <small>${esc(u.correo)}</small>
        </div>
        <span class="usr-chip ${clase}">${esc(u.estado)}</span>
        <button type="button" class="usr-btn usr-btn--primario" data-accion="editar">
          <span class="material-icons-sharp">edit</span> Editar
        </button>
      </article>`;
  }

  function mostrar(texto) {
    ultimaBusqueda = texto.trim();
    if (!ultimaBusqueda) {
      cont.innerHTML = "";
      return;
    }
    const res = buscar(ultimaBusqueda);
    cont.innerHTML = res.length
      ? res.map(tarjeta).join("")
      : `<div class="usr-vacio"><span class="material-icons-sharp">person_search</span>
           <h3>No se encontró ningún usuario</h3>
           <p>Revisa que el ID <b>${esc(ultimaBusqueda)}</b> esté bien escrito (documento o código completo).</p></div>`;
  }

  /* ---------- Modal ---------- */
  function mostrarError(msg, campo) {
    el.error.textContent = msg;
    el.error.hidden = false;
    if (campo) campo.focus();
    return null;
  }

  function abrirModal(tipo, id) {
    const u = U.leer(TIPOS[tipo].clave).find((x) => x.id === id);
    if (!u) return;
    editando = { tipo, id };
    el.error.hidden = true;
    el.modalTitulo.textContent = `Editar ${TIPOS[tipo].etiqueta.toLowerCase()}`;
    el.nombre.value = u.nombre;
    el.documento.value = u.documento;
    el.correo.value = u.correo;
    el.estado.value = u.estado;
    el.clave.value = "";
    el.clave.type = "password";
    el.verClave.querySelector("span").textContent = "visibility";
    el.campoGrado.hidden = tipo !== "estudiante";
    el.campoMateria.hidden = tipo !== "profesor";
    el.grado.value = u.grado || "";
    el.materia.value = u.materia || "";
    el.modal.showModal();
    el.nombre.focus();
  }
  const cerrarModal = () => el.modal.close();

  el.editar.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    el.error.hidden = true;
    const { tipo, id } = editando;
    const nombre = el.nombre.value.trim();
    const documento = el.documento.value.trim();
    const correo = el.correo.value.trim();
    const clave = el.clave.value;

    if (nombre.length < 3) return mostrarError("Escribe el nombre completo (mínimo 3 letras).", el.nombre);
    if (!/^\d{5,12}$/.test(documento)) return mostrarError("El documento debe tener entre 5 y 12 números.", el.documento);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mostrarError("Escribe un correo válido.", el.correo);
    if (tipo === "estudiante" && !el.grado.value.trim()) return mostrarError("Indica el grado.", el.grado);
    if (tipo === "profesor" && !el.materia.value.trim()) return mostrarError("Indica la materia.", el.materia);
    if (clave && clave.length < 6) return mostrarError("La nueva contraseña debe tener mínimo 6 caracteres.", el.clave);

    const lista = U.leer(TIPOS[tipo].clave);
    if (lista.some((x) => x.documento === documento && x.id !== id))
      return mostrarError("Ya hay alguien con ese documento.", el.documento);

    const cambios = { nombre, documento, correo, estado: el.estado.value };
    if (tipo === "estudiante") cambios.grado = el.grado.value.trim();
    else cambios.materia = el.materia.value.trim();
    if (clave) cambios.claveHash = await U.hashClave(clave);

    const nueva = lista.map((x) => (x.id === id ? { ...x, ...cambios } : x));
    try {
      localStorage.setItem(TIPOS[tipo].clave, JSON.stringify(nueva));
    } catch (e) {
      return mostrarError("No se pudo guardar. Revisa el almacenamiento del navegador.");
    }

    // Si cambió el documento, seguimos mostrando a la persona editada
    if (norm(ultimaBusqueda) === norm(lista.find((x) => x.id === id)?.documento)) ultimaBusqueda = documento;
    cerrarModal();
    if (typeof refreshDashboard === "function") refreshDashboard(); // avisa a las demás vistas
    mostrar(ultimaBusqueda);
  });

  /* ---------- Eventos ---------- */
  el.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    mostrar(el.id.value);
  });
  cont.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-accion='editar']");
    if (!b) return;
    const card = b.closest(".usr-card");
    abrirModal(card.dataset.tipo, card.dataset.id);
  });
  el.cerrar.addEventListener("click", cerrarModal);
  el.cancelar.addEventListener("click", cerrarModal);
  el.modal.addEventListener("click", (ev) => { if (ev.target === el.modal) cerrarModal(); });
  U.activarVerClave(el.verClave, el.clave);

  // Si otra vista cambió datos, refrescar el resultado mostrado
  window.addEventListener("nova:datos", () => { if (ultimaBusqueda) mostrar(ultimaBusqueda); });
})();
