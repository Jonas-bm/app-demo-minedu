(function configureEvaluationModule(global) {
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
    const label = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDateTime(value) {
    if (!value) return "No registrada";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: value.length === 10 ? undefined : "2-digit",
      minute: value.length === 10 ? undefined : "2-digit"
    }).format(date);
  }

  function getDisplayEvaluation(deliverable) {
    const stored = global.DEMO_STORE.getEvaluations().find((item) => item.entregableId === deliverable.id);
    if (stored) return { ...stored, demoReconstructed: false };
    const observed = deliverable.evaluacion.estado === "observada";
    const responses = {};
    const observations = {};
    global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
      responses[item.id] = observed && item.id === "producto-04" ? "no-cumple" : "cumple";
      observations[item.id] = observed && item.id === "producto-04" ? "Los anexos presentados son ilegibles (dato demo)." : "Se verificó el producto en la simulación.";
    });
    return {
      entregableId: deliverable.id,
      resultado: deliverable.evaluacion.estado,
      respuestas: responses,
      observaciones: observations,
      paginas: Object.fromEntries(global.DEMO_EVALUATION_CONFIG.items.map((item, index) => [item.id, { inicio: 10 + (index * 10), fin: 19 + (index * 10) }])),
      motivo: observed
        ? (global.DEMO_REPORT_CONFIG?.resultadoInforme?.observada || "Observado presenta actividades que requieren mayor sustento y precisión")
        : (global.DEMO_REPORT_CONFIG?.resultadoInforme?.conforme || "Conforme cumple con las 8 actividades"),
      evaluadoPor: deliverable.evaluacion.evaluador || "Macro Demo",
      evaluadoEn: deliverable.evaluacion.fecha,
      demoReconstructed: true
    };
  }

  function appendMetadata(container, label, value) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value || "—";
    item.append(term, description);
    container.append(item);
  }

  function renderEvaluationDetail(container, deliverable, backHash = "#entregables", backDestination = "Entregables") {
    const evaluation = getDisplayEvaluation(deliverable);
    const audit = global.DEMO_STORE.getAudit().filter((item) => item.entidad === "evaluacion-entregable" && item.entidadId === deliverable.id);
    const versions = audit.length ? audit : [{
      accion: "creacion",
      usuario: evaluation.evaluadoPor,
      fecha: evaluation.evaluadoEn,
      detalle: `Evaluación demo registrada con resultado ${evaluation.resultado}.`
    }];
    const wrapper = document.createElement("article");
    const back = document.createElement("a");
    const heading = document.createElement("header");
    const headingText = document.createElement("div");
    const title = document.createElement("h3");
    const subtitle = document.createElement("p");
    const result = document.createElement("span");
    const metadata = document.createElement("dl");
    const readOnlyNotice = document.createElement("p");
    const detailActions = document.createElement("div");
    const previewLink = document.createElement("a");
    const warning = document.createElement("p");
    const criteriaSection = document.createElement("section");
    const criteriaTitle = document.createElement("h4");
    const criteriaGrid = document.createElement("ol");
    const motiveSection = document.createElement("section");
    const motiveTitle = document.createElement("h4");
    const motiveText = document.createElement("p");
    const historySection = document.createElement("section");
    const historyTitle = document.createElement("h4");
    const historyList = document.createElement("ol");

    wrapper.className = "evaluation-detail";
    back.className = "atet-back-link";
    back.href = backHash;
    back.textContent = "← Atrás";
    back.setAttribute("aria-label", `Atrás, volver a ${backDestination}`);
    heading.className = "evaluation-detail__heading";
    title.textContent = "Detalle de evaluación";
    subtitle.textContent = `${deliverable.atet.nombreCompleto} · Entregable N.° ${deliverable.numero}`;
    result.className = `evaluation-status evaluation-status--${evaluation.resultado}`;
    result.textContent = evaluation.resultado === "conforme" ? "Conforme" : "Observado";
    headingText.append(title, subtitle);
    heading.append(headingText, result);
    readOnlyNotice.className = "evaluation-detail__readonly";
    readOnlyNotice.textContent = "Vista de solo lectura. La evaluación publicada por el Macro no puede modificarse desde el rol Gestor.";
    detailActions.className = "evaluation-detail__actions";
    previewLink.className = "registration-action registration-action--primary";
    previewLink.href = `#vista-previa-informe/${encodeURIComponent(deliverable.id)}`;
    previewLink.textContent = "Vista previa del informe";
    detailActions.append(previewLink);
    metadata.className = "evaluation-detail__metadata";
    appendMetadata(metadata, "Código ATET", deliverable.atet.codigo);
    appendMetadata(metadata, "Orden de servicio", deliverable.contrato.ordenServicio);
    appendMetadata(metadata, "Periodo", formatPeriod(deliverable.periodoId));
    appendMetadata(metadata, "Evaluador", evaluation.evaluadoPor);
    appendMetadata(metadata, "Fecha de evaluación", formatDateTime(evaluation.evaluadoEn));
    appendMetadata(metadata, "Versión de criterios", global.DEMO_EVALUATION_CONFIG.version);
    warning.className = "registration-form__note evaluation-detail__warning";
    warning.textContent = evaluation.demoReconstructed
      ? "Detalle ficticio reconstruido para visualizar el resultado base de la demostración."
      : global.DEMO_EVALUATION_CONFIG.warning;
    criteriaSection.className = "evaluation-detail__section";
    criteriaTitle.textContent = "Respuestas de la evaluación";
    criteriaGrid.className = "evaluation-detail__criteria";
    global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
      const row = document.createElement("li");
      const criterion = document.createElement("p");
      const answer = document.createElement("strong");
      const observation = document.createElement("p");
      const pages = document.createElement("p");
      const response = evaluation.respuestas?.[item.id];
      row.className = "evaluation-detail__criterion";
      criterion.textContent = `${item.number}. ${item.criterion}`;
      answer.className = `evaluation-answer evaluation-answer--${response || "pendiente"}`;
      answer.textContent = response === "cumple" ? "Cumple" : response === "no-cumple" ? "No cumple" : "Sin respuesta";
      observation.textContent = evaluation.observaciones?.[item.id] || "Sin observación.";
      const pageRange = evaluation.paginas?.[item.id];
      pages.textContent = pageRange ? `Páginas: ${pageRange.inicio}${pageRange.fin !== pageRange.inicio ? `–${pageRange.fin}` : ""}` : "Páginas no registradas";
      pages.className = "evaluation-detail__pages";
      row.append(criterion, answer, observation, pages);
      criteriaGrid.append(row);
    });
    criteriaSection.append(criteriaTitle, criteriaGrid);
    motiveSection.className = "evaluation-detail__section evaluation-detail__motive";
    motiveTitle.textContent = "Resultado de Informe";
    const reportOutcome = global.DEMO_REPORT_CONFIG?.resultadoInforme || {};
    motiveText.textContent = evaluation.resultado === "conforme"
      ? (reportOutcome.conforme || "Conforme cumple con las 8 actividades")
      : (reportOutcome.observada || "Observado presenta actividades que requieren mayor sustento y precisión");
    motiveSection.append(motiveTitle, motiveText);
    historySection.className = "evaluation-detail__section";
    historyTitle.textContent = "Historial y versiones";
    historyList.className = "evaluation-detail__history";
    versions.forEach((version, index) => {
      const item = document.createElement("li");
      const versionName = document.createElement("strong");
      const detail = document.createElement("span");
      const author = document.createElement("span");
      versionName.textContent = `Versión ${index + 1} · ${version.accion === "actualizacion" ? "Actualización" : "Registro inicial"}`;
      detail.textContent = version.detalle;
      author.textContent = `${version.usuario || "Macro Demo"} · ${formatDateTime(version.fecha)}`;
      item.append(versionName, detail, author);
      historyList.append(item);
    });
    historySection.append(historyTitle, historyList);
    wrapper.append(back, heading);
    if (backHash === "#entregables-pendientes") wrapper.append(readOnlyNotice, detailActions);
    wrapper.append(metadata, warning, criteriaSection, motiveSection, historySection);
    container.replaceChildren(wrapper);
  }

  function createEvaluationItem(item, draft) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    const options = document.createElement("div");
    const observationLabel = document.createElement("label");
    const observation = document.createElement("textarea");
    const pageFields = document.createElement("div");
    const startLabel = document.createElement("label");
    const start = document.createElement("input");
    const endLabel = document.createElement("label");
    const end = document.createElement("input");
    const error = document.createElement("p");
    fieldset.className = "evaluation-item";
    fieldset.dataset.itemId = item.id;
    legend.textContent = `${item.number}. ${item.product}`;
    options.className = "evaluation-item__options";
    global.DEMO_EVALUATION_CONFIG.responseOptions.forEach((option) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const text = document.createElement("span");
      input.type = "radio";
      input.name = item.id;
      input.value = option.id;
      input.checked = draft?.respuestas?.[item.id] === option.id;
      text.textContent = option.label;
      label.append(input, text);
      options.append(label);
    });
    observationLabel.htmlFor = `${item.id}-observation`;
    observationLabel.textContent = "Análisis / motivo (obligatorio si no cumple)";
    observation.id = `${item.id}-observation`;
    observation.name = `${item.id}-observation`;
    observation.value = draft?.observaciones?.[item.id] || "";
    observation.rows = 2;
    pageFields.className = "evaluation-item__pages";
    startLabel.textContent = "Página inicial";
    start.type = "number";
    start.min = "1";
    start.step = "1";
    start.name = `${item.id}-page-start`;
    start.value = draft?.paginas?.[item.id]?.inicio || "";
    endLabel.textContent = "Página final";
    end.type = "number";
    end.min = "1";
    end.step = "1";
    end.name = `${item.id}-page-end`;
    end.value = draft?.paginas?.[item.id]?.fin || "";
    startLabel.append(start);
    endLabel.append(end);
    pageFields.append(startLabel, endLabel);
    error.className = "evaluation-item__error";
    error.id = `${item.id}-error`;
    error.setAttribute("role", "alert");
    fieldset.append(legend, options, observationLabel, observation, pageFields, error);
    return fieldset;
  }

  async function render(container, deliverableId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando evaluación…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverable = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .find((item) => item.id === deliverableId);
      if (!deliverable || !deliverable.presentacion.fecha) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>El entregable no está disponible para evaluación.</strong><span>Primero debe registrarse su presentación.</span><a class="atet-back-link" href="#entregables">← Atrás</a></div>';
        return;
      }
      if (deliverable.evaluacion.estado !== "pendiente") {
        renderEvaluationDetail(container, deliverable);
        return;
      }

      const draft = global.DEMO_STORE.getEvaluationDrafts().find((item) => item.entregableId === deliverable.id);
      const wrapper = document.createElement("div");
      const back = document.createElement("a");
      const summary = document.createElement("div");
      const title = document.createElement("h3");
      const metadata = document.createElement("p");
      const warning = document.createElement("p");
      const form = document.createElement("form");
      const grid = document.createElement("div");
      const outcome = document.createElement("section");
      const outcomeLabel = document.createElement("span");
      const outcomeValue = document.createElement("strong");
      const motiveField = document.createElement("div");
      const motiveLabel = document.createElement("label");
      const motive = document.createElement("textarea");
      const motiveError = document.createElement("p");
      const actions = document.createElement("div");
      const cancel = document.createElement("a");
      const saveDraft = document.createElement("button");
      const finalize = document.createElement("button");
      const status = document.createElement("p");
      let submitting = false;
      wrapper.className = "evaluation-view";
      back.className = "atet-back-link";
      back.href = "#entregables";
      back.textContent = "← Atrás";
      back.setAttribute("aria-label", "Atrás, volver a Entregables");
      summary.className = "evaluation-summary";
      title.textContent = `${deliverable.atet.nombreCompleto} · Entregable N.° ${deliverable.numero}`;
      metadata.textContent = `${deliverable.atet.codigo} · ${deliverable.contrato.ordenServicio} · ${formatPeriod(deliverable.periodoId)}`;
      warning.className = "registration-form__note evaluation-warning";
      warning.textContent = global.DEMO_EVALUATION_CONFIG.warning;
      summary.append(title, metadata);
      form.className = "evaluation-form";
      form.noValidate = true;
      grid.className = "evaluation-grid";
      global.DEMO_EVALUATION_CONFIG.items.forEach((item) => grid.append(createEvaluationItem(item, draft)));
      outcome.className = "evaluation-outcome";
      outcome.setAttribute("aria-live", "polite");
      outcomeLabel.textContent = "Resultado calculado";
      outcomeValue.textContent = "Pendiente";
      motiveField.className = "evaluation-motive";
      motiveField.hidden = true;
      motiveLabel.htmlFor = "evaluation-motive";
      motiveLabel.textContent = "Resumen automático de observaciones";
      motive.id = "evaluation-motive";
      motive.name = "evaluation-motive";
      motive.rows = 3;
      motive.value = draft?.motivo || "";
      motive.readOnly = true;
      motive.setAttribute("aria-describedby", "evaluation-motive-error");
      motiveError.id = "evaluation-motive-error";
      motiveError.className = "evaluation-item__error";
      motiveError.setAttribute("role", "alert");
      motiveField.append(motiveLabel, motive, motiveError);
      outcome.append(outcomeLabel, outcomeValue, motiveField);
      actions.className = "registration-form__actions";
      cancel.className = "registration-action registration-action--secondary";
      cancel.href = "#entregables";
      cancel.textContent = "Cancelar";
      saveDraft.className = "registration-action registration-action--secondary";
      saveDraft.type = "button";
      saveDraft.textContent = draft ? "Actualizar borrador" : "Guardar borrador";
      finalize.className = "registration-action registration-action--primary";
      finalize.type = "submit";
      finalize.textContent = "Finalizar evaluación";
      status.className = "registration-form__status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      actions.append(cancel, saveDraft, finalize);
      form.append(grid, outcome, actions, status);

      function collectEvaluation(showErrors = true) {
        const responses = {};
        const observations = {};
        const pages = {};
        let firstMissing = null;
        global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
          const selected = form.querySelector(`input[name="${item.id}"]:checked`);
          const fieldset = form.querySelector(`[data-item-id="${item.id}"]`);
          const error = fieldset.querySelector(".evaluation-item__error");
          const observation = form.elements.namedItem(`${item.id}-observation`).value.trim();
          const start = Number(form.elements.namedItem(`${item.id}-page-start`).value);
          const end = Number(form.elements.namedItem(`${item.id}-page-end`).value);
          const message = global.DEMO_EVALUATION_CONFIG.validateEntry(selected?.value, observation, start, end);
          if (showErrors) { fieldset.classList.toggle("is-invalid", Boolean(message)); error.textContent = message; }
          if (message && !firstMissing) firstMissing = !selected ? fieldset.querySelector("input") : selected.value === "no-cumple" && !observation ? fieldset.querySelector("textarea") : fieldset.querySelector('input[type="number"]');
          if (selected) responses[item.id] = selected.value;
          observations[item.id] = observation;
          pages[item.id] = { inicio: start || null, fin: end || null };
        });
        return { responses, observations, pages, firstMissing, calculation: global.DEMO_EVALUATION_CONFIG.calculateResult(responses) };
      }

      function updateOutcome() {
        const collected = collectEvaluation(false);
        const { calculation } = collected;
        const labels = { pendiente: "Pendiente", conforme: "Conforme", observada: "Observado" };
        outcomeValue.textContent = labels[calculation.result];
        outcomeValue.className = `evaluation-outcome__value evaluation-outcome__value--${calculation.result}`;
        motiveField.hidden = calculation.result !== "observada";
        motive.value = calculation.result === "observada"
          ? global.DEMO_EVALUATION_CONFIG.items.filter((item) => collected.responses[item.id] === "no-cumple").map((item) => `Producto ${item.number}: ${collected.observations[item.id] || "Motivo pendiente"}`).join(" ")
          : "";
        if (motiveField.hidden) {
          motiveError.textContent = "";
          motive.setAttribute("aria-invalid", "false");
        }
      }

      form.addEventListener("change", (event) => {
        if (event.target.type === "radio") {
          const item = event.target.closest(".evaluation-item");
          item.classList.remove("is-invalid");
          item.querySelector(".evaluation-item__error").textContent = "";
          updateOutcome();
        }
      });
      form.addEventListener("input", (event) => {
        const item = event.target.closest(".evaluation-item");
        if (item) {
          item.classList.remove("is-invalid");
          item.querySelector(".evaluation-item__error").textContent = "";
          updateOutcome();
        }
      });
      motive.addEventListener("input", () => {
        motiveError.textContent = "";
        motive.setAttribute("aria-invalid", "false");
      });
      saveDraft.addEventListener("click", () => {
        if (submitting) return;
        const collected = collectEvaluation(false);
        if (!global.confirm("¿Deseas guardar este borrador de evaluación?")) return;
        const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
        global.DEMO_STORE.saveEvaluationDraft({
          entregableId: deliverable.id,
          estado: "borrador",
          respuestas: collected.responses,
          observaciones: collected.observations,
          paginas: collected.pages,
          catalogoVersion: global.DEMO_EVALUATION_CONFIG.version,
          motivo: collected.calculation.result === "observada"
            ? global.DEMO_EVALUATION_CONFIG.items.filter((item) => collected.responses[item.id] === "no-cumple").map((item) => `Producto ${item.number}: ${collected.observations[item.id]}`).join(" ")
            : "",
          guardadoPor: session?.nombre || "Macro Demo",
          guardadoEn: new Date().toISOString()
        });
        status.textContent = "El borrador se guardó correctamente.";
        saveDraft.textContent = "Actualizar borrador";
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (submitting) return;
        const collected = collectEvaluation(true);
        if (collected.firstMissing) {
          status.textContent = "Completa las ocho evaluaciones, sus motivos requeridos y las páginas.";
          collected.firstMissing.focus();
          return;
        }
        const generatedMotive = global.DEMO_EVALUATION_CONFIG.items
          .filter((item) => collected.responses[item.id] === "no-cumple")
          .map((item) => `Producto ${item.number}: ${collected.observations[item.id]}`)
          .join(" ");
        motive.value = generatedMotive;
        const motiveMissing = collected.calculation.result === "observada" && !generatedMotive;
        motiveError.textContent = motiveMissing ? "El motivo es obligatorio cuando el resultado es Observado." : "";
        motive.setAttribute("aria-invalid", String(motiveMissing));
        if (motiveMissing) {
          status.textContent = "Registra el motivo de observación antes de finalizar.";
          motive.focus();
          return;
        }
        const resultLabel = collected.calculation.result === "conforme" ? "Conforme" : "Observado";
        if (!global.confirm(`El resultado será ${resultLabel}. ¿Deseas finalizar la evaluación?`)) return;
        submitting = true;
        saveDraft.disabled = true;
        finalize.disabled = true;
        const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
        global.DEMO_STORE.saveEvaluation({
          entregableId: deliverable.id,
          resultado: collected.calculation.result,
          respuestas: collected.responses,
          observaciones: collected.observations,
          paginas: collected.pages,
          motivo: collected.calculation.result === "observada" ? generatedMotive : "",
          catalogoVersion: global.DEMO_EVALUATION_CONFIG.version,
          evaluadoPor: session?.nombre || "Macro Demo",
          evaluadoEn: new Date().toISOString()
        });
        global.DEMO_STORE.setFlash(`La evaluación del entregable N.° ${deliverable.numero} se guardó como ${resultLabel}.`);
        global.location.hash = "entregables";
      });
      updateOutcome();
      wrapper.append(back, summary, warning, form);
      container.replaceChildren(wrapper);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar la evaluación.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar la evaluación.</strong><a class="atet-back-link" href="#entregables">← Atrás</a></div>';
    }
  }

  async function renderReadOnly(container, deliverableId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando detalle de evaluación…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverable = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .find((item) => item.id === deliverableId);
      if (!deliverable || !["conforme", "observada"].includes(deliverable.evaluacion.estado)) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>La evaluación publicada no está disponible.</strong><span>Solo pueden consultarse evaluaciones finalizadas.</span><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
        return;
      }
      renderEvaluationDetail(container, deliverable, "#entregables-pendientes", "Entregables pendientes");
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el detalle para el Gestor.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el detalle de evaluación.</strong><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
    }
  }

  global.EVALUATION_MODULE = Object.freeze({ render, renderReadOnly });
})(window);
