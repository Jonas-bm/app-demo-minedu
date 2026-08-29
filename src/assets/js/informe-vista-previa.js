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

  // Confirmación propia del sistema (reemplaza window.confirm) con el estilo de
  // los modales del panel.
  function confirmDialog({ title, message, confirmLabel = "Aceptar", cancelLabel = "Cancelar" }) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "admin-user-modal report-confirm-modal";
      dialog.innerHTML = `<article>
        <header class="admin-user-modal__header"><div><h3>${escape(title)}</h3></div><button class="admin-user-modal__close" type="button" aria-label="Cerrar">×</button></header>
        <div class="admin-user-modal__body"><p>${escape(message)}</p></div>
        <footer class="admin-user-modal__footer"><button class="registration-action registration-action--secondary" data-confirm-cancel type="button">${escape(cancelLabel)}</button><button class="registration-action registration-action--primary" data-confirm-ok type="button">${escape(confirmLabel)}</button></footer>
      </article>`;
      const settle = (value) => { dialog.close(); dialog.remove(); resolve(value); };
      dialog.querySelector(".admin-user-modal__close").addEventListener("click", () => settle(false));
      dialog.querySelector("[data-confirm-cancel]").addEventListener("click", () => settle(false));
      dialog.querySelector("[data-confirm-ok]").addEventListener("click", () => settle(true));
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); settle(false); });
      document.body.append(dialog);
      dialog.showModal();
      dialog.querySelector("[data-confirm-ok]").focus();
    });
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

  // Ordinales del entregable. El número proviene del dato del sistema
  // (deliverable.numero): un mes = un entregable, por lo que el segundo mes de
  // continuidad es el SEGUNDO ENTREGABLE, el tercero el TERCER ENTREGABLE, etc.
  const DELIVERABLE_ORDINALS = ["", "PRIMER", "SEGUNDO", "TERCER", "CUARTO", "QUINTO", "SEXTO", "SÉPTIMO", "OCTAVO", "NOVENO", "DÉCIMO", "UNDÉCIMO", "DUODÉCIMO"];

  function deliverableLabel(number, casing = "upper") {
    const word = DELIVERABLE_ORDINALS[number] || `${number}.°`;
    const text = `${word} ENTREGABLE`;
    if (casing === "lower") return text.toLowerCase();
    if (casing === "title") return text.charAt(0) + text.slice(1).toLowerCase();
    return text;
  }

  // Número institucional simulado del informe. Los modelos de la carpeta docs
  // (INFORME DE CONFORMIDAD-01666-… y de OBSERVACION-03166-…) usan 5 dígitos con
  // ceros a la izquierda, así que se genera un correlativo de cinco dígitos
  // estable por entregable con el mismo formato "NNNNN-AAAA-MINEDU/VMGP-DITE".
  function hashSeed(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
    }
    hash ^= hash >>> 15; hash = Math.imul(hash, 0x2c1b3c6d) >>> 0;
    hash ^= hash >>> 12; hash = Math.imul(hash, 0x297a2d39) >>> 0;
    hash ^= hash >>> 15;
    return hash >>> 0;
  }

  function simulatedReportNumber(deliverable) {
    const year = Number(String(deliverable.periodoId).split("-")[0]) || new Date().getFullYear();
    const digits = String((hashSeed(deliverable.id) % 99999) + 1).padStart(5, "0");
    return `${digits}-${year}-MINEDU/VMGP-DITE`;
  }

  function createReportNumber(deliverable) {
    return `INFORME N.° ${simulatedReportNumber(deliverable)}`;
  }

  function reportFileName(deliverable) {
    return `${createReportNumber(deliverable).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}.html`;
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

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
  }

  function paragraphs(list, values) {
    return list.map((text) => `<p class="report-editable">${escape(fill(text, values))}</p>`).join("");
  }

  const SPANISH_UNITS = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho"];

  function observationCountText(count) {
    const word = SPANISH_UNITS[count] || String(count);
    return `${word} (${String(count).padStart(2, "0")}) ${count === 1 ? "observación" : "observaciones"}`;
  }

  function serviceCell(rowSpan, serviceName) {
    // La denominación del servicio se muestra como primera columna combinada,
    // según los modelos de informe (tabla de 3 y de 5 columnas).
    return `<td rowspan="${rowSpan}" class="official-report__service-cell">${escape(serviceName)}</td>`;
  }

  function conformityAnalysis(evaluation, values) {
    const items = global.DEMO_EVALUATION_CONFIG.items;
    const analysis = global.DEMO_REPORT_CONFIG.analisis.conforme;
    const entregable = escape(values.entregable);
    const activities = items.map((item, index) => `<tr>${index === 0 ? serviceCell(items.length, values.servicio) : ""}<td>${escape(item.activity)}</td><td class="official-report__result">${evaluation.respuestas?.[item.id] === "no-cumple" ? "No cumple" : "Cumple"}</td></tr>`).join("");
    const products = items.map((item, index) => `<tr>${index === 0 ? serviceCell(items.length, values.servicio) : ""}<td>${escape(item.product)}</td><td class="official-report__result">${evaluation.respuestas?.[item.id] === "no-cumple" ? "No cumple" : "Cumple"}</td><td>${escape(evaluation.observaciones?.[item.id] || "Se presenta el producto solicitado en esta simulación.")}</td><td class="official-report__pages">${escape(pageRange(evaluation, item))}</td></tr>`).join("");
    return `<p class="report-editable">${escape(fill(analysis.plazo, values))}</p>
      <p class="report-editable">${escape(fill(analysis.evaluacion, values))}</p>
      <p>${escape(fill(analysis.introActividades, values))}</p>
      <div class="official-report__table-wrap"><table class="official-report__table official-report__table--activities"><thead><tr><th>Denominación del Servicio</th><th>${entregable} (Actividades)</th><th>Cumplimiento según TDR<br>(Cumple / No cumple)</th></tr></thead><tbody>${activities}</tbody></table></div>
      <p>${escape(fill(analysis.introProductos, values))}</p>
      <div class="official-report__table-wrap"><table class="official-report__table official-report__table--products"><thead><tr><th>Denominación del Servicio</th><th>${entregable} (Productos)</th><th>Cumplimiento según TDR<br>(Cumple / No cumple)</th><th>Análisis del producto entregado</th><th>N.° de páginas donde se identifica el producto</th></tr></thead><tbody>${products}</tbody></table></div>`;
  }

  function observedAnalysis(evaluation, values) {
    const items = global.DEMO_EVALUATION_CONFIG.items;
    const analysis = global.DEMO_REPORT_CONFIG.analisis.observada;
    const rows = items.map((item, index) => {
      const doesNotComply = evaluation.respuestas?.[item.id] === "no-cumple";
      const detail = doesNotComply ? `No Cumple: ${evaluation.observaciones?.[item.id] || "Observación registrada por el Macro."}` : "Cumple";
      return `<tr>${index === 0 ? serviceCell(items.length, values.servicio) : ""}<td>${escape(item.product)}</td><td class="${doesNotComply ? "official-report__observation" : "official-report__result"}">${escape(detail)}</td></tr>`;
    }).join("");
    return `<p class="report-editable">${escape(fill(analysis.intro, values))}</p>
      <p class="report-editable">${escape(fill(analysis.detalle, values))}</p>
      <div class="official-report__table-wrap"><table class="official-report__table official-report__table--observed"><thead><tr><th>Denominación del Servicio</th><th>${escape(values.entregable)} (Productos)</th><th>Observaciones</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="report-editable">${escape(fill(analysis.cierre, values))}</p>`;
  }

  function orderedList(html) {
    return `<ol class="official-report__antecedents">${html}</ol>`;
  }

  function buildDocument({ deliverable, evaluation, atet, serviceName, existingReport }) {
    const observed = evaluation.resultado === "observada";
    const config = global.DEMO_REPORT_CONFIG;
    const number = existingReport?.numero || createReportNumber(deliverable);
    const issueDate = existingReport?.fecha ? `Lima, ${formatDate(existingReport.fecha)}` : "Lima, fecha pendiente de asignar (demo)";
    const locador = deliverable.atet.nombreCompleto;
    const presentationDate = formatDate(deliverable.presentacion?.fecha);
    const maximumDate = formatDate(deliverable.fechaMaxima);
    const orderDate = formatDate(deliverable.contrato.fechaInicio);
    const onTime = !deliverable.presentacion?.fecha || deliverable.presentacion.fecha <= deliverable.fechaMaxima;
    const count = global.DEMO_EVALUATION_CONFIG.items.filter((item) => evaluation.respuestas?.[item.id] === "no-cumple").length;
    const entregableLabel = deliverableLabel(deliverable.numero);
    const subject = observed ? `OBSERVACIONES AL ${entregableLabel} DEL ${serviceName}` : `CONFORMIDAD DEL ${entregableLabel} DEL ${serviceName}`;

    const values = {
      locador, servicio: serviceName,
      entregable: entregableLabel,
      entregableTitulo: deliverableLabel(deliverable.numero, "title"),
      ordenServicio: deliverable.contrato.ordenServicio,
      fechaOrden: orderDate,
      fechaPresentacion: presentationDate,
      fechaMaxima: maximumDate,
      resultadoPlazo: onTime ? "fue presentado dentro del plazo establecido" : "fue presentado fuera del plazo establecido",
      conteoTexto: observationCountText(count),
      relacionadas: count === 1 ? "relacionada" : "relacionadas",
      plazoDias: config.subsanacionDias
    };

    const antecedents = config.antecedentes.institucionales
      .concat(observed ? config.antecedentes.observada : config.antecedentes.conforme)
      .map((text) => `<li class="report-editable">${escape(fill(text, values))}</li>`)
      .join("");
    const analysis = observed ? observedAnalysis(evaluation, values) : conformityAnalysis(evaluation, values);
    const conclusions = paragraphs(observed ? config.conclusiones.observada : config.conclusiones.conforme, values);
    const recommendation = escape(fill(observed ? config.recomendaciones.observada : config.recomendaciones.conforme, values));

    return `<div class="official-report">
      <header class="official-report__letterhead"><p>“Decenio de la Igualdad de oportunidades para mujeres y hombres”</p><p>“Año institucional — texto simulado”</p></header>
      <h3 data-report-number>${escape(number)}</h3>
      <dl class="official-report__header-data"><div><dt>A</dt><dd>${escape(config.recipient)}</dd></div><div><dt>De</dt><dd data-report-sender>${escape(config.sender)}</dd></div><div><dt>Asunto</dt><dd class="report-editable">${escape(subject)}</dd></div><div><dt>Referencia</dt><dd>Orden de Servicio N.° ${escape(deliverable.contrato.ordenServicio)} · SINAD ${escape(atet.sinad || "DEMO")}</dd></div><div><dt>Fecha</dt><dd data-report-date>${escape(issueDate)}</dd></div></dl>
      <p class="official-report__intro report-editable">Tengo el agrado de dirigirme a usted, en atención al asunto del rubro y los documentos de la referencia, para informarle lo siguiente:</p>
      <section><h4>I. ANTECEDENTES</h4>${orderedList(antecedents)}</section>
      <section><h4>II. ANÁLISIS</h4>${analysis}</section>
      <section><h4>III. CONCLUSIONES</h4>${conclusions}</section>
      <section><h4>IV. RECOMENDACIÓN</h4><p class="report-editable">${recommendation}</p><p>Es todo cuanto debo informar.</p></section>
      <footer class="official-report__signature"><span aria-hidden="true"></span><strong data-report-signature>${escape(existingReport ? `${existingReport.autor} · firma simulada` : global.DEMO_REPORT_CONFIG.signatureName)}</strong><small>${escape(global.DEMO_REPORT_CONFIG.signatureRole)}</small></footer>
      <p class="official-report__demo-stamp">DOCUMENTO DE SIMULACIÓN · SIN VALIDEZ OFICIAL</p>
    </div>`;
  }

  function downloadableHtml(number, paper) {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(number)}</title><style>body{margin:0;padding:32px;background:#eef1f5;color:#111;font:14px Arial,sans-serif}.official-report{max-width:980px;margin:auto;padding:55px;background:#fff;line-height:1.6}.official-report__letterhead{text-align:center;font-size:12px}.official-report>h3{text-align:center;margin:30px 0;text-decoration:underline}.official-report__header-data>div{display:grid;grid-template-columns:100px 1fr;padding:6px 0}.official-report__header-data dt{font-weight:bold}.official-report__header-data dd{margin:0}.official-report h4{margin-top:28px;text-decoration:underline}.official-report section p{text-align:justify}.official-report__antecedents{margin:0;padding-left:34px;list-style:none;counter-reset:antecedent}.official-report__antecedents li{position:relative;margin:0 0 10px;text-align:justify}.official-report__antecedents li::before{counter-increment:antecedent;content:"1." counter(antecedent);position:absolute;left:-34px;font-weight:bold}.official-report__table-wrap{overflow:auto;margin:12px 0 18px}.official-report__table{width:100%;border-collapse:collapse;font-size:11px;line-height:1.4}.official-report__table th,.official-report__table td{padding:7px;border:1px solid #555;vertical-align:top}.official-report__table th{text-align:center;background:#eee}.official-report__result,.official-report__pages{text-align:center;font-weight:bold}.official-report__observation{color:#8d1f1f;font-weight:bold}.official-report__service-cell{font-weight:bold;background:#f7f7f7;vertical-align:middle}.official-report__signature{width:330px;margin:80px auto 0;text-align:center}.official-report__signature span{display:block;border-top:1px solid #333}.official-report__signature strong,.official-report__signature small{display:block}.official-report__demo-stamp{margin-top:35px;padding:8px;border:2px solid #a33;text-align:center;color:#a33;font-weight:bold}.is-editable{background:transparent!important;outline:0!important}@media(max-width:650px){body{padding:8px}.official-report{padding:20px}.official-report__header-data>div{grid-template-columns:1fr}.official-report__signature{width:100%}}@page{margin:16mm}@media print{body{background:#fff;padding:0}.official-report{max-width:none;padding:0;box-shadow:none}.official-report__table{font-size:10px}}</style></head><body>${paper.innerHTML}</body></html>`;
  }

  function openPrintable(number, paper) {
    // El navegador ofrece "Guardar como PDF" desde su propio diálogo de impresión.
    const win = global.open("", "_blank");
    if (!win) return false;
    const markup = downloadableHtml(number, paper).replace(
      "</body></html>",
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});<\/script></body></html>'
    );
    win.document.open();
    win.document.write(markup);
    win.document.close();
    win.focus();
    return true;
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
      const regionRecord = catalogs.regiones.find((item) => item.id === atet.regionId);
      const region = regionRecord?.nombre || "Dato no disponible";
      const scope = catalogs.ambitos.find((item) => item.id === regionRecord?.ambitoId)?.nombre;
      const zoneNumber = catalogs.zonas.find((item) => item.id === atet.zonaId)?.numero;
      const serviceName = (atet.denominacionServicio
        || (global.SERVICE_DENOMINATION?.generate({ region, scope, zoneNumber }) || "")
        || `SERVICIO DE ASISTENCIA TECNOLÓGICA PARA LA ACTUALIZACIÓN DE LOS MATERIALES EDUCATIVOS DIGITALES DE LAS INSTITUCIONES EDUCATIVAS BENEFICIADAS CON TABLETAS, EN EL MARCO DEL PLAN DE CIERRE DE BRECHA DIGITAL EN LA REGIÓN ${String(region).toUpperCase()} — DEMO`).replace(/\.\s*$/, "");
      const storedReport = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id);
      const existingReport = storedReport?.templateVersion === global.DEMO_REPORT_CONFIG.version ? storedReport : null;
      const wrapper = document.createElement("div");
      const back = document.createElement("a");
      const warning = document.createElement("p");
      const paper = document.createElement("article");
      const actions = document.createElement("div");
      const edit = document.createElement("button");
      const pdf = document.createElement("button");
      const generate = document.createElement("button");
      const status = document.createElement("p");
      wrapper.className = "report-preview";
      back.className = "atet-back-link"; back.href = `#detalle-evaluacion-gestor/${encodeURIComponent(deliverable.id)}`; back.textContent = "← Atrás";
      warning.className = "registration-form__note report-preview__warning"; warning.textContent = global.DEMO_REPORT_CONFIG.warning;
      paper.className = "report-preview__paper"; paper.innerHTML = buildDocument({ deliverable, evaluation, atet, serviceName, existingReport });
      actions.className = "report-preview__actions";
      edit.className = "registration-action registration-action--secondary"; edit.type = "button"; edit.textContent = "Editar información del informe";
      pdf.className = "registration-action registration-action--secondary"; pdf.type = "button"; pdf.textContent = "Descargar PDF";
      generate.className = "registration-action registration-action--primary"; generate.type = "button"; generate.textContent = existingReport ? "Descargar informe generado" : "Generar informe";
      status.className = "registration-form__status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
      actions.append(edit, pdf, generate, status); wrapper.append(back, warning, paper, actions); container.replaceChildren(wrapper);

      pdf.addEventListener("click", () => {
        const currentNumber = paper.querySelector("[data-report-number]")?.textContent || "INFORME-DEMO";
        paper.querySelectorAll(".report-editable").forEach((element) => { element.contentEditable = "false"; element.classList.remove("is-editable"); });
        edit.setAttribute("aria-pressed", "false"); edit.textContent = "Editar información del informe";
        const opened = openPrintable(currentNumber, paper);
        status.textContent = opened
          ? "Se abrió el informe en una pestaña nueva. En el diálogo de impresión elige “Guardar como PDF”."
          : "El navegador bloqueó la ventana emergente. Habilita las ventanas emergentes para descargar el PDF.";
      });

      edit.addEventListener("click", () => {
        const editing = edit.getAttribute("aria-pressed") !== "true";
        paper.querySelectorAll(".report-editable").forEach((element) => { element.contentEditable = String(editing); element.classList.toggle("is-editable", editing); });
        edit.setAttribute("aria-pressed", String(editing)); edit.textContent = editing ? "Guardar edición" : "Editar información del informe";
        status.textContent = editing ? "Puedes ajustar los textos del informe; la evaluación y las tablas permanecen bloqueadas." : "Edición aplicada a la vista previa.";
        if (editing) paper.querySelector(".report-editable")?.focus();
      });

      generate.addEventListener("click", async () => {
        const current = global.DEMO_STORE.getReports().find((item) => item.entregableId === deliverable.id && item.templateVersion === global.DEMO_REPORT_CONFIG.version);
        if (current) { downloadReport(current); status.textContent = `Se descargó ${current.referencia}.`; return; }
        const confirmed = await confirmDialog({
          title: "Generar informe",
          message: `¿Deseas generar el informe del ${deliverableLabel(deliverable.numero, "lower")} con la información mostrada?`,
          confirmLabel: "Generar informe"
        });
        if (!confirmed || !isCurrent()) return;
        generate.disabled = true;
        paper.querySelectorAll(".report-editable").forEach((element) => { element.contentEditable = "false"; element.classList.remove("is-editable"); });
        const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
        const generatedAt = new Date().toISOString();
        const number = createReportNumber(deliverable);
        paper.querySelector("[data-report-number]").textContent = number;
        paper.querySelector("[data-report-date]").textContent = `Lima, ${formatDate(generatedAt)}`;
        paper.querySelector("[data-report-signature]").textContent = `${session?.nombre || "Gestor Demo"} · firma simulada`;
        const report = { id: `report-${deliverable.id}`, entregableId: deliverable.id, numero: number, tipo: evaluation.resultado, templateVersion: global.DEMO_REPORT_CONFIG.version, fecha: generatedAt.slice(0, 10), autor: session?.nombre || "Gestor Demo", estado: "generado", referencia: reportFileName(deliverable), generadoEn: generatedAt, contenidoHtml: downloadableHtml(number, paper) };
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
