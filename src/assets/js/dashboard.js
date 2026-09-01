(function configureDashboard(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los datos del Dashboard.");
          return response.json();
        }),
        fetch("../data/catalogos.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los periodos.");
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

  function createMetricCard(label, value, modifier) {
    const article = document.createElement("article");
    const cardLabel = document.createElement("p");
    const cardValue = document.createElement("strong");

    article.className = `metric-card${modifier ? ` metric-card--${modifier}` : ""}`;
    cardLabel.className = "metric-card__label";
    cardLabel.textContent = label;
    cardValue.className = "metric-card__value";
    cardValue.textContent = value;
    article.append(cardLabel, cardValue);

    return article;
  }

  function renderMetrics(container, result, context = { isDemoMacro: true }) {
    container.replaceChildren();

    if (result.esperados === 0 && context.isDemoMacro) {
      const empty = document.createElement("p");
      empty.className = "dashboard-state";
      empty.textContent = "No existen entregables programados para este periodo.";
      container.append(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "metrics-grid";
    grid.append(
      createMetricCard("ATET a cargo", result.atetACargo, "primary"),
      createMetricCard("Entregables presentados", result.presentados, "info"),
      createMetricCard("Entregables conformes", result.conformes, "success"),
      createMetricCard("Entregables observados", result.observados, "warning"),
      createMetricCard("Pendientes de presentación", result.pendientesPresentacion, "neutral")
    );
    container.append(grid);

    if (result.esperados === 0) {
      const note = document.createElement("p");
      note.className = "dashboard-state";
      note.textContent = "Aún no hay entregables programados en este periodo. Registra tus ATET para iniciar el seguimiento.";
      container.append(note);
    }
  }

  function formatDate(value) {
    if (!value) return "No definida";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(year, month - 1, day));
  }

  function renderProgress(container, result, catalogPeriod) {
    const progressPercent = Math.min(100, Math.max(0, result.avancePresentacion));
    const section = document.createElement("section");
    const headingRow = document.createElement("div");
    const heading = document.createElement("h3");
    const progressText = document.createElement("strong");
    const progressTrack = document.createElement("div");
    const progressBar = document.createElement("span");
    const details = document.createElement("p");
    const dates = document.createElement("div");

    section.className = "period-progress";
    headingRow.className = "period-progress__heading";
    heading.textContent = "Avance de presentación";
    progressText.textContent = `${progressPercent}%`;
    progressTrack.className = "period-progress__track";
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-label", "Avance de presentación del periodo");
    progressTrack.setAttribute("aria-valuemin", "0");
    progressTrack.setAttribute("aria-valuemax", "100");
    progressTrack.setAttribute("aria-valuenow", String(progressPercent));
    progressBar.style.width = `${progressPercent}%`;
    details.className = "period-progress__detail";
    details.textContent = `${result.presentados} de ${result.esperados} entregables presentados`;
    dates.className = "period-dates";

    [
      ["Fecha de corte", catalogPeriod.fechaCorte],
      ["Fecha máxima de presentación", catalogPeriod.fechaMaximaPresentacion]
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const itemLabel = document.createElement("span");
      const itemValue = document.createElement("strong");
      itemLabel.textContent = label;
      itemValue.textContent = formatDate(value);
      item.append(itemLabel, itemValue);
      dates.append(item);
    });

    headingRow.append(heading, progressText);
    progressTrack.append(progressBar);
    section.append(headingRow, progressTrack, details, dates);
    container.replaceChildren(section);
  }

  function createStatusBadge(status) {
    const settings = {
      pendiente: {
        label: "Pendiente",
        icon: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/>'
      },
      conforme: {
        label: "Conforme",
        icon: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/>'
      },
      observada: {
        label: "Observada",
        icon: '<path d="M12 4 21 20H3zM12 9v5M12 17h.01"/>'
      }
    };
    const current = settings[status] || settings.pendiente;
    const badge = document.createElement("span");
    badge.className = `status-badge status-badge--${status}`;
    badge.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24">${current.icon}</svg><span>${current.label}</span>`;
    return badge;
  }

  function daysBetween(start, end) {
    const toUtc = (value) => {
      const [year, month, day] = value.split("-").map(Number);
      return Date.UTC(year, month - 1, day);
    };
    return Math.ceil((toUtc(end) - toUtc(start)) / 86400000);
  }

  function remainingDaysLabel(referenceDate, dueDate) {
    const days = daysBetween(referenceDate, dueDate);
    if (days < 0) return `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
    if (days === 0) return "Vence hoy";
    return `${days} ${days === 1 ? "día" : "días"}`;
  }

  function createTable(headers, captionText) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const row = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "tracking-table-wrapper";
    table.className = "tracking-table";
    caption.className = "sr-only";
    caption.textContent = captionText;
    headers.forEach((header) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = header;
      row.append(cell);
    });
    head.append(row);
    table.append(caption, head, body);
    wrapper.append(table);
    return { wrapper, body };
  }

  function createEmptyTrackingState(message) {
    const empty = document.createElement("p");
    empty.className = "tracking-empty";
    empty.textContent = message;
    return empty;
  }

  function appendPaginatedTable(section, items, headers, createRow, label) {
    const pageSize = 3;
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const content = document.createElement("div");
    let currentPage = 1;

    function renderPage() {
      const { wrapper, body } = createTable(headers, label);
      const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      pageItems.forEach((item) => body.append(createRow(item)));

      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const info = document.createElement("span");
      const next = document.createElement("button");
      pagination.className = "table-pagination";
      pagination.setAttribute("aria-label", `Paginación de ${label}`);
      previous.type = "button";
      previous.textContent = "Anterior";
      previous.disabled = currentPage === 1;
      info.textContent = `Página ${currentPage} de ${totalPages}`;
      info.setAttribute("aria-live", "polite");
      next.type = "button";
      next.textContent = "Siguiente";
      next.disabled = currentPage === totalPages;
      previous.addEventListener("click", () => {
        currentPage -= 1;
        renderPage();
      });
      next.addEventListener("click", () => {
        currentPage += 1;
        renderPage();
      });
      pagination.append(previous, info, next);
      content.replaceChildren(wrapper, pagination);
    }

    section.append(content);
    renderPage();
  }

  function renderTracking(container, result, referenceDate) {
    const grid = document.createElement("div");
    const upcomingSection = document.createElement("section");
    const reviewsSection = document.createElement("section");
    const upcomingTitle = document.createElement("h3");
    const reviewsTitle = document.createElement("h3");

    grid.className = "tracking-grid";
    upcomingSection.className = "tracking-panel";
    reviewsSection.className = "tracking-panel";
    upcomingTitle.textContent = "Próximos entregables por vencer";
    reviewsTitle.textContent = "Últimos entregables revisados";
    upcomingSection.append(upcomingTitle);
    reviewsSection.append(reviewsTitle);

    if (result.proximosVencimientos.length === 0) {
      upcomingSection.append(createEmptyTrackingState("No hay entregables pendientes para este periodo."));
    } else {
      appendPaginatedTable(upcomingSection, result.proximosVencimientos, ["ATET", "Entregable", "Fecha máxima", "Estado", "Días restantes"], (item) => {
        const row = document.createElement("tr");
        const values = [item.atetNombre, `N.° ${item.numero}`, formatDate(item.fechaMaxima)];
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        const statusCell = document.createElement("td");
        const daysCell = document.createElement("td");
        statusCell.append(createStatusBadge("pendiente"));
        daysCell.textContent = remainingDaysLabel(referenceDate, item.fechaMaxima);
        row.append(statusCell, daysCell);
        return row;
      }, "próximos entregables");
    }

    if (result.ultimasRevisiones.length === 0) {
      reviewsSection.append(createEmptyTrackingState("Todavía no hay entregables revisados en este periodo."));
    } else {
      appendPaginatedTable(reviewsSection, result.ultimasRevisiones, ["Fecha", "ATET", "Entregable", "Resultado", "Evaluador"], (item) => {
        const row = document.createElement("tr");
        [formatDate(item.evaluacion.fecha), item.atetNombre, `N.° ${item.numero}`].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        const statusCell = document.createElement("td");
        const evaluatorCell = document.createElement("td");
        statusCell.append(createStatusBadge(item.evaluacion.estado));
        evaluatorCell.textContent = item.evaluacion.evaluador || "No registrado";
        row.append(statusCell, evaluatorCell);
        return row;
      }, "últimos entregables revisados");
    }

    grid.append(upcomingSection, reviewsSection);
    container.replaceChildren(grid);
  }

  function renderSummary(container, result) {
    if (result.esperados === 0) {
      container.replaceChildren();
      return;
    }

    const pendingResult = result.esperados - result.conformes - result.observados;
    const conformingPercent = global.DASHBOARD_CALCULATIONS.percentage(result.conformes, result.esperados);
    const observedPercent = global.DASHBOARD_CALCULATIONS.percentage(result.observados, result.esperados);
    const pendingPercent = global.DASHBOARD_CALCULATIONS.percentage(pendingResult, result.esperados);
    const conformingStop = conformingPercent;
    const observedStop = conformingPercent + observedPercent;
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const subtitle = document.createElement("p");
    const content = document.createElement("div");
    const chart = document.createElement("div");
    const chartCenter = document.createElement("div");
    const total = document.createElement("strong");
    const totalLabel = document.createElement("span");
    const legend = document.createElement("ul");
    const accessibleSummary = document.createElement("p");

    section.className = "result-summary";
    heading.className = "result-summary__heading";
    title.textContent = "Resumen del estado del periodo";
    subtitle.textContent = "Distribución sobre el total de entregables esperados";
    content.className = "result-summary__content";
    chart.className = "result-chart";
    chart.style.setProperty("--conforming-stop", `${conformingStop}%`);
    chart.style.setProperty("--observed-stop", `${observedStop}%`);
    chart.setAttribute("role", "img");
    chart.setAttribute(
      "aria-label",
      `${result.conformes} conformes, ${result.observados} observados y ${pendingResult} pendientes de resultado, de ${result.esperados} esperados.`
    );
    chartCenter.className = "result-chart__center";
    total.textContent = result.esperados;
    totalLabel.textContent = "Esperados";
    legend.className = "result-legend";
    accessibleSummary.className = "sr-only";
    accessibleSummary.textContent = `Resumen textual: ${conformingPercent}% conformes, ${observedPercent}% observados y ${pendingPercent}% pendientes de resultado. Estos pendientes incluyen ${result.pendientesPresentacion} sin presentar y ${result.pendientesEvaluacion} presentados aún sin evaluar.`;

    [
      ["conforme", "Conformes", result.conformes, conformingPercent],
      ["observada", "Observados", result.observados, observedPercent],
      ["pendiente", "Pendientes de resultado", pendingResult, pendingPercent]
    ].forEach(([status, label, value, percent]) => {
      const item = document.createElement("li");
      const indicator = document.createElement("span");
      const text = document.createElement("span");
      const amount = document.createElement("strong");
      indicator.className = `result-legend__indicator result-legend__indicator--${status}`;
      indicator.setAttribute("aria-hidden", "true");
      text.textContent = label;
      amount.textContent = `${value} (${percent}%)`;
      item.append(indicator, text, amount);
      legend.append(item);
    });

    chartCenter.append(total, totalLabel);
    chart.append(chartCenter);
    heading.append(title, subtitle);
    content.append(chart, legend);
    section.append(heading, content, accessibleSummary);
    container.replaceChildren(section);
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="dashboard-state" role="status">Cargando indicadores del periodo…</p>';

    try {
      const [dashboardData, catalogs, personalData] = await loadData();
      if (!isCurrent()) return;
      const context = global.MACRO_CONTEXT
        ? global.MACRO_CONTEXT.get()
        : { isDemoMacro: true, assignedQuota: null };
      // Entregables del Macro (los de la demo si es `macro.demo`, más uno por cada
      // ATET propio que aún no tenga entregable en el periodo) y solo sus
      // presentaciones/evaluaciones.
      const scopedDashboard = global.MACRO_CONTEXT
        ? global.MACRO_CONTEXT.effectiveDashboard(dashboardData, context, personalData)
        : dashboardData;
      const ownPresentations = global.MACRO_CONTEXT
        ? global.MACRO_CONTEXT.ownPresentations(context)
        : global.DEMO_STORE.getPresentations();
      const ownEvaluations = global.MACRO_CONTEXT
        ? global.MACRO_CONTEXT.ownEvaluations(context)
        : global.DEMO_STORE.getEvaluations();
      const dashboardWithPresentations = global.DELIVERABLE_CALCULATIONS.applyPresentationOverrides(
        scopedDashboard,
        ownPresentations
      );
      const effectiveDashboardData = global.DELIVERABLE_CALCULATIONS.applyEvaluationOverrides(
        dashboardWithPresentations,
        ownEvaluations
      );
      const periodMap = new Map(catalogs.periodos.map((period) => [period.id, period]));
      const availablePeriods = effectiveDashboardData.periodos.filter((period) => periodMap.has(period.id));

      if (availablePeriods.length === 0) {
        container.innerHTML = '<p class="dashboard-state">No hay periodos disponibles para mostrar.</p>';
        return;
      }

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
      label.htmlFor = "dashboard-period";
      label.textContent = "Periodo";
      select.id = "dashboard-period";
      select.name = "periodo";
      select.setAttribute("aria-controls", "dashboard-metrics");
      metrics.id = "dashboard-metrics";
      metrics.setAttribute("aria-live", "polite");
      progress.id = "dashboard-progress";
      tracking.id = "dashboard-tracking";
      summary.id = "dashboard-summary";

      availablePeriods.forEach((period) => {
        const catalogPeriod = periodMap.get(period.id);
        const option = document.createElement("option");
        option.value = period.id;
        option.textContent = `${catalogPeriod.mesNombre} ${catalogPeriod.anio}`;
        select.append(option);
      });

      const requestedDefault = effectiveDashboardData.periodoPredeterminado;
      const defaultHasDeliverables = availablePeriods.some((period) => period.id === requestedDefault && period.entregables.length > 0);
      const firstWithDeliverables = availablePeriods.find((period) => period.entregables.length > 0);
      select.value = defaultHasDeliverables
        ? requestedDefault
        : (firstWithDeliverables || availablePeriods[0]).id;

      function updatePeriod() {
        const period = availablePeriods.find((item) => item.id === select.value);
        const result = global.DASHBOARD_CALCULATIONS.calculatePeriod(period);
        if (!context.isDemoMacro && context.assignedQuota != null) {
          result.atetACargo = context.assignedQuota;
        }
        renderMetrics(metrics, result, context);
        renderProgress(progress, result, periodMap.get(period.id));
        renderTracking(tracking, result, effectiveDashboardData.metadata.fechaReferencia);
        renderSummary(summary, result);
      }

      select.addEventListener("change", updatePeriod);
      field.append(label, select);
      controls.append(field);
      container.replaceChildren(controls, metrics, progress, tracking, summary);
      updatePeriod();
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Error al cargar el Dashboard.", error);
      container.innerHTML = '<div class="dashboard-state dashboard-state--error" role="alert"><strong>No pudimos cargar los indicadores.</strong><span>Verifica que la aplicación se esté ejecutando desde un servidor local e inténtalo nuevamente.</span></div>';
    }
  }

  global.DASHBOARD_MODULE = Object.freeze({ render });
})(window);
