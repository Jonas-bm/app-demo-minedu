(function configureAtetRegistration(global) {
  let existingAtetsPromise;
  let catalogsPromise;

  function loadExistingAtets() {
    if (!existingAtetsPromise) {
      existingAtetsPromise = fetch("../data/personal.json")
        .then((response) => {
          if (!response.ok) throw new Error("No se pudieron verificar los registros existentes.");
          return response.json();
        })
        .then((data) => data.atets)
        .catch((error) => {
          existingAtetsPromise = null;
          throw error;
        });
    }
    return existingAtetsPromise.then((atets) => atets.concat(global.DEMO_STORE.getRegistrations()));
  }

  function loadCatalogs() {
    if (!catalogsPromise) {
      catalogsPromise = fetch("../data/catalogos.json")
        .then((response) => {
          if (!response.ok) throw new Error("No se pudieron cargar los catálogos.");
          return response.json();
        })
        .catch((error) => {
          catalogsPromise = null;
          throw error;
        });
    }
    return catalogsPromise;
  }

  function createInputField(config) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const control = config.type === "select"
      ? document.createElement("select")
      : config.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");
    const error = document.createElement("p");

    field.className = `registration-field${config.fullWidth ? " registration-field--full" : ""}`;
    label.htmlFor = config.id;
    label.textContent = config.label;
    control.id = config.id;
    control.name = config.id;
    control.setAttribute("aria-describedby", `${config.id}-error`);

    if (control instanceof HTMLInputElement) control.type = config.type || "text";
    if (config.placeholder) control.placeholder = config.placeholder;
    if (config.autocomplete) control.autocomplete = config.autocomplete;
    if (config.readOnly) control.readOnly = true;
    if (config.required) control.required = true;

    if (control instanceof HTMLSelectElement) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = config.placeholder;
      control.append(option);
    }

    error.className = "registration-field__error";
    error.id = `${config.id}-error`;
    error.setAttribute("role", "alert");
    error.setAttribute("aria-live", "polite");
    field.append(label, control, error);
    return field;
  }

  function createFormSection(titleText, fields) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    const grid = document.createElement("div");
    fieldset.className = "registration-form__section";
    legend.textContent = titleText;
    grid.className = "registration-form__grid";
    fields.forEach((field) => grid.append(createInputField(field)));
    fieldset.append(legend, grid);
    return fieldset;
  }

  function showFieldError(form, id, message) {
    const control = form.elements.namedItem(id);
    const error = form.querySelector(`#${id}-error`);
    control.classList.toggle("is-invalid", Boolean(message));
    control.setAttribute("aria-invalid", String(Boolean(message)));
    error.textContent = message;
    return Boolean(message);
  }

  function requiredMessage(value, label) {
    return value.trim() ? "" : `${label} es obligatorio.`;
  }

  function validateIdentityAndContact(form, existingAtets) {
    const code = form.elements.namedItem("atet-code").value.trim();
    const dni = form.elements.namedItem("atet-dni").value.trim();
    const names = form.elements.namedItem("atet-names").value.trim();
    const surnames = form.elements.namedItem("atet-surnames").value.trim();
    const sinad = form.elements.namedItem("atet-sinad").value.trim();
    const phone = form.elements.namedItem("atet-phone").value.trim();
    const email = form.elements.namedItem("atet-email").value.trim();
    const serviceOrder = form.elements.namedItem("atet-service-order").value.trim();
    const normalizedCode = code.toLocaleLowerCase("es");
    const normalizedEmail = email.toLocaleLowerCase("es");
    const errors = {
      "atet-code": requiredMessage(code, "El código ATET") || (existingAtets.some((atet) => atet.codigo.toLocaleLowerCase("es") === normalizedCode) ? "Este código ATET ya está registrado." : ""),
      "atet-dni": requiredMessage(dni, "El DNI") || (!/^\d{8}$/.test(dni) ? "El DNI debe tener exactamente 8 dígitos." : existingAtets.some((atet) => atet.dni === dni) ? "Este DNI ya está registrado." : ""),
      "atet-names": requiredMessage(names, "Los nombres"),
      "atet-surnames": requiredMessage(surnames, "Los apellidos"),
      "atet-sinad": requiredMessage(sinad, "El SINAD"),
      "atet-phone": requiredMessage(phone, "El celular") || (!/^9\d{8}$/.test(phone) ? "Ingresa un celular peruano de 9 dígitos que empiece en 9." : ""),
      "atet-email": requiredMessage(email, "El correo electrónico") || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? "Ingresa un correo electrónico válido." : ""),
      "atet-service-order": requiredMessage(serviceOrder, "La orden de servicio")
    };
    let firstInvalidControl = null;

    Object.entries(errors).forEach(([id, message]) => {
      if (showFieldError(form, id, message) && !firstInvalidControl) {
        firstInvalidControl = form.elements.namedItem(id);
      }
    });

    return firstInvalidControl;
  }

  function validateLocation(form, catalogs, existingAtets) {
    const regionId = form.elements.namedItem("atet-region").value;
    const zoneId = form.elements.namedItem("atet-zone").value;
    const region = catalogs.regiones.find((item) => item.id === regionId);
    const zone = catalogs.zonas.find((item) => item.id === zoneId);
    const regionError = region ? "" : "Selecciona una región.";
    let zoneError = "";

    if (!zone) {
      zoneError = "Selecciona una zona disponible.";
    } else if (!region || zone.regionId !== region.id) {
      zoneError = "La zona no pertenece a la región seleccionada.";
    } else if (!zone.disponible || existingAtets.some((atet) => atet.zonaId === zone.id)) {
      zoneError = "Esta zona ya está asignada y no puede seleccionarse.";
    }

    const hasRegionError = showFieldError(form, "atet-region", regionError);
    const hasZoneError = showFieldError(form, "atet-zone", zoneError);
    return hasRegionError
      ? form.elements.namedItem("atet-region")
      : hasZoneError
        ? form.elements.namedItem("atet-zone")
        : null;
  }

  function validateDates(form) {
    const startDate = form.elements.namedItem("atet-start-date").value;
    const endDate = form.elements.namedItem("atet-end-date").value;
    const startError = startDate ? "" : "La fecha de inicio es obligatoria.";
    const endError = !endDate
      ? "La fecha de término es obligatoria."
      : startDate && endDate < startDate
        ? "La fecha de término no puede ser anterior a la fecha de inicio."
        : "";
    const hasStartError = showFieldError(form, "atet-start-date", startError);
    const hasEndError = showFieldError(form, "atet-end-date", endError);
    return hasStartError
      ? form.elements.namedItem("atet-start-date")
      : hasEndError
        ? form.elements.namedItem("atet-end-date")
        : null;
  }

  function createRegistration(form) {
    const uniquePart = global.crypto?.randomUUID
      ? global.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const registration = {
      id: `atet-local-${uniquePart}`,
      codigo: form.elements.namedItem("atet-code").value.trim(),
      nombreCompleto: `${form.elements.namedItem("atet-names").value.trim()} ${form.elements.namedItem("atet-surnames").value.trim()}`,
      dni: form.elements.namedItem("atet-dni").value.trim(),
      sinad: form.elements.namedItem("atet-sinad").value.trim(),
      celular: form.elements.namedItem("atet-phone").value.trim(),
      correo: form.elements.namedItem("atet-email").value.trim().toLocaleLowerCase("es"),
      ordenServicio: form.elements.namedItem("atet-service-order").value.trim(),
      regionId: form.elements.namedItem("atet-region").value,
      zonaId: form.elements.namedItem("atet-zone").value,
      fechaInicio: form.elements.namedItem("atet-start-date").value,
      fechaTermino: form.elements.namedItem("atet-end-date").value,
      estado: "activo"
    };
    return global.MACRO_CONTEXT
      ? global.MACRO_CONTEXT.stampOwnership(registration)
      : registration;
  }

  async function setupLocationFields(form, status) {
    const regionSelect = form.elements.namedItem("atet-region");
    const scopeInput = form.elements.namedItem("atet-scope");
    const zoneSelect = form.elements.namedItem("atet-zone");
    const denominationInput = form.elements.namedItem("atet-denomination");
    const zoneHelp = document.createElement("p");
    const denominationHelp = document.createElement("p");
    zoneHelp.className = "registration-field__help";
    zoneHelp.id = "atet-zone-help";
    zoneSelect.setAttribute("aria-describedby", "atet-zone-help atet-zone-error");
    zoneSelect.insertAdjacentElement("afterend", zoneHelp);
    denominationHelp.className = "registration-field__help";
    denominationHelp.id = "atet-denomination-help";
    denominationHelp.textContent = "Plantilla provisional para la maqueta, pendiente de fórmula oficial.";
    denominationInput.setAttribute("aria-describedby", "atet-denomination-help atet-denomination-error");
    denominationInput.insertAdjacentElement("afterend", denominationHelp);
    regionSelect.disabled = true;
    zoneSelect.disabled = true;
    status.textContent = "Cargando regiones y zonas…";

    try {
      const catalogs = await loadCatalogs();
      catalogs.regiones.forEach((region) => {
        const option = document.createElement("option");
        option.value = region.id;
        option.textContent = region.nombre;
        regionSelect.append(option);
      });
      regionSelect.disabled = false;
      status.textContent = "";

      function updateLocation() {
        const region = catalogs.regiones.find((item) => item.id === regionSelect.value);
        const scope = catalogs.ambitos.find((item) => item.id === region?.ambitoId);
        const zones = region ? catalogs.zonas.filter((item) => item.regionId === region.id) : [];
        const locallyOccupiedZones = new Set(global.DEMO_STORE.getRegistrations().map((atet) => atet.zonaId));
        const isAvailable = (zone) => zone.disponible && !locallyOccupiedZones.has(zone.id);
        const availableZones = zones.filter(isAvailable).length;
        scopeInput.value = scope?.nombre || "";
        zoneSelect.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = region ? "Selecciona una zona disponible" : "Selecciona primero una región";
        zoneSelect.append(placeholder);

        zones.forEach((zone) => {
          const option = document.createElement("option");
          option.value = zone.id;
          option.textContent = `${zone.nombre} — ${isAvailable(zone) ? "Disponible" : "Asignada"}`;
          option.disabled = !isAvailable(zone);
          zoneSelect.append(option);
        });
        zoneSelect.disabled = !region;
        denominationInput.value = "";
        zoneHelp.textContent = region
          ? `${availableZones} de ${zones.length} zonas disponibles en ${region.nombre}.`
          : "Elige una región para consultar sus zonas.";
        showFieldError(form, "atet-region", "");
        showFieldError(form, "atet-zone", "");
      }

      function updateDenomination() {
        const region = catalogs.regiones.find((item) => item.id === regionSelect.value);
        const scope = catalogs.ambitos.find((item) => item.id === region?.ambitoId);
        const occupiedZones = new Set(global.DEMO_STORE.getRegistrations().map((atet) => atet.zonaId));
        const zone = catalogs.zonas.find((item) => item.id === zoneSelect.value && item.regionId === region?.id && item.disponible && !occupiedZones.has(item.id));
        denominationInput.value = global.SERVICE_DENOMINATION.generate({
          region: region?.nombre,
          scope: scope?.nombre,
          zoneNumber: zone?.numero
        });
      }

      regionSelect.addEventListener("change", updateLocation);
      zoneSelect.addEventListener("change", updateDenomination);
      form.addEventListener("reset", () => setTimeout(updateLocation, 0));
      updateLocation();
    } catch (error) {
      console.error("Error al preparar la ubicación ATET.", error);
      status.textContent = "No pudimos cargar regiones y zonas. Ejecuta la aplicación desde un servidor local e inténtalo nuevamente.";
    }
  }

  function render(container) {
    const form = document.createElement("form");
    const note = document.createElement("p");
    const actions = document.createElement("div");
    const cancel = document.createElement("a");
    const clear = document.createElement("button");
    const save = document.createElement("button");
    const status = document.createElement("p");
    let isSubmitting = false;

    form.className = "registration-form";
    form.id = "registration-form";
    form.noValidate = true;
    form.setAttribute("aria-describedby", "registration-form-note");
    note.className = "registration-form__note";
    note.id = "registration-form-note";
    note.textContent = "Los campos marcados como obligatorios se validarán antes de guardar.";

    form.append(
      note,
      createFormSection("Datos del ATET", [
        { id: "atet-code", label: "Código ATET (obligatorio)", placeholder: "Ej. ATET-001", required: true },
        { id: "atet-dni", label: "DNI (obligatorio)", placeholder: "8 dígitos", autocomplete: "off", required: true },
        { id: "atet-names", label: "Nombres (obligatorio)", placeholder: "Nombres", autocomplete: "given-name", required: true },
        { id: "atet-surnames", label: "Apellidos (obligatorio)", placeholder: "Apellidos", autocomplete: "family-name", required: true },
        { id: "atet-sinad", label: "SINAD (obligatorio)", placeholder: "Código SINAD", required: true },
        { id: "atet-phone", label: "Celular (obligatorio)", placeholder: "9 dígitos", autocomplete: "tel", required: true },
        { id: "atet-email", label: "Correo electrónico (obligatorio)", type: "email", placeholder: "correo@ejemplo.gob.pe", autocomplete: "email", required: true },
        { id: "atet-service-order", label: "Orden de servicio (obligatorio)", placeholder: "Número de O/S", required: true }
      ]),
      createFormSection("Ubicación del servicio", [
        { id: "atet-region", label: "Región (obligatorio)", type: "select", placeholder: "Selecciona una región", required: true },
        { id: "atet-scope", label: "Ámbito", placeholder: "Se completará automáticamente", readOnly: true },
        { id: "atet-zone", label: "Zona (obligatorio)", type: "select", placeholder: "Selecciona una zona", required: true }
      ]),
      createFormSection("Denominación del servicio", [
        { id: "atet-denomination", label: "Denominación generada automáticamente", type: "textarea", placeholder: "Se generará al seleccionar región y zona", readOnly: true, fullWidth: true }
      ]),
      createFormSection("Fechas del servicio", [
        { id: "atet-start-date", label: "Fecha de inicio (obligatorio)", type: "date", required: true },
        { id: "atet-end-date", label: "Fecha de término (obligatorio)", type: "date", required: true }
      ])
    );

    actions.className = "registration-form__actions";
    cancel.className = "registration-action registration-action--secondary";
    cancel.href = "#mis-atet";
    cancel.textContent = "Cancelar";
    clear.className = "registration-action registration-action--secondary";
    clear.type = "reset";
    clear.textContent = "Limpiar";
    save.className = "registration-action registration-action--primary";
    save.type = "submit";
    save.textContent = "Guardar ATET";
    status.className = "registration-form__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.append(cancel, clear, save);
    form.append(actions, status);
    setupLocationFields(form, status);

    form.addEventListener("input", (event) => {
      if (event.target.matches("input, select, textarea")) {
        showFieldError(form, event.target.name, "");
        status.textContent = "";
      }
    });
    form.addEventListener("reset", () => {
      form.querySelectorAll(".registration-field__error").forEach((error) => {
        error.textContent = "";
      });
      form.querySelectorAll(".is-invalid").forEach((control) => {
        control.classList.remove("is-invalid");
        control.setAttribute("aria-invalid", "false");
      });
      status.textContent = "El formulario se limpió.";
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;
      save.disabled = true;
      status.textContent = "Verificando datos…";
      try {
        const [existingAtets, catalogs] = await Promise.all([loadExistingAtets(), loadCatalogs()]);
        const firstInvalidControl = validateIdentityAndContact(form, existingAtets);
        if (firstInvalidControl) {
          status.textContent = "Corrige los campos indicados antes de continuar.";
          firstInvalidControl.focus();
          isSubmitting = false;
          save.disabled = false;
          return;
        }
        const firstInvalidLocation = validateLocation(form, catalogs, existingAtets);
        if (firstInvalidLocation) {
          status.textContent = "Selecciona una región y una zona disponible para continuar.";
          firstInvalidLocation.focus();
          isSubmitting = false;
          save.disabled = false;
          return;
        }
        const firstInvalidDate = validateDates(form);
        if (firstInvalidDate) {
          status.textContent = "Corrige las fechas del servicio antes de guardar.";
          firstInvalidDate.focus();
          isSubmitting = false;
          save.disabled = false;
          return;
        }

        const registration = createRegistration(form);
        const confirmed = global.confirm(`¿Deseas guardar el ATET ${registration.codigo}?`);
        if (!confirmed) {
          status.textContent = "El guardado fue cancelado. Puedes continuar editando el formulario.";
          isSubmitting = false;
          save.disabled = false;
          return;
        }

        global.DEMO_STORE.addRegistration(registration);
        global.DEMO_STORE.setFlash(`El ATET ${registration.codigo} se guardó correctamente.`);
        global.location.hash = "mis-atet";
      } catch (error) {
        console.error("Error al validar el registro ATET.", error);
        status.textContent = "No pudimos validar o guardar el ATET. Ejecuta la aplicación desde un servidor local e inténtalo nuevamente.";
        isSubmitting = false;
        save.disabled = false;
      }
    });

    container.replaceChildren(form);
  }

  global.REGISTER_ATET_MODULE = Object.freeze({ render });
})(window);
