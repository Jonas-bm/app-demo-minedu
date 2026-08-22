(function configureManagerInbox(global) {
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
    const label = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
  }

  function createBadge(status) {
    const badge = document.createElement("span");
    badge.className = `evaluation-status evaluation-status--${status}`;
    badge.textContent = status === "conforme" ? "Conforme" : "Observado";
    return badge;
  }

  function getManagementStatus(item) {
    return item.evaluacion.estadoGestion || "pendiente-informe";
  }

  function createManagementBadge(status) {
    const labels = {
      "pendiente-informe": "Pendiente de informe",
      "en-revision": "En revisión",
      gestionado: "Gestionado"
    };
    const badge = document.createElement("span");
    badge.className = `management-status management-status--${status}`;
    badge.textContent = labels[status] || status;
    return badge;
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

  function createTable(rows) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "manager-inbox__table-wrapper";
    table.className = "manager-inbox__table";
    caption.className = "sr-only";
    caption.textContent = "Evaluaciones publicadas pendientes de informe";
    ["Periodo", "ATET", "O/S", "Entregable", "Resultado", "Macro evaluador", "Fecha", "Gestión", "Acción"].forEach((text) => {
      const header = document.createElement("th");
      header.scope = "col";
      header.textContent = text;
      headRow.append(header);
    });
    rows.forEach((item) => {
      const row = document.createElement("tr");
      [formatPeriod(item.periodoId), item.atet.nombreCompleto, item.contrato.ordenServicio, `N.° ${item.numero}`].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const resultCell = document.createElement("td");
      resultCell.append(createBadge(item.evaluacion.estado));
      row.append(resultCell);
      [item.evaluacion.evaluador || "Macro Demo", formatDate(item.evaluacion.fecha)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const managementCell = document.createElement("td");
      managementCell.append(createManagementBadge(getManagementStatus(item)));
      row.append(managementCell);
      const actionCell = document.createElement("td");
      const action = document.createElement("a");
      action.className = "deliverable-action";
      action.href = `#detalle-evaluacion-gestor/${encodeURIComponent(item.id)}`;
      action.textContent = "Ver detalle";
      action.setAttribute("aria-label", `Ver detalle de la evaluación del entregable ${item.numero} de ${item.atet.nombreCompleto}`);
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
    pager.setAttribute("aria-label", "Paginación de evaluaciones recibidas");
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
    container.innerHTML = '<p class="atet-state" role="status">Cargando evaluaciones recibidas…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const evaluations = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .filter((item) => item.evaluacion.estado === "conforme" || item.evaluacion.estado === "observada")
        .map((item) => {
          const report = global.DEMO_STORE.getReports().find((candidate) => candidate.entregableId === item.id);
          return report ? { ...item, evaluacion: { ...item.evaluacion, estadoGestion: "gestionado" } } : item;
        })
        .sort((first, second) => String(second.evaluacion.fecha).localeCompare(String(first.evaluacion.fecha)));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const counter = document.createElement("p");
      const notice = document.createElement("p");
      const filters = document.createElement("div");
      const macroFilter = createSelectField("manager-macro-filter", "Macro", "Todos los Macros");
      const atetFilter = createSelectField("manager-atet-filter", "ATET", "Todos los ATET");
      const periodFilter = createSelectField("manager-period-filter", "Periodo", "Todos los periodos");
      const resultFilter = createSelectField("manager-result-filter", "Resultado", "Todos los resultados");
      const managementFilter = createSelectField("manager-status-filter", "Estado del informe", "Todos los estados");
      const orderFilter = createSelectField("manager-order-filter", "Orden", "Más recientes primero");
      const clear = document.createElement("button");
      const results = document.createElement("div");
      const pageSize = 5;
      let currentPage = 1;
      section.className = "manager-inbox";
      heading.className = "manager-inbox__heading";
      title.textContent = "Evaluaciones recibidas";
      counter.textContent = `${evaluations.length} pendientes`;
      notice.className = "registration-form__note manager-inbox__notice";
      notice.textContent = "Estas evaluaciones fueron publicadas por el Macro y son de solo lectura. El Gestor no puede modificar sus respuestas.";
      filters.className = "manager-inbox__filters";
      clear.className = "atet-filters__clear manager-inbox__clear";
      clear.type = "button";
      clear.textContent = "Limpiar filtros";
      results.className = "manager-inbox__results";
      heading.append(title, counter);

      [...new Set(evaluations.map((item) => item.evaluacion.evaluador || "Macro Demo"))]
        .sort((first, second) => first.localeCompare(second, "es"))
        .forEach((value) => appendOption(macroFilter.select, value, value));
      [...new Map(evaluations.map((item) => [item.atet.codigo, item.atet])).values()]
        .sort((first, second) => first.nombreCompleto.localeCompare(second.nombreCompleto, "es"))
        .forEach((atet) => appendOption(atetFilter.select, atet.codigo, `${atet.nombreCompleto} · ${atet.codigo}`));
      [...new Set(evaluations.map((item) => item.periodoId))]
        .sort().reverse()
        .forEach((value) => appendOption(periodFilter.select, value, formatPeriod(value)));
      appendOption(resultFilter.select, "conforme", "Conforme");
      appendOption(resultFilter.select, "observada", "Observado");
      appendOption(managementFilter.select, "pendiente-informe", "Pendiente de informe");
      appendOption(managementFilter.select, "en-revision", "En revisión");
      appendOption(managementFilter.select, "gestionado", "Gestionado");
      orderFilter.select.firstElementChild.value = "recientes";
      appendOption(orderFilter.select, "antiguos", "Más antiguos primero");
      appendOption(orderFilter.select, "atet-asc", "ATET de A a Z");
      filters.append(
        macroFilter.field, atetFilter.field, periodFilter.field,
        resultFilter.field, managementFilter.field, orderFilter.field, clear
      );

      function getFilteredEvaluations() {
        const filtered = evaluations.filter((item) =>
          (!macroFilter.select.value || (item.evaluacion.evaluador || "Macro Demo") === macroFilter.select.value)
          && (!atetFilter.select.value || item.atet.codigo === atetFilter.select.value)
          && (!periodFilter.select.value || item.periodoId === periodFilter.select.value)
          && (!resultFilter.select.value || item.evaluacion.estado === resultFilter.select.value)
          && (!managementFilter.select.value || getManagementStatus(item) === managementFilter.select.value)
        );
        return filtered.sort((first, second) => {
          if (orderFilter.select.value === "antiguos") return String(first.evaluacion.fecha).localeCompare(String(second.evaluacion.fecha));
          if (orderFilter.select.value === "atet-asc") return first.atet.nombreCompleto.localeCompare(second.atet.nombreCompleto, "es");
          return String(second.evaluacion.fecha).localeCompare(String(first.evaluacion.fecha));
        });
      }

      function update(page = 1) {
        const filtered = getFilteredEvaluations();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        currentPage = Math.max(1, Math.min(page, totalPages));
        counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
        results.replaceChildren();
        if (!filtered.length) {
          const empty = document.createElement("p");
          empty.className = "atet-list__empty";
          empty.textContent = "No existen evaluaciones para los filtros seleccionados.";
          results.append(empty);
          return;
        }
        const start = (currentPage - 1) * pageSize;
        results.append(createTable(filtered.slice(start, start + pageSize)));
        if (totalPages > 1) results.append(createPager(currentPage, totalPages, update));
      }

      [macroFilter.select, atetFilter.select, periodFilter.select, resultFilter.select, managementFilter.select, orderFilter.select]
        .forEach((select) => select.addEventListener("change", () => update(1)));
      clear.addEventListener("click", () => {
        macroFilter.select.value = "";
        atetFilter.select.value = "";
        periodFilter.select.value = "";
        resultFilter.select.value = "";
        managementFilter.select.value = "";
        orderFilter.select.value = "recientes";
        update(1);
        macroFilter.select.focus();
      });

      section.append(heading, notice, filters, results);
      container.replaceChildren(section);
      update(1);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar la bandeja del Gestor.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar las evaluaciones recibidas.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.MANAGER_INBOX_MODULE = Object.freeze({ render });
})(window);
