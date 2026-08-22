(function configureHistoryModule(global) {
  let historyPromise;

  function loadHistory() {
    if (!historyPromise) {
      historyPromise = fetch("../data/historial.json")
        .then((response) => {
          if (!response.ok) throw new Error("No se pudo cargar el historial.");
          return response.json();
        })
        .catch((error) => {
          historyPromise = null;
          throw error;
        });
    }
    return historyPromise;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function createTable(records) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");
    wrapper.className = "history-table-wrapper";
    table.className = "history-table";
    caption.className = "sr-only";
    caption.textContent = "Historial de acciones sobre presentaciones";
    ["Fecha y hora", "Acción", "Usuario", "Entregable", "Detalle"].forEach((text) => {
      const header = document.createElement("th");
      header.scope = "col";
      header.textContent = text;
      headRow.append(header);
    });
    records.forEach((record) => {
      const row = document.createElement("tr");
      const values = [formatDateTime(record.fecha), record.accion === "actualizacion" ? "Actualización" : "Creación", record.usuario, record.entidadId, record.detalle];
      values.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 1) cell.className = `history-action history-action--${record.accion}`;
        row.append(cell);
      });
      body.append(row);
    });
    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function renderHistory(container, records) {
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const counter = document.createElement("p");
    const controls = document.createElement("div");
    const searchField = document.createElement("div");
    const searchLabel = document.createElement("label");
    const search = document.createElement("input");
    const actionField = document.createElement("div");
    const actionLabel = document.createElement("label");
    const action = document.createElement("select");
    const clear = document.createElement("button");
    const results = document.createElement("div");
    const pageSize = 5;
    let currentPage = 1;
    section.className = "history-list";
    heading.className = "history-list__heading";
    title.textContent = "Acciones registradas";
    counter.setAttribute("aria-live", "polite");
    controls.className = "history-filters";
    searchField.className = "deliverable-filter";
    searchLabel.htmlFor = "history-search";
    searchLabel.textContent = "Buscar";
    search.id = "history-search";
    search.type = "search";
    search.placeholder = "Entregable, usuario o detalle";
    actionField.className = "deliverable-filter";
    actionLabel.htmlFor = "history-action-filter";
    actionLabel.textContent = "Acción";
    action.id = "history-action-filter";
    [["", "Todas las acciones"], ["creacion", "Creación"], ["actualizacion", "Actualización"]].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      action.append(option);
    });
    clear.className = "atet-filters__clear";
    clear.type = "button";
    clear.textContent = "Limpiar filtros";
    results.className = "history-list__results";

    function update(resetPage = false) {
      const query = normalize(search.value);
      const filtered = records.filter((record) =>
        (!action.value || record.accion === action.value)
        && normalize([record.entidadId, record.usuario, record.detalle].join(" ")).includes(query)
      );
      if (resetPage) currentPage = 1;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      counter.textContent = `${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}`;
      results.replaceChildren();
      if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "atet-list__empty";
        empty.textContent = "No existen acciones que coincidan con los filtros.";
        results.append(empty);
        return;
      }
      const pagination = document.createElement("nav");
      const previous = document.createElement("button");
      const info = document.createElement("span");
      const next = document.createElement("button");
      pagination.className = "table-pagination";
      pagination.setAttribute("aria-label", "Paginación del historial");
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

    search.addEventListener("input", () => update(true));
    action.addEventListener("change", () => update(true));
    clear.addEventListener("click", () => { search.value = ""; action.value = ""; update(true); search.focus(); });
    searchField.append(searchLabel, search);
    actionField.append(actionLabel, action);
    heading.append(title, counter);
    controls.append(searchField, actionField, clear);
    section.append(heading, controls, results);
    container.append(section);
    update();
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando historial…</p>';
    try {
      const base = await loadHistory();
      if (!isCurrent()) return;
      const records = base.registros.concat(global.DEMO_STORE.getAudit())
        .sort((first, second) => second.fecha.localeCompare(first.fecha));
      container.replaceChildren();
      renderHistory(container, records);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("No se pudo cargar el historial.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el historial.</strong><span>Verifica los datos y vuelve a intentarlo.</span></div>';
    }
  }

  global.HISTORY_MODULE = Object.freeze({ render });
})(window);
