(function configureAdminModule(global) {
  const usersKey = "demoAdminUsers";
  const atetStateKey = "demoAdminAtetState";
  let dataPromise;

  const seedUsers = [
    { id: "USR-001", usuario: "macro.demo", nombre: "Macro Demo", rol: "Macro", estado: "Activo" },
    { id: "USR-002", usuario: "gestor.demo", nombre: "Gestor Demo", rol: "Gestor de la Información", estado: "Activo" },
    { id: "USR-003", usuario: "jefe.demo", nombre: "Jefe Demo", rol: "Jefe", estado: "Activo" },
    { id: "USR-004", usuario: "admin.demo", nombre: "Administrador Demo", rol: "Administrador", estado: "Activo" }
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
      const pageSize = 5;
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      let currentPage = 1;
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
      function showPage(page) {
        currentPage = Math.min(totalPages, Math.max(1, page));
        rows.forEach((row, index) => { row.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize; });
        previous.disabled = currentPage === 1;
        next.disabled = currentPage === totalPages;
        status.textContent = `Página ${currentPage} de ${totalPages}`;
      }
      previous.addEventListener("click", () => showPage(currentPage - 1));
      next.addEventListener("click", () => showPage(currentPage + 1));
      pager.append(previous, status, next);
      wrapper.after(pager);
      showPage(1);
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

  function renderAuditTable(entries) {
    if (!entries.length) return '<p class="atet-state">Aún no hay eventos locales. Las operaciones nuevas aparecerán aquí.</p>';
    return table(["Fecha y hora", "Usuario", "Rol", "Módulo", "Acción", "Descripción"], entries.map((item) => `<tr><td>${escape(date(item.fecha))}</td><td>${escape(item.usuario)}</td><td>${escape(item.rol || "Demo")}</td><td>${escape(item.entidad)}</td><td><span class="admin-badge">${escape(item.accion)}</span></td><td>${escape(item.detalle)}</td></tr>`));
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
          <div class="registration-field"><label for="admin-user-role">Rol *</label><select id="admin-user-role" name="role" data-native-select="true" required><option value="">Seleccionar rol</option><option>Macro</option><option value="Gestor de la Información">Gestor de la Información</option><option>Jefe</option></select><p class="registration-field__help">El sistema dispone de un único Administrador protegido.</p><p class="registration-field__error" data-error="role" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-password">Contraseña temporal *</label><input id="admin-user-password" name="password" type="text" value="demo2026" autocomplete="off" required><p class="registration-field__help">Solo para la simulación; mínimo 6 caracteres.</p><p class="registration-field__error" data-error="password" role="alert"></p></div>
          <div class="registration-field"><label for="admin-user-status">Estado inicial *</label><select id="admin-user-status" name="status" data-native-select="true" required><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select><p class="registration-field__error" data-error="status" role="alert"></p></div>
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

  async function renderMacros(container) {
    const [, personal] = await loadData();
    const groups = [
      { macro: "Macro Demo", group: "Grupo 01", region: "Amazonas", assigned: personal.atets.length, status: "Activo" },
      { macro: "Macro Norte Demo", group: "Grupo 02", region: "Lima", assigned: 45, status: "Activo" },
      { macro: "Macro Sur Demo", group: "Grupo 03", region: "Cusco", assigned: 48, status: "Activo" }
    ];
    container.innerHTML = `${notice()}${table(["Macro", "Grupo", "Región", "ATET asignados", "Estado"], groups.map((item) => `<tr><td>${escape(item.macro)}</td><td>${escape(item.group)}</td><td>${escape(item.region)}</td><td>${item.assigned}</td><td><span class="admin-badge admin-badge--ok">${item.status}</span></td></tr>`))}<p class="admin-help">Las asignaciones adicionales son datos ficticios para visualizar el módulo administrativo.</p>`;
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

  async function renderParameters(container) {
    const [, , catalogs] = await loadData();
    const regions = catalogs.regiones || [];
    const zones = catalogs.zonas || [];
    container.innerHTML = `${notice()}<div class="admin-toolbar"><button class="registration-action registration-action--secondary" data-parameter-save type="button">Guardar cambios simulados</button><span>Catálogo protegido y versionado</span></div><div class="admin-grid"><section class="admin-panel"><h3>Regiones y ámbitos</h3>${table(["Región", "Ámbito"], regions.map((item) => `<tr><td>${escape(item.nombre)}</td><td>${escape(item.ambito || item.ambitoId)}</td></tr>`))}</section><section class="admin-panel"><h3>Zonas configuradas</h3><p><strong>${zones.length}</strong> zonas disponibles en el catálogo demo.</p><p>Los cambios estructurales se simulan para proteger la consistencia de registros existentes.</p></section></div><section class="admin-panel"><h3>Ítems del segundo entregable</h3><ol class="admin-products">${global.DEMO_EVALUATION_CONFIG.items.map((item) => `<li><strong>Producto ${item.number}</strong><span>${escape(item.product)}</span></li>`).join("")}</ol><p class="admin-help">Versión: ${escape(global.DEMO_EVALUATION_CONFIG.version)}</p></section>`;
    container.querySelector("[data-parameter-save]").addEventListener("click", () => {
      if (!global.confirm("¿Registrar una actualización simulada de parámetros? Los catálogos base no se sobrescribirán.")) return;
      global.DEMO_STORE.recordAudit({ entidad: "parametros", entidadId: global.DEMO_EVALUATION_CONFIG.version, accion: "actualizar", detalle: "Guardó una revisión simulada de parámetros sin alterar el catálogo base.", nivel: "advertencia" });
      global.alert("Cambios simulados guardados en la auditoría. El catálogo base permanece protegido.");
    });
  }

  function renderAudit(container, logMode) {
    let entries = global.DEMO_STORE.getAudit().slice().reverse();
    if (logMode) {
      const simulated = [
        { fecha: new Date().toISOString(), usuario: "Sistema Demo", rol: "Sistema", entidad: "sesión", accion: "inicio", detalle: "Aplicación estática iniciada correctamente.", nivel: "exito" },
        { fecha: new Date(Date.now() - 3600000).toISOString(), usuario: "Sistema Demo", rol: "Sistema", entidad: "importaciones", accion: "validación", detalle: "Validación demo completada con advertencias controladas.", nivel: "advertencia" }
      ];
      entries = [...entries, ...simulated].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    }
    container.innerHTML = `${notice()}<div class="admin-toolbar"><input class="admin-search" type="search" placeholder="Buscar por usuario, módulo o descripción" aria-label="Buscar eventos"><button class="registration-action registration-action--secondary" data-export-events type="button">Exportar CSV demo</button><span>${entries.length} eventos</span></div><div data-admin-events>${renderAuditTable(entries)}</div>`;
    const search = container.querySelector(".admin-search");
    search.addEventListener("input", () => { const term = search.value.toLocaleLowerCase("es"); const filtered = entries.filter((item) => [item.usuario, item.rol, item.entidad, item.accion, item.detalle, item.nivel].join(" ").toLocaleLowerCase("es").includes(term)); container.querySelector("[data-admin-events]").innerHTML = renderAuditTable(filtered); activateAdminPagination(container.querySelector("[data-admin-events]")); });
    container.querySelector("[data-export-events]").addEventListener("click", () => {
      const csv = ["fecha,usuario,rol,modulo,accion,descripcion", ...entries.map((item) => [item.fecha, item.usuario, item.rol, item.entidad, item.accion, item.detalle].map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = logMode ? "bitacora-demo.csv" : "auditoria-demo.csv"; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    });
  }

  async function render(container, moduleId) {
    container.innerHTML = '<p class="atet-state" role="status">Cargando módulo administrativo…</p>';
    try {
      if (moduleId === "dashboard-admin") await renderDashboard(container);
      if (moduleId === "usuarios-admin") renderUsers(container);
      if (moduleId === "macros-admin") await renderMacros(container);
      if (moduleId === "atet-admin") await renderAtet(container);
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
