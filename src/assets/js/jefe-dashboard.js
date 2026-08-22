(function configureExecutiveDashboard(global) {
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
        }),
        fetch("../data/catalogos.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los periodos.");
          return response.json();
        })
      ]).catch((error) => {
        dataPromise = null;
        throw error;
      });
    }
    return dataPromise;
  }

  function createMetricCard(label, value, modifier) {
    const card = document.createElement("article");
    const text = document.createElement("p");
    const amount = document.createElement("strong");
    card.className = `metric-card metric-card--${modifier}`;
    text.className = "metric-card__label";
    text.textContent = label;
    amount.className = "metric-card__value";
    amount.textContent = value;
    card.append(text, amount);
    return card;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
  }

  function renderMetrics(container, rows, activeAtets, reports) {
    const presented = rows.filter((item) => item.presentacion.fecha).length;
    const evaluated = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado)).length;
    const grid = document.createElement("div");
    grid.className = "metrics-grid";
    grid.append(
      createMetricCard("ATET activos", activeAtets, "primary"),
      createMetricCard("Entregables esperados", rows.length, "info"),
      createMetricCard("Entregables presentados", presented, "success"),
      createMetricCard("Entregables evaluados", evaluated, "warning"),
      createMetricCard("Informes generados", reports.length, "neutral")
    );
    container.replaceChildren(grid);
  }

  function renderProgress(container, rows, reports) {
    const evaluated = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado)).length;
    const percent = rows.length ? Math.round((evaluated / rows.length) * 100) : 0;
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const value = document.createElement("strong");
    const track = document.createElement("div");
    const bar = document.createElement("span");
    const detail = document.createElement("p");
    const states = document.createElement("div");
    section.className = "period-progress";
    heading.className = "period-progress__heading";
    title.textContent = "Avance consolidado de evaluación";
    value.textContent = `${percent}%`;
    track.className = "period-progress__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "Avance consolidado de evaluación");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(percent));
    bar.style.width = `${percent}%`;
    detail.className = "period-progress__detail";
    detail.textContent = `${evaluated} de ${rows.length} entregables evaluados`;
    states.className = "period-dates";
    [["Evaluaciones pendientes", Math.max(0, rows.length - evaluated)], ["Informes generados", reports.length]].forEach(([label, amount]) => {
      const item = document.createElement("div");
      const itemLabel = document.createElement("span");
      const itemValue = document.createElement("strong");
      itemLabel.textContent = label;
      itemValue.textContent = amount;
      item.append(itemLabel, itemValue);
      states.append(item);
    });
    heading.append(title, value);
    track.append(bar);
    section.append(heading, track, detail, states);
    container.replaceChildren(section);
  }

  function createSimpleTable(headers, data, captionText) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "tracking-table-wrapper";
    table.className = "tracking-table";
    caption.className = "sr-only";
    caption.textContent = captionText;
    headers.forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    data.forEach((values) => {
      const row = document.createElement("tr");
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      body.append(row);
    });
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function renderTracking(container, rows, reports) {
    const evaluated = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado));
    const grid = document.createElement("div");
    const macroPanel = document.createElement("section");
    const reportPanel = document.createElement("section");
    const macroTitle = document.createElement("h3");
    const reportTitle = document.createElement("h3");
    grid.className = "tracking-grid";
    macroPanel.className = reportPanel.className = "tracking-panel";
    macroTitle.textContent = "Resumen por Macro";
    reportTitle.textContent = "Últimos informes generados";
    macroPanel.append(macroTitle, createSimpleTable(
      ["Macro", "Esperados", "Presentados", "Evaluados", "Pendientes"],
      [["Macro Demo", rows.length, rows.filter((item) => item.presentacion.fecha).length, evaluated.length, Math.max(0, rows.length - evaluated.length)]],
      "Resumen ejecutivo por Macro"
    ));
    reportPanel.append(reportTitle);
    if (!reports.length) {
      const empty = document.createElement("p");
      empty.className = "tracking-empty";
      empty.textContent = "No existen informes generados en este periodo.";
      reportPanel.append(empty);
    } else {
      reportPanel.append(createSimpleTable(
        ["Número", "Fecha", "Tipo", "Gestor"],
        reports.slice(0, 3).map((report) => [report.numero, formatDate(report.fecha), report.tipo === "conforme" ? "Conforme" : "Observado", report.autor]),
        "Últimos informes generados"
      ));
    }
    grid.append(macroPanel, reportPanel);
    container.replaceChildren(grid);
  }

  function renderSummary(container, rows) {
    const conforming = rows.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = rows.filter((item) => item.evaluacion.estado === "observada").length;
    const pending = Math.max(0, rows.length - conforming - observed);
    const total = rows.length;
    if (!total) {
      const empty = document.createElement("p");
      empty.className = "dashboard-state";
      empty.textContent = "No existen entregables para este periodo.";
      container.replaceChildren(empty);
      return;
    }
    const conformingPercent = Math.round((conforming / total) * 100);
    const observedPercent = Math.round((observed / total) * 100);
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const subtitle = document.createElement("p");
    const content = document.createElement("div");
    const chart = document.createElement("div");
    const center = document.createElement("div");
    const amount = document.createElement("strong");
    const label = document.createElement("span");
    const legend = document.createElement("ul");
    section.className = "result-summary";
    heading.className = "result-summary__heading";
    title.textContent = "Estado consolidado del periodo";
    subtitle.textContent = "Distribución sobre el total de entregables esperados";
    content.className = "result-summary__content";
    chart.className = "result-chart";
    chart.style.setProperty("--conforming-stop", `${conformingPercent}%`);
    chart.style.setProperty("--observed-stop", `${conformingPercent + observedPercent}%`);
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", `${conforming} conformes, ${observed} observados y ${pending} pendientes.`);
    center.className = "result-chart__center";
    amount.textContent = total;
    label.textContent = "Esperados";
    legend.className = "result-legend";
    [["conforme", "Conformes", conforming], ["observada", "Observados", observed], ["pendiente", "Pendientes", pending]].forEach(([status, text, value]) => {
      const item = document.createElement("li");
      const indicator = document.createElement("span");
      const itemLabel = document.createElement("span");
      const itemValue = document.createElement("strong");
      indicator.className = `result-legend__indicator result-legend__indicator--${status}`;
      itemLabel.textContent = text;
      itemValue.textContent = value;
      item.append(indicator, itemLabel, itemValue);
      legend.append(item);
    });
    center.append(amount, label);
    chart.append(center);
    heading.append(title, subtitle);
    content.append(chart, legend);
    section.append(heading, content);
    container.replaceChildren(section);
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="dashboard-state" role="status">Cargando indicadores ejecutivos…</p>';
    try {
      const [dashboard, personal, catalogs] = await loadData();
      if (!isCurrent()) return;
      const rows = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const periodMap = new Map(catalogs.periodos.map((item) => [item.id, item]));
      const periodIds = [...new Set(rows.map((item) => item.periodoId))].filter((id) => periodMap.has(id));
      const controls = document.createElement("div");
      const field = document.createElement("div");
      const label = document.createElement("label");
      const select = document.createElement("select");
      const metrics = document.createElement("div");
      const progress = document.createElement("div");
      const tracking = document.createElement("div");
      const summary = document.createElement("div");
      controls.className = "dashboard-controls";
      field.className = "dashboard-period-field";
      label.htmlFor = "executive-dashboard-period";
      label.textContent = "Periodo";
      select.id = "executive-dashboard-period";
      periodIds.forEach((id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${periodMap.get(id).mesNombre} ${periodMap.get(id).anio}`;
        select.append(option);
      });
      select.value = periodIds.includes(dashboard.periodoPredeterminado) ? dashboard.periodoPredeterminado : periodIds[0];
      function update() {
        const periodRows = rows.filter((item) => item.periodoId === select.value);
        const reports = global.DEMO_STORE.getReports()
          .filter((report) => periodRows.some((item) => item.id === report.entregableId))
          .sort((first, second) => String(second.generadoEn).localeCompare(String(first.generadoEn)));
        renderMetrics(metrics, periodRows, personal.atets.filter((item) => item.estado === "activo").length, reports);
        renderProgress(progress, periodRows, reports);
        renderTracking(tracking, periodRows, reports);
        renderSummary(summary, periodRows);
      }
      select.addEventListener("change", update);
      field.append(label, select);
      controls.append(field);
      container.replaceChildren(controls, metrics, progress, tracking, summary);
      update();
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el Dashboard ejecutivo.", error);
      container.innerHTML = '<div class="dashboard-state dashboard-state--error" role="alert"><strong>No pudimos cargar los indicadores ejecutivos.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.EXECUTIVE_DASHBOARD_MODULE = Object.freeze({ render });
})(window);
