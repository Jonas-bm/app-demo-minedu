(function configureExecutiveDeliverableStatus(global) {
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

  function formatPeriod(periodId) {
    const [year, month] = periodId.split("-").map(Number);
    const value = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
  }

  function createSelectField(id, labelText, defaultText) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const option = document.createElement("option");
    field.className = "manager-inbox__filter";
    label.htmlFor = id;
    label.textContent = labelText;
    select.id = id;
    option.value = "";
    option.textContent = defaultText;
    select.append(option);
    field.append(label, select);
    return { field, select };
  }

  function appendOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function createEvaluationBadge(status) {
    const labels = { pendiente: "Pendiente", conforme: "Conforme", observada: "Observado" };
    const badge = document.createElement("span");
    badge.className = `evaluation-status evaluation-status--${status}`;
    badge.textContent = labels[status] || status;
    return badge;
  }

  function createPresentationBadge(item) {
    const badge = document.createElement("span");
    badge.className = `deliverable-status deliverable-status--${item.estado}`;
    badge.textContent = item.presentacion.fecha ? item.estado === "fuera-plazo" ? "Fuera de plazo" : "Presentado" : "Pendiente";
    return badge;
  }

  function renderSummary(container, rows) {
    const total = rows.length;
    const presented = rows.filter((item) => item.presentacion.fecha).length;
    const pending = total - presented;
    const evaluatedRows = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado));
    const conforming = evaluatedRows.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = evaluatedRows.filter((item) => item.evaluacion.estado === "observada").length;
    const summary = document.createElement("dl");
    summary.className = "deliverable-state__summary";
    [
      ["Pendientes de presentación", pending, total, "esperados"],
      ["Presentados", presented, total, "esperados"],
      ["Conformes", conforming, evaluatedRows.length, "evaluados"],
      ["Observados", observed, evaluatedRows.length, "evaluados"]
    ].forEach(([label, value, denominator, denominatorLabel]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      const percent = denominator ? Math.round((value / denominator) * 100) : 0;
      term.textContent = label;
      description.textContent = `${value} de ${denominator} ${denominatorLabel} (${percent}%)`;
      item.append(term, description);
      summary.append(item);
    });
    container.replaceChildren(summary);
  }

  function createTable(rows, reportsByDeliverable) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "deliverable-state__table-wrapper";
    table.className = "deliverable-state__table";
    caption.className = "sr-only";
    caption.textContent = "Estado consolidado de entregables";
    ["Periodo", "Macro", "ATET", "Entregable", "Fecha máxima", "Presentación", "Evaluación", "Informe"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    rows.forEach((item) => {
      const row = document.createElement("tr");
      [formatPeriod(item.periodoId), "Macro Demo", item.atet.nombreCompleto, `N.° ${item.numero}`, formatDate(item.fechaMaxima)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const presentationCell = document.createElement("td");
      const evaluationCell = document.createElement("td");
      const reportCell = document.createElement("td");
      presentationCell.append(createPresentationBadge(item));
      evaluationCell.append(createEvaluationBadge(item.evaluacion.estado));
      const report = reportsByDeliverable.get(item.id);
      reportCell.textContent = report ? `Generado · ${report.numero}` : item.evaluacion.estado === "pendiente" ? "No corresponde" : "Pendiente de informe";
      row.append(presentationCell, evaluationCell, reportCell);
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
    pager.setAttribute("aria-label", "Paginación del estado de entregables");
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
    container.innerHTML = '<p class="atet-state" role="status">Cargando estado de entregables…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const reportsByDeliverable = new Map(global.DEMO_STORE.getReports().map((item) => [item.entregableId, item]));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const counter = document.createElement("p");
      const filters = document.createElement("div");
      const periodFilter = createSelectField("executive-state-period", "Periodo", "Todos los periodos");
      const macroFilter = createSelectField("executive-state-macro", "Macro", "Todos los Macros");
      const atetFilter = createSelectField("executive-state-atet", "ATET", "Todos los ATET");
      const presentationFilter = createSelectField("executive-state-presentation", "Presentación", "Todos los estados");
      const evaluationFilter = createSelectField("executive-state-evaluation", "Evaluación", "Todos los resultados");
      const clear = document.createElement("button");
      const summary = document.createElement("div");
      const results = document.createElement("div");
      const pageSize = 5;
      let currentPage = 1;
      section.className = "deliverable-state";
      heading.className = "deliverable-state__heading";
      title.textContent = "Estado consolidado";
      counter.setAttribute("aria-live", "polite");
      filters.className = "deliverable-state__filters";
      clear.className = "atet-filters__clear";
      clear.type = "button";
      clear.textContent = "Limpiar filtros";
      summary.className = "deliverable-state__summary-wrapper";
      results.className = "deliverable-state__results";
      [...new Set(deliverables.map((item) => item.periodoId))].sort().reverse().forEach((id) => appendOption(periodFilter.select, id, formatPeriod(id)));
      appendOption(macroFilter.select, "macro-demo", "Macro Demo");
      [...new Map(deliverables.map((item) => [item.atet.codigo, item.atet])).values()]
        .sort((first, second) => first.nombreCompleto.localeCompare(second.nombreCompleto, "es"))
        .forEach((atet) => appendOption(atetFilter.select, atet.codigo, `${atet.nombreCompleto} · ${atet.codigo}`));
      appendOption(presentationFilter.select, "pendiente", "Pendiente");
      appendOption(presentationFilter.select, "presentado", "Presentado");
      appendOption(evaluationFilter.select, "pendiente", "Pendiente");
      appendOption(evaluationFilter.select, "conforme", "Conforme");
      appendOption(evaluationFilter.select, "observada", "Observado");
      periodFilter.select.value = dashboard.periodoPredeterminado;
      filters.append(periodFilter.field, macroFilter.field, atetFilter.field, presentationFilter.field, evaluationFilter.field, clear);
      heading.append(title, counter);

      function getFiltered() {
        return deliverables.filter((item) =>
          (!periodFilter.select.value || item.periodoId === periodFilter.select.value)
          && (!macroFilter.select.value || macroFilter.select.value === "macro-demo")
          && (!atetFilter.select.value || item.atet.codigo === atetFilter.select.value)
          && (!presentationFilter.select.value || (presentationFilter.select.value === "presentado" ? Boolean(item.presentacion.fecha) : !item.presentacion.fecha))
          && (!evaluationFilter.select.value || item.evaluacion.estado === evaluationFilter.select.value)
        );
      }

      function update(page = 1) {
        const filtered = getFiltered();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        currentPage = Math.max(1, Math.min(page, totalPages));
        counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
        renderSummary(summary, filtered);
        results.replaceChildren();
        if (!filtered.length) {
          const empty = document.createElement("p");
          empty.className = "atet-list__empty";
          empty.textContent = "No existen entregables para los filtros seleccionados.";
          results.append(empty);
          return;
        }
        const start = (currentPage - 1) * pageSize;
        results.append(createTable(filtered.slice(start, start + pageSize), reportsByDeliverable), createPager(currentPage, totalPages, update));
      }
      [periodFilter.select, macroFilter.select, atetFilter.select, presentationFilter.select, evaluationFilter.select]
        .forEach((select) => select.addEventListener("change", () => update(1)));
      clear.addEventListener("click", () => {
        periodFilter.select.value = "";
        macroFilter.select.value = "";
        atetFilter.select.value = "";
        presentationFilter.select.value = "";
        evaluationFilter.select.value = "";
        update(1);
        periodFilter.select.focus();
      });
      section.append(heading, filters, summary, results);
      container.replaceChildren(section);
      update(1);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el estado de entregables.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el estado de entregables.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.EXECUTIVE_DELIVERABLE_STATUS_MODULE = Object.freeze({ render });
})(window);
