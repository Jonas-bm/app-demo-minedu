(function configureReportPreview(global) {
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
          if (!response.ok) throw new Error("No se pudieron cargar los catálogos.");
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

  function formatDate(value) {
    if (!value) return "Pendiente de asignar";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "long", year: "numeric"
    }).format(date);
  }

  function getEvaluation(deliverable) {
    const stored = global.DEMO_STORE.getEvaluations().find((item) => item.entregableId === deliverable.id);
    if (stored) return stored;
    const observed = deliverable.evaluacion.estado === "observada";
    const responses = {};
    global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
      responses[item.id] = observed && item.id === "item-04" ? "no-cumple" : "cumple";
    });
    return {
      resultado: deliverable.evaluacion.estado,
      respuestas: responses,
      motivo: observed ? "La demostración presenta actividades que requieren mayor sustento y precisión." : "",
      evaluadoPor: deliverable.evaluacion.evaluador || "Macro Demo",
      evaluadoEn: deliverable.evaluacion.fecha
    };
  }

  function appendData(container, label, value, pending = false) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    if (pending) description.className = "report-preview__pending";
    item.append(term, description);
    container.append(item);
  }

  function createReportNumber(deliverable, reports) {
    const period = deliverable.periodoId.replace("-", "");
    const sequence = String(reports.length + 1).padStart(3, "0");
    return `INF-DEMO-${period}-${sequence}`;
  }

  function downloadReport(report) {
    const blob = new Blob([report.contenidoHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.referencia;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function render(container, deliverableId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Preparando vista previa del informe…</p>';
    try {
      const [dashboard, personal, catalogs] = await loadData();
      if (!isCurrent()) return;
      const deliverable = global.DELIVERABLE_CALCULATIONS
        .buildExpectedDeliverables(dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations())
        .find((item) => item.id === deliverableId);
      if (!deliverable || !["conforme", "observada"].includes(deliverable.evaluacion.estado)) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No se puede preparar el informe.</strong><span>La evaluación debe estar finalizada y publicada.</span><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
        return;
      }
      const evaluation = getEvaluation(deliverable);
      const atet = personal.atets.find((item) => item.codigo === deliverable.atet.codigo) || {};
      const region = catalogs.regiones.find((item) => item.id === atet.regionId)?.nombre || "Dato no disponible";
      const wrapper = document.createElement("div");
      const back = document.createElement("a");
      const warning = document.createElement("p");
      const paper = document.createElement("article");
      const institutional = document.createElement("p");
      const title = document.createElement("h3");
      const documentData = document.createElement("dl");
      const subject = document.createElement("p");
      const introTitle = document.createElement("h4");
      const intro = document.createElement("p");
      const evaluationTitle = document.createElement("h4");
      const evaluationData = document.createElement("dl");
      const criteriaTitle = document.createElement("h4");
      const criteria = document.createElement("ol");
      const conclusionTitle = document.createElement("h4");
      const conclusion = document.createElement("p");
      const signature = document.createElement("div");
      const actions = document.createElement("div");
      const generate = document.createElement("button");
      const generationStatus = document.createElement("p");
      wrapper.className = "report-preview";
      back.className = "atet-back-link";
      back.href = `#detalle-evaluacion-gestor/${encodeURIComponent(deliverable.id)}`;
      back.textContent = "← Atrás";
      back.setAttribute("aria-label", "Atrás, volver al detalle de evaluación");
      warning.className = "registration-form__note report-preview__warning";
      warning.textContent = global.DEMO_REPORT_CONFIG.warning;
      paper.className = "report-preview__paper";
      institutional.className = "report-preview__institution";
      institutional.textContent = "MINISTERIO DE EDUCACIÓN · DIRECCIÓN DE INNOVACIÓN TECNOLÓGICA EN EDUCACIÓN";
      title.textContent = global.DEMO_REPORT_CONFIG.titles[evaluation.resultado];
      documentData.className = "report-preview__document-data";
      appendData(documentData, "Número de informe", "Pendiente de asignar", true);
      appendData(documentData, "Fecha de emisión", "Pendiente de asignar", true);
      appendData(documentData, "Versión de plantilla", global.DEMO_REPORT_CONFIG.version);
      subject.className = "report-preview__subject";
      subject.textContent = `Asunto: Resultado del entregable N.° ${deliverable.numero} correspondiente a ${formatPeriod(deliverable.periodoId)}.`;
      introTitle.textContent = "1. Antecedentes";
      intro.textContent = global.DEMO_REPORT_CONFIG.introduction;
      evaluationTitle.textContent = "2. Datos de la evaluación";
      evaluationData.className = "report-preview__evaluation-data";
      appendData(evaluationData, "ATET", `${deliverable.atet.nombreCompleto} · ${deliverable.atet.codigo}`);
      appendData(evaluationData, "Orden de servicio", deliverable.contrato.ordenServicio);
      appendData(evaluationData, "Región", region);
      appendData(evaluationData, "Periodo", formatPeriod(deliverable.periodoId));
      appendData(evaluationData, "Macro evaluador", evaluation.evaluadoPor || "Macro Demo");
      appendData(evaluationData, "Fecha de evaluación", formatDate(evaluation.evaluadoEn));
      criteriaTitle.textContent = "3. Resumen de criterios";
      criteria.className = "report-preview__criteria";
      global.DEMO_EVALUATION_CONFIG.items.forEach((item) => {
        const row = document.createElement("li");
        const text = document.createElement("span");
        const answer = document.createElement("strong");
        text.textContent = item.criterion;
        answer.textContent = evaluation.respuestas?.[item.id] === "no-cumple" ? "No cumple" : "Cumple";
        answer.className = evaluation.respuestas?.[item.id] === "no-cumple" ? "is-observed" : "is-conforming";
        row.append(text, answer);
        criteria.append(row);
      });
      conclusionTitle.textContent = "4. Conclusión";
      conclusion.textContent = global.DEMO_REPORT_CONFIG.conclusion[evaluation.resultado];
      if (evaluation.resultado === "observada") conclusion.textContent += ` Motivo: ${evaluation.motivo}`;
      signature.className = "report-preview__signature";
      signature.innerHTML = '<span aria-hidden="true"></span><strong>Responsable de emisión y firma</strong><small>Pendiente de asignar</small>';
      actions.className = "report-preview__actions";
      generate.className = "registration-action registration-action--primary";
      generate.type = "button";
      generationStatus.className = "registration-form__status";
      generationStatus.setAttribute("role", "status");
      generationStatus.setAttribute("aria-live", "polite");
      const existingReport = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id);
      function applyGeneratedData(report) {
        const numberValue = documentData.children[0].querySelector("dd");
        const dateValue = documentData.children[1].querySelector("dd");
        numberValue.textContent = report.numero;
        dateValue.textContent = formatDate(report.fecha);
        numberValue.classList.remove("report-preview__pending");
        dateValue.classList.remove("report-preview__pending");
        signature.querySelector("strong").textContent = report.autor;
        signature.querySelector("small").textContent = "Gestor responsable · Demo";
        signature.querySelector("small").classList.remove("report-preview__pending");
      }
      if (existingReport) applyGeneratedData(existingReport);
      generate.textContent = existingReport ? "Descargar informe generado" : "Generar informe demo";
      paper.append(institutional, title, documentData, subject, introTitle, intro, evaluationTitle, evaluationData, criteriaTitle, criteria, conclusionTitle, conclusion, signature);
      actions.append(generate, generationStatus);
      wrapper.append(back, warning, paper, actions);
      container.replaceChildren(wrapper);

      generate.addEventListener("click", () => {
        const currentReport = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id);
        if (currentReport) {
          downloadReport(currentReport);
          generationStatus.textContent = `Se descargó ${currentReport.referencia}.`;
          return;
        }
        if (!global.confirm("¿Deseas generar este informe ficticio de demostración?")) return;
        generate.disabled = true;
        const reports = global.DEMO_STORE.getReports();
        const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
        const generatedAt = new Date().toISOString();
        const number = createReportNumber(deliverable, reports);
        const reference = `${number.toLowerCase()}.html`;
        const report = {
          id: `report-${deliverable.id}`,
          entregableId: deliverable.id,
          numero: number,
          tipo: evaluation.resultado,
          fecha: generatedAt.slice(0, 10),
          autor: session?.nombre || "Gestor Demo",
          estado: "generado",
          referencia: reference,
          generadoEn: generatedAt,
          contenidoHtml: ""
        };
        applyGeneratedData(report);
        report.contenidoHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${number}</title><style>body{margin:0;padding:32px;background:#eef1f5;color:#17191d;font-family:Arial,sans-serif}.report-preview__paper{max-width:900px;margin:auto;padding:48px;background:#fff}.report-preview__institution,.report-preview__paper>h3{text-align:center}.report-preview__document-data,.report-preview__evaluation-data{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#dfe3e8}.report-preview__document-data>div,.report-preview__evaluation-data>div{padding:12px;background:#fff}dt{font-size:12px;font-weight:700;color:#566173}dd{margin:5px 0 0;font-weight:700}.report-preview__criteria{padding-left:24px}.report-preview__criteria li{padding:8px;border-bottom:1px solid #dfe3e8}.report-preview__criteria strong{float:right}.report-preview__signature{margin:64px auto 0;text-align:center}.report-preview__signature span{display:block;border-top:1px solid #596273}@media(max-width:650px){body{padding:12px}.report-preview__paper{padding:20px}.report-preview__document-data,.report-preview__evaluation-data{grid-template-columns:1fr}}</style></head><body>${paper.outerHTML}</body></html>`;
        global.DEMO_STORE.saveReport(report);
        generate.disabled = false;
        generate.textContent = "Descargar informe generado";
        generationStatus.textContent = `Informe ${number} generado correctamente.`;
        downloadReport(report);
      });
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo generar la vista previa.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos preparar la vista previa.</strong><a class="atet-back-link" href="#entregables-pendientes">← Atrás</a></div>';
    }
  }

  global.REPORT_PREVIEW_MODULE = Object.freeze({ render });
})(window);
