(function configureExecutiveDeliverableStatus(global) {
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
    const value = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
  }

  function getPresentationLabel(item) {
    if (!item.presentacion.fecha) return "Pendiente";
    return item.estado === "fuera-plazo" ? "Fuera de plazo" : "Presentado";
  }

  function getEvaluationLabel(status) {
    return { pendiente: "Pendiente", conforme: "Conforme", observada: "Observado" }[status] || status;
  }

  function getReportLabel(item, reportsByDeliverable) {
    const report = reportsByDeliverable.get(item.id);
    if (report) return `Generado · ${report.numero}`;
    return item.evaluacion.estado === "pendiente" ? "No corresponde" : "Pendiente de informe";
  }

  function pdfTone(value) {
    if (["Presentado", "Conforme"].includes(value)) return "ok";
    if (["Observado"].includes(value)) return "danger";
    if (["Fuera de plazo"].includes(value)) return "warn";
    return "muted";
  }

  function buildPdfDocument({ rows, reportsByDeliverable, filters, generatedAt }) {
    const total = rows.length;
    const presented = rows.filter((item) => item.presentacion.fecha).length;
    const pending = total - presented;
    const evaluatedRows = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado));
    const conforming = evaluatedRows.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = evaluatedRows.filter((item) => item.evaluacion.estado === "observada").length;
    const percent = (value, denominator) => (denominator ? Math.round((value / denominator) * 100) : 0);
    const logoUrl = new URL("../assets/images/logo-minedu.png", document.baseURI).href;

    const kpis = [
      ["Pendientes de presentación", `${pending} de ${total}`, `${percent(pending, total)}%`],
      ["Presentados", `${presented} de ${total}`, `${percent(presented, total)}%`],
      ["Conformes", `${conforming} de ${evaluatedRows.length}`, `${percent(conforming, evaluatedRows.length)}%`],
      ["Observados", `${observed} de ${evaluatedRows.length}`, `${percent(observed, evaluatedRows.length)}%`]
    ].map(([label, value, share]) => `<div class="kpi"><span class="kpi__label">${escapeHtml(label)}</span><span class="kpi__value">${escapeHtml(value)}</span><span class="kpi__share">${escapeHtml(share)}</span></div>`).join("");

    const filterChips = filters.length
      ? filters.map(([label, value]) => `<span class="chip"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join("")
      : '<span class="chip chip--empty">Sin filtros aplicados</span>';

    const bodyRows = rows.map((item, index) => {
      const presentation = getPresentationLabel(item);
      const evaluation = getEvaluationLabel(item.evaluacion.estado);
      const cells = [
        formatPeriod(item.periodoId),
        "Macro Demo",
        item.atet.nombreCompleto,
        `N.° ${item.numero}`,
        formatDate(item.fechaMaxima)
      ].map((value) => `<td>${escapeHtml(value)}</td>`).join("");
      return `<tr>
        <td class="num">${index + 1}</td>
        ${cells}
        <td><span class="pill pill--${pdfTone(presentation)}">${escapeHtml(presentation)}</span></td>
        <td><span class="pill pill--${pdfTone(evaluation)}">${escapeHtml(evaluation)}</span></td>
        <td class="report">${escapeHtml(getReportLabel(item, reportsByDeliverable))}</td>
      </tr>`;
    }).join("");

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de entregables</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0}
  body{background:#eef1f5;color:#1b2430;font:12px/1.5 "Segoe UI",Arial,sans-serif;padding:28px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:1040px;margin:0 auto;background:#fff;border:1px solid #dfe3e8;box-shadow:0 4px 18px rgba(19,47,87,.08)}
  .masthead{display:flex;align-items:center;gap:16px;padding:22px 34px;background:#132f57;color:#fff}
  .masthead img{height:46px;width:auto;background:#fff;padding:4px 6px;border-radius:4px}
  .masthead__org{font-size:19px;font-weight:800;letter-spacing:.16em}
  .masthead__unit{font-size:11.5px;margin-top:3px;opacity:.88}
  .masthead__tag{margin-left:auto;text-align:right;font-size:10.5px;line-height:1.4;opacity:.8}
  .title-band{padding:22px 34px 10px}
  .title-band h1{margin:0;font-size:20px;color:#132f57;letter-spacing:.01em}
  .title-band p{margin:4px 0 0;color:#5a6675;font-size:11.5px}
  .meta{display:flex;flex-wrap:wrap;gap:8px;padding:12px 34px 4px}
  .chip{background:#f1f5fa;border:1px solid #dce3ec;border-radius:999px;padding:4px 11px;font-size:10.5px;color:#3a4657}
  .chip strong{color:#132f57}
  .chip--empty{color:#8b97a6}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:16px 34px 0;border:1px solid #e2e6ec;border-radius:8px;overflow:hidden}
  .kpi{padding:12px 14px;text-align:center;border-right:1px solid #e2e6ec}
  .kpi:last-child{border-right:0}
  .kpi__label{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#68727f;font-weight:700}
  .kpi__value{display:block;margin-top:5px;font-size:15px;font-weight:800;color:#132f57}
  .kpi__share{display:block;font-size:10px;color:#7a8695;font-weight:600}
  table{width:100%;border-collapse:collapse;margin:18px 0 0}
  thead th{background:#132f57;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding:9px 8px;text-align:left}
  thead th:first-child{padding-left:34px}
  thead th:last-child{padding-right:34px}
  tbody td{padding:8px;border-bottom:1px solid #e7eaef;font-size:10.5px;vertical-align:middle}
  tbody td:first-child{padding-left:34px}
  tbody td:last-child{padding-right:34px}
  tbody tr:nth-child(even){background:#f7f9fc}
  td.num{color:#97a1ad;font-weight:700;width:26px}
  td.report{color:#3a4657}
  .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:9.5px;font-weight:700;white-space:nowrap}
  .pill--ok{background:#e3f4ea;color:#1f7a44}
  .pill--danger{background:#fbe6e6;color:#a52a2a}
  .pill--warn{background:#fcefdc;color:#8a5a12}
  .pill--muted{background:#eef1f5;color:#5a6675}
  .footer{display:flex;justify-content:space-between;padding:14px 34px 26px;color:#8b97a6;font-size:9.5px}
  .footer strong{color:#a52a2a}
  @page{margin:14mm}
  @media print{body{background:#fff;padding:0}.sheet{border:0;box-shadow:none;max-width:none}}
</style></head><body>
<div class="sheet">
  <div class="masthead">
    <img src="${escapeHtml(logoUrl)}" alt="Ministerio de Educación">
    <div>
      <div class="masthead__org">SIGATET</div>
      <div class="masthead__unit">Sistema Integrado de Gestión y Seguimiento de ATET</div>
    </div>
    <div class="masthead__tag">Ministerio de Educación del Perú<br>Reporte generado automáticamente</div>
  </div>
  <div class="title-band">
    <h1>Estado consolidado de entregables</h1>
    <p>Estado de presentación y evaluación de entregables · ${escapeHtml(total)} ${total === 1 ? "registro" : "registros"} · Generado el ${escapeHtml(generatedAt)}</p>
  </div>
  <div class="meta">${filterChips}</div>
  <div class="kpis">${kpis}</div>
  <table>
    <thead><tr>
      <th>#</th><th>Periodo</th><th>Macro</th><th>ATET</th><th>Entregable</th>
      <th>Fecha máxima</th><th>Presentación</th><th>Evaluación</th><th>Informe</th>
    </tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#8b97a6">No existen entregables para los filtros seleccionados.</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>SIGATET · Sistema Integrado de Gestión y Seguimiento de ATET</span>
    <strong>DOCUMENTO DE SIMULACIÓN · SIN VALIDEZ OFICIAL</strong>
    <span>${escapeHtml(generatedAt)}</span>
  </div>
</div>
</body></html>`;
  }

  function openDeliverableStatusPdf(options) {
    const previous = document.getElementById("deliverable-state-print-frame");
    if (previous) previous.remove();
    const frame = document.createElement("iframe");
    frame.id = "deliverable-state-print-frame";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.append(frame);

    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      window.removeEventListener("afterprint", cleanup);
      window.setTimeout(() => frame.remove(), 800);
    };

    frame.addEventListener("load", () => {
      const printWindow = frame.contentWindow;
      let printed = false;
      const triggerPrint = () => {
        if (printed) return;
        printed = true;
        window.addEventListener("afterprint", cleanup);
        printWindow.addEventListener("afterprint", cleanup);
        window.setTimeout(cleanup, 60000);
        printWindow.focus();
        printWindow.print();
      };
      const image = frame.contentDocument && frame.contentDocument.querySelector("img");
      if (image && !image.complete) {
        image.addEventListener("load", triggerPrint, { once: true });
        image.addEventListener("error", triggerPrint, { once: true });
        window.setTimeout(triggerPrint, 1500);
      } else {
        window.setTimeout(triggerPrint, 120);
      }
    });

    frame.srcdoc = buildPdfDocument(options);
    return true;
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

  function createEvaluationBadge(status) {
    const labels = { pendiente: "Pendiente", conforme: "Conforme", observada: "Observado" };
    const badge = document.createElement("span");
    badge.className = `evaluation-status evaluation-status--${status}`;
    badge.textContent = labels[status] || status;
    return badge;
  }

  function createPresentationBadge(item) {
    const badge = document.createElement("span");
    badge.className = `deliverable-status deliverable-status--${item.estado}`;
    badge.textContent = item.presentacion.fecha ? item.estado === "fuera-plazo" ? "Fuera de plazo" : "Presentado" : "Pendiente";
    return badge;
  }

  function renderSummary(container, rows) {
    const total = rows.length;
    const presented = rows.filter((item) => item.presentacion.fecha).length;
    const pending = total - presented;
    const evaluatedRows = rows.filter((item) => ["conforme", "observada"].includes(item.evaluacion.estado));
    const conforming = evaluatedRows.filter((item) => item.evaluacion.estado === "conforme").length;
    const observed = evaluatedRows.filter((item) => item.evaluacion.estado === "observada").length;
    const summary = document.createElement("dl");
    summary.className = "deliverable-state__summary";
    [
      ["Pendientes de presentación", pending, total, "esperados"],
      ["Presentados", presented, total, "esperados"],
      ["Conformes", conforming, evaluatedRows.length, "evaluados"],
      ["Observados", observed, evaluatedRows.length, "evaluados"]
    ].forEach(([label, value, denominator, denominatorLabel]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      const percent = denominator ? Math.round((value / denominator) * 100) : 0;
      term.textContent = label;
      description.textContent = `${value} de ${denominator} ${denominatorLabel} (${percent}%)`;
      item.append(term, description);
      summary.append(item);
    });
    container.replaceChildren(summary);
  }

  function createTable(rows, reportsByDeliverable) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "deliverable-state__table-wrapper";
    table.className = "deliverable-state__table";
    caption.className = "sr-only";
    caption.textContent = "Estado consolidado de entregables";
    ["Periodo", "Macro", "ATET", "Entregable", "Fecha máxima", "Presentación", "Evaluación", "Informe"].forEach((text) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      headRow.append(th);
    });
    rows.forEach((item) => {
      const row = document.createElement("tr");
      [formatPeriod(item.periodoId), "Macro Demo", item.atet.nombreCompleto, `N.° ${item.numero}`, formatDate(item.fechaMaxima)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const presentationCell = document.createElement("td");
      const evaluationCell = document.createElement("td");
      const reportCell = document.createElement("td");
      presentationCell.append(createPresentationBadge(item));
      evaluationCell.append(createEvaluationBadge(item.evaluacion.estado));
      const report = reportsByDeliverable.get(item.id);
      reportCell.textContent = report ? `Generado · ${report.numero}` : item.evaluacion.estado === "pendiente" ? "No corresponde" : "Pendiente de informe";
      row.append(presentationCell, evaluationCell, reportCell);
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
    pager.setAttribute("aria-label", "Paginación del estado de entregables");
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
    container.innerHTML = '<p class="atet-state" role="status">Cargando estado de entregables…</p>';
    try {
      const [dashboard, personal] = await loadData();
      if (!isCurrent()) return;
      const deliverables = global.DELIVERABLE_CALCULATIONS.buildExpectedDeliverables(
        dashboard, personal, global.DEMO_STORE.getPresentations(), global.DEMO_STORE.getEvaluations()
      );
      const reportsByDeliverable = new Map(global.DEMO_STORE.getReports().map((item) => [item.entregableId, item]));
      const section = document.createElement("section");
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      const headingMeta = document.createElement("div");
      const counter = document.createElement("p");
      const downloadPdf = document.createElement("button");
      const filters = document.createElement("div");
      const periodFilter = createSelectField("executive-state-period", "Periodo", "Todos los periodos");
      const macroFilter = createSelectField("executive-state-macro", "Macro", "Todos los Macros");
      const atetFilter = createSelectField("executive-state-atet", "ATET", "Todos los ATET");
      const presentationFilter = createSelectField("executive-state-presentation", "Presentación", "Todos los estados");
      const evaluationFilter = createSelectField("executive-state-evaluation", "Evaluación", "Todos los resultados");
      const clear = document.createElement("button");
      const summary = document.createElement("div");
      const results = document.createElement("div");
      const pageSize = 5;
      let currentPage = 1;
      section.className = "deliverable-state";
      heading.className = "deliverable-state__heading";
      title.textContent = "Estado consolidado";
      headingMeta.className = "deliverable-state__heading-meta";
      counter.setAttribute("aria-live", "polite");
      downloadPdf.type = "button";
      downloadPdf.className = "registration-action registration-action--primary deliverable-state__pdf";
      downloadPdf.textContent = "Descargar PDF";
      filters.className = "deliverable-state__filters";
      clear.className = "atet-filters__clear";
      clear.type = "button";
      clear.textContent = "Limpiar filtros";
      summary.className = "deliverable-state__summary-wrapper";
      results.className = "deliverable-state__results";
      [...new Set(deliverables.map((item) => item.periodoId))].sort().reverse().forEach((id) => appendOption(periodFilter.select, id, formatPeriod(id)));
      appendOption(macroFilter.select, "macro-demo", "Macro Demo");
      [...new Map(deliverables.map((item) => [item.atet.codigo, item.atet])).values()]
        .sort((first, second) => first.nombreCompleto.localeCompare(second.nombreCompleto, "es"))
        .forEach((atet) => appendOption(atetFilter.select, atet.codigo, `${atet.nombreCompleto} · ${atet.codigo}`));
      appendOption(presentationFilter.select, "pendiente", "Pendiente");
      appendOption(presentationFilter.select, "presentado", "Presentado");
      appendOption(evaluationFilter.select, "pendiente", "Pendiente");
      appendOption(evaluationFilter.select, "conforme", "Conforme");
      appendOption(evaluationFilter.select, "observada", "Observado");
      periodFilter.select.value = dashboard.periodoPredeterminado;
      filters.append(periodFilter.field, macroFilter.field, atetFilter.field, presentationFilter.field, evaluationFilter.field, clear);
      headingMeta.append(counter, downloadPdf);
      heading.append(title, headingMeta);

      function getActiveFilters() {
        const selectedText = (select) => select.options[select.selectedIndex]?.textContent?.trim() || "";
        return [
          ["Periodo", periodFilter.select],
          ["Macro", macroFilter.select],
          ["ATET", atetFilter.select],
          ["Presentación", presentationFilter.select],
          ["Evaluación", evaluationFilter.select]
        ].filter(([, select]) => select.value).map(([label, select]) => [label, selectedText(select)]);
      }

      downloadPdf.addEventListener("click", () => {
        const filtered = getFiltered();
        const generatedAt = new Intl.DateTimeFormat("es-PE", {
          day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
        }).format(new Date());
        downloadPdf.disabled = true;
        counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"} · preparando impresión…`;
        openDeliverableStatusPdf({
          rows: filtered,
          reportsByDeliverable,
          filters: getActiveFilters(),
          generatedAt
        });
        window.setTimeout(() => {
          downloadPdf.disabled = false;
          counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
        }, 1500);
      });

      function getFiltered() {
        return deliverables.filter((item) =>
          (!periodFilter.select.value || item.periodoId === periodFilter.select.value)
          && (!macroFilter.select.value || macroFilter.select.value === "macro-demo")
          && (!atetFilter.select.value || item.atet.codigo === atetFilter.select.value)
          && (!presentationFilter.select.value || (presentationFilter.select.value === "presentado" ? Boolean(item.presentacion.fecha) : !item.presentacion.fecha))
          && (!evaluationFilter.select.value || item.evaluacion.estado === evaluationFilter.select.value)
        );
      }

      function update(page = 1) {
        const filtered = getFiltered();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        currentPage = Math.max(1, Math.min(page, totalPages));
        counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
        renderSummary(summary, filtered);
        results.replaceChildren();
        if (!filtered.length) {
          const empty = document.createElement("p");
          empty.className = "atet-list__empty";
          empty.textContent = "No existen entregables para los filtros seleccionados.";
          results.append(empty);
          return;
        }
        const start = (currentPage - 1) * pageSize;
        results.append(createTable(filtered.slice(start, start + pageSize), reportsByDeliverable), createPager(currentPage, totalPages, update));
      }
      [periodFilter.select, macroFilter.select, atetFilter.select, presentationFilter.select, evaluationFilter.select]
        .forEach((select) => select.addEventListener("change", () => update(1)));
      clear.addEventListener("click", () => {
        periodFilter.select.value = "";
        macroFilter.select.value = "";
        atetFilter.select.value = "";
        presentationFilter.select.value = "";
        evaluationFilter.select.value = "";
        update(1);
        periodFilter.select.focus();
      });
      section.append(heading, filters, summary, results);
      container.replaceChildren(section);
      update(1);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el estado de entregables.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el estado de entregables.</strong><span>Intenta nuevamente.</span></div>';
    }
  }

  global.EXECUTIVE_DELIVERABLE_STATUS_MODULE = Object.freeze({ render });
})(window);
