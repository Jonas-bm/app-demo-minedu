(function configureExecutiveReportsByMacro(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar las evaluaciones.");
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

  function appendOption(select, value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }

  function groupRows(candidates) {
    const groups = new Map();
    candidates.forEach((item) => {
      const key = `${item.periodoId}|macro-demo`;
      if (!groups.has(key)) {
        groups.set(key, {
          periodoId: item.periodoId,
          macro: "Macro Demo",
          evaluaciones: 0,
          pendientes: 0,
          generados: 0,
          conformes: 0,
          observados: 0
        });
      }
      const group = groups.get(key);
      group.evaluaciones += 1;
      if (!item.report) group.pendientes += 1;
      else {
        group.generados += 1;
        if (item.report.tipo === "conforme") group.conformes += 1;
        if (item.report.tipo === "observada") group.observados += 1;
      }
    });
    return [...groups.values()].sort((first, second) => second.periodoId.localeCompare(first.periodoId));
  }

  function createProgress(value, total) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    const wrapper = document.createElement("div");
    const text = document.createElement("span");
    const track = document.createElement("div");
    const bar = document.createElement("span");
    wrapper.className = "macro-progress__value";
    text.textContent = `${value} de ${total} (${percent}%)`;
    track.className = "macro-progress__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", `Avance de informes: ${value} de ${total}`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(percent));
    bar.style.width = `${percent}%`;
    track.append(bar);
    wrapper.append(text, track);
    return wrapper;
  }

  function renderSummary(container, candidates) {
    const generated = candidates.filter((item) => item.report).length;
    const conforming = candidates.filter((item) => item.report?.tipo === "conforme").length;
    const observed = candidates.filter((item) => item.report?.tipo === "observada").length;
    const summary = document.createElement("dl");
    summary.className = "deliverable-state__summary reports-by-macro__summary";
    [
      ["Evaluaciones publicadas", candidates.length],
      ["Pendientes de informe", candidates.length - generated],
      ["Informes conformes", conforming],
      ["Informes observados", observed],
      ["Total generado", `${generated} de ${candidates.length}`]
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      item.append(term, description);
      summary.append(item);
    });
    container.replaceChildren(summary);
  }

  function createTable(rows) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "reports-by-macro__table-wrapper";
    table.className = "reports-by-macro__table";
    caption.className = "sr-only";
    caption.textContent = "Informes agrupados por Macro y periodo";
    ["Periodo", "Macro", "Evaluaciones", "Pendientes", "Conformes", "Observados", "Generados", "Avance"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    rows.forEach((item) => {
      const row = document.createElement("tr");
      [formatPeriod(item.periodoId), item.macro, item.evaluaciones, item.pendientes, item.conformes, item.observados, item.generados].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const progressCell = document.createElement("td");
      progressCell.append(createProgress(item.generados, item.evaluaciones));
      row.append(progressCell);
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
    pager.setAttribute("aria-label", "Paginación de informes por Macro");
    previous.type = next.type = "button";
    previous.textContent = "Anterior";
    next.textContent = "Siguiente";
    previous.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    status.textContent = `Página ${currentPage} de ${totalPages}`;
    previous.addEventListener("click", () => onChange(currentPage - 1));
    next.addEventListener("click", () => onChange(currentPage + 1));
    pager.append(previous, status, next);
    return pager;
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando informes por Macro…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const reportsByDeliverable = new Map(global.DEMO_STORE.getReports().map((item) => [item.entregableId, item]));
      const candidates = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado))
        .map((item) => ({ ...item, report: reportsByDeliverable.get(item.id) || null }));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const counter = document.createElement("p");
      const filters = document.createElement("div");
      const periodFilter = createSelectField("reports-macro-period", "Periodo", "Todos los periodos");
      const macroFilter = createSelectField("reports-macro-owner", "Macro", "Todos los Macros");
      const statusFilter = createSelectField("reports-macro-status", "Estado", "Todos los estados");
      const typeFilter = createSelectField("reports-macro-type", "Tipo de informe", "Todos los tipos");
      const clear = document.createElement("button");
      const summary = document.createElement("div");
      const results = document.createElement("div");
      const pageSize = 5;
      let currentPage = 1;
      section.className = "reports-by-macro";
      heading.className = "deliverable-state__heading";
      title.textContent = "Informes agrupados por responsable";
      counter.setAttribute("aria-live", "polite");
      filters.className = "reports-by-macro__filters";
      clear.className = "atet-filters__clear";
      clear.type = "button";
      clear.textContent = "Limpiar filtros";
      [...new Set(candidates.map((item) => item.periodoId))].sort().reverse().forEach((id) => appendOption(periodFilter.select, id, formatPeriod(id)));
      appendOption(macroFilter.select, "macro-demo", "Macro Demo");
      appendOption(statusFilter.select, "pendiente", "Pendiente de informe");
      appendOption(statusFilter.select, "generado", "Generado");
      appendOption(typeFilter.select, "conforme", "Conforme");
      appendOption(typeFilter.select, "observada", "Observado");
      filters.append(periodFilter.field, macroFilter.field, statusFilter.field, typeFilter.field, clear);
      heading.append(title, counter);

      function getFiltered() {
        return candidates.filter((item) =>
          (!periodFilter.select.value || item.periodoId === periodFilter.select.value)
          && (!macroFilter.select.value || macroFilter.select.value === "macro-demo")
          && (!statusFilter.select.value || (statusFilter.select.value === "generado" ? Boolean(item.report) : !item.report))
          && (!typeFilter.select.value || (item.report ? item.report.tipo : item.evaluacion.estado) === typeFilter.select.value)
        );
      }

      function update(page = 1) {
        const filtered = getFiltered();
        const grouped = groupRows(filtered);
        const totalPages = Math.max(1, Math.ceil(grouped.length / pageSize));
        currentPage = Math.max(1, Math.min(page, totalPages));
        counter.textContent = `${filtered.length} ${filtered.length === 1 ? "evaluación" : "evaluaciones"}`;
        renderSummary(summary, filtered);
        results.replaceChildren();
        if (!grouped.length) {
          const empty = document.createElement("p");
          empty.className = "atet-list__empty";
          empty.textContent = "No existen informes o evaluaciones para los filtros seleccionados.";
          results.append(empty);
          return;
        }
        const start = (currentPage - 1) * pageSize;
        results.append(createTable(grouped.slice(start, start + pageSize)), createPager(currentPage, totalPages, update));
      }
      [periodFilter.select, macroFilter.select, statusFilter.select, typeFilter.select]
        .forEach((select) => select.addEventListener("change", () => update(1)));
      clear.addEventListener("click", () => {
        periodFilter.select.value = "";
        macroFilter.select.value = "";
        statusFilter.select.value = "";
        typeFilter.select.value = "";
        update(1);
        periodFilter.select.focus();
      });
      section.append(heading, filters, summary, results);
      container.replaceChildren(section);
      update(1);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudieron cargar los informes por Macro.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar los informes por Macro.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.EXECUTIVE_REPORTS_BY_MACRO_MODULE = Object.freeze({ render });
})(window);
