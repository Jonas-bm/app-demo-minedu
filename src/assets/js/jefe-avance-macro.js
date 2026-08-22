(function configureMacroProgress(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los entregables.");
          return response.json();
        }),
        fetch("../data/personal.json").then((response) => {
          if (!response.ok) throw new Error("No se pudo cargar la asignación de ATET.");
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

  function createProgress(value, total, label) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    const wrapper = document.createElement("div");
    const text = document.createElement("span");
    const track = document.createElement("div");
    const bar = document.createElement("span");
    wrapper.className = "macro-progress__value";
    text.textContent = `${value} de ${total} (${percent}%)`;
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

  function createTable(summary) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    const row = document.createElement("tr");
    wrapper.className = "macro-progress__table-wrapper";
    table.className = "macro-progress__table";
    caption.className = "sr-only";
    caption.textContent = "Avance consolidado por Macro";
    ["Macro", "ATET asignados", "ATET registrados", "ATET pendientes", "Presentación", "Evaluación", "Informes"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    [summary.macro, summary.asignados, summary.registrados, summary.pendientes].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const presentationCell = document.createElement("td");
    const evaluationCell = document.createElement("td");
    const reportCell = document.createElement("td");
    presentationCell.append(createProgress(summary.presentados, summary.esperados, `Avance de presentación de ${summary.macro}`));
    evaluationCell.append(createProgress(summary.evaluados, summary.esperados, `Avance de evaluación de ${summary.macro}`));
    reportCell.append(createProgress(summary.informes, summary.evaluados, `Avance de informes de ${summary.macro}`));
    row.append(presentationCell, evaluationCell, reportCell);
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
    pager.setAttribute("aria-label", "Paginación de avance por Macro");
    previous.type = next.type = "button";
    previous.textContent = "Anterior";
    next.textContent = "Siguiente";
    previous.disabled = next.disabled = true;
    status.textContent = "Página 1 de 1";
    pager.append(previous, status, next);
    return pager;
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando avance por Macro…</p>';
    try {
      const [dashboard, personal, catalogs] = await loadData();
      if (!isCurrent()) return;
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const assignment = global.ATET_CALCULATIONS.calculateAssignment({
        ...personal,
        atets: personal.atets.concat(global.DEMO_STORE.getRegistrations())
      });
      const periodMap = new Map(catalogs.periodos.map((item) => [item.id, item]));
      const periodIds = [...new Set(deliverables.map((item) => item.periodoId))].filter((id) => periodMap.has(id));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const description = document.createElement("p");
      const filters = document.createElement("div");
      const field = document.createElement("div");
      const label = document.createElement("label");
      const select = document.createElement("select");
      const results = document.createElement("div");
      section.className = "macro-progress";
      heading.className = "macro-progress__heading";
      title.textContent = "Avance consolidado por responsable";
      description.textContent = "Comparación de cobertura ATET y progreso del periodo seleccionado.";
      filters.className = "macro-progress__filters";
      field.className = "manager-inbox__filter";
      label.htmlFor = "macro-progress-period";
      label.textContent = "Periodo";
      select.id = "macro-progress-period";
      periodIds.forEach((id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${periodMap.get(id).mesNombre} ${periodMap.get(id).anio}`;
        select.append(option);
      });
      select.value = periodIds.includes(dashboard.periodoPredeterminado) ? dashboard.periodoPredeterminado : periodIds[0];
      results.className = "macro-progress__results";
      heading.append(title, description);
      field.append(label, select);
      filters.append(field);

      function update() {
        const rows = deliverables.filter((item) => item.periodoId === select.value);
        const evaluatedIds = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado)).map((item) => item.id);
        const summary = {
          macro: "Macro Demo",
          ...assignment,
          esperados: rows.length,
          presentados: rows.filter((item) => item.presentacion.fecha).length,
          evaluados: evaluatedIds.length,
          informes: global.DEMO_STORE.getReports().filter((report) => evaluatedIds.includes(report.entregableId)).length
        };
        results.replaceChildren(createTable(summary), createPager());
      }
      select.addEventListener("change", update);
      section.append(heading, filters, results);
      container.replaceChildren(section);
      update();
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el avance por Macro.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el avance por Macro.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.MACRO_PROGRESS_MODULE = Object.freeze({ render });
})(window);
