const storedSession = JSON.parse(sessionStorage.getItem("demoSession") || "null");
const sessionRole = storedSession ? window.normalizeDemoRole(storedSession.rol) : null;
const roleMenu = sessionRole ? window.ROLE_MENUS[sessionRole] : null;

if (!storedSession || !sessionRole || !roleMenu) {
  sessionStorage.removeItem("demoSession");
  window.location.replace("../../index.html");
} else {
  const iconPaths = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-3.2 2.2-5 5.5-5s5.1 1.8 5.5 5M16 7h5M18.5 4.5v5"/>',
    "user-plus": '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-3.2 2.2-5 5.5-5 1.4 0 2.5.3 3.4.9M18 13v8M14 17h8"/>',
    file: '<path d="M6 3.5h9l4 4V21H6zM15 3.5V8h4M9 12h7M9 16h7"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5M12 7.5V12l3 2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6"/>',
    inbox: '<path d="M4 5h16v14H4zM4 14h4l2 2h4l2-2h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.5-1.2.9-1.9-2.1-2.1-1.9.9-1.2-.5-.7-2h-3l-.7 2-1.2.5-1.9-.9-2.1 2.1.9 1.9-.5 1.2-2 .7v3l2 .7.5 1.2-.9 1.9 2.1 2.1 1.9-.9 1.2.5.7 2h3l.7-2 1.2-.5 1.9.9 2.1-2.1-.9-1.9.5-1.2z"/>',
    shield: '<path d="M12 3 20 6v5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>'
  };

  const body = document.body;
  const menuButton = document.querySelector("#menu-button");
  const sidebarOverlay = document.querySelector("#sidebar-overlay");
  const sidebar = document.querySelector("#sidebar");
  const sidebarNav = document.querySelector("#sidebar-nav");
  const mainContent = document.querySelector("#main-content");
  const pageTitle = document.querySelector(".page-heading h1");
  const breadcrumbLabel = document.querySelector(".breadcrumb span");
  const moduleContainer = document.querySelector("#module-container");
  const moduleTitle = document.querySelector("#module-title");
  const moduleDescription = document.querySelector("#module-description");
  const moduleDynamic = document.querySelector("#module-dynamic");

  function enhanceModuleStates() {
    moduleDynamic.querySelectorAll(".atet-list__empty, .tracking-empty, .dashboard-state:not([role]), .atet-state:not([role])")
      .forEach((state) => {
        state.setAttribute("role", "status");
        state.setAttribute("aria-live", "polite");
      });
    moduleDynamic.querySelectorAll(".atet-state--error, .dashboard-state--error").forEach((state) => {
      state.setAttribute("role", "alert");
      if (!state.querySelector("a, button")) {
        const retry = document.createElement("button");
        retry.className = "state-retry";
        retry.type = "button";
        retry.textContent = "Reintentar";
        retry.addEventListener("click", () => loadModule(window.location.hash.slice(1), false));
        state.append(retry);
      }
    });
    const loading = [...moduleDynamic.querySelectorAll('[role="status"]')]
      .some((state) => /^(Cargando|Preparando)/i.test(state.textContent.trim()));
    moduleContainer.setAttribute("aria-busy", String(loading));
  }

  const stateObserver = new MutationObserver(enhanceModuleStates);
  stateObserver.observe(moduleDynamic, { childList: true, subtree: true });

  storedSession.rol = sessionRole;
  sessionStorage.setItem("demoSession", JSON.stringify(storedSession));
  document.querySelector("#user-name").textContent = storedSession.nombre;
  document.querySelector("#user-role").textContent = sessionRole;
  const topbarAvatar = document.querySelector(".user-menu__avatar");

  function applyTopbarPhoto(photo) {
    topbarAvatar.classList.toggle("has-photo", Boolean(photo));
    topbarAvatar.style.backgroundImage = photo ? `url("${photo}")` : "";
  }

  applyTopbarPhoto(localStorage.getItem(`demoProfilePhoto:${storedSession.usuario}`) || "");
  globalThis.addEventListener("demo-profile-photo-change", (event) => {
    if (event.detail?.usuario === storedSession.usuario) applyTopbarPhoto(event.detail.photo);
  });

  roleMenu.forEach((item, index) => {
    const link = document.createElement("a");
    const icon = document.createElement("span");
    const label = document.createElement("span");

    link.className = `nav-link${index === 0 ? " is-active" : ""}`;
    link.href = `#${item.id}`;
    if (index === 0) link.setAttribute("aria-current", "page");

    icon.className = "nav-link__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 24 24">${iconPaths[item.icon]}</svg>`;
    label.textContent = item.label;

    link.append(icon, label);
    sidebarNav.append(link);
  });

  const navLinks = sidebarNav.querySelectorAll(".nav-link");

  function setSidebar(open) {
    body.classList.toggle("sidebar-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    sidebarOverlay.setAttribute("aria-hidden", String(!open));
  }

  menuButton.addEventListener("click", () => {
    const open = !body.classList.contains("sidebar-open");
    setSidebar(open);
    if (open) sidebarNav.querySelector("a")?.focus();
  });
  sidebarOverlay.addEventListener("click", () => {
    setSidebar(false);
    menuButton.focus();
  });

  function setActiveLink(moduleId) {
    navLinks.forEach((link) => {
      const active = link.hash === `#${moduleId}`;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function showModuleError(reason = "not-found") {
    const forbidden = reason === "forbidden";
    setActiveLink("");
    moduleContainer.classList.remove("is-dashboard");
    moduleContainer.classList.add("is-error");
    pageTitle.textContent = forbidden ? "Acceso no permitido" : "Módulo no disponible";
    breadcrumbLabel.textContent = forbidden ? "› Acceso no permitido" : "› Error";
    moduleTitle.textContent = forbidden ? "No tienes permiso para acceder a esta sección" : "No pudimos mostrar esta sección";
    moduleDescription.textContent = forbidden
      ? "La ruta existe, pero no está habilitada para el rol de tu sesión. Usa las opciones disponibles en el menú."
      : "La ruta solicitada no existe en esta demostración.";
    moduleDynamic.replaceChildren();
    document.title = "Módulo no disponible | Sistema de Gestión ATET";
  }

  function loadModule(moduleId, moveFocus = true) {
    try {
      if (!window.canAccessDemoRoute(sessionRole, moduleId)) {
        showModuleError(window.isKnownDemoRoute(moduleId) ? "forbidden" : "not-found");
        setSidebar(false);
        if (moveFocus) mainContent.focus({ preventScroll: true });
        return;
      }
      const isAtetDetail = sessionRole === window.APP_ROLES.MACRO && moduleId.startsWith("detalle-atet/");
      const isAtetImport = sessionRole === window.APP_ROLES.MACRO && moduleId === "importar-atet";
      const isPresentationRoute = sessionRole === window.APP_ROLES.MACRO && moduleId.startsWith("registrar-presentacion/");
      const isEvaluationRoute = sessionRole === window.APP_ROLES.MACRO && moduleId.startsWith("evaluar-entregable/");
      const isManagerEvaluationDetail = sessionRole === window.APP_ROLES.GESTOR && moduleId.startsWith("detalle-evaluacion-gestor/");
      const isReportPreview = sessionRole === window.APP_ROLES.GESTOR && moduleId.startsWith("vista-previa-informe/");
      const viewId = isAtetDetail ? "detalle-atet" : isPresentationRoute ? "registrar-presentacion" : isEvaluationRoute ? "evaluar-entregable" : isManagerEvaluationDetail ? "detalle-evaluacion-gestor" : isReportPreview ? "vista-previa-informe" : moduleId;
      const allowedItem = roleMenu.find((item) => item.id === moduleId);
      const view = allowedItem || isAtetDetail || isAtetImport || isPresentationRoute || isEvaluationRoute || isManagerEvaluationDetail || isReportPreview ? window.MODULE_VIEWS[viewId] : null;

      if ((!allowedItem && !isAtetDetail && !isAtetImport && !isPresentationRoute && !isEvaluationRoute && !isManagerEvaluationDetail && !isReportPreview) || !view) {
        showModuleError("not-found");
      } else {
        setActiveLink(isAtetDetail || isAtetImport ? "mis-atet" : isPresentationRoute || isEvaluationRoute ? "entregables" : isManagerEvaluationDetail || isReportPreview ? "entregables-pendientes" : moduleId);
        moduleContainer.classList.toggle("is-dashboard", moduleId === "dashboard" || moduleId === "dashboard-gestor" || moduleId === "dashboard-ejecutivo");
        moduleContainer.classList.remove("is-error");
        pageTitle.textContent = view.title;
        breadcrumbLabel.textContent = `› ${view.title}`;
        moduleTitle.textContent = view.title;
        moduleDescription.textContent = view.description;
        moduleDynamic.replaceChildren();
        document.title = `${view.title} | Sistema de Gestión ATET`;

        if (moduleId === "dashboard" && sessionRole === window.APP_ROLES.MACRO) {
          window.DASHBOARD_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#dashboard"
          );
        }

        if (moduleId === "mis-atet" && sessionRole === window.APP_ROLES.MACRO) {
          window.MIS_ATET_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#mis-atet"
          );
        }

        if (moduleId === "registrar-atet" && sessionRole === window.APP_ROLES.MACRO) {
          window.REGISTER_ATET_MODULE.render(moduleDynamic);
        }

        if (moduleId === "entregables" && sessionRole === window.APP_ROLES.MACRO) {
          window.DELIVERABLES_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#entregables"
          );
        }

        if (moduleId === "historial" && sessionRole === window.APP_ROLES.MACRO) {
          window.HISTORY_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#historial"
          );
        }

        if (moduleId === "entregables-pendientes" && sessionRole === window.APP_ROLES.GESTOR) {
          window.MANAGER_INBOX_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#entregables-pendientes"
          );
        }

        if (moduleId === "dashboard-gestor" && sessionRole === window.APP_ROLES.GESTOR) {
          window.MANAGER_DASHBOARD_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#dashboard-gestor"
          );
        }


        if (moduleId === "historial-informes" && sessionRole === window.APP_ROLES.GESTOR) {
          window.MANAGER_REPORT_HISTORY_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#historial-informes"
          );
        }


        if (moduleId === "dashboard-ejecutivo" && sessionRole === window.APP_ROLES.JEFE) {
          window.EXECUTIVE_DASHBOARD_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#dashboard-ejecutivo"
          );
        }


        if (moduleId === "avance-macro" && sessionRole === window.APP_ROLES.JEFE) {
          window.MACRO_PROGRESS_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#avance-macro"
          );
        }


        if (moduleId === "estado-entregables" && sessionRole === window.APP_ROLES.JEFE) {
          window.EXECUTIVE_DELIVERABLE_STATUS_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#estado-entregables"
          );
        }


        if (moduleId === "informes-macro" && sessionRole === window.APP_ROLES.JEFE) {
          window.EXECUTIVE_REPORTS_BY_MACRO_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#informes-macro"
          );
        }


        if (moduleId === "productividad-gestor" && sessionRole === window.APP_ROLES.JEFE) {
          window.MANAGER_PRODUCTIVITY_MODULE.render(
            moduleDynamic,
            () => window.location.hash === "#productividad-gestor"
          );
        }

        if (sessionRole === window.APP_ROLES.ADMINISTRADOR && moduleId.endsWith("-admin")) {
          window.ADMIN_MODULE.render(moduleDynamic, moduleId);
        }


        if (moduleId === "perfil") {
          window.PROFILE_MODULE.render(moduleDynamic);
        }

        if (isAtetImport) {
          window.IMPORT_ATET_MODULE.render(moduleDynamic);
        }

        if (isPresentationRoute) {
          const deliverableId = decodeURIComponent(moduleId.slice("registrar-presentacion/".length));
          window.DELIVERABLES_MODULE.renderPresentationPlaceholder(
            moduleDynamic,
            deliverableId,
            () => window.location.hash === `#${moduleId}`
          );
        }

        if (isEvaluationRoute) {
          const deliverableId = decodeURIComponent(moduleId.slice("evaluar-entregable/".length));
          window.EVALUATION_MODULE.render(
            moduleDynamic,
            deliverableId,
            () => window.location.hash === `#${moduleId}`
          );
        }


        if (isManagerEvaluationDetail) {
          const deliverableId = decodeURIComponent(moduleId.slice("detalle-evaluacion-gestor/".length));
          window.EVALUATION_MODULE.renderReadOnly(
            moduleDynamic,
            deliverableId,
            () => window.location.hash === `#${moduleId}`
          );
        }


        if (isReportPreview) {
          const deliverableId = decodeURIComponent(moduleId.slice("vista-previa-informe/".length));
          window.REPORT_PREVIEW_MODULE.render(
            moduleDynamic,
            deliverableId,
            () => window.location.hash === `#${moduleId}`
          );
        }

        if (isAtetDetail) {
          const atetId = decodeURIComponent(moduleId.slice("detalle-atet/".length));
          window.MIS_ATET_MODULE.renderDetail(
            moduleDynamic,
            atetId,
            () => window.location.hash === `#${moduleId}`
          );
        }

        moduleContainer.classList.remove("is-view-entering");
        void moduleContainer.offsetWidth;
        moduleContainer.classList.add("is-view-entering");
      }
    } catch (error) {
      console.error("No se pudo cargar el módulo.", error);
      showModuleError("not-found");
    }

    setSidebar(false);
    moduleContainer.addEventListener("animationend", () => moduleContainer.classList.remove("is-view-entering"), { once: true });
    if (moveFocus) mainContent.focus({ preventScroll: true });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const moduleId = link.hash.slice(1);

      if (window.location.hash === link.hash) {
        loadModule(moduleId);
      } else {
        window.location.hash = moduleId;
      }
    });
  });

  window.addEventListener("hashchange", () => {
    loadModule(window.location.hash.slice(1));
  });

  const initialModuleId = window.location.hash.slice(1) || roleMenu[0].id;
  if (!window.location.hash) history.replaceState(null, "", `#${initialModuleId}`);
  loadModule(initialModuleId, false);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("sidebar-open")) {
      setSidebar(false);
      menuButton.focus();
      return;
    }
    if (event.key === "Tab" && body.classList.contains("sidebar-open")) {
      const focusable = [...sidebar.querySelectorAll('a[href], button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  function logout() {
    sessionStorage.removeItem("demoSession");
    window.location.replace("../../index.html");
  }

  document.querySelector("#logout").addEventListener("click", logout);
  document.querySelector("#sidebar-logout").addEventListener("click", logout);
}
