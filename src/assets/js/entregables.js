(function configureDeliverablesModule(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/dashboard.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los entregables.");
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

  function formatPeriod(periodId) {
    const [year, month] = periodId.split("-").map(Number);
    const label = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDate(value) {
    if (!value) return "—";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(year, month - 1, day));
  }

  function createSelectField(id, labelText, defaultText) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const defaultOption = document.createElement("option");
    field.className = "deliverable-filter";
    label.htmlFor = id;
    label.textContent = labelText;
    select.id = id;
    defaultOption.value = "";
    defaultOption.textContent = defaultText;
    select.append(defaultOption);
    field.append(label, select);
    return { field, select };
  }

  function appendOption(select, value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }

  function createStatus(status) {
    const labels = { pendiente: "Pendiente", presentado: "Presentado", "fuera-plazo": "Fuera de plazo" };
    const badge = document.createElement("span");
    badge.className = `deliverable-status deliverable-status--${status}`;
    badge.textContent = labels[status] || status;
    return badge;
  }

  function createEvaluationStatus(status) {
    const labels = { pendiente: "Pendiente", conforme: "Conforme", observada: "Observado" };
    const badge = document.createElement("span");
    badge.className = `evaluation-status evaluation-status--${status}`;
    badge.textContent = labels[status] || status;
    return badge;
  }

  function createTable(rows) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "deliverable-table-wrapper";
    table.className = "deliverable-table";
    caption.className = "sr-only";
    caption.textContent = "Lista de entregables esperados";
    ["Periodo", "ATET", "O/S", "Entregable", "Fecha máxima", "Presentación", "Estado", "Evaluación", "Acción"].forEach((text) => {
      const header = document.createElement("th");
      header.scope = "col";
      header.textContent = text;
      headRow.append(header);
    });
    rows.forEach((deliverable) => {
      const row = document.createElement("tr");
      const atetCell = document.createElement("td");
      const actionCell = document.createElement("td");
      const action = document.createElement("a");
      [formatPeriod(deliverable.periodoId)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const atetName = document.createElement("strong");
      const atetCode = document.createElement("span");
      atetName.textContent = deliverable.atet.nombreCompleto;
      atetCode.textContent = deliverable.atet.codigo;
      atetCell.className = "deliverable-table__atet";
      atetCell.append(atetName, atetCode);
      row.append(atetCell);
      [deliverable.contrato.ordenServicio, `N.° ${deliverable.numero}`, formatDate(deliverable.fechaMaxima), formatDate(deliverable.presentacion.fecha)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const statusCell = document.createElement("td");
      statusCell.append(createStatus(deliverable.estado));
      const evaluationCell = document.createElement("td");
      evaluationCell.append(createEvaluationStatus(deliverable.evaluacion.estado));
      action.className = "deliverable-action";
      action.href = deliverable.presentacion.fecha
        ? `#evaluar-entregable/${encodeURIComponent(deliverable.id)}`
        : `#registrar-presentacion/${encodeURIComponent(deliverable.id)}`;
      action.textContent = deliverable.presentacion.fecha
        ? deliverable.evaluacion.estado === "pendiente" ? "Evaluar entregable" : "Ver evaluación"
        : "Registrar presentación";
      action.setAttribute("aria-label", `${action.textContent} del entregable ${deliverable.numero} de ${deliverable.atet.nombreCompleto}`);
      actionCell.append(action);
      row.append(statusCell, evaluationCell, actionCell);
      body.append(row);
    });
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function renderList(container, deliverables, defaultPeriod) {
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const counter = document.createElement("p");
    const filters = document.createElement("div");
    const periodFilter = createSelectField("deliverable-period-filter", "Periodo", "Todos los periodos");
    const atetFilter = createSelectField("deliverable-atet-filter", "ATET", "Todos los ATET");
    const statusFilter = createSelectField("deliverable-status-filter", "Estado", "Todos los estados");
    const clear = document.createElement("button");
    const results = document.createElement("div");
    const pageSize = 5;
    let currentPage = 1;
    section.className = "deliverable-list";
    heading.className = "deliverable-list__heading";
    title.textContent = "Entregables esperados";
    counter.setAttribute("aria-live", "polite");
    filters.className = "deliverable-filters";
    clear.className = "atet-filters__clear";
    clear.type = "button";
    clear.textContent = "Limpiar filtros";
    results.className = "deliverable-list__results";

    [...new Set(deliverables.map((item) => item.periodoId))].sort().forEach((id) => appendOption(periodFilter.select, id, formatPeriod(id)));
    [...new Map(deliverables.map((item) => [item.atet.codigo, item.atet])).values()]
      .sort((first, second) => first.nombreCompleto.localeCompare(second.nombreCompleto, "es"))
      .forEach((atet) => appendOption(atetFilter.select, atet.codigo, `${atet.nombreCompleto} · ${atet.codigo}`));
    [["pendiente", "Pendiente"], ["presentado", "Presentado"], ["fuera-plazo", "Fuera de plazo"]]
      .forEach(([value, text]) => appendOption(statusFilter.select, value, text));
    periodFilter.select.value = defaultPeriod;

    function update(resetPage = false) {
      const filtered = deliverables.filter((item) =>
        (!periodFilter.select.value || item.periodoId === periodFilter.select.value)
        && (!atetFilter.select.value || item.atet.codigo === atetFilter.select.value)
        && (!statusFilter.select.value || item.estado === statusFilter.select.value)
      );
      if (resetPage) currentPage = 1;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
      results.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "atet-list__empty";
        empty.textContent = "No existen entregables para los filtros seleccionados.";
        results.append(empty);
        return;
      }
      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const info = document.createElement("span");
      const next = document.createElement("button");
      pagination.className = "table-pagination";
      pagination.setAttribute("aria-label", "Paginación de entregables");
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

    [periodFilter.select, atetFilter.select, statusFilter.select].forEach((select) => select.addEventListener("change", () => update(true)));
    clear.addEventListener("click", () => {
      periodFilter.select.value = "";
      atetFilter.select.value = "";
      statusFilter.select.value = "";
      update(true);
      periodFilter.select.focus();
    });
    heading.append(title, counter);
    filters.append(periodFilter.field, atetFilter.field, statusFilter.field, clear);
    section.append(heading, filters, results);
    container.append(section);
    update();
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando entregables…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations());
      container.replaceChildren();
      renderList(container, deliverables, dashboard.periodoPredeterminado);
      const flashMessage = global.DEMO_STORE.takeFlash();
      if (flashMessage) {
        const flash = document.createElement("p");
        flash.className = "demo-flash";
        flash.setAttribute("role", "status");
        flash.textContent = flashMessage;
        container.prepend(flash);
      }
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudieron cargar los entregables.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar los entregables.</strong><span>Verifica los datos y vuelve a intentarlo.</span></div>';
    }
  }

  async function renderPresentationPlaceholder(container, deliverableId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando entregable…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverable = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .find((item) => item.id === deliverableId);
      if (!deliverable) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No encontramos el entregable solicitado.</strong><a class="atet-back-link" href="#entregables">← Atrás</a></div>';
        return;
      }
      const wrapper = document.createElement("div");
      const back = document.createElement("a");
      wrapper.className = "deliverable-presentation";
      back.className = "atet-back-link";
      back.href = "#entregables";
      back.textContent = "← Atrás";
      back.setAttribute("aria-label", "Atrás, volver a Entregables");
      wrapper.append(back);

      if (deliverable.presentacion.fecha) {
        const heading = document.createElement("div");
        const title = document.createElement("h3");
        const details = document.createElement("dl");
        heading.className = "deliverable-presentation__heading";
        title.textContent = `${deliverable.atet.nombreCompleto} · Entregable N.° ${deliverable.numero}`;
        heading.append(title, createStatus(deliverable.estado));
        details.className = "atet-detail__fields deliverable-presentation__details";
        [
          ["Código ATET", deliverable.atet.codigo],
          ["Orden de servicio", deliverable.contrato.ordenServicio],
          ["Periodo", formatPeriod(deliverable.periodoId)],
          ["Fecha máxima", formatDate(deliverable.fechaMaxima)],
          ["Fecha de presentación", formatDate(deliverable.presentacion.fecha)],
          ["Referencia externa provisional", deliverable.presentacion.referenciaDocumento || "No registrada en los datos de demostración"],
          ["Observaciones administrativas", deliverable.presentacion.observaciones || "Sin observaciones", true]
        ].forEach(([labelText, value, full = false]) => {
          const item = document.createElement("div");
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          if (full) item.className = "atet-detail__field--full";
          term.textContent = labelText;
          description.textContent = value;
          item.append(term, description);
          details.append(item);
        });
        wrapper.append(heading, details);
      } else {
        const form = document.createElement("form");
        const note = document.createElement("p");
        const actions = document.createElement("div");
        const cancel = document.createElement("a");
        const save = document.createElement("button");
        const status = document.createElement("p");
        let submitting = false;

        function createField({ id, labelText, value = "", type = "text", readOnly = false, required = false, full = false }) {
          const field = document.createElement("div");
          const label = document.createElement("label");
          const control = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
          const error = document.createElement("p");
          field.className = `registration-field${full ? " registration-field--full" : ""}`;
          label.htmlFor = id;
          label.textContent = labelText;
          control.id = id;
          control.name = id;
          control.value = value;
          control.readOnly = readOnly;
          control.required = required;
          if (control instanceof HTMLInputElement) control.type = type;
          control.setAttribute("aria-describedby", `${id}-error`);
          error.id = `${id}-error`;
          error.className = "registration-field__error";
          error.setAttribute("role", "alert");
          field.append(label, control, error);
          return field;
        }

        function createSection(titleText, fields) {
          const fieldset = document.createElement("fieldset");
          const legend = document.createElement("legend");
          const grid = document.createElement("div");
          fieldset.className = "registration-form__section";
          legend.textContent = titleText;
          grid.className = "registration-form__grid";
          fields.forEach((field) => grid.append(field));
          fieldset.append(legend, grid);
          return fieldset;
        }

        function setError(id, message) {
          const control = form.elements.namedItem(id);
          const error = form.querySelector(`#${id}-error`);
          control.classList.toggle("is-invalid", Boolean(message));
          control.setAttribute("aria-invalid", String(Boolean(message)));
          error.textContent = message;
          return Boolean(message);
        }

        form.className = "registration-form deliverable-presentation__form";
        form.noValidate = true;
        note.className = "registration-form__note";
        note.textContent = "La referencia identifica el documento almacenado en el sistema externo; este campo es provisional para la maqueta.";
        form.append(
          note,
          createSection("Datos del entregable", [
            createField({ id: "presentation-atet", labelText: "ATET", value: `${deliverable.atet.nombreCompleto} · ${deliverable.atet.codigo}`, readOnly: true }),
            createField({ id: "presentation-order", labelText: "Orden de servicio", value: deliverable.contrato.ordenServicio, readOnly: true }),
            createField({ id: "presentation-period", labelText: "Periodo y entregable", value: `${formatPeriod(deliverable.periodoId)} · N.° ${deliverable.numero}`, readOnly: true }),
            createField({ id: "presentation-due", labelText: "Fecha máxima", value: deliverable.fechaMaxima, type: "date", readOnly: true })
          ]),
          createSection("Datos de la presentación", [
            createField({ id: "presentation-date", labelText: "Fecha de presentación (obligatoria)", type: "date", required: true }),
            createField({ id: "presentation-reference", labelText: "Referencia externa provisional (obligatoria)", required: true }),
            createField({ id: "presentation-observations", labelText: "Observaciones administrativas", type: "textarea", full: true })
          ])
        );
        actions.className = "registration-form__actions";
        cancel.className = "registration-action registration-action--secondary";
        cancel.href = "#entregables";
        cancel.textContent = "Cancelar";
        save.className = "registration-action registration-action--primary";
        save.type = "submit";
        save.textContent = "Guardar presentación";
        status.className = "registration-form__status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        actions.append(cancel, save);
        form.append(actions, status);
        form.addEventListener("input", (event) => {
          if (event.target.matches("input, textarea")) setError(event.target.name, "");
        });
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (submitting) return;
          const presentationDate = form.elements.namedItem("presentation-date").value;
          const reference = form.elements.namedItem("presentation-reference").value.trim();
          const invalidDate = setError("presentation-date", presentationDate ? "" : "La fecha de presentación es obligatoria.");
          const invalidReference = setError("presentation-reference", reference ? "" : "La referencia externa es obligatoria.");
          const firstInvalid = invalidDate
            ? form.elements.namedItem("presentation-date")
            : invalidReference
              ? form.elements.namedItem("presentation-reference")
              : null;
          if (firstInvalid) {
            status.textContent = "Corrige los campos indicados antes de guardar.";
            firstInvalid.focus();
            return;
          }
          if (!global.confirm(`¿Deseas registrar la presentación del entregable N.° ${deliverable.numero}?`)) return;
          submitting = true;
          save.disabled = true;
          global.DEMO_STORE.savePresentation({
            entregableId: deliverable.id,
            fecha: presentationDate,
            referenciaDocumento: reference,
            observaciones: form.elements.namedItem("presentation-observations").value.trim(),
            registradoEn: new Date().toISOString(),
            registradoPor: JSON.parse(sessionStorage.getItem("demoSession") || "null")?.nombre || "Macro Demo"
          });
          global.DEMO_STORE.setFlash(`La presentación del entregable N.° ${deliverable.numero} se guardó correctamente.`);
          global.location.hash = "entregables";
        });
        wrapper.append(form);
      }
      container.replaceChildren(wrapper);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el entregable.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el entregable solicitado.</strong><a class="atet-back-link" href="#entregables">← Atrás</a></div>';
    }
  }

  global.DELIVERABLES_MODULE = Object.freeze({ render, renderPresentationPlaceholder });
})(window);
