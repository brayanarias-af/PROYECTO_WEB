// Registros académicos: se arman con las notas guardadas en la vista Notas
function construirRegistros() {
  const estudiantes = NovaUtils.leer("nova_estudiantes");
  return NovaUtils.leer("nova_notas").map((r) => {
    const c = NovaUtils.calcular(r);
    const e = estudiantes.find((x) => x.id === r.estudianteId);
    return {
      codigo: e ? e.codigo : "—",
      estudiante: e ? e.nombre : r.estudianteNombre || "—",
      materia: r.materia,
      nota: c.completo ? c.acumulado : null,
      estado: c.completo ? "Completa" : "En curso",
    };
  });
}
const leerProfesoresActivos = () =>
  NovaUtils.leer("nova_profesores").filter((p) => p.estado === "Activo");

let REGISTROS_DATA = construirRegistros();
// Estudiantes guardados por la vista Estudiantes (localStorage).
// Solo los activos cuentan como matriculados.
function leerEstudiantesGuardados() {
  try {
    const datos = JSON.parse(localStorage.getItem("nova_estudiantes"));
    return Array.isArray(datos) ? datos.filter((e) => e.estado === "Activo") : [];
  } catch {
    return [];
  }
}

let ESTUDIANTES_DATA = leerEstudiantesGuardados();
let PROFESORES_DATA = leerProfesoresActivos();
let UPDATE_DATA = [];

const STATUS_COLOR = {
  Completa: "success",
  Cancelada: "danger",
  "En curso": "warning",
};

// Executes when document is loaded
document.addEventListener("DOMContentLoaded", (ev) => {
  // Insights (tarjetas de arriba)
  buildInsights();

  // Registros académicos (tabla)
  renderTableBody("Todos");
  document
    .getElementById("filtro-estado")
    .addEventListener("change", (e) => renderTableBody(e.target.value));

  // Updates Data
  document
    .getElementsByClassName("recent-updates")
    .item(0)
    .appendChild(buildUpdatesList());

  // Resumen académico
  const salesAnalytics = document.getElementById("analytics");
  buildSalesAnalytics(salesAnalytics);
});

// Utilidades
const esc = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const getInitials = (name) =>
  String(name)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Document Builder
const setRing = (cardClass, pct) => {
  const circle = document.querySelector(`.insights .${cardClass} circle`);
  const length = 226; // 2 * PI * 36
  circle.style.strokeDasharray = length;
  circle.style.strokeDashoffset = length * (1 - pct / 100);
};

const buildInsights = () => {
  const total = REGISTROS_DATA.length;
  const canceladas = REGISTROS_DATA.filter((r) => r.estado === "Cancelada").length;
  const completas = REGISTROS_DATA.filter((r) => r.estado === "Completa").length;

  const conCancelacion = new Set(
    REGISTROS_DATA.filter((r) => r.estado === "Cancelada").map((r) => r.estudiante)
  ).size;

  const pctSin = ESTUDIANTES_DATA.length
    ? Math.round(((ESTUDIANTES_DATA.length - conCancelacion) / ESTUDIANTES_DATA.length) * 100)
    : 0;
  const pctCanc = total ? Math.round((canceladas / total) * 100) : 0;
  const pctComp = total ? Math.round((completas / total) * 100) : 0;

  document.getElementById("total-estudiantes").textContent = ESTUDIANTES_DATA.length;
  document.getElementById("pct-estudiantes").textContent = pctSin + "%";
  setRing("sales", pctSin);

  document.getElementById("total-canceladas").textContent = canceladas;
  document.getElementById("pct-canceladas").textContent = pctCanc + "%";
  setRing("expenses", pctCanc);

  document.getElementById("total-completas").textContent = completas;
  document.getElementById("pct-completas").textContent = pctComp + "%";
  setRing("income", pctComp);
};

const renderTableBody = (filter = "Todos") => {
  const tbody = document.getElementById("tabla-registros");

  const rows =
    filter === "Todos"
      ? REGISTROS_DATA
      : REGISTROS_DATA.filter((r) => r.estado === filter);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6">No hay registros para mostrar</td></tr>`;
    return;
  }

  let bodyContent = "";
  for (const row of rows) {
    const nota =
      row.nota === null || row.nota === undefined ? "—" : Number(row.nota).toFixed(1);

    bodyContent += `
      <tr>
        <td>${esc(row.codigo)}</td>
        <td>${esc(row.estudiante)}</td>
        <td>${esc(row.materia)}</td>
        <td>${nota}</td>
        <td class="${STATUS_COLOR[row.estado] || ""}">${esc(row.estado)}</td>
        <td class="primary">Detalles</td>
      </tr>
    `;
  }

  tbody.innerHTML = bodyContent;
};

const buildUpdatesList = () => {
  const updateData = UPDATE_DATA;

  const div = document.createElement("div");
  div.classList.add("updates");

  if (!updateData.length) {
    div.innerHTML = `<p>Sin actividad reciente</p>`;
    return div;
  }

  let updateContent = "";
  for (const update of updateData) {
    updateContent += `
      <div class="update">
        <div class="avatar">${esc(getInitials(update.profileName))}</div>
        <div class="message">
          <p><b>${esc(update.profileName)}</b> ${esc(update.message)}</p>
          <small class="text-muted">${esc(update.updatedTime)}</small>
        </div>
      </div>
    `;
  }

  div.innerHTML = updateContent;

  return div;
};

const buildSalesAnalytics = (element) => {
  const notas = REGISTROS_DATA.filter((r) => r.nota !== null && r.nota !== undefined).map(
    (r) => Number(r.nota)
  );
  const promedio = notas.length
    ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2)
    : "0.00";
  const canceladas = REGISTROS_DATA.filter((r) => r.estado === "Cancelada").length;

  const analyticsData = [
    { itemClass: "online", icon: "grade", title: "PROMEDIO GENERAL", subtitle: "Escala 0.0 - 5.0", colorClass: "primary", value: promedio },
    { itemClass: "offline", icon: "event_busy", title: "CANCELACIONES", subtitle: "Este semestre", colorClass: "danger", value: canceladas },
    { itemClass: "customers", icon: "person_outline", title: "PROFESORES", subtitle: "Activos", colorClass: "success", value: PROFESORES_DATA.length },
  ];

  element.innerHTML = "";

  for (const analytic of analyticsData) {
    const item = document.createElement("div");
    item.classList.add("item");
    item.classList.add(analytic.itemClass);

    const itemHtml = `
      <div class="icon">
        <span class="material-icons-sharp"> ${analytic.icon} </span>
      </div>
      <div class="right">
        <div class="info">
          <h3>${analytic.title}</h3>
          <small class="text-muted"> ${analytic.subtitle} </small>
        </div>
        <h5 class="${analytic.colorClass}"></h5>
        <h3>${analytic.value}</h3>
      </div>
    `;

    item.innerHTML = itemHtml;

    element.appendChild(item);
  }
};

// Refresca todo el panel (llámala después de cargar o cambiar los datos)
const refreshDashboard = () => {
  ESTUDIANTES_DATA = leerEstudiantesGuardados();
  REGISTROS_DATA = construirRegistros();
  PROFESORES_DATA = leerProfesoresActivos();
  buildInsights();
  renderTableBody(document.getElementById("filtro-estado").value);

  const updates = document.querySelector(".recent-updates .updates");
  if (updates) updates.remove();
  document.getElementsByClassName("recent-updates").item(0).appendChild(buildUpdatesList());

  buildSalesAnalytics(document.getElementById("analytics"));

  // Avisa a las vistas cargadas (estudiantes, profesores, materias, notas, usuarios)
  // para que recarguen sus datos desde localStorage
  window.dispatchEvent(new Event("nova:datos"));
};

// Document operation functions
const sideMenu = document.querySelector("aside");
const menuBtn = document.querySelector("#menu-btn");
const closeBtn = document.querySelector("#close-btn");
const themeToggler = document.querySelector(".theme-toggler");

// Show Sidebar
menuBtn.addEventListener("click", () => {
  sideMenu.classList.add("abierto");
});

// Hide Sidebar
closeBtn.addEventListener("click", () => {
  sideMenu.classList.remove("abierto");
});

// Change Theme (se guarda en localStorage para que no se pierda al cambiar de vista ni al recargar)
const setTheme = (oscuro) => {
  document.body.classList.toggle("dark-theme-variables", oscuro);
  themeToggler.querySelector("span:nth-child(1)").classList.toggle("active", !oscuro);
  themeToggler.querySelector("span:nth-child(2)").classList.toggle("active", oscuro);
  try {
    localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
  } catch {}
};

themeToggler.addEventListener("click", () =>
  setTheme(!document.body.classList.contains("dark-theme-variables"))
);

try {
  if (localStorage.getItem("tema") === "oscuro") setTheme(true);
} catch {}