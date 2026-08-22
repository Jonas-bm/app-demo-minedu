(function configureManagerReportHistory(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los entregables.");
          return response.json();
        }),
        fetch("../data/personal.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los ATET.");
          return response.json();
        })
      ]).catch((error) => {
        dataPromise = null;
        throw error;
      });
    }
    return dataPromise;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
  }

  function downloadReport(report) {
    const blob = new Blob([report.contenidoHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.referencia;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function createTable(reports, deliverablesById) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "report-history__table-wrapper";
    table.className = "report-history__table";
    caption.className = "sr-only";
    caption.textContent = "Historial de informes generados";
    ["Número", "Fecha", "Tipo", "ATET", "Entregable", "Autor", "Estado", "Referencia", "Acción"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    reports.forEach((report) => {
      const deliverable = deliverablesById.get(report.entregableId);
      const row = document.createElement("tr");
      [
        report.numero,
        formatDate(report.fecha),
        report.tipo === "conforme" ? "Conforme" : "Observado",
        deliverable?.atet?.nombreCompleto || "ATET no disponible",
        deliverable ? `N.° ${deliverable.numero}` : "—",
        report.autor,
        report.estado === "generado" ? "Generado" : report.estado,
        report.referencia
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const actionCell = document.createElement("td");
      const action = document.createElement("button");
      action.className = "deliverable-action";
      action.type = "button";
      action.textContent = "Descargar";
      action.setAttribute("aria-label", `Descargar ${report.numero}`);
      action.addEventListener("click", () => downloadReport(report));
      actionCell.append(action);
      row.append(actionCell);
      body.append(row);
    });
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function createPager(currentPage, totalPages, onChange) {
    const pager = document.createElement("nav");
    const previous = document.createElement("button");
    const status = document.createElement("span");
    const next = document.createElement("button");
    pager.className = "table-pagination";
    pager.setAttribute("aria-label", "Paginación del historial de informes");
    previous.type = next.type = "button";
    previous.textContent = "Anterior";
    next.textContent = "Siguiente";
    previous.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    status.textContent = `Página ${currentPage} de ${totalPages}`;
    status.setAttribute("aria-live", "polite");
    previous.addEventListener("click", () => onChange(currentPage - 1));
    next.addEventListener("click", () => onChange(currentPage + 1));
    pager.append(previous, status, next);
    return pager;
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando historial de informes…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const reports = global.DEMO_STORE.getReports().sort((first, second) => String(second.generadoEn).localeCompare(String(first.generadoEn)));
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const deliverablesById = new Map(deliverables.map((item) => [item.id, item]));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const counter = document.createElement("p");
      const results = document.createElement("div");
      const pageSize = 5;
      let currentPage = 1;
      section.className = "report-history";
      heading.className = "report-history__heading";
      title.textContent = "Informes generados";
      counter.textContent = `${reports.length} ${reports.length === 1 ? "informe" : "informes"}`;
      results.className = "report-history__results";
      heading.append(title, counter);
      function update(page) {
        const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
        currentPage = Math.max(1, Math.min(page, totalPages));
        results.replaceChildren();
        if (!reports.length) {
          const empty = document.createElement("p");
          empty.className = "atet-list__empty";
          empty.textContent = "Todavía no se han generado informes de demostración.";
          results.append(empty);
          return;
        }
        const start = (currentPage - 1) * pageSize;
        results.append(createTable(reports.slice(start, start + pageSize), deliverablesById));
        if (totalPages > 1) results.append(createPager(currentPage, totalPages, update));
      }
      section.append(heading, results);
      container.replaceChildren(section);
      update(1);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el historial de informes.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el historial de informes.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.MANAGER_REPORT_HISTORY_MODULE = Object.freeze({ render });
})(window);
