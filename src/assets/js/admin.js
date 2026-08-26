(function configureAdminModule(global) {
  const usersKey = "demoAdminUsers";
  const atetStateKey = "demoAdminAtetState";
  const macroAssignmentsKey = "demoMacroAssignments";
  let dataPromise;

  const seedUsers = [
    { id: "USR-001", usuario: "macro.demo", nombre: "Macro Demo", rol: "Macro", estado: "Activo" },
    { id: "USR-002", usuario: "gestor.demo", nombre: "Gestor Demo", rol: "Gestor de la Información", estado: "Activo" },
    { id: "USR-003", usuario: "jefe.demo", nombre: "Jefe Demo", rol: "Jefe", estado: "Activo" },
    { id: "USR-004", usuario: "admin.demo", nombre: "Administrador Demo", rol: "Administrador", estado: "Activo" }
  ];
  const seedMacroAssignments = [
    { id: "ASG-001", macroId: "USR-001", macro: "Macro Demo", group: "Grupo 01", regionId: "reg-amazonas", assigned: 50, status: "Activo" },
    { id: "ASG-002", macroId: "macro-norte-demo", macro: "Macro Norte Demo", group: "Grupo 02", regionId: "reg-loreto", assigned: 40, status: "Activo" },
    { id: "ASG-003", macroId: "macro-centro-demo", macro: "Macro Centro Demo", group: "Grupo 03", regionId: "reg-lima", assigned: 35, status: "Activo" }
  ];

  function loadData() {
    if (!dataPromise) dataPromise = Promise.all([
      fetch("../data/dashboard.json").then((response) => response.json()),
      fetch("../data/personal.json").then((response) => response.json()),
      fetch("../data/catalogos.json").then((response) => response.json())
    ]).catch((error) => { dataPromise = null; throw error; });
    return dataPromise;
  }

  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value || fallback; }
    catch { return fallback; }
  }

  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function users() { return read(usersKey, seedUsers).map((item) => ({ ...item, rol: item.rol === "Administrador" && item.usuario !== "admin.demo" ? "Jefe" : item.rol })); }
  function macroAssignments() { return read(macroAssignmentsKey, seedMacroAssignments); }
  function atetState() { return read(atetStateKey, {}); }
  function escape(value) { return String(value ?? "—").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
  function date(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(parsed); }
  function card(label, value, detail) { return `<article class="admin-card"><span>${escape(label)}</span><strong>${escape(value)}</strong><small>${escape(detail)}</small></article>`; }
  function notice() { return '<p class="registration-form__note admin-demo-note"><strong>Modo demostración:</strong> todas las identidades, accesos, firmas, cifras y operaciones de esta sección son simulados.</p>'; }
  function table(headers, rows) { return `<div class="admin-table-wrap" data-admin-paged-table><table class="admin-table"><thead><tr>${headers.map((item) => `<th scope="col">${escape(item)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`; }

  function activateAdminPagination(container) {
    container.querySelectorAll("[data-admin-paged-table]:not([data-pagination-ready])").forEach((wrapper, tableIndex) => {
      wrapper.dataset.paginationReady = "true";
      const rows = [...wrapper.querySelectorAll("tbody > tr")];
      const tableElement = wrapper.querySelector("table");
      const pageSize = 5;
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      let currentPage = 1;
      let changingPage = false;
      const pager = document.createElement("nav");
      const previous = document.createElement("button");
      const status = document.createElement("span");
      const next = document.createElement("button");
      pager.className = "table-pagination admin-table-pagination";
      pager.setAttribute("aria-label", `Paginación de tabla administrativa ${tableIndex + 1}`);
      previous.type = next.type = "button";
      previous.textContent = "Anterior";
      next.textContent = "Siguiente";
      status.setAttribute("aria-live", "polite");
      function renderPage(page) {
        currentPage = Math.min(totalPages, Math.max(1, page));
        rows.forEach((row, index) => { row.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize; });
        previous.disabled = currentPage === 1;
        next.disabled = currentPage === totalPages;
        status.textContent = `Página ${currentPage} de ${totalPages}`;
      }
      function showPage(page, animate = true) {
        const targetPage = Math.min(totalPages, Math.max(1, page));
        if (targetPage === currentPage || changingPage) return;
        const reducedMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!animate || reducedMotion) { renderPage(targetPage); return; }
        changingPage = true;
        previous.disabled = true;
        next.disabled = true;
        wrapper.classList.add("is-page-leaving");
        global.setTimeout(() => {
          wrapper.classList.remove("is-page-leaving");
          wrapper.classList.add("is-page-entering");
          renderPage(targetPage);
          tableElement.getBoundingClientRect();
          global.requestAnimationFrame(() => {
            wrapper.classList.remove("is-page-entering");
            global.setTimeout(() => { changingPage = false; previous.disabled = currentPage === 1; next.disabled = currentPage === totalPages; }, 180);
          });
        }, 130);
      }
      previous.addEventListener("click", () => showPage(currentPage - 1));
      next.addEventListener("click", () => showPage(currentPage + 1));
      pager.append(previous, status, next);
      wrapper.after(pager);
      renderPage(1);
    });
  }

  async function renderDashboard(container) {
    const [dashboard, personal] = await loadData();
    const registrations = global.DEMO_STORE.getRegistrations();
    const reports = global.DEMO_STORE.getReports();
    const activeUsers = users().filter((item) => item.estado === "Activo");
    const totalAtet = personal.atets.length + registrations.length;
    const errors = global.DEMO_STORE.getAudit().filter((item) => item.nivel === "error").length;
    container.innerHTML = `${notice()}<div class="admin-cards">${card("Usuarios", users().length, `${activeUsers.length} activos`)}${card("Macros", activeUsers.filter((item) => item.rol === "Macro").length, "Con acceso demo")}${card("ATET registrados", totalAtet, `${registrations.length} incorporados localmente`)}${card("Informes generados", reports.length, "Con numeración demo")}</div>
      <div class="admin-grid"><section class="admin-panel"><h3>Estado del sistema</h3><ul class="admin-status"><li><span class="dot dot--ok"></span>Macros activos <strong>${activeUsers.filter((item) => item.rol === "Macro").length}</strong></li><li><span class="dot dot--ok"></span>Gestores activos <strong>${activeUsers.filter((item) => item.rol === "Gestor de la Información").length}</strong></li><li><span class="dot dot--ok"></span>Jefes activos <strong>${activeUsers.filter((item) => item.rol === "Jefe").length}</strong></li><li><span class="dot dot--warn"></span>ATET pendientes de registro <strong>${Math.max(0, (dashboard.asignacion?.totalAsignados || totalAtet) - totalAtet)}</strong></li><li><span class="dot dot--error"></span>Eventos con error <strong>${errors}</strong></li></ul></section>
      <section class="admin-panel"><h3>Acciones rápidas</h3><div class="admin-actions"><a href="#usuarios-admin">Crear usuario demo</a><a href="#macros-admin">Revisar asignaciones</a><a href="#parametros-admin">Configurar catálogos</a><a href="#auditoria-admin">Ver auditoría</a></div></section></div>
      <section class="admin-panel"><h3>Última actividad</h3>${renderAuditTable(global.DEMO_STORE.getAudit().slice(-5).reverse())}</section>`;
  }

  function auditRoute(item) {
    const entity = String(item.entidad || "").toLocaleLowerCase("es");
    if (entity === "usuarios") return "usuarios-admin";
    if (entity === "atet") return "atet-admin";
    if (entity === "parametros") return "parametros-admin";
    if (entity === "importaciones") return "atet-admin";
    if (entity === "asignaciones-macro") return "macros-admin";
    if (entity.includes("macro")) return "macros-admin";
    return "";
  }

  function actionKind(action) {
    const value = String(action || "").toLocaleLowerCase("es");
    if (["crear", "creacion", "inicio"].includes(value)) return "create";
    if (value.includes("correg") || value.includes("actual") || value.includes("estado")) return "update";
    if (value.includes("desactiv") || value.includes("elimin")) return "delete";
    if (value.includes("consulta") || value.includes("visual")) return "view";
    return "other";
  }

  function initials(name) {
    return String(name || "U").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function auditModuleLabel(entity) {
    const labels = {
      ATET: "ATET",
      usuarios: "Usuarios",
      parametros: "Parámetros generales",
      importaciones: "Importaciones",
      "asignaciones-macro": "Asignación de ATET",
      informe: "Informes",
      "evaluacion-entregable": "Evaluaciones",
      "presentacion-entregable": "Entregables",
      sesión: "Sesión"
    };
    return labels[entity] || String(entity || "Sistema").replaceAll("-", " ");
  }

  function auditRecordLabel(item) {
    if (item.entidadId === "anio-catalogo-entregable") return "Año del catálogo";
    return item.entidadId || "—";
  }

  function auditFieldLabel(key) {
    const labels = {
      nombre: "Nombre",
      dni: "DNI",
      ordenServicio: "Orden de servicio",
      estado: "Estado",
      year: "Año",
      cantidad: "Cantidad",
      codigos: "Códigos",
      macroId: "Código del Macro",
      macro: "Macro",
      group: "Grupo",
      regionId: "Región",
      assigned: "ATET asignados",
      status: "Estado"
    };
    return labels[key] || String(key).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
  }

  function auditValueHtml(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return `<div class="audit-value-fields">${Object.entries(value).map(([key, fieldValue]) => `<div><span>${escape(auditFieldLabel(key))}</span><strong>${escape(Array.isArray(fieldValue) ? fieldValue.join(", ") : fieldValue)}</strong></div>`).join("")}</div>`;
    }
    if (Array.isArray(value)) return `<p class="audit-value-text">${escape(value.join(", "))}</p>`;
    return `<p class="audit-value-text">${escape(value)}</p>`;
  }

  function renderAuditTable(entries) {
    if (!entries.length) return '<p class="atet-state">Aún no hay eventos locales. Las operaciones nuevas aparecerán aquí.</p>';
    return `<div class="admin-table-wrap audit-table-wrap" data-admin-paged-table><table class="admin-table audit-table"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Rol</th><th>Módulo</th><th>Acción</th><th>Descripción</th><th>Registro afectado</th><th>Detalle</th></tr></thead><tbody>${entries.map((item, index) => {
      const route = auditRoute(item);
      const record = escape(auditRecordLabel(item));
      return `<tr><td class="audit-date">${escape(date(item.fecha))}</td><td><span class="audit-user"><span class="audit-user__avatar">${escape(initials(item.usuario))}</span>${escape(item.usuario)}</span></td><td class="audit-role">${escape(item.rol || "Demo")}</td><td class="audit-module">${escape(auditModuleLabel(item.entidad))}</td><td><span class="audit-action audit-action--${actionKind(item.accion)}">${escape(item.accion)}</span></td><td class="audit-description">${escape(item.detalle)}</td><td class="audit-record">${route ? `<a class="audit-record-link" href="#${route}" title="Abrir ${escape(auditModuleLabel(item.entidad))}">${record}</a>` : `<span class="audit-record-code">${record}</span>`}</td><td><button class="audit-detail-button" type="button" data-audit-detail="${index}" aria-label="Ver detalle de ${record}">Ver</button></td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.]+/g, ".").replace(/^\.+|\.+$/g, "");
  }

  function openUserModal(container, currentUsers) {
    const dialog = document.createElement("dialog");
    dialog.className = "admin-user-modal";
    dialog.innerHTML = `<form class="admin-user-form" method="dialog" novalidate>
      <header class="admin-user-modal__header"><div><h3>Agregar nuevo usuario</h3><p>Registra una cuenta ficticia y asígnale el rol correspondiente.</p></div><button class="admin-user-modal__close" type="button" aria-label="Cerrar modal">×</button></header>
      <div class="admin-user-modal__body">
        <p class="registration-form__note"><strong>Cuenta demo:</strong> estos datos se guardarán únicamente en este navegador.</p>
        <div class="admin-user-form__grid">
          <div class="registration-field"><label for="admin-user-names">Nombres *</label><input id="admin-user-names" name="names" autocomplete="off" required><p class="registration-field__error" data-error="names" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-surnames">Apellidos *</label><input id="admin-user-surnames" name="surnames" autocomplete="off" required><p class="registration-field__error" data-error="surnames" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-dni">DNI demo *</label><input id="admin-user-dni" name="dni" inputmode="numeric" maxlength="8" autocomplete="off" required><p class="registration-field__error" data-error="dni" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-email">Correo electrónico *</label><input id="admin-user-email" name="email" type="email" autocomplete="off" required><p class="registration-field__error" data-error="email" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-username">Usuario *</label><input id="admin-user-username" name="username" autocomplete="off" required><p class="registration-field__help">Puedes modificar el usuario sugerido.</p><p class="registration-field__error" data-error="username" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-role">Rol *</label><select id="admin-user-role" name="role" required><option value="">Seleccionar rol</option><option>Macro</option><option value="Gestor de la Información">Gestor de la Información</option><option>Jefe</option></select><p class="registration-field__help">El sistema dispone de un único Administrador protegido.</p><p class="registration-field__error" data-error="role" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-password">Contraseña temporal *</label><input id="admin-user-password" name="password" type="text" value="demo2026" autocomplete="off" required><p class="registration-field__help">Solo para la simulación; mínimo 6 caracteres.</p><p class="registration-field__error" data-error="password" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-status">Estado inicial *</label><select id="admin-user-status" name="status" required><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select><p class="registration-field__error" data-error="status" role="alert"></p></div>
        </div>
      </div>
      <footer class="admin-user-modal__footer"><p class="admin-user-form__status" role="status" aria-live="polite"></p><button class="registration-action registration-action--secondary" data-modal-cancel type="button">Cancelar</button><button class="registration-action registration-action--primary" type="submit">Crear usuario</button></footer>
    </form>`;
    container.append(dialog);
    const form = dialog.querySelector("form");
    const close = () => { dialog.close(); dialog.remove(); };
    const names = form.elements.namedItem("names");
    const surnames = form.elements.namedItem("surnames");
    const username = form.elements.namedItem("username");
    let usernameEdited = false;

    function suggestUsername() {
      if (usernameEdited) return;
      const firstName = names.value.trim().split(/\s+/)[0] || "";
      const firstSurname = surnames.value.trim().split(/\s+/)[0] || "";
      username.value = normalizeUsername(`${firstName}.${firstSurname}`);
    }

    names.addEventListener("input", suggestUsername);
    surnames.addEventListener("input", suggestUsername);
    username.addEventListener("input", () => { usernameEdited = true; username.value = normalizeUsername(username.value); });
    dialog.querySelector(".admin-user-modal__close").addEventListener("click", close);
    dialog.querySelector("[data-modal-cancel]").addEventListener("click", close);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    form.addEventListener("input", (event) => {
      const field = event.target.name;
      const error = form.querySelector(`[data-error="${field}"]`);
      event.target.classList.remove("is-invalid");
      event.target.setAttribute("aria-invalid", "false");
      if (error) error.textContent = "";
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      values.username = normalizeUsername(values.username);
      const errors = {
        names: values.names.trim() ? "" : "Ingresa los nombres.",
        surnames: values.surnames.trim() ? "" : "Ingresa los apellidos.",
        dni: /^\d{8}$/.test(values.dni) ? currentUsers.some((item) => item.dni === values.dni) ? "El DNI demo ya está registrado." : "" : "Ingresa exactamente 8 dígitos.",
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? currentUsers.some((item) => item.correo?.toLowerCase() === values.email.toLowerCase()) ? "El correo ya está registrado." : "" : "Ingresa un correo válido.",
        username: values.username ? currentUsers.some((item) => item.usuario.toLowerCase() === values.username) ? "El usuario ya existe." : "" : "Ingresa el usuario.",
        role: ["Macro", "Gestor de la Información", "Jefe"].includes(values.role) ? "" : "Selecciona un rol.",
        password: values.password.length >= 6 ? "" : "Usa al menos 6 caracteres.",
        status: ["Activo", "Inactivo"].includes(values.status) ? "" : "Selecciona el estado."
      };
      let firstInvalid = null;
      Object.entries(errors).forEach(([field, message]) => {
        const control = form.elements.namedItem(field);
        const error = form.querySelector(`[data-error="${field}"]`);
        control.classList.toggle("is-invalid", Boolean(message));
        control.setAttribute("aria-invalid", String(Boolean(message)));
        error.textContent = message;
        if (message && !firstInvalid) firstInvalid = control;
      });
      if (firstInvalid) { form.querySelector(".admin-user-form__status").textContent = "Corrige los campos indicados para crear el usuario."; firstInvalid.focus(); return; }
      const nextNumber = Math.max(0, ...currentUsers.map((item) => Number(String(item.id).replace(/\D/g, "")) || 0)) + 1;
      const user = { id: `USR-${String(nextNumber).padStart(3, "0")}`, usuario: values.username, nombres: values.names.trim(), apellidos: values.surnames.trim(), nombre: `${values.names.trim()} ${values.surnames.trim()}`, dni: values.dni, correo: values.email.trim().toLowerCase(), rol: values.role, estado: values.status, contrasenaTemporal: values.password, creadoEn: new Date().toISOString() };
      currentUsers.push(user);
      write(usersKey, currentUsers);
      global.DEMO_STORE.recordAudit({ entidad: "usuarios", entidadId: user.id, accion: "crear", detalle: `Creó el usuario demo ${user.usuario} con rol ${user.rol}.`, nivel: "exito" });
      close();
      renderUsers(container);
    });
    dialog.showModal();
    names.focus();
  }

  function renderUsers(container) {
    const rows = users();
    container.innerHTML = `${notice()}<div class="admin-toolbar"><button class="registration-action registration-action--primary" data-admin-action="add-user" type="button">Agregar usuario</button><span>${rows.length} usuarios ficticios</span></div>${table(["Código", "Usuario", "Nombre", "Rol", "Estado", "Acciones"], rows.map((item) => { const protectedAdmin = item.usuario === "admin.demo"; return `<tr><td>${escape(item.id)}</td><td>${escape(item.usuario)}</td><td>${escape(item.nombre)}</td><td>${escape(item.rol)}</td><td><span class="admin-badge admin-badge--${item.estado === "Activo" ? "ok" : "off"}">${escape(item.estado)}</span></td><td><div class="admin-row-actions">${protectedAdmin ? '<span class="admin-protected-account">Administrador único · cuenta protegida</span>' : `<button type="button" data-admin-action="toggle-user" data-id="${escape(item.id)}">${item.estado === "Activo" ? "Desactivar" : "Activar"}</button><button type="button" data-admin-action="reset-user" data-id="${escape(item.id)}">Restablecer acceso</button>`}</div></td></tr>`; }))}`;
    container.onclick = (event) => {
      const button = event.target.closest("[data-admin-action]"); if (!button) return;
      const current = users();
      if (button.dataset.adminAction === "add-user") {
        openUserModal(container, current);
      } else {
        const item = current.find((user) => user.id === button.dataset.id); if (!item) return;
        if (item.usuario === "admin.demo") return;
        if (button.dataset.adminAction === "toggle-user") { const before = item.estado; item.estado = item.estado === "Activo" ? "Inactivo" : "Activo"; write(usersKey, current); global.DEMO_STORE.recordAudit({ entidad: "usuarios", entidadId: item.id, accion: "actualizar", detalle: `${item.usuario}: ${before} → ${item.estado}.`, anterior: before, nuevo: item.estado }); renderUsers(container); }
        if (button.dataset.adminAction === "reset-user") { item.contrasenaTemporal = "demo2026"; write(usersKey, current); global.DEMO_STORE.recordAudit({ entidad: "usuarios", entidadId: item.id, accion: "restablecer-acceso", detalle: `Restableció el acceso simulado de ${item.usuario}.`, nivel: "advertencia" }); global.alert("Acceso demo restablecido. La contraseña temporal es demo2026."); }
      }
    };
    activateAdminPagination(container);
  }

  function openMacroAssignmentModal(container, assignment, assignments, regions) {
    const editing = Boolean(assignment);
    const macroUsers = users().filter((item) => item.rol === "Macro" && item.estado === "Activo");
    if (editing && !macroUsers.some((item) => item.id === assignment.macroId)) macroUsers.push({ id: assignment.macroId, nombre: assignment.macro, estado: assignment.status, rol: "Macro" });
    const selectableMacros = editing ? macroUsers : macroUsers.filter((item) => !assignments.some((current) => current.macroId === item.id && current.status === "Activo"));
    const availableMacros = selectableMacros.length > 0;
    const dialog = document.createElement("dialog");
    dialog.className = "admin-user-modal admin-assignment-modal";
    dialog.innerHTML = `<form class="admin-user-form" method="dialog" novalidate><header class="admin-user-modal__header"><div><h3>${editing ? "Editar asignación de ATET" : "Asignar grupo de ATET"}</h3><p>Define el grupo y la cantidad asignada al Macro; no se seleccionan ATET uno por uno.</p></div><button class="admin-user-modal__close" type="button" aria-label="Cerrar">×</button></header><div class="admin-user-modal__body"><p class="registration-form__note"><strong>Responsabilidad del Administrador:</strong> administra el cupo del grupo. El Macro recibe el grupo y gestiona sus registros.</p><div class="admin-user-form__grid"><div class="registration-field"><label for="assignment-macro">Macro *</label><select id="assignment-macro" name="macro" ${editing ? "disabled" : ""} required><option value="">Seleccionar Macro</option>${selectableMacros.map((item) => `<option value="${escape(item.id)}" ${assignment?.macroId === item.id ? "selected" : ""}>${escape(item.nombre)}</option>`).join("")}</select><p class="registration-field__error" data-error="macro"></p></div><div class="registration-field"><label for="assignment-region">Región *</label><select id="assignment-region" name="region" required><option value="">Seleccionar región</option>${regions.map((item) => `<option value="${escape(item.id)}" ${assignment?.regionId === item.id ? "selected" : ""}>${escape(item.nombre)}</option>`).join("")}</select><p class="registration-field__error" data-error="region"></p></div><div class="registration-field"><label for="assignment-group">Nombre del grupo *</label><input id="assignment-group" name="group" value="${escape(assignment?.group || `Grupo ${String(assignments.length + 1).padStart(2, "0")}`)}" required><p class="registration-field__error" data-error="group"></p></div><div class="registration-field"><label for="assignment-quantity">Cantidad de ATET asignados *</label><input id="assignment-quantity" name="quantity" type="number" min="1" max="9999" step="1" value="${escape(assignment?.assigned || "")}" required><p class="registration-field__error" data-error="quantity"></p></div><div class="registration-field"><label for="assignment-status">Estado *</label><select id="assignment-status" name="status" required><option ${assignment?.status !== "Inactivo" ? "selected" : ""}>Activo</option><option ${assignment?.status === "Inactivo" ? "selected" : ""}>Inactivo</option></select><p class="registration-field__error" data-error="status"></p></div></div>${!availableMacros && !editing ? '<p class="atet-state atet-state--error">No existen Macros activos sin una asignación vigente. Crea o activa un usuario Macro antes de continuar.</p>' : ""}</div><footer class="admin-user-modal__footer"><p class="admin-user-form__status" role="status"></p><button class="registration-action registration-action--secondary" data-modal-cancel type="button">Cancelar</button><button class="registration-action registration-action--primary" type="submit" ${!availableMacros ? "disabled" : ""}>${editing ? "Guardar cambios" : "Asignar grupo"}</button></footer></form>`;
    container.append(dialog);
    const form = dialog.querySelector("form");
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector(".admin-user-modal__close").addEventListener("click", close);
    dialog.querySelector("[data-modal-cancel]").addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const macroId = editing ? assignment.macroId : values.macro;
      const macro = macroUsers.find((item) => item.id === macroId);
      const quantity = Number(values.quantity);
      const errors = { macro: macro ? "" : "Selecciona un Macro activo.", region: regions.some((item) => item.id === values.region) ? "" : "Selecciona una región.", group: values.group?.trim() ? "" : "Ingresa el nombre del grupo.", quantity: Number.isInteger(quantity) && quantity > 0 && quantity <= 9999 ? "" : "Ingresa una cantidad entre 1 y 9999.", status: ["Activo", "Inactivo"].includes(values.status) ? "" : "Selecciona el estado." };
      let invalid;
      Object.entries(errors).forEach(([name, message]) => { const control = form.elements.namedItem(name); const error = form.querySelector(`[data-error="${name}"]`); if (control) control.classList.toggle("is-invalid", Boolean(message)); if (error) error.textContent = message; if (message && !invalid) invalid = control; });
      if (invalid) { invalid.focus(); return; }
      const duplicateMacro = assignments.some((item) => item.id !== assignment?.id && item.macroId === macroId && item.status === "Activo" && values.status === "Activo");
      const duplicateGroup = assignments.some((item) => item.id !== assignment?.id && item.group.toLocaleLowerCase("es") === values.group.trim().toLocaleLowerCase("es"));
      if (duplicateMacro || duplicateGroup) { form.querySelector(".admin-user-form__status").textContent = duplicateMacro ? "Este Macro ya tiene un grupo activo asignado." : "Ya existe una asignación con ese nombre de grupo."; return; }
      const next = { id: assignment?.id || `ASG-${String(Math.max(0, ...assignments.map((item) => Number(item.id.replace(/\D/g, "")) || 0)) + 1).padStart(3, "0")}`, macroId, macro: macro?.nombre || assignment.macro, group: values.group.trim(), regionId: values.region, assigned: quantity, status: values.status };
      const previous = assignment ? { ...assignment } : null;
      if (editing) assignments[assignments.findIndex((item) => item.id === assignment.id)] = next; else assignments.push(next);
      write(macroAssignmentsKey, assignments);
      global.DEMO_STORE.recordAudit({ entidad: "asignaciones-macro", entidadId: next.id, accion: editing ? "actualizar" : "crear", detalle: `${editing ? "Actualizó" : "Asignó"} ${next.group} con ${next.assigned} ATET a ${next.macro}.`, anterior: previous, nuevo: next, nivel: "exito" });
      close();
      renderMacros(container);
    });
    dialog.showModal();
  }

  async function renderMacros(container) {
    const [, personal, catalogs] = await loadData();
    const assignments = macroAssignments();
    const allAtets = [...personal.atets, ...global.DEMO_STORE.getRegistrations()];
    const regionMap = new Map(catalogs.regiones.map((item) => [item.id, item.nombre]));
    const rows = assignments.map((item) => {
      const registered = Math.min(item.assigned, allAtets.filter((atet) => atet.regionId === item.regionId).length);
      return { ...item, region: regionMap.get(item.regionId) || item.regionId, registered, pending: Math.max(0, item.assigned - registered) };
    });
    const totalAssigned = rows.filter((item) => item.status === "Activo").reduce((sum, item) => sum + item.assigned, 0);
    const totalRegistered = rows.filter((item) => item.status === "Activo").reduce((sum, item) => sum + item.registered, 0);
    container.innerHTML = `${notice()}<div class="admin-toolbar"><div><strong>Asignación de ATET por grupos</strong><p class="admin-help">El Administrador asigna cupos grupales; no selecciona cada ATET individualmente.</p></div><button class="registration-action registration-action--primary" data-assignment-add type="button">Asignar grupo</button></div><div class="admin-cards admin-assignment-summary">${card("Grupos activos", rows.filter((item) => item.status === "Activo").length, "Asignaciones vigentes")}${card("ATET asignados", totalAssigned, "Cupo total")}${card("Registrados", totalRegistered, "ATET vinculados por región")}${card("Pendientes", Math.max(0, totalAssigned - totalRegistered), "Por completar registro")}</div>${table(["Macro", "Región", "Grupo", "ATET asignados", "Registrados", "Pendientes", "Estado", "Acciones"], rows.map((item) => `<tr><td>${escape(item.macro)}</td><td>${escape(item.region)}</td><td>${escape(item.group)}</td><td><strong>${item.assigned}</strong></td><td>${item.registered}</td><td>${item.pending}</td><td><span class="admin-badge admin-badge--${item.status === "Activo" ? "ok" : "off"}">${escape(item.status)}</span></td><td><div class="admin-row-actions"><button type="button" data-assignment-edit="${escape(item.id)}">Editar</button></div></td></tr>`))}<p class="admin-help">Los valores registrados se calculan con los ATET existentes en la región del grupo.</p>`;
    container.querySelector("[data-assignment-add]").addEventListener("click", () => openMacroAssignmentModal(container, null, assignments, catalogs.regiones));
    container.onclick = (event) => { const button = event.target.closest("[data-assignment-edit]"); if (!button) return; const item = assignments.find((current) => current.id === button.dataset.assignmentEdit); if (item) openMacroAssignmentModal(container, item, assignments, catalogs.regiones); };
    activateAdminPagination(container);
  }

  function openAtetModal(container, record, records, mode) {
    const current = atetState();
    const previous = { estado: "Activo", nombre: record.nombresApellidos || record.nombreCompleto, dni: record.dni, ordenServicio: record.ordenServicio, ...(current[record.codigo] || {}) };
    const isEdit = mode === "edit";
    const nextStatus = previous.estado === "Activo" ? "Inactivo" : "Activo";
    const dialog = document.createElement("dialog");
    dialog.className = "admin-user-modal admin-atet-modal";
    dialog.innerHTML = `<form class="admin-user-form" method="dialog" novalidate>
      <header class="admin-user-modal__header"><div><h3>${isEdit ? "Corregir información del ATET" : `${nextStatus === "Inactivo" ? "Desactivar" : "Activar"} ATET`}</h3><p>${escape(record.codigo)} · Toda modificación quedará registrada en la auditoría.</p></div><button class="admin-user-modal__close" type="button" aria-label="Cerrar modal">×</button></header>
      <div class="admin-user-modal__body">
        <p class="registration-form__note"><strong>Acción administrativa:</strong> no elimina el registro ni modifica sus entregables o evaluaciones.</p>
        ${isEdit ? `<div class="admin-user-form__grid">
          <div class="registration-field registration-field--full"><label for="admin-atet-name">Nombres y apellidos *</label><input id="admin-atet-name" name="name" value="${escape(previous.nombre)}" required><p class="registration-field__error" data-error="name" role="alert"></p></div>
          <div class="registration-field"><label for="admin-atet-dni">DNI demo *</label><input id="admin-atet-dni" name="dni" value="${escape(previous.dni)}" inputmode="numeric" maxlength="8" required><p class="registration-field__error" data-error="dni" role="alert"></p></div>
          <div class="registration-field"><label for="admin-atet-order">Orden de servicio *</label><input id="admin-atet-order" name="order" value="${escape(previous.ordenServicio)}" required><p class="registration-field__error" data-error="order" role="alert"></p></div>
        </div>` : `<div class="admin-atet-status-change"><span>Estado actual</span><strong>${escape(previous.estado)}</strong><span aria-hidden="true">→</span><span>Nuevo estado</span><strong class="admin-badge admin-badge--${nextStatus === "Activo" ? "ok" : "off"}">${nextStatus}</strong></div>`}
        <div class="registration-field admin-atet-reason"><label for="admin-atet-reason">Motivo de la ${isEdit ? "corrección" : "modificación de estado"} *</label><textarea id="admin-atet-reason" name="reason" rows="3" required placeholder="Describe por qué se realiza este cambio"></textarea><p class="registration-field__error" data-error="reason" role="alert"></p></div>
      </div>
      <footer class="admin-user-modal__footer"><p class="admin-user-form__status" role="status" aria-live="polite"></p><button class="registration-action registration-action--secondary" data-modal-cancel type="button">Cancelar</button><button class="registration-action registration-action--primary" type="submit">${isEdit ? "Guardar corrección" : `Confirmar ${nextStatus === "Inactivo" ? "desactivación" : "activación"}`}</button></footer>
    </form>`;
    container.append(dialog);
    const form = dialog.querySelector("form");
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector(".admin-user-modal__close").addEventListener("click", close);
    dialog.querySelector("[data-modal-cancel]").addEventListener("click", close);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    form.addEventListener("input", (event) => {
      const error = form.querySelector(`[data-error="${event.target.name}"]`);
      event.target.classList.remove("is-invalid"); event.target.setAttribute("aria-invalid", "false"); if (error) error.textContent = "";
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const errors = { reason: values.reason?.trim() ? "" : "Escribe el motivo obligatorio." };
      if (isEdit) {
        errors.name = values.name.trim() ? "" : "Ingresa los nombres y apellidos.";
        const duplicateDni = records.some((item) => item.codigo !== record.codigo && (current[item.codigo]?.dni || item.dni) === values.dni);
        errors.dni = /^\d{8}$/.test(values.dni) ? duplicateDni ? "El DNI demo pertenece a otro ATET." : "" : "Ingresa exactamente 8 dígitos.";
        errors.order = values.order.trim() ? "" : "Ingresa la orden de servicio.";
      }
      let firstInvalid = null;
      Object.entries(errors).forEach(([field, message]) => { const control = form.elements.namedItem(field); const error = form.querySelector(`[data-error="${field}"]`); control.classList.toggle("is-invalid", Boolean(message)); control.setAttribute("aria-invalid", String(Boolean(message))); error.textContent = message; if (message && !firstInvalid) firstInvalid = control; });
      if (firstInvalid) { form.querySelector(".admin-user-form__status").textContent = "Corrige los campos indicados antes de guardar."; firstInvalid.focus(); return; }
      if (isEdit) {
        current[record.codigo] = { ...previous, nombre: values.name.trim(), dni: values.dni, ordenServicio: values.order.trim() };
        global.DEMO_STORE.recordAudit({ entidad: "ATET", entidadId: record.codigo, accion: "corregir", detalle: values.reason.trim(), anterior: { nombre: previous.nombre, dni: previous.dni, ordenServicio: previous.ordenServicio }, nuevo: { nombre: values.name.trim(), dni: values.dni, ordenServicio: values.order.trim() }, nivel: "advertencia" });
      } else {
        current[record.codigo] = { ...previous, estado: nextStatus };
        global.DEMO_STORE.recordAudit({ entidad: "ATET", entidadId: record.codigo, accion: "cambiar-estado", detalle: values.reason.trim(), anterior: previous.estado, nuevo: nextStatus, nivel: "advertencia" });
      }
      write(atetStateKey, current); close(); renderAtet(container);
    });
    dialog.showModal();
    form.elements.namedItem(isEdit ? "name" : "reason").focus();
  }

  async function renderAtet(container) {
    const [, personal] = await loadData();
    const state = atetState();
    const records = [...personal.atets, ...global.DEMO_STORE.getRegistrations()];
    container.innerHTML = `${notice()}${table(["Código", "Nombre", "DNI", "Orden de servicio", "Estado", "Acciones"], records.map((item) => { const local = state[item.codigo] || {}; const status = local.estado || "Activo"; return `<tr><td>${escape(item.codigo)}</td><td>${escape(local.nombre || item.nombresApellidos || item.nombreCompleto)}</td><td>${escape(local.dni || item.dni)}</td><td>${escape(local.ordenServicio || item.ordenServicio)}</td><td><span class="admin-badge admin-badge--${status === "Activo" ? "ok" : "off"}">${status}</span></td><td><div class="admin-row-actions"><button type="button" data-admin-atet="edit" data-id="${escape(item.codigo)}">Corregir</button><button type="button" data-admin-atet="toggle" data-id="${escape(item.codigo)}">${status === "Activo" ? "Desactivar" : "Activar"}</button></div></td></tr>`; }))}`;
    container.onclick = (event) => { const button = event.target.closest("[data-admin-atet]"); if (!button) return; const item = records.find((record) => record.codigo === button.dataset.id); if (!item) return; openAtetModal(container, item, records, button.dataset.adminAtet); };
    activateAdminPagination(container);
  }

  function permissionCell(value) {
    const labels = { yes: "Permitido", partial: "Permitido parcialmente", no: "No permitido" };
    const symbols = { yes: "✓", partial: "◐", no: "×" };
    return `<td><span class="role-permission role-permission--${value}" title="${labels[value]}" aria-label="${labels[value]}">${symbols[value]}</span></td>`;
  }

  function renderRolesPermissions(container) {
    const permissions = [
      ["Gestión del sistema", "Administrar usuarios", "yes", "no", "no", "no"],
      ["Gestión del sistema", "Administrar grupos Macro", "yes", "no", "no", "no"],
      ["Gestión del sistema", "Configurar parámetros y catálogos", "yes", "no", "no", "no"],
      ["Gestión del sistema", "Consultar auditoría y bitácora", "yes", "no", "no", "no"],
      ["ATET", "Registrar e importar ATET", "no", "yes", "no", "no"],
      ["ATET", "Consultar ATET de su grupo", "partial", "yes", "partial", "partial"],
      ["ATET", "Corregir o desactivar ATET", "yes", "no", "no", "no"],
      ["Entregables", "Registrar presentación", "no", "yes", "no", "no"],
      ["Entregables", "Revisar PDF externo", "no", "yes", "no", "no"],
      ["Entregables", "Evaluar los 8 productos", "no", "yes", "no", "no"],
      ["Informes", "Verificar evaluación registrada", "no", "no", "yes", "partial"],
      ["Informes", "Generar informe conforme u observado", "no", "no", "yes", "no"],
      ["Informes", "Consultar historial de informes", "no", "no", "yes", "yes"],
      ["Estadísticas", "Consultar indicadores operativos", "partial", "partial", "partial", "yes"],
      ["Estadísticas", "Consultar avance por Macro", "partial", "no", "no", "yes"],
      ["Estadísticas", "Consultar productividad del Gestor", "no", "no", "no", "yes"]
    ];
    const matrixRows = permissions.map(([group, action, admin, macro, manager, boss]) => `<tr><td><span class="role-permission-group">${escape(group)}</span></td><td>${escape(action)}</td>${permissionCell(admin)}${permissionCell(macro)}${permissionCell(manager)}${permissionCell(boss)}</tr>`);
    container.innerHTML = `${notice()}<div class="roles-layout">
      <section class="roles-flow admin-panel"><div class="roles-section-heading"><h3>Roles y flujo de trabajo</h3><p>Responsabilidades dentro del proceso del Sistema ATET.</p></div><div class="roles-flow__columns">
        <article class="role-flow-card role-flow-card--macro"><header><span>M</span><div><h4>Macro</h4><p>Registro y evaluación</p></div></header><ol><li><strong>Registra ATET</strong><span>Registra manualmente o importa los ATET de su grupo.</span></li><li><strong>Registra presentación</strong><span>Consigna la fecha del entregable presentado externamente.</span></li><li><strong>Revisa el PDF externo</strong><span>Realiza la revisión física fuera del Sistema ATET.</span></li><li><strong>Evalúa los 8 productos</strong><span>Marca Cumple/No cumple, análisis y páginas.</span></li></ol></article>
        <article class="role-flow-card role-flow-card--manager"><header><span>G</span><div><h4>Gestor</h4><p>Control e informes</p></div></header><ol><li><strong>Verifica la información</strong><span>Consulta la evaluación registrada por el Macro.</span></li><li><strong>Genera el informe</strong><span>Usa la evaluación sin volver a revisar el PDF.</span></li><li><strong>Conforme u observado</strong><span>Emite el informe demo correspondiente.</span></li></ol></article>
        <article class="role-flow-card role-flow-card--boss"><header><span>J</span><div><h4>Jefe</h4><p>Estadísticas y consultas</p></div></header><ol><li><strong>Indicadores ejecutivos</strong><span>Consulta avance, resultados e informes.</span></li><li><strong>Supervisión</strong><span>Acceso de solo lectura a información consolidada.</span></li></ol></article>
      </div><p class="registration-form__note roles-admin-note"><strong>Administrador:</strong> configura el sistema, crea usuarios, activa Macros y Gestores, asigna grupos y cupos de ATET a cada Macro, mantiene parámetros y controla la auditoría. No revisa entregables ni genera informes.</p></section>
      <section class="roles-matrix admin-panel"><div class="roles-section-heading"><h3>Matriz de permisos por rol</h3><p>Permisos efectivos según los módulos implementados.</p></div><div class="admin-table-wrap" data-admin-paged-table><table class="admin-table roles-permission-table"><thead><tr><th>Área</th><th>Módulo / funcionalidad</th><th>Administrador</th><th>Macro</th><th>Gestor</th><th>Jefe</th></tr></thead><tbody>${matrixRows.join("")}</tbody></table></div><div class="roles-legend"><span>${permissionCell("yes").replace(/^<td>|<\/td>$/g, "")} Permitido</span><span>${permissionCell("partial").replace(/^<td>|<\/td>$/g, "")} Parcial</span><span>${permissionCell("no").replace(/^<td>|<\/td>$/g, "")} No permitido</span></div></section>
    </div>`;
    activateAdminPagination(container);
  }

  async function renderParameters(container) {
    const [, , catalogs] = await loadData();
    const regions = catalogs.regiones || [];
    const zones = catalogs.zonas || [];
    const orderedProducts = [...global.DEMO_EVALUATION_CONFIG.items].sort((first, second) => first.number - second.number);
    container.innerHTML = `${notice()}<div class="admin-toolbar"><button class="registration-action registration-action--secondary" data-parameter-save type="button">Guardar cambios</button><span>Catálogo protegido y versionado</span></div><section class="admin-panel admin-year-parameter"><div><h3>Año de los materiales educativos digitales</h3><p>Este valor se aplica a las actividades, productos, evaluaciones y vistas de informes que mencionan el año.</p></div><label>Año del catálogo<input data-catalog-year type="number" inputmode="numeric" min="2000" max="2100" step="1" value="${global.DEMO_EVALUATION_CONFIG.year}" required></label></section><div class="admin-grid"><section class="admin-panel"><h3>Regiones y ámbitos</h3>${table(["Región", "Ámbito"], regions.map((item) => `<tr><td>${escape(item.nombre)}</td><td>${escape(item.ambito || item.ambitoId)}</td></tr>`))}</section><section class="admin-panel"><h3>Zonas configuradas</h3><p><strong>${zones.length}</strong> zonas disponibles en el catálogo demo.</p><p>Los cambios estructurales se simulan para proteger la consistencia de registros existentes.</p></section></div><section class="admin-panel"><h3>Ítems del segundo entregable</h3><ol class="admin-products">${orderedProducts.map((item) => `<li value="${item.number}"><strong>Producto ${item.number}</strong><span>${escape(item.product)}</span></li>`).join("")}</ol><p class="admin-help">Año vigente: ${global.DEMO_EVALUATION_CONFIG.year} · Versión: ${escape(global.DEMO_EVALUATION_CONFIG.version)} · Orden fijo del producto 1 al 8.</p></section>`;
    container.querySelector("[data-parameter-save]").addEventListener("click", () => {
      const input = container.querySelector("[data-catalog-year]");
      if (!input.reportValidity()) return;
      const previousYear = global.DEMO_EVALUATION_CONFIG.year;
      try {
        const newYear = global.DEMO_EVALUATION_CONFIG.setYear(input.value);
        if (newYear === previousYear) {
          input.focus();
          return;
        }
        global.DEMO_STORE.recordAudit({ entidad: "parametros", entidadId: "anio-catalogo-entregable", accion: "actualizar", detalle: `Actualizó el año de los materiales educativos digitales de ${previousYear} a ${newYear}.`, nivel: "exito", anterior: { year: previousYear }, nuevo: { year: newYear } });
        renderParameters(container);
      } catch (error) {
        input.setCustomValidity(error.message);
        input.reportValidity();
        input.setCustomValidity("");
      }
    });
  }

  function renderAudit(container, logMode) {
    let entries = global.DEMO_STORE.getAudit().filter((item) => {
      const isCatalogYear = item.entidad === "parametros" && item.entidadId === "anio-catalogo-entregable";
      if (!isCatalogYear || item.anterior === null || item.anterior === undefined || item.nuevo === null || item.nuevo === undefined) return true;
      return JSON.stringify(item.anterior) !== JSON.stringify(item.nuevo);
    }).slice().reverse();
    if (logMode) {
      const simulated = [
        { fecha: new Date().toISOString(), usuario: "Sistema Demo", rol: "Sistema", entidad: "sesión", accion: "inicio", detalle: "Aplicación estática iniciada correctamente.", nivel: "exito" },
        { fecha: new Date(Date.now() - 3600000).toISOString(), usuario: "Sistema Demo", rol: "Sistema", entidad: "importaciones", accion: "validación", detalle: "Validación demo completada con advertencias controladas.", nivel: "advertencia" }
      ];
      entries = [...entries, ...simulated].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    }
    const unique = (field) => [...new Set(entries.map((item) => item[field] || "Demo"))].sort((a, b) => String(a).localeCompare(String(b), "es"));
    const options = (values) => values.map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join("");
    const moduleOptions = unique("entidad").map((value) => `<option value="${escape(value)}">${escape(auditModuleLabel(value))}</option>`).join("");
    container.innerHTML = `${notice()}<section class="audit-filters" aria-label="Filtros del historial"><div class="audit-filter-grid"><label>Fecha inicio<input data-audit-start type="date"></label><label>Fecha fin<input data-audit-end type="date"></label><label>Usuario<select data-audit-user><option value="">Todos</option>${options(unique("usuario"))}</select></label><label>Rol<select data-audit-role><option value="">Todos</option>${options(unique("rol"))}</select></label><label>Módulo<select data-audit-module><option value="">Todos</option>${moduleOptions}</select></label><label>Acción<select data-audit-action><option value="">Todas</option>${options(unique("accion"))}</select></label><label class="audit-filter-search">Buscar por descripción o registro<input data-audit-search type="search" placeholder="Ej. ATET-001, informe, usuario…"></label></div><div class="audit-filter-actions"><div><button class="registration-action registration-action--secondary" data-audit-clear type="button">Limpiar filtros</button><button class="registration-action registration-action--primary" data-audit-submit type="button">Buscar</button></div><button class="registration-action registration-action--secondary" data-export-events type="button">Exportar CSV</button></div></section><div class="audit-results-heading"><span data-audit-count>${entries.length} registros encontrados</span><small>Los códigos azules abren el módulo relacionado.</small></div><div data-admin-events></div>`;
    let filteredEntries = entries;
    const results = container.querySelector("[data-admin-events]");
    function applyFilters() {
      const start = container.querySelector("[data-audit-start]").value;
      const end = container.querySelector("[data-audit-end]").value;
      const user = container.querySelector("[data-audit-user]").value;
      const role = container.querySelector("[data-audit-role]").value;
      const module = container.querySelector("[data-audit-module]").value;
      const action = container.querySelector("[data-audit-action]").value;
      const term = container.querySelector("[data-audit-search]").value.trim().toLocaleLowerCase("es");
      filteredEntries = entries.filter((item) => {
        const day = String(item.fecha || "").slice(0, 10);
        const searchable = [item.usuario, item.rol, item.entidad, item.accion, item.detalle, item.entidadId].join(" ").toLocaleLowerCase("es");
        return (!start || day >= start) && (!end || day <= end) && (!user || item.usuario === user) && (!role || (item.rol || "Demo") === role) && (!module || item.entidad === module) && (!action || item.accion === action) && (!term || searchable.includes(term));
      });
      results.innerHTML = renderAuditTable(filteredEntries);
      container.querySelector("[data-audit-count]").textContent = `${filteredEntries.length} ${filteredEntries.length === 1 ? "registro encontrado" : "registros encontrados"}`;
      activateAdminPagination(results);
    }
    container.querySelector("[data-audit-submit]").addEventListener("click", applyFilters);
    container.querySelector("[data-audit-search]").addEventListener("keydown", (event) => { if (event.key === "Enter") applyFilters(); });
    container.querySelector("[data-audit-clear]").addEventListener("click", () => { container.querySelectorAll(".audit-filters input, .audit-filters select").forEach((control) => { control.value = ""; }); applyFilters(); });
    results.addEventListener("click", (event) => {
      const button = event.target.closest("[data-audit-detail]");
      if (!button) return;
      const item = filteredEntries[Number(button.dataset.auditDetail)];
      if (!item) return;
      const dialog = document.createElement("dialog");
      dialog.className = "admin-user-modal audit-detail-modal";
      dialog.innerHTML = `<article><header class="admin-user-modal__header"><div><h3>Detalle de la actividad</h3><p>${escape(auditRecordLabel(item))}</p></div><button class="admin-user-modal__close" type="button" aria-label="Cerrar">×</button></header><div class="admin-user-modal__body"><dl class="audit-detail-list"><div><dt>Fecha y hora</dt><dd>${escape(date(item.fecha))}</dd></div><div><dt>Usuario y rol</dt><dd>${escape(item.usuario)} · ${escape(item.rol || "Demo")}</dd></div><div><dt>Módulo</dt><dd>${escape(auditModuleLabel(item.entidad))}</dd></div><div><dt>Acción</dt><dd>${escape(item.accion)}</dd></div><div><dt>Descripción</dt><dd>${escape(item.detalle)}</dd></div>${item.anterior !== null && item.anterior !== undefined ? `<div><dt>Valor anterior</dt><dd>${auditValueHtml(item.anterior)}</dd></div>` : ""}${item.nuevo !== null && item.nuevo !== undefined ? `<div><dt>Valor nuevo</dt><dd>${auditValueHtml(item.nuevo)}</dd></div>` : ""}</dl></div></article>`;
      document.body.append(dialog);
      const close = () => { dialog.close(); dialog.remove(); };
      dialog.querySelector("button").addEventListener("click", close);
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
      dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
      dialog.showModal();
    });
    container.querySelector("[data-export-events]").addEventListener("click", () => {
      const csv = ["fecha,usuario,rol,modulo,accion,descripcion,registro_afectado", ...filteredEntries.map((item) => [item.fecha, item.usuario, item.rol, item.entidad, item.accion, item.detalle, item.entidadId].map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = logMode ? "bitacora-demo.csv" : "auditoria-demo.csv"; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    });
    applyFilters();
  }

  async function render(container, moduleId) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando módulo administrativo…</p>';
    try {
      if (moduleId === "dashboard-admin") await renderDashboard(container);
      if (moduleId === "usuarios-admin") renderUsers(container);
      if (moduleId === "macros-admin") await renderMacros(container);
      if (moduleId === "atet-admin") await renderAtet(container);
      if (moduleId === "roles-permisos-admin") renderRolesPermissions(container);
      if (moduleId === "parametros-admin") await renderParameters(container);
      if (moduleId === "auditoria-admin") renderAudit(container, false);
      if (moduleId === "bitacora-admin") renderAudit(container, true);
      activateAdminPagination(container);
    } catch (error) {
      console.error("No se pudo cargar el módulo administrativo.", error);
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar este módulo administrativo.</strong></div>';
    }
  }

  global.ADMIN_MODULE = Object.freeze({ render });
})(window);
