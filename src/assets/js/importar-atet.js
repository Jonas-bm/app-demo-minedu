(function configureAtetImportModule(global) {
  const config = global.ATET_IMPORT_CONFIG;

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function uint16(value) {
    return [value & 255, (value >>> 8) & 255];
  }

  function uint32(value) {
    return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
  }

  function createZip(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const directory = [];
    let offset = 0;

    Object.entries(files).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(content);
      const checksum = crc32(data);
      const local = new Uint8Array([
        80, 75, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...uint32(checksum), ...uint32(data.length), ...uint32(data.length),
        ...uint16(nameBytes.length), 0, 0, ...nameBytes
      ]);
      chunks.push(local, data);
      directory.push(new Uint8Array([
        80, 75, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...uint32(checksum), ...uint32(data.length), ...uint32(data.length),
        ...uint16(nameBytes.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ...uint32(offset), ...nameBytes
      ]));
      offset += local.length + data.length;
    });

    const directorySize = directory.reduce((total, item) => total + item.length, 0);
    const end = new Uint8Array([
      80, 75, 5, 6, 0, 0, 0, 0,
      ...uint16(directory.length), ...uint16(directory.length),
      ...uint32(directorySize), ...uint32(offset), 0, 0
    ]);
    return new Blob([...chunks, ...directory, end], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function escapeXml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    })[character]);
  }

  function createTemplateWorkbook() {
    const cells = config.columns.map((column, index) => {
      let number = index + 1;
      let reference = "";
      while (number > 0) {
        number -= 1;
        reference = String.fromCharCode(65 + (number % 26)) + reference;
        number = Math.floor(number / 26);
      }
      return `<c r="${reference}1" t="inlineStr" s="1"><is><t>${escapeXml(column.header)}</t></is></c>`;
    }).join("");
    const files = {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${config.sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font/><font><b/><color rgb="FFFFFFFF"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17345E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="1" applyFont="1" applyFill="1"/></cellXfs></styleSheet>',
      "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row></sheetData></worksheet>`
    };
    return createZip(files);
  }

  function formatBytes(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  async function loadValidationData() {
    const [personal, catalogs] = await Promise.all([
      fetch("../data/personal.json").then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los ATET existentes.");
        return response.json();
      }),
      fetch("../data/catalogos.json").then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los catálogos.");
        return response.json();
      })
    ]);
    return {
      existingAtets: personal.atets.concat(global.DEMO_STORE.getRegistrations()),
      catalogs
    };
  }

  function render(container) {
    const wrapper = document.createElement("div");
    const back = document.createElement("a");
    const steps = document.createElement("ol");
    const intro = document.createElement("section");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const download = document.createElement("button");
    const upload = document.createElement("section");
    const uploadTitle = document.createElement("h3");
    const dropzone = document.createElement("label");
    const fileInput = document.createElement("input");
    const dropIcon = document.createElement("span");
    const dropTitle = document.createElement("strong");
    const dropHelp = document.createElement("span");
    const fileCard = document.createElement("div");
    const status = document.createElement("p");
    const actions = document.createElement("div");
    const cancel = document.createElement("a");
    const next = document.createElement("button");
    let selectedFile = null;

    function setCurrentStep(index) {
      [...steps.children].forEach((step, stepIndex) => {
        step.classList.toggle("is-current", stepIndex === index);
        step.classList.toggle("is-complete", stepIndex < index);
        if (stepIndex === index) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      });
    }

    function createRowStatus(statusValue, final = false) {
      const badge = document.createElement("span");
      const reviewLabels = {
        [config.rowStatuses.valid]: "Sin incidencias",
        [config.rowStatuses.warning]: "Con advertencias",
        [config.rowStatuses.blocked]: "No importable"
      };
      const finalLabels = {
        [config.rowStatuses.valid]: "Importada",
        [config.rowStatuses.warning]: "Importada con advertencia",
        [config.rowStatuses.blocked]: "No importada"
      };
      badge.className = `import-row-status import-row-status--${statusValue}`;
      badge.textContent = (final ? finalLabels : reviewLabels)[statusValue] || statusValue;
      return badge;
    }

    function createReviewTable(rows, final = false) {
      const wrapperElement = document.createElement("div");
      const table = document.createElement("table");
      const caption = document.createElement("caption");
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      const body = document.createElement("tbody");
      wrapperElement.className = "import-review-table-wrapper";
      table.className = "import-review-table";
      const colgroup = document.createElement("colgroup");
      ["fila", "codigo", "nombre", "region", "estado", "incidencias"].forEach((name) => {
        const col = document.createElement("col");
        col.className = `import-col--${name}`;
        colgroup.append(col);
      });
      caption.className = "sr-only";
      caption.textContent = final ? "Resultado final de la importación" : "Vista previa de filas validadas para importar";
      ["Fila", "Código ATET", "Nombres y apellidos", "Región y zona", "Estado", "Incidencias"].forEach((label) => {
        const header = document.createElement("th");
        header.scope = "col";
        header.textContent = label;
        headRow.append(header);
      });
      rows.forEach((row) => {
        const tableRow = document.createElement("tr");
        const values = [row.rowNumber, row.data.codigo || "—", row.data.nombresApellidos || "—", [row.data.region, row.data.zona].filter(Boolean).join(" · ") || "—"];
        values.forEach((value, cellIndex) => {
          const cell = document.createElement("td");
          if (cellIndex === 2) cell.className = "import-cell--nombre";
          cell.textContent = value;
          tableRow.append(cell);
        });
        const statusCell = document.createElement("td");
        const issuesCell = document.createElement("td");
        issuesCell.className = "import-cell--incidencias";
        const issues = row.errors.concat(row.warnings);
        statusCell.append(createRowStatus(row.status, final));
        if (!issues.length) {
          const ok = document.createElement("span");
          ok.className = "import-issues-none";
          ok.textContent = "Sin incidencias";
          issuesCell.append(ok);
        } else {
          const details = document.createElement("details");
          const summaryElement = document.createElement("summary");
          const list = document.createElement("ul");
          summaryElement.textContent = `${issues.length} ${issues.length === 1 ? "incidencia" : "incidencias"}`;
          row.errors.forEach((issue) => {
            const item = document.createElement("li");
            item.className = "is-error";
            item.textContent = `${issue.column}: ${issue.message}`;
            list.append(item);
          });
          row.warnings.forEach((issue) => {
            const item = document.createElement("li");
            item.className = "is-warning";
            item.textContent = `${issue.column}: ${issue.message}`;
            list.append(item);
          });
          details.append(summaryElement, list);
          issuesCell.append(details);
        }
        tableRow.append(statusCell, issuesCell);
        body.append(tableRow);
      });
      head.append(headRow);
      table.append(caption, colgroup, head, body);
      wrapperElement.append(table);
      return wrapperElement;
    }

    function createRegistrationFromRow(row, batchId) {
      const registration = {
        id: `atet-import-${batchId}-${row.rowNumber}`,
        codigo: row.data.codigo.trim(),
        nombreCompleto: row.data.nombresApellidos.trim(),
        dni: row.data.dni.trim(),
        sinad: row.data.sinad.trim(),
        celular: row.data.celular.trim(),
        correo: row.data.correo.trim(),
        ordenServicio: row.data.ordenServicio.trim(),
        regionId: row.data.regionId,
        zonaId: row.data.zonaId,
        fechaInicio: row.data.fechaInicio,
        fechaTermino: row.data.fechaTermino,
        estado: "activo",
        estadoImportacion: row.status,
        observacionesImportacion: row.warnings.map((issue) => `${issue.column}: ${issue.message}`)
      };
      return global.MACRO_CONTEXT
        ? global.MACRO_CONTEXT.stampOwnership(registration)
        : registration;
    }

    function downloadIncidentReport(rows) {
      const escapeCsv = (value) => {
        const text = String(value ?? "");
        const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replace(/"/g, '""')}"`;
      };
      const lines = [["Fila", "Código ATET", "Nombres y apellidos", "Estado", "Errores", "Advertencias"]];
      rows.forEach((row) => lines.push([
        row.rowNumber,
        row.data.codigo,
        row.data.nombresApellidos,
        row.status,
        row.errors.map((issue) => `${issue.column}: ${issue.message}`).join(" | "),
        row.warnings.map((issue) => `${issue.column}: ${issue.message}`).join(" | ")
      ]));
      const blob = new Blob([`\ufeff${lines.map((line) => line.map(escapeCsv).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resultado-importacion-atet-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function showImportResult(imported, rows, reviewPanel) {
      const result = document.createElement("section");
      const titleElement = document.createElement("h3");
      const message = document.createElement("p");
      const summary = document.createElement("dl");
      const tableRegion = document.createElement("div");
      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const pageInfo = document.createElement("span");
      const following = document.createElement("button");
      const download = document.createElement("button");
      const restart = document.createElement("button");
      const finish = document.createElement("a");
      const pageSize = 5;
      const totals = {
        valid: rows.filter((row) => row.status === config.rowStatuses.valid).length,
        warning: rows.filter((row) => row.status === config.rowStatuses.warning).length,
        blocked: rows.filter((row) => row.status === config.rowStatuses.blocked).length
      };
      let currentPage = 1;

      function renderFinalPage() {
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        tableRegion.replaceChildren(createReviewTable(rows.slice((currentPage - 1) * pageSize, currentPage * pageSize), true));
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        previous.disabled = currentPage === 1;
        following.disabled = currentPage === totalPages;
      }

      result.className = "import-panel import-final-state";
      result.tabIndex = -1;
      titleElement.textContent = imported.length ? "Importación completada" : "No se importaron filas";
      message.textContent = imported.length
        ? "Los registros permitidos se guardaron en la maqueta y ya están disponibles en Mis ATET."
        : "Las filas dejaron de estar disponibles o presentaron duplicados antes de confirmar.";
      summary.className = "import-validation-summary import-final-state__summary";
      [
        ["Procesadas", rows.length, "total"],
        ["Importadas", totals.valid, "valid"],
        ["Con advertencia", totals.warning, "warning"],
        ["No importadas", totals.blocked, "blocked"]
      ].forEach(([label, value, type]) => {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        item.className = `import-validation-summary__item import-validation-summary__item--${type}`;
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        summary.append(item);
      });
      tableRegion.className = "import-review__table-region import-final-state__table";
      pagination.className = "table-pagination import-review__pagination";
      pagination.setAttribute("aria-label", "Paginación del resultado de importación");
      previous.type = "button";
      previous.textContent = "Anterior";
      following.type = "button";
      following.textContent = "Siguiente";
      pageInfo.setAttribute("aria-live", "polite");
      previous.addEventListener("click", () => { currentPage -= 1; renderFinalPage(); });
      following.addEventListener("click", () => { currentPage += 1; renderFinalPage(); });
      pagination.append(previous, pageInfo, following);
      result.append(titleElement, message, summary, tableRegion, pagination);
      reviewPanel.replaceWith(result);
      setCurrentStep(3);
      download.className = "registration-action registration-action--secondary";
      download.type = "button";
      download.textContent = "Descargar reporte CSV";
      download.addEventListener("click", () => downloadIncidentReport(rows));
      restart.className = "registration-action registration-action--secondary";
      restart.type = "button";
      restart.textContent = "Importar otro archivo";
      restart.addEventListener("click", () => render(container));
      finish.className = "registration-action registration-action--primary";
      finish.href = "#mis-atet";
      finish.textContent = "Finalizar y ver Mis ATET";
      actions.replaceChildren(download, restart, finish);
      if (imported.length) {
        global.DEMO_STORE.setFlash(`${imported.length} ${imported.length === 1 ? "ATET fue importado" : "ATET fueron importados"} correctamente.`);
      }
      renderFinalPage();
      result.focus({ preventScroll: true });
    }

    function showReview(rows, validationPanel) {
      const reviewPanel = document.createElement("section");
      const reviewHeading = document.createElement("div");
      const reviewTitle = document.createElement("h3");
      const reviewCounter = document.createElement("p");
      const tableRegion = document.createElement("div");
      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const pageInfo = document.createElement("span");
      const following = document.createElement("button");
      const replace = document.createElement("button");
      const importButton = document.createElement("button");
      const pageSize = 5;
      const initiallyImportable = rows.filter((row) => row.status !== config.rowStatuses.blocked).length;
      let currentPage = 1;

      function renderPage() {
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        tableRegion.replaceChildren(createReviewTable(pageRows));
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        previous.disabled = currentPage === 1;
        following.disabled = currentPage === totalPages;
      }

      reviewPanel.className = "import-panel import-review";
      reviewPanel.tabIndex = -1;
      reviewHeading.className = "import-review__heading";
      reviewTitle.textContent = "Revisa las filas antes de importar";
      reviewCounter.textContent = `${rows.length} ${rows.length === 1 ? "fila procesada" : "filas procesadas"}`;
      reviewHeading.append(reviewTitle, reviewCounter);
      tableRegion.className = "import-review__table-region";
      pagination.className = "table-pagination import-review__pagination";
      pagination.setAttribute("aria-label", "Paginación de filas validadas");
      previous.type = "button";
      previous.textContent = "Anterior";
      following.type = "button";
      following.textContent = "Siguiente";
      pageInfo.setAttribute("aria-live", "polite");
      previous.addEventListener("click", () => { currentPage -= 1; renderPage(); });
      following.addEventListener("click", () => { currentPage += 1; renderPage(); });
      pagination.append(previous, pageInfo, following);
      reviewPanel.append(reviewHeading, tableRegion, pagination);
      validationPanel.replaceWith(reviewPanel);
      setCurrentStep(2);
      replace.className = "registration-action registration-action--secondary";
      replace.type = "button";
      replace.textContent = "Volver y reemplazar archivo";
      replace.addEventListener("click", () => render(container));
      importButton.className = "registration-action registration-action--primary";
      importButton.type = "button";
      importButton.textContent = `Importar ${initiallyImportable} ${initiallyImportable === 1 ? "fila" : "filas"}`;
      importButton.disabled = initiallyImportable === 0;
      importButton.addEventListener("click", async () => {
        if (!global.confirm(`Se importarán ${initiallyImportable} ${initiallyImportable === 1 ? "fila" : "filas"}. ¿Deseas continuar?`)) return;
        importButton.disabled = true;
        importButton.textContent = "Importando…";
        try {
          const { existingAtets } = await loadValidationData();
          const codes = new Set(existingAtets.map((item) => item.codigo.trim().toLocaleLowerCase("es")).filter(Boolean));
          const dnis = new Set(existingAtets.map((item) => item.dni.trim()).filter(Boolean));
          const batchId = Date.now();
          const imported = [];
          const finalRows = rows.map((row) => ({ ...row, errors: [...row.errors], warnings: [...row.warnings] }));
          finalRows.filter((row) => row.status !== config.rowStatuses.blocked).forEach((row) => {
            const code = row.data.codigo.trim().toLocaleLowerCase("es");
            const dni = row.data.dni.trim();
            // Maqueta: solo se evita duplicar un código o DNI ya existente; el
            // resto de la fila se importa sin incidencias (ver AV-029).
            if ((code && codes.has(code)) || (dni && dnis.has(dni))) {
              row.status = config.rowStatuses.blocked;
              row.errors.push({ column: "Registro", message: "El código o el DNI ya existe en otro ATET registrado." });
              return;
            }
            if (code) codes.add(code);
            if (dni) dnis.add(dni);
            imported.push(createRegistrationFromRow(row, batchId));
          });
          global.DEMO_STORE.addRegistrations(imported);
          showImportResult(imported, finalRows, reviewPanel);
        } catch (error) {
          console.error("No se pudo completar la importación.", error);
          reviewCounter.textContent = "No se pudo completar la importación. Inténtalo nuevamente.";
          importButton.disabled = false;
          importButton.textContent = `Importar ${initiallyImportable} ${initiallyImportable === 1 ? "fila" : "filas"}`;
        }
      });
      actions.replaceChildren(replace, importButton);
      renderPage();
      reviewPanel.focus({ preventScroll: true });
    }

    function showValidationResult(rows) {
      const result = document.createElement("section");
      const resultTitle = document.createElement("h3");
      const resultText = document.createElement("p");
      const summary = document.createElement("dl");
      const changeFile = document.createElement("button");
      const review = document.createElement("button");
      const totals = {
        valid: rows.filter((row) => row.status === config.rowStatuses.valid).length,
        warning: rows.filter((row) => row.status === config.rowStatuses.warning).length,
        blocked: rows.filter((row) => row.status === config.rowStatuses.blocked).length
      };
      result.className = "import-panel import-validation-result";
      result.tabIndex = -1;
      resultTitle.textContent = "Validación terminada";
      resultText.textContent = `Se procesaron ${rows.length} ${rows.length === 1 ? "fila" : "filas"}. Ámbito y denominación fueron calculados desde el catálogo demo.`;
      summary.className = "import-validation-summary";
      [
        ["Total", rows.length, "total"],
        ["Sin incidencias", totals.valid, "valid"],
        ["Con advertencias", totals.warning, "warning"],
        ["No importables", totals.blocked, "blocked"]
      ].forEach(([label, value, type]) => {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        item.className = `import-validation-summary__item import-validation-summary__item--${type}`;
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        summary.append(item);
      });
      result.append(resultTitle, resultText, summary);
      intro.hidden = true;
      upload.hidden = true;
      wrapper.insertBefore(result, actions);
      setCurrentStep(1);
      changeFile.className = "registration-action registration-action--secondary";
      changeFile.type = "button";
      changeFile.textContent = "Cambiar archivo";
      changeFile.addEventListener("click", () => render(container));
      review.className = "registration-action registration-action--primary";
      review.type = "button";
      review.textContent = "Siguiente: revisar filas";
      review.addEventListener("click", () => showReview(rows, result));
      actions.replaceChildren(changeFile, review);
      result.focus({ preventScroll: true });
    }

    wrapper.className = "import-wizard";
    back.className = "atet-back-link";
    back.href = "#mis-atet";
    back.textContent = "← Atrás";
    back.setAttribute("aria-label", "Atrás, volver a Mis ATET");
    steps.className = "import-steps";
    steps.setAttribute("aria-label", "Progreso de importación");
    ["Cargar archivo", "Validar datos", "Revisar", "Importar"].forEach((label, index) => {
      const step = document.createElement("li");
      step.className = index === 0 ? "is-current" : "";
      if (index === 0) step.setAttribute("aria-current", "step");
      step.innerHTML = `<span>${index + 1}</span><strong>${label}</strong>`;
      steps.append(step);
    });

    intro.className = "import-panel import-panel--template";
    title.textContent = "1. Descarga la plantilla";
    description.textContent = "Utiliza la plantilla de demostración para conservar los encabezados y el orden esperado.";
    download.className = "registration-action registration-action--secondary";
    download.type = "button";
    download.textContent = "Descargar plantilla demo (.xlsx)";
    download.addEventListener("click", () => {
      const url = URL.createObjectURL(createTemplateWorkbook());
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-importacion-atet-demo.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    intro.append(title, description, download);

    function showFile(file) {
      const extension = `.${file.name.split(".").pop().toLocaleLowerCase("es")}`;
      let message = "";
      if (!config.acceptedExtensions.includes(extension)) message = "Selecciona un archivo con extensión .xlsx.";
      else if (file.size === 0) message = "El archivo está vacío.";
      else if (file.size > config.maximumBytes) message = "El archivo supera el tamaño máximo de 5 MB.";

      selectedFile = message ? null : file;
      fileInput.value = "";
      fileCard.replaceChildren();
      fileCard.hidden = Boolean(message) || !file;
      next.disabled = !selectedFile;
      dropTitle.textContent = selectedFile ? "Reemplazar archivo" : "Selecciona o arrastra tu archivo";
      status.className = `import-status${message ? " import-status--error" : ""}`;
      status.textContent = message || `${file.name} (${formatBytes(file.size)}) está listo para validar.`;
      if (selectedFile) {
        const fileName = document.createElement("strong");
        const fileMeta = document.createElement("span");
        fileName.textContent = file.name;
        fileMeta.textContent = `${formatBytes(file.size)} · Archivo seleccionado`;
        fileCard.append(fileName, fileMeta);
      }
    }

    upload.className = "import-panel";
    uploadTitle.textContent = "2. Carga el archivo completado";
    dropzone.className = "import-dropzone";
    dropzone.htmlFor = "atet-import-file";
    fileInput.id = "atet-import-file";
    fileInput.type = "file";
    fileInput.accept = config.acceptedExtensions.join(",");
    fileInput.className = "sr-only";
    dropIcon.className = "import-dropzone__icon";
    dropIcon.setAttribute("aria-hidden", "true");
    dropIcon.textContent = "⇧";
    dropTitle.textContent = "Selecciona o arrastra tu archivo";
    dropHelp.textContent = "Formato .xlsx · Tamaño máximo 5 MB";
    dropzone.append(fileInput, dropIcon, dropTitle, dropHelp);
    fileCard.className = "import-file-card";
    fileCard.hidden = true;
    status.className = "import-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) showFile(fileInput.files[0]);
    });
    ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    }));
    dropzone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files[0];
      if (file) showFile(file);
    });
    upload.append(uploadTitle, dropzone, fileCard, status);

    actions.className = "import-actions";
    cancel.className = "registration-action registration-action--secondary";
    cancel.href = "#mis-atet";
    cancel.textContent = "Cancelar";
    next.className = "registration-action registration-action--primary";
    next.type = "button";
    next.textContent = "Siguiente: validar datos";
    next.disabled = true;
    next.addEventListener("click", () => {
      if (!selectedFile) return;
      next.disabled = true;
      next.textContent = "Validando…";
      status.className = "import-status";
      status.textContent = "Leyendo el archivo y validando sus registros…";
      Promise.all([
        global.ATET_IMPORT_VALIDATION.parseWorkbook(selectedFile),
        loadValidationData()
      ])
        .then(([workbook, data]) => {
          const rows = global.ATET_IMPORT_VALIDATION.validateWorkbook(workbook, data.existingAtets, data.catalogs);
          showValidationResult(rows);
        })
        .catch((error) => {
          console.error("No se pudo validar la importación.", error);
          status.className = "import-status import-status--error";
          status.textContent = error.message || "No se pudo leer o validar el archivo seleccionado.";
          next.disabled = false;
          next.textContent = "Reintentar validación";
        });
    });
    actions.append(cancel, next);
    wrapper.append(back, steps, intro, upload, actions);
    container.replaceChildren(wrapper);
  }

  global.IMPORT_ATET_MODULE = Object.freeze({ render, createTemplateWorkbook });
})(window);
