(function configureHistoryModule(global) {
  let dataPromise;

  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudo cargar el historial.");
          return response.json();
        }),
        fetch("../data/personal.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los contratos ATET.");
          return response.json();
        })
      ]).catch((error) => {
        dataPromise = null;
        throw error;
      });
    }
    return dataPromise;
  }

  // Acota los datos al Macro con sesión iniciada: cada Macro ve únicamente sus
  // propios entregables, presentaciones y evaluaciones, nunca los de otro Macro.
  function scopeToMacro(dashboard, personal) {
    if (!global.MACRO_CONTEXT) {
      return {
        dashboard,
        personal,
        presentations: global.DEMO_STORE.getPresentations(),
        evaluations: global.DEMO_STORE.getEvaluations()
      };
    }
    const context = global.MACRO_CONTEXT.get();
    return {
      dashboard: global.MACRO_CONTEXT.effectiveDashboard(dashboard, context, personal),
      personal: global.MACRO_CONTEXT.effectivePersonal(personal, context),
      presentations: global.MACRO_CONTEXT.ownPresentations(context),
      evaluations: global.MACRO_CONTEXT.ownEvaluations(context)
    };
  }

  function periodParts(periodId) {
    const [year, month] = String(periodId).split("-").map(Number);
    return { year: year || 0, month: month || 0 };
  }

  function formatShortDate(value) {
    if (!value) return "—";
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  function resultKey(deliverable) {
    const estado = deliverable.evaluacion?.estado;
    if (estado === "conforme") return "conforme";
    if (estado === "observada") return "observada";
    return "pendiente";
  }

  function resultLabel(key) {
    if (key === "conforme") return "Conforme";
    if (key === "observada") return "Observado";
    return "Pendiente";
  }

  // Una fila por entregable que el Macro ha registrado (presentado).
  function buildRows(deliverables) {
    return deliverables
      .filter((deliverable) => deliverable.presentacion && deliverable.presentacion.fecha)
      .map((deliverable) => {
        const { year, month } = periodParts(deliverable.periodoId);
        return {
          id: deliverable.id,
          anio: year,
          mes: month,
          periodoLabel: month ? `${MONTHS[month - 1]} ${year}` : deliverable.periodoId,
          atet: deliverable.atet.nombreCompleto,
          numero: deliverable.numero,
          presentacion: deliverable.presentacion.fecha,
          resultado: resultKey(deliverable)
        };
      })
      .sort((first, second) => second.presentacion.localeCompare(first.presentacion));
  }

  function createResultBadge(key) {
    const badge = document.createElement("span");
    badge.className = `status-badge status-badge--${key === "observada" ? "observada" : key}`;
    const text = document.createElement("span");
    text.textContent = resultLabel(key);
    badge.append(text);
    return badge;
  }

  function createTable(rows) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "history-table-wrapper";
    table.className = "history-table";
    caption.className = "sr-only";
    caption.textContent = "Historial de presentaciones y evaluaciones registradas por el Macro";
    ["Período", "ATET", "Entregable", "Presentación", "Resultado", "Informe"].forEach((text) => {
      const header = document.createElement("th");
      header.scope = "col";
      header.textContent = text;
      headRow.append(header);
    });
    rows.forEach((row) => {
      const tableRow = document.createElement("tr");
      [row.periodoLabel, row.atet, `${row.numero}.º`, formatShortDate(row.presentacion)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        tableRow.append(cell);
      });
      const resultCell = document.createElement("td");
      resultCell.append(createResultBadge(row.resultado));
      tableRow.append(resultCell);
      const reportCell = document.createElement("td");
      if (row.resultado === "pendiente") {
        reportCell.textContent = "—";
      } else {
        const link = document.createElement("a");
        link.className = "atet-detail-link";
        link.href = `#evaluar-entregable/${encodeURIComponent(row.id)}`;
        link.textContent = "Ver";
        link.setAttribute("aria-label", `Ver el resultado del entregable ${row.numero} de ${row.atet}`);
        reportCell.append(link);
      }
      tableRow.append(reportCell);
      body.append(tableRow);
    });
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function createFilterField(id, labelText) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    field.className = "deliverable-filter";
    label.htmlFor = id;
    label.textContent = labelText;
    select.id = id;
    field.append(label, select);
    return { field, select };
  }

  function fillOptions(select, options) {
    options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.append(option);
    });
  }

  function renderHistory(container, rows) {
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const counter = document.createElement("p");
    const controls = document.createElement("div");
    const yearFilter = createFilterField("history-year", "Año");
    const monthFilter = createFilterField("history-month", "Mes");
    const atetFilter = createFilterField("history-atet", "ATET");
    const resultFilter = createFilterField("history-result-filter", "Resultado");
    const clear = document.createElement("button");
    const results = document.createElement("div");
    const pageSize = 5;
    let currentPage = 1;

    section.className = "history-list";
    heading.className = "history-list__heading";
    title.textContent = "Presentaciones y evaluaciones registradas";
    counter.setAttribute("aria-live", "polite");
    controls.className = "history-filters";
    clear.className = "atet-filters__clear";
    clear.type = "button";
    clear.textContent = "Limpiar filtros";
    results.className = "history-list__results";

    const years = [...new Set(rows.map((row) => row.anio).filter(Boolean))].sort((a, b) => b - a);
    const months = [...new Set(rows.map((row) => row.mes).filter(Boolean))].sort((a, b) => a - b);
    const atets = [...new Set(rows.map((row) => row.atet))].sort((a, b) => a.localeCompare(b, "es"));

    fillOptions(yearFilter.select, [["", "Todos los años"], ...years.map((year) => [String(year), String(year)])]);
    fillOptions(monthFilter.select, [["", "Todos los meses"], ...months.map((month) => [String(month), MONTHS[month - 1]])]);
    fillOptions(atetFilter.select, [["", "Todos los ATET"], ...atets.map((atet) => [atet, atet])]);
    fillOptions(resultFilter.select, [
      ["", "Todos los resultados"],
      ["conforme", "Conforme"],
      ["observada", "Observado"],
      ["pendiente", "Pendiente"]
    ]);

    function update(resetPage = false) {
      const filtered = rows.filter((row) =>
        (!yearFilter.select.value || String(row.anio) === yearFilter.select.value)
        && (!monthFilter.select.value || String(row.mes) === monthFilter.select.value)
        && (!atetFilter.select.value || row.atet === atetFilter.select.value)
        && (!resultFilter.select.value || row.resultado === resultFilter.select.value)
      );
      if (resetPage) currentPage = 1;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      counter.textContent = `${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}`;
      results.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "atet-list__empty";
        empty.textContent = rows.length
          ? "No hay registros que coincidan con los filtros."
          : "Aún no has registrado presentaciones ni evaluaciones.";
        results.append(empty);
        return;
      }
      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const info = document.createElement("span");
      const next = document.createElement("button");
      pagination.className = "table-pagination";
      pagination.setAttribute("aria-label", "Paginación del historial");
      previous.type = "button";
      previous.textContent = "Anterior";
      previous.disabled = currentPage === 1;
      next.type = "button";
      next.textContent = "Siguiente";
      next.disabled = currentPage === totalPages;
      info.textContent = `Página ${currentPage} de ${totalPages}`;
      info.setAttribute("aria-live", "polite");
      previous.addEventListener("click", () => { currentPage -= 1; update(); });
      next.addEventListener("click", () => { currentPage += 1; update(); });
      pagination.append(previous, info, next);
      results.append(createTable(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)), pagination);
    }

    [yearFilter.select, monthFilter.select, atetFilter.select, resultFilter.select].forEach((select) => {
      select.addEventListener("change", () => update(true));
    });
    clear.addEventListener("click", () => {
      [yearFilter.select, monthFilter.select, atetFilter.select, resultFilter.select].forEach((select) => {
        select.value = "";
      });
      update(true);
      yearFilter.select.focus();
    });

    heading.append(title, counter);
    controls.append(yearFilter.field, monthFilter.field, atetFilter.field, resultFilter.field, clear);
    section.append(heading, controls, results);
    container.append(section);
    update();
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando historial…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const scoped = scopeToMacro(dashboard, personal);
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        scoped.dashboard,
        scoped.personal,
        scoped.presentations,
        scoped.evaluations
      );
      container.replaceChildren();
      renderHistory(container, buildRows(deliverables));
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el historial.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el historial.</strong><span>Verifica los datos y vuelve a intentarlo.</span></div>';
    }
  }

  global.HISTORY_MODULE = Object.freeze({ render });
})(window);
