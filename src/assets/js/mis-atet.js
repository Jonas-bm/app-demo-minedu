(function configureAtetModule(global) {
  let dataPromise;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch("../data/personal.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los datos ATET.");
          return response.json();
        }),
        fetch("../data/catalogos.json").then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los catálogos ATET.");
          return response.json();
        })
      ])
        .catch((error) => {
          dataPromise = null;
          throw error;
        });
    }
    return dataPromise;
  }

  function normalizeSearchValue(value) {
    return String(value || "")
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function mergeLocalRegistrations(data) {
    const context = global.MACRO_CONTEXT ? global.MACRO_CONTEXT.get() : { isDemoMacro: true };
    const ownRegistrations = global.MACRO_CONTEXT
      ? global.MACRO_CONTEXT.ownRegistrations(context)
      : global.DEMO_STORE.getRegistrations();
    // El Macro demo mantiene su padrón precargado; un Macro creado por el
    // Administrador solo ve los ATET que él mismo registró o importó.
    const atets = context.isDemoMacro
      ? data.atets.concat(ownRegistrations)
      : ownRegistrations;
    return { ...data, atets };
  }

  function createAtetStatus(status) {
    const badge = document.createElement("span");
    const label = status === "activo" ? "Activo" : status;
    badge.className = `atet-status atet-status--${status}`;
    badge.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>';
    const text = document.createElement("span");
    text.textContent = label;
    badge.append(text);
    return badge;
  }

  function createAtetTable(items) {
    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    const caption = document.createElement("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");

    wrapper.className = "atet-table-wrapper";
    table.className = "atet-table";
    caption.className = "sr-only";
    caption.textContent = "Listado de ATET registrados";
    ["Código", "Nombres y apellidos", "DNI", "Orden de servicio", "Estado", "Acción"].forEach((header) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = header;
      headRow.append(cell);
    });

    items.forEach((atet) => {
      const row = document.createElement("tr");
      [atet.codigo, atet.nombreCompleto, atet.dni, atet.ordenServicio].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const statusCell = document.createElement("td");
      const actionCell = document.createElement("td");
      const detailLink = document.createElement("a");
      statusCell.append(createAtetStatus(atet.estado));
      detailLink.className = "atet-detail-link";
      detailLink.href = `#detalle-atet/${encodeURIComponent(atet.id)}`;
      detailLink.textContent = "Ver detalle";
      detailLink.setAttribute("aria-label", `Ver detalle de ${atet.nombreCompleto}`);
      actionCell.append(detailLink);
      row.append(statusCell, actionCell);
      body.append(row);
    });

    head.append(headRow);
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function createFilterField(id, labelText, defaultText) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const defaultOption = document.createElement("option");
    field.className = "atet-filter-field";
    label.htmlFor = id;
    label.textContent = labelText;
    select.id = id;
    select.name = id;
    defaultOption.value = "";
    defaultOption.textContent = defaultText;
    select.append(defaultOption);
    field.append(label, select);
    return { field, select };
  }

  function appendOptions(select, items, getLabel = (item) => item.nombre) {
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = getLabel(item);
      select.append(option);
    });
  }

  function createPagination(totalItems, pageSize, currentPage, onPageChange) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const nav = document.createElement("nav");
    const previous = document.createElement("button");
    const info = document.createElement("span");
    const next = document.createElement("button");
    nav.className = "table-pagination";
    nav.setAttribute("aria-label", "Paginación de ATET registrados");
    previous.type = "button";
    previous.textContent = "Anterior";
    previous.disabled = currentPage === 1;
    info.textContent = `Página ${currentPage} de ${totalPages}`;
    info.setAttribute("aria-live", "polite");
    next.type = "button";
    next.textContent = "Siguiente";
    next.disabled = currentPage === totalPages;
    previous.addEventListener("click", () => onPageChange(currentPage - 1));
    next.addEventListener("click", () => onPageChange(currentPage + 1));
    nav.append(previous, info, next);
    return nav;
  }

  function renderAtetList(container, atets, catalogs) {
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const counter = document.createElement("p");
    const headingActions = document.createElement("div");
    const importLink = document.createElement("a");
    const searchField = document.createElement("div");
    const searchLabel = document.createElement("label");
    const searchInput = document.createElement("input");
    const filters = document.createElement("div");
    const regionFilter = createFilterField("atet-region-filter", "Región", "Todas las regiones");
    const scopeFilter = createFilterField("atet-scope-filter", "Ámbito", "Todos los ámbitos");
    const zoneFilter = createFilterField("atet-zone-filter", "Zona", "Todas las zonas");
    const statusFilter = createFilterField("atet-status-filter", "Estado", "Todos los estados");
    const clearButton = document.createElement("button");
    const results = document.createElement("div");
    const regionMap = new Map(catalogs.regiones.map((region) => [region.id, region]));
    // Las zonas presentes se derivan de los ATET listados (ya no hay catálogo
    // fijo de zonas): cada `zonaId` se resuelve a su región y número.
    const assignedZones = [...new Set(atets.map((atet) => atet.zonaId))]
      .map((zonaId) => global.DEMO_ZONAS.resolve(zonaId))
      .filter(Boolean);
    const pageSize = 5;
    let currentPage = 1;

    section.className = "atet-list";
    heading.className = "atet-list__heading";
    title.textContent = "ATET registrados";
    headingActions.className = "atet-list__heading-actions";
    importLink.className = "atet-list__import-link";
    importLink.href = "#importar-atet";
    importLink.textContent = "Importar ATET";
    counter.className = "atet-list__counter";
    counter.setAttribute("aria-live", "polite");
    searchField.className = "atet-search";
    searchLabel.htmlFor = "atet-search-input";
    searchLabel.textContent = "Buscar ATET";
    searchInput.id = "atet-search-input";
    searchInput.type = "search";
    searchInput.placeholder = "Código, nombre, DNI u orden de servicio";
    searchInput.autocomplete = "off";
    filters.className = "atet-filters";
    clearButton.className = "atet-filters__clear";
    clearButton.type = "button";
    clearButton.textContent = "Limpiar filtros";
    results.className = "atet-list__results";

    appendOptions(regionFilter.select, catalogs.regiones);
    appendOptions(scopeFilter.select, catalogs.ambitos);
    appendOptions(statusFilter.select, catalogs.estados.atet);

    function updateZoneOptions() {
      const previousValue = zoneFilter.select.value;
      const matchingZones = assignedZones.filter((zone) => {
        if (regionFilter.select.value && zone.regionId !== regionFilter.select.value) return false;
        const region = regionMap.get(zone.regionId);
        return !scopeFilter.select.value || region?.ambitoId === scopeFilter.select.value;
      });
      zoneFilter.select.replaceChildren();
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Todas las zonas";
      zoneFilter.select.append(defaultOption);
      appendOptions(zoneFilter.select, matchingZones, (zone) => {
        const region = regionMap.get(zone.regionId);
        return `${region?.nombre || "Región"} — ${zone.nombre}`;
      });
      zoneFilter.select.value = matchingZones.some((zone) => zone.id === previousValue) ? previousValue : "";
    }

    function updateResults(resetPage = false) {
      const query = normalizeSearchValue(searchInput.value);
      const filtered = atets.filter((atet) => {
        const region = regionMap.get(atet.regionId);
        const searchable = [atet.codigo, atet.nombreCompleto, atet.dni, atet.ordenServicio]
          .map(normalizeSearchValue)
          .join(" ");
        return searchable.includes(query)
          && (!regionFilter.select.value || atet.regionId === regionFilter.select.value)
          && (!scopeFilter.select.value || region?.ambitoId === scopeFilter.select.value)
          && (!zoneFilter.select.value || atet.zonaId === zoneFilter.select.value)
          && (!statusFilter.select.value || atet.estado === statusFilter.select.value);
      });

      if (resetPage) currentPage = 1;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      currentPage = Math.min(currentPage, totalPages);
      const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      counter.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
      results.replaceChildren();
      if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "atet-list__empty";
        empty.textContent = "No encontramos ATET que coincidan con la búsqueda y los filtros seleccionados.";
        results.append(empty);
      } else {
        results.append(
          createAtetTable(pageItems),
          createPagination(filtered.length, pageSize, currentPage, (page) => {
            currentPage = page;
            updateResults();
          })
        );
      }
    }

    searchInput.addEventListener("input", () => updateResults(true));
    [regionFilter.select, scopeFilter.select].forEach((select) => {
      select.addEventListener("change", () => {
        updateZoneOptions();
        updateResults(true);
      });
    });
    [zoneFilter.select, statusFilter.select].forEach((select) => {
      select.addEventListener("change", () => updateResults(true));
    });
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      regionFilter.select.value = "";
      scopeFilter.select.value = "";
      statusFilter.select.value = "";
      updateZoneOptions();
      updateResults(true);
      searchInput.focus();
    });
    headingActions.append(counter, importLink);
    heading.append(title, headingActions);
    searchField.append(searchLabel, searchInput);
    filters.append(
      regionFilter.field,
      scopeFilter.field,
      zoneFilter.field,
      statusFilter.field,
      clearButton
    );
    section.append(heading, searchField, filters, results);
    container.append(section);
    updateZoneOptions();
    updateResults();
  }

  function formatDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(year, month - 1, day));
  }

  function createDetailGroup(titleText, fields) {
    const section = document.createElement("section");
    const title = document.createElement("h3");
    const list = document.createElement("dl");
    section.className = "atet-detail__section";
    title.textContent = titleText;
    list.className = "atet-detail__fields";

    fields.forEach(([label, value, fullWidth = false]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      if (fullWidth) item.className = "atet-detail__field--full";
      term.textContent = label;
      if (value instanceof Node) {
        description.append(value);
      } else {
        description.textContent = value || "No registrado";
      }
      item.append(term, description);
      list.append(item);
    });

    section.append(title, list);
    return section;
  }

  async function renderDetail(container, atetId, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando detalle ATET…</p>';

    try {
      const [baseData, catalogs] = await loadData();
      if (!isCurrent()) return;
      const data = mergeLocalRegistrations(baseData);
      const atet = data.atets.find((item) => item.id === atetId);

      if (!atet) {
        container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No encontramos el ATET solicitado.</strong><span>El registro puede no existir o ya no estar disponible.</span><a class="atet-back-link" href="#mis-atet">← Atrás</a></div>';
        return;
      }

      const region = catalogs.regiones.find((item) => item.id === atet.regionId);
      const zone = global.DEMO_ZONAS.resolve(atet.zonaId);
      const scope = catalogs.ambitos.find((item) => item.id === region?.ambitoId);

      if (!region || !zone || !scope) throw new Error("El ATET tiene una asignación territorial incompleta.");

      const wrapper = document.createElement("div");
      const toolbar = document.createElement("div");
      const backLink = document.createElement("a");
      const status = createAtetStatus(atet.estado);
      wrapper.className = "atet-detail";
      toolbar.className = "atet-detail__toolbar";
      backLink.className = "atet-back-link";
      backLink.href = "#mis-atet";
      backLink.textContent = "← Atrás";
      backLink.setAttribute("aria-label", "Atrás, volver a Mis ATET");
      toolbar.append(backLink, status);

      wrapper.append(
        toolbar,
        createDetailGroup("Datos del ATET", [
          ["Código ATET", atet.codigo],
          ["Nombres y apellidos", atet.nombreCompleto],
          ["DNI", atet.dni],
          ["SINAD", atet.sinad],
          ["Celular", atet.celular],
          ["Correo electrónico", atet.correo]
        ]),
        createDetailGroup("Servicio y asignación", [
          ["Orden de servicio", atet.ordenServicio],
          ["Región", region.nombre],
          ["Ámbito", scope.nombre],
          ["Zona", zone.nombre],
          ["Denominación provisional de demostración", global.SERVICE_DENOMINATION.generate({ region: region.nombre, scope: scope.nombre, zoneNumber: zone.numero }), true]
        ]),
        createDetailGroup("Fechas del servicio", [
          ["Fecha de inicio", formatDate(atet.fechaInicio)],
          ["Fecha de término", formatDate(atet.fechaTermino)]
        ])
      );
      container.replaceChildren(wrapper);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Error al cargar el detalle ATET.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el detalle ATET.</strong><span>Verifica los datos del registro e inténtalo nuevamente.</span><a class="atet-back-link" href="#mis-atet">← Atrás</a></div>';
    }
  }

  async function render(container, isCurrent = () => true) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando ATET registrados…</p>';

    try {
      const [baseData, catalogs] = await loadData();
      if (!isCurrent()) return;
      const data = mergeLocalRegistrations(baseData);
      container.replaceChildren();
      renderAtetList(container, data.atets, catalogs);
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
      console.error("Error al cargar Mis ATET.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el resumen ATET.</strong><span>Verifica que la aplicación se esté ejecutando desde un servidor local e inténtalo nuevamente.</span></div>';
    }
  }

  global.MIS_ATET_MODULE = Object.freeze({ render, renderDetail });
})(window);
