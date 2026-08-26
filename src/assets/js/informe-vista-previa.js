(function configureReportPreview(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) dataPromise = Promise.all([
      fetch("../data/dashboard.json").then((response) => { if (!response.ok) throw new Error("No se pudieron cargar los entregables."); return response.json(); }),
      fetch("../data/personal.json").then((response) => { if (!response.ok) throw new Error("No se pudieron cargar los ATET."); return response.json(); }),
      fetch("../data/catalogos.json").then((response) => { if (!response.ok) throw new Error("No se pudieron cargar los catálogos."); return response.json(); })
    ]).catch((error) => { dataPromise = null; throw error; });
    return dataPromise;
  }

  function escape(value) {
    return String(value ?? "—").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  }

  function formatPeriod(periodId) {
    const [year, month] = periodId.split("-").map(Number);
    const value = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(value) {
    if (!value) return "Pendiente de asignar";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  function getEvaluation(deliverable) {
    const stored = global.DEMO_STORE.getEvaluations().find((item) => item.entregableId === deliverable.id);
    if (stored) return stored;
    const observed = deliverable.evaluacion.estado === "observada";
    const respuestas = {};
    const observaciones = {};
    const paginas = {};
    global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
      respuestas[item.id] = observed && item.id === "producto-04" ? "no-cumple" : "cumple";
      observaciones[item.id] = observed && item.id === "producto-04" ? "Los anexos presentados son ilegibles (dato demo)." : "Se presenta el producto solicitado y se verifica su contenido en la simulación.";
      paginas[item.id] = { inicio: 10 + ((item.number - 1) * 10), fin: 19 + ((item.number - 1) * 10) };
    });
    return { resultado: deliverable.evaluacion.estado, respuestas, observaciones, paginas, evaluadoPor: deliverable.evaluacion.evaluador || "Macro Demo", evaluadoEn: deliverable.evaluacion.fecha };
  }

  function createReportNumber(deliverable, reports) {
    return `INF-DEMO-${deliverable.periodoId.replace("-", "")}-${String(reports.length + 1).padStart(3, "0")}`;
  }

  function downloadReport(report) {
    const url = URL.createObjectURL(new Blob([report.contenidoHtml], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = report.referencia; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  function pageRange(evaluation, item) {
    const range = evaluation.paginas?.[item.id];
    if (!range?.inicio) return "—";
    return range.inicio === range.fin ? String(range.inicio) : `${range.inicio} - ${range.fin}`;
  }

  function conformityTables(evaluation, serviceName) {
    const activities = global.DEMO_EVALUATION_CONFIG.items.map((item) => `<tr><td>${escape(item.activity)}</td><td class="official-report__result">${evaluation.respuestas?.[item.id] === "no-cumple" ? "No cumple" : "Cumple"}</td></tr>`).join("");
    const products = global.DEMO_EVALUATION_CONFIG.items.map((item) => `<tr><td>${escape(item.product)}</td><td class="official-report__result">${evaluation.respuestas?.[item.id] === "no-cumple" ? "No cumple" : "Cumple"}</td><td>${escape(evaluation.observaciones?.[item.id] || "Se presenta el producto solicitado en esta simulación.")}</td><td class="official-report__pages">${escape(pageRange(evaluation, item))}</td></tr>`).join("");
    return `<p>De la evaluación realizada a las actividades ejecutadas, se evidencia que en el entregable se cumple con lo solicitado:</p>
      <div class="official-report__table-wrap"><table class="official-report__table"><thead><tr><th>SEGUNDO ENTREGABLE (Actividades)</th><th>Cumplimiento según TDR<br>(Cumple / No cumple)</th></tr></thead><tbody>${activities}</tbody></table></div>
      <p>De la evaluación del producto solicitado, se evidencia el siguiente resultado:</p>
      <p class="official-report__service"><strong>Denominación del servicio:</strong> ${escape(serviceName)}</p>
      <div class="official-report__table-wrap"><table class="official-report__table official-report__table--products"><thead><tr><th>SEGUNDO ENTREGABLE (Productos)</th><th>Cumplimiento según TDR</th><th>Análisis del producto entregado</th><th>N.° de páginas donde se identifica el producto</th></tr></thead><tbody>${products}</tbody></table></div>`;
  }

  function observedTable(evaluation, serviceName) {
    const rows = global.DEMO_EVALUATION_CONFIG.items.map((item) => {
      const doesNotComply = evaluation.respuestas?.[item.id] === "no-cumple";
      const detail = doesNotComply ? `No cumple: ${evaluation.observaciones?.[item.id] || "Observación registrada por el Macro."}` : "Cumple";
      return `<tr><td>${escape(item.product)}</td><td class="${doesNotComply ? "official-report__observation" : "official-report__result"}">${escape(detail)}</td></tr>`;
    }).join("");
    const count = global.DEMO_EVALUATION_CONFIG.items.filter((item) => evaluation.respuestas?.[item.id] === "no-cumple").length;
    return `<p>De la revisión del SEGUNDO ENTREGABLE remitido por el locador, se determina que presenta ${count} observación(es) relacionada(s) con las actividades descritas en los Términos de Referencia.</p>
      <p class="official-report__service"><strong>Denominación del servicio:</strong> ${escape(serviceName)}</p>
      <div class="official-report__table-wrap"><table class="official-report__table"><thead><tr><th>SEGUNDO ENTREGABLE (Productos)</th><th>Observaciones</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p>Por lo expuesto, se requiere la subsanación de las observaciones registradas en un plazo referencial de tres (03) días calendario. Este plazo forma parte exclusivamente de la simulación.</p>`;
  }

  function buildDocument({ deliverable, evaluation, atet, region, existingReport }) {
    const observed = evaluation.resultado === "observada";
    const number = existingReport?.numero || "INFORME N.° PENDIENTE-DEMO";
    const issueDate = existingReport?.fecha ? `Lima, ${formatDate(existingReport.fecha)}` : "Lima, fecha pendiente de asignar (demo)";
    const serviceName = atet.denominacionServicio || `SERVICIO DE ASISTENCIA TECNOLÓGICA PARA LA ACTUALIZACIÓN DE MATERIALES EDUCATIVOS DIGITALES EN LA REGIÓN ${region.toUpperCase()} — DEMO`;
    const presentationDate = formatDate(deliverable.presentacion?.fecha);
    const maximumDate = formatDate(deliverable.fechaMaxima);
    const subject = observed ? `OBSERVACIONES AL SEGUNDO ENTREGABLE DEL ${serviceName}` : `CONFORMIDAD DEL SEGUNDO ENTREGABLE DEL ${serviceName}`;
    const count = global.DEMO_EVALUATION_CONFIG.items.filter((item) => evaluation.respuestas?.[item.id] === "no-cumple").length;
    const analysisTables = observed ? observedTable(evaluation, serviceName) : conformityTables(evaluation, serviceName);
    const conclusion = observed
      ? `El segundo entregable presentado en esta demostración tiene ${count} observación(es). Por ello, se determina observar el entregable y solicitar su subsanación simulada.`
      : "El segundo entregable cumple con las actividades y productos requeridos en esta simulación, por lo que corresponde otorgar la conformidad demo del servicio.";
    const recommendation = observed ? "Se recomienda remitir el presente informe demo al área correspondiente para la atención simulada de las observaciones." : "Se recomienda remitir el presente informe demo al área correspondiente para continuar con el flujo administrativo simulado.";
    return `<div class="official-report">
      <header class="official-report__letterhead"><p>“Decenio de la Igualdad de oportunidades para mujeres y hombres”</p><p>“Año institucional — texto simulado”</p></header>
      <h3 data-report-number>${escape(number)}</h3>
      <dl class="official-report__header-data"><div><dt>A</dt><dd>${escape(global.DEMO_REPORT_CONFIG.recipient)}</dd></div><div><dt>De</dt><dd data-report-sender>${escape(global.DEMO_REPORT_CONFIG.sender)}</dd></div><div><dt>Asunto</dt><dd class="report-editable">${escape(subject)}</dd></div><div><dt>Referencia</dt><dd>Orden de Servicio N.° ${escape(deliverable.contrato.ordenServicio)} · SINAD ${escape(atet.sinad || "DEMO")}</dd></div><div><dt>Fecha</dt><dd data-report-date>${escape(issueDate)}</dd></div></dl>
      <p class="official-report__intro report-editable">Tengo el agrado de dirigirme a usted, en atención al asunto y documento de la referencia, para informar lo siguiente:</p>
      <section><h4>I. ANTECEDENTES</h4><p>La Dirección de Innovación Tecnológica en Educación desarrolla la estrategia de actualización de materiales educativos digitales en el marco del Plan de Cierre de Brecha Digital.</p><p>Para esta demostración se registra a ${escape(deliverable.atet.nombreCompleto)} como responsable del ${escape(serviceName)}, asociado a la Orden de Servicio N.° ${escape(deliverable.contrato.ordenServicio)}.</p></section>
      <section><h4>II. ANÁLISIS</h4><p>El SEGUNDO ENTREGABLE fue presentado el ${escape(presentationDate)}, siendo la fecha máxima de presentación el ${escape(maximumDate)}.</p><p>El producto es evaluado de acuerdo con las ocho actividades descritas en los Términos de Referencia y con la revisión registrada por ${escape(evaluation.evaluadoPor || "Macro Demo")}.</p>${analysisTables}</section>
      <section><h4>III. CONCLUSIONES</h4><p class="report-editable">${escape(conclusion)}</p></section>
      <section><h4>IV. RECOMENDACIÓN</h4><p class="report-editable">${escape(recommendation)}</p><p>Es todo cuanto debo informar.</p></section>
      <footer class="official-report__signature"><span aria-hidden="true"></span><strong data-report-signature>${escape(existingReport ? `${existingReport.autor} · firma simulada` : global.DEMO_REPORT_CONFIG.signatureName)}</strong><small>${escape(global.DEMO_REPORT_CONFIG.signatureRole)}</small></footer>
      <p class="official-report__demo-stamp">DOCUMENTO DE SIMULACIÓN · SIN VALIDEZ OFICIAL</p>
    </div>`;
  }

  function downloadableHtml(number, paper) {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(number)}</title><style>body{margin:0;padding:32px;background:#eef1f5;color:#111;font:14px Arial,sans-serif}.official-report{max-width:980px;margin:auto;padding:55px;background:#fff;line-height:1.6}.official-report__letterhead{text-align:center;font-size:12px}.official-report>h3{text-align:center;margin:30px 0}.official-report__header-data>div{display:grid;grid-template-columns:100px 1fr;padding:6px 0}.official-report__header-data dt{font-weight:bold}.official-report__header-data dd{margin:0}.official-report h4{margin-top:28px}.official-report__table-wrap{overflow:auto}.official-report__table{width:100%;border-collapse:collapse;font-size:12px}.official-report__table th,.official-report__table td{padding:8px;border:1px solid #555;vertical-align:top}.official-report__table th{text-align:center;background:#eee}.official-report__result,.official-report__pages{text-align:center}.official-report__signature{width:330px;margin:80px auto 0;text-align:center}.official-report__signature span{display:block;border-top:1px solid #333}.official-report__signature strong,.official-report__signature small{display:block}.official-report__demo-stamp{margin-top:35px;padding:8px;border:2px solid #a33;text-align:center;color:#a33;font-weight:bold}@media(max-width:650px){body{padding:8px}.official-report{padding:20px}.official-report__header-data>div{grid-template-columns:1fr}.official-report__signature{width:100%}}</style></head><body>${paper.innerHTML}</body></html>`;
  }

  async function render(container, deliverableId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Preparando vista previa del informe…</p>';
    try {
      const [dashboard, personal, catalogs] = await loadData();
      if (!isCurrent()) return;
      const deliverable = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()).find((item) => item.id === deliverableId);
      if (!deliverable || !["conforme", "observada"].includes(deliverable.evaluacion.estado)) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No se puede preparar el informe.</strong><span>La evaluación debe estar finalizada y publicada.</span><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
        return;
      }
      const evaluation = getEvaluation(deliverable);
      const atet = personal.atets.find((item) => item.codigo === deliverable.atet.codigo) || {};
      const region = catalogs.regiones.find((item) => item.id === atet.regionId)?.nombre || "Dato no disponible";
      const storedReport = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id);
      const existingReport = storedReport?.templateVersion === global.DEMO_REPORT_CONFIG.version ? storedReport : null;
      const wrapper = document.createElement("div");
      const back = document.createElement("a");
      const warning = document.createElement("p");
      const paper = document.createElement("article");
      const actions = document.createElement("div");
      const edit = document.createElement("button");
      const generate = document.createElement("button");
      const status = document.createElement("p");
      wrapper.className = "report-preview";
      back.className = "atet-back-link"; back.href = `#detalle-evaluacion-gestor/${encodeURIComponent(deliverable.id)}`; back.textContent = "← Atrás";
      warning.className = "registration-form__note report-preview__warning"; warning.textContent = global.DEMO_REPORT_CONFIG.warning;
      paper.className = "report-preview__paper"; paper.innerHTML = buildDocument({ deliverable, evaluation, atet, region, existingReport });
      actions.className = "report-preview__actions";
      edit.className = "registration-action registration-action--secondary"; edit.type = "button"; edit.textContent = "Editar información del informe";
      generate.className = "registration-action registration-action--primary"; generate.type = "button"; generate.textContent = existingReport ? "Descargar informe generado" : "Generar informe demo";
      status.className = "registration-form__status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
      actions.append(edit, generate, status); wrapper.append(back, warning, paper, actions); container.replaceChildren(wrapper);

      edit.addEventListener("click", () => {
        const editing = edit.getAttribute("aria-pressed") !== "true";
        paper.querySelectorAll(".report-editable").forEach((element) => { element.contentEditable = String(editing); element.classList.toggle("is-editable", editing); });
        edit.setAttribute("aria-pressed", String(editing)); edit.textContent = editing ? "Guardar edición demo" : "Editar información del informe";
        status.textContent = editing ? "Puedes ajustar los textos del informe; la evaluación y las tablas permanecen bloqueadas." : "Edición aplicada a la vista previa.";
        if (editing) paper.querySelector(".report-editable")?.focus();
      });

      generate.addEventListener("click", () => {
        const current = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id && item.templateVersion === global.DEMO_REPORT_CONFIG.version);
        if (current) { downloadReport(current); status.textContent = `Se descargó ${current.referencia}.`; return; }
        if (!global.confirm("¿Deseas generar este informe ficticio de demostración?")) return;
        generate.disabled = true;
        paper.querySelectorAll(".report-editable").forEach((element) => { element.contentEditable = "false"; element.classList.remove("is-editable"); });
        const reports = global.DEMO_STORE.getReports();
        const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
        const generatedAt = new Date().toISOString();
        const number = createReportNumber(deliverable, reports);
        paper.querySelector("[data-report-number]").textContent = number;
        paper.querySelector("[data-report-date]").textContent = `Lima, ${formatDate(generatedAt)}`;
        paper.querySelector("[data-report-signature]").textContent = `${session?.nombre || "Gestor Demo"} · firma simulada`;
        const report = { id: `report-${deliverable.id}`, entregableId: deliverable.id, numero: number, tipo: evaluation.resultado, templateVersion: global.DEMO_REPORT_CONFIG.version, fecha: generatedAt.slice(0, 10), autor: session?.nombre || "Gestor Demo", estado: "generado", referencia: `${number.toLowerCase()}.html`, generadoEn: generatedAt, contenidoHtml: downloadableHtml(number, paper) };
        global.DEMO_STORE.saveReport(report);
        generate.disabled = false; generate.textContent = "Descargar informe generado"; status.textContent = `Informe ${number} generado correctamente.`; downloadReport(report);
      });
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo generar la vista previa.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos preparar la vista previa.</strong><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
    }
  }

  global.REPORT_PREVIEW_MODULE = Object.freeze({ render });
})(window);
