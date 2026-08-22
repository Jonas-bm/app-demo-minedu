(function configureManagerProductivity(global) {
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

  function createProgress(value, total, label) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    const wrapper = document.createElement("div");
    const text = document.createElement("span");
    const track = document.createElement("div");
    const bar = document.createElement("span");
    wrapper.className = "macro-progress__value";
    text.textContent = `${percent}% (${value} de ${total})`;
    track.className = "macro-progress__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", label);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(percent));
    bar.style.width = `${percent}%`;
    track.append(bar);
    wrapper.append(text, track);
    return wrapper;
  }

  function renderSummary(container, summary) {
    const list = document.createElement("dl");
    list.className = "deliverable-state__summary manager-productivity__summary";
    [
      ["Carga recibida", summary.recibidas],
      ["Informes generados", summary.generados],
      ["Pendientes", summary.pendientes],
      ["Conformes generados", summary.conformes],
      ["Observados generados", summary.observados]
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      item.append(term, description);
      list.append(item);
    });
    container.replaceChildren(list);
  }

  function createTable(summary, periodLabel) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    const row = document.createElement("tr");
    wrapper.className = "manager-productivity__table-wrapper";
    table.className = "manager-productivity__table";
    caption.className = "sr-only";
    caption.textContent = "Productividad por Gestor";
    ["Periodo", "Gestor", "Carga recibida", "Generados", "Pendientes", "Conformes", "Observados", "Productividad"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    [periodLabel, "Gestor Demo", summary.recibidas, summary.generados, summary.pendientes, summary.conformes, summary.observados].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const productivityCell = document.createElement("td");
    productivityCell.append(createProgress(summary.generados, summary.recibidas, "Productividad del Gestor Demo"));
    row.append(productivityCell);
    body.append(row);
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function createPager() {
    const pager = document.createElement("nav");
    const previous = document.createElement("button");
    const status = document.createElement("span");
    const next = document.createElement("button");
    pager.className = "table-pagination";
    pager.setAttribute("aria-label", "Paginación de productividad por Gestor");
    previous.type = next.type = "button";
    previous.textContent = "Anterior";
    next.textContent = "Siguiente";
    previous.disabled = next.disabled = true;
    status.textContent = "Página 1 de 1";
    pager.append(previous, status, next);
    return pager;
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando productividad por Gestor…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const evaluations = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado));
      const reports = global.DEMO_STORE.getReports();
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const description = document.createElement("p");
      const warning = document.createElement("p");
      const filters = document.createElement("div");
      const periodField = document.createElement("div");
      const periodLabel = document.createElement("label");
      const periodSelect = document.createElement("select");
      const managerField = document.createElement("div");
      const managerLabel = document.createElement("label");
      const managerSelect = document.createElement("select");
      const summaryContainer = document.createElement("div");
      const results = document.createElement("div");
      section.className = "manager-productivity";
      heading.className = "macro-progress__heading";
      title.textContent = "Productividad consolidada";
      description.textContent = "Carga recibida e informes gestionados por responsable.";
      warning.className = "registration-form__note manager-productivity__rule";
      warning.textContent = "Criterio demo: productividad = informes generados ÷ evaluaciones recibidas. No constituye una métrica oficial de desempeño.";
      filters.className = "manager-productivity__filters";
      periodField.className = managerField.className = "manager-inbox__filter";
      periodLabel.htmlFor = "manager-productivity-period";
      periodLabel.textContent = "Periodo";
      periodSelect.id = "manager-productivity-period";
      managerLabel.htmlFor = "manager-productivity-owner";
      managerLabel.textContent = "Gestor";
      managerSelect.id = "manager-productivity-owner";
      const allPeriods = document.createElement("option");
      allPeriods.value = "";
      allPeriods.textContent = "Todos los periodos";
      periodSelect.append(allPeriods);
      [...new Set(evaluations.map((item) => item.periodoId))].sort().reverse().forEach((id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = formatPeriod(id);
        periodSelect.append(option);
      });
      const managerOption = document.createElement("option");
      managerOption.value = "gestor-demo";
      managerOption.textContent = "Gestor Demo";
      managerSelect.append(managerOption);
      periodSelect.value = dashboard.periodoPredeterminado;
      periodField.append(periodLabel, periodSelect);
      managerField.append(managerLabel, managerSelect);
      filters.append(periodField, managerField);
      heading.append(title, description);

      function update() {
        const selectedEvaluations = evaluations.filter((item) => !periodSelect.value || item.periodoId === periodSelect.value);
        const selectedIds = new Set(selectedEvaluations.map((item) => item.id));
        const selectedReports = reports.filter((report) => selectedIds.has(report.entregableId));
        const summary = {
          recibidas: selectedEvaluations.length,
          generados: selectedReports.length,
          pendientes: Math.max(0, selectedEvaluations.length - selectedReports.length),
          conformes: selectedReports.filter((report) => report.tipo === "conforme").length,
          observados: selectedReports.filter((report) => report.tipo === "observada").length
        };
        renderSummary(summaryContainer, summary);
        results.replaceChildren(createTable(summary, periodSelect.value ? formatPeriod(periodSelect.value) : "Todos"), createPager());
      }
      periodSelect.addEventListener("change", update);
      section.append(heading, warning, filters, summaryContainer, results);
      container.replaceChildren(section);
      update();
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar la productividad del Gestor.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar la productividad por Gestor.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.MANAGER_PRODUCTIVITY_MODULE = Object.freeze({ render });
})(window);
