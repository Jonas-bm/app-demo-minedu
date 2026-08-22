(function configureManagerDashboard(global) {
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

  function createResultBadge(status) {
    const badge = document.createElement("span");
    badge.className = `evaluation-status evaluation-status--${status}`;
    badge.textContent = status === "conforme" ? "Conforme" : "Observado";
    return badge;
  }

  function renderMetrics(container, evaluations, reports) {
    const conforming = evaluations.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = evaluations.filter((item) => item.evaluacion.estado === "observada").length;
    const grid = document.createElement("div");
    grid.className = "metrics-grid";
    grid.append(
      createMetricCard("Evaluaciones recibidas", evaluations.length, "primary"),
      createMetricCard("Pendientes de informe", Math.max(0, evaluations.length - reports.length), "info"),
      createMetricCard("Evaluaciones conformes", conforming, "success"),
      createMetricCard("Evaluaciones observadas", observed, "warning"),
      createMetricCard("Informes generados", reports.length, "neutral")
    );
    container.replaceChildren(grid);
  }

  function renderProgress(container, evaluations, reports) {
    const progressValue = evaluations.length ? Math.round((reports.length / evaluations.length) * 100) : 0;
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const percent = document.createElement("strong");
    const track = document.createElement("div");
    const bar = document.createElement("span");
    const detail = document.createElement("p");
    const states = document.createElement("div");
    section.className = "period-progress";
    heading.className = "period-progress__heading";
    title.textContent = "Avance de gestión de informes";
    percent.textContent = `${progressValue}%`;
    track.className = "period-progress__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "Avance de informes generados");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(progressValue));
    bar.style.width = `${progressValue}%`;
    detail.className = "period-progress__detail";
    detail.textContent = `${reports.length} de ${evaluations.length} informes generados`;
    states.className = "period-dates";
    [["Pendientes de gestión", Math.max(0, evaluations.length - reports.length)], ["Revisados por el Gestor", reports.length]].forEach(([label, value]) => {
      const item = document.createElement("div");
      const itemLabel = document.createElement("span");
      const itemValue = document.createElement("strong");
      itemLabel.textContent = label;
      itemValue.textContent = value;
      item.append(itemLabel, itemValue);
      states.append(item);
    });
    heading.append(title, percent);
    track.append(bar);
    section.append(heading, track, detail, states);
    container.replaceChildren(section);
  }

  function renderTracking(container, evaluations, reportRows) {
    const grid = document.createElement("div");
    const received = document.createElement("section");
    const reportsPanel = document.createElement("section");
    const receivedTitle = document.createElement("h3");
    const reportsTitle = document.createElement("h3");
    grid.className = "tracking-grid";
    received.className = reportsPanel.className = "tracking-panel";
    receivedTitle.textContent = "Últimas evaluaciones recibidas";
    reportsTitle.textContent = "Últimos informes gestionados";
    received.append(receivedTitle);
    reportsPanel.append(reportsTitle);
    if (!evaluations.length) {
      const empty = document.createElement("p");
      empty.className = "tracking-empty";
      empty.textContent = "No existen evaluaciones publicadas en este periodo.";
      received.append(empty);
    } else {
      const wrapper = document.createElement("div");
      const table = document.createElement("table");
      const caption = document.createElement("caption");
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      const body = document.createElement("tbody");
      wrapper.className = "tracking-table-wrapper";
      table.className = "tracking-table";
      caption.className = "sr-only";
      caption.textContent = "Últimas evaluaciones recibidas por el Gestor";
      ["Fecha", "ATET", "Entregable", "Resultado", "Macro"].forEach((label) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = label;
        headRow.append(th);
      });
      evaluations.slice(0, 3).forEach((item) => {
        const row = document.createElement("tr");
        [formatDate(item.evaluacion.fecha), item.atet.nombreCompleto, `N.° ${item.numero}`].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        const resultCell = document.createElement("td");
        const macroCell = document.createElement("td");
        resultCell.append(createResultBadge(item.evaluacion.estado));
        macroCell.textContent = item.evaluacion.evaluador || "Macro Demo";
        row.append(resultCell, macroCell);
        body.append(row);
      });
      head.append(headRow);
      table.append(caption, head, body);
      wrapper.append(table);
      received.append(wrapper);
    }
    if (!reportRows.length) {
      const reportEmpty = document.createElement("p");
      reportEmpty.className = "tracking-empty";
      reportEmpty.textContent = "Todavía no hay informes gestionados en esta maqueta.";
      reportsPanel.append(reportEmpty);
    } else {
      const list = document.createElement("ul");
      list.className = "manager-dashboard__reports";
      reportRows.slice(0, 3).forEach((report) => {
        const item = document.createElement("li");
        const number = document.createElement("strong");
        const detail = document.createElement("span");
        number.textContent = report.numero;
        detail.textContent = `${report.tipo === "conforme" ? "Conforme" : "Observado"} · ${formatDate(report.fecha)} · ${report.autor}`;
        item.append(number, detail);
        list.append(item);
      });
      reportsPanel.append(list);
    }
    grid.append(received, reportsPanel);
    container.replaceChildren(grid);
  }

  function renderSummary(container, evaluations) {
    const total = evaluations.length;
    if (!total) {
      const empty = document.createElement("p");
      empty.className = "dashboard-state";
      empty.textContent = "No existen resultados publicados para resumir en este periodo.";
      container.replaceChildren(empty);
      return;
    }
    const conforming = evaluations.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = evaluations.filter((item) => item.evaluacion.estado === "observada").length;
    const conformingPercent = total ? Math.round((conforming / total) * 100) : 0;
    const observedPercent = total ? 100 - conformingPercent : 0;
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const subtitle = document.createElement("p");
    const content = document.createElement("div");
    const chart = document.createElement("div");
    const center = document.createElement("div");
    const amount = document.createElement("strong");
    const amountLabel = document.createElement("span");
    const legend = document.createElement("ul");
    section.className = "result-summary";
    heading.className = "result-summary__heading";
    title.textContent = "Resultados recibidos en el periodo";
    subtitle.textContent = "Distribución de las evaluaciones publicadas por el Macro";
    content.className = "result-summary__content";
    chart.className = "result-chart";
    chart.style.setProperty("--conforming-stop", `${conformingPercent}%`);
    chart.style.setProperty("--observed-stop", "100%");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", `${conforming} evaluaciones conformes y ${observed} observadas.`);
    center.className = "result-chart__center";
    amount.textContent = total;
    amountLabel.textContent = "Recibidas";
    legend.className = "result-legend";
    [["conforme", "Conformes", conforming, conformingPercent], ["observada", "Observadas", observed, observedPercent]].forEach(([status, label, value, percent]) => {
      const item = document.createElement("li");
      const indicator = document.createElement("span");
      const text = document.createElement("span");
      const count = document.createElement("strong");
      indicator.className = `result-legend__indicator result-legend__indicator--${status}`;
      text.textContent = label;
      count.textContent = `${value} (${percent}%)`;
      item.append(indicator, text, count);
      legend.append(item);
    });
    center.append(amount, amountLabel);
    chart.append(center);
    heading.append(title, subtitle);
    content.append(chart, legend);
    section.append(heading, content);
    container.replaceChildren(section);
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="dashboard-state" role="status">Cargando indicadores del Gestor…</p>';
    try {
      const [dashboard, personal, catalogs] = await loadData();
      if (!isCurrent()) return;
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const periodMap = new Map(catalogs.periodos.map((item) => [item.id, item]));
      const periodIds = [...new Set(deliverables.map((item) => item.periodoId))].filter((id) => periodMap.has(id));
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
      label.htmlFor = "manager-dashboard-period";
      label.textContent = "Periodo";
      select.id = "manager-dashboard-period";
      periodIds.forEach((id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${periodMap.get(id).mesNombre} ${periodMap.get(id).anio}`;
        select.append(option);
      });
      select.value = periodIds.includes(dashboard.periodoPredeterminado) ? dashboard.periodoPredeterminado : periodIds[0];
      function update() {
        const evaluations = deliverables
          .filter((item) => item.periodoId === select.value && ["conforme", "observada"].includes(item.evaluacion.estado))
          .sort((first, second) => String(second.evaluacion.fecha).localeCompare(String(first.evaluacion.fecha)));
        const reports = global.DEMO_STORE.getReports().filter((report) => evaluations.some((item) => item.id === report.entregableId));
        renderMetrics(metrics, evaluations, reports);
        renderProgress(progress, evaluations, reports);
        renderTracking(tracking, evaluations, reports);
        renderSummary(summary, evaluations);
      }
      select.addEventListener("change", update);
      field.append(label, select);
      controls.append(field);
      container.replaceChildren(controls, metrics, progress, tracking, summary);
      update();
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el Dashboard del Gestor.", error);
      container.innerHTML = '<div class="dashboard-state dashboard-state--error" role="alert"><strong>No pudimos cargar los indicadores del Gestor.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.MANAGER_DASHBOARD_MODULE = Object.freeze({ render });
})(window);
