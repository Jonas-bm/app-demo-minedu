(function configureRoles(global) {
  const roles = Object.freeze({
    MACRO: "Macro",
    GESTOR: "Gestor de la Información",
    JEFE: "Jefe",
    ADMINISTRADOR: "Administrador"
  });

  const menus = Object.freeze({
    [roles.MACRO]: Object.freeze([
      { id: "dashboard", label: "Dashboard", icon: "home" },
      { id: "mis-atet", label: "Mis ATET", icon: "users" },
      { id: "registrar-atet", label: "Registrar ATET", icon: "user-plus" },
      { id: "entregables", label: "Entregables", icon: "file" },
      { id: "historial", label: "Historial", icon: "history" },
      { id: "perfil", label: "Perfil", icon: "user" }
    ]),
    [roles.GESTOR]: Object.freeze([
      { id: "dashboard-gestor", label: "Dashboard", icon: "home" },
      { id: "entregables-pendientes", label: "Entregables pendientes", icon: "inbox" },
      { id: "historial-informes", label: "Historial de informes", icon: "history" },
      { id: "perfil", label: "Perfil", icon: "user" }
    ]),
    [roles.JEFE]: Object.freeze([
      { id: "dashboard-ejecutivo", label: "Dashboard ejecutivo", icon: "chart" },
      { id: "avance-macro", label: "Avance por Macro", icon: "users" },
      { id: "estado-entregables", label: "Estado de entregables", icon: "file" },
      { id: "informes-macro", label: "Informes por Macro", icon: "inbox" },
      { id: "productividad-gestor", label: "Productividad por Gestor", icon: "chart" },
      { id: "perfil", label: "Perfil", icon: "user" }
    ]),
    [roles.ADMINISTRADOR]: Object.freeze([
      { id: "dashboard-admin", label: "Dashboard", icon: "home" },
      { id: "usuarios-admin", label: "Usuarios", icon: "users" },
      { id: "macros-admin", label: "Macros", icon: "users" },
      { id: "atet-admin", label: "ATET", icon: "file" },
      { id: "roles-permisos-admin", label: "Roles y permisos", icon: "shield" },
      { id: "parametros-admin", label: "Parámetros generales", icon: "settings" },
      { id: "auditoria-admin", label: "Historial de actividades", icon: "history" },
      { id: "bitacora-admin", label: "Bitácora del sistema", icon: "inbox" },
      { id: "perfil", label: "Perfil", icon: "user" }
    ])
  });

  const roleAliases = Object.freeze({
    macro: roles.MACRO,
    administrador: roles.ADMINISTRADOR,
    "mesa de partes": roles.MACRO,
    gestor: roles.GESTOR,
    "gestor de la informacion": roles.GESTOR,
    jefe: roles.JEFE
  });

  function normalizeRole(value) {
    if (typeof value !== "string") return null;

    const key = value
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return roleAliases[key] || null;
  }

  const extraRoutes = Object.freeze({
    [roles.MACRO]: Object.freeze([
      Object.freeze({ type: "exact", value: "importar-atet" }),
      Object.freeze({ type: "prefix", value: "detalle-atet/" }),
      Object.freeze({ type: "prefix", value: "registrar-presentacion/" }),
      Object.freeze({ type: "prefix", value: "evaluar-entregable/" })
    ]),
    [roles.GESTOR]: Object.freeze([
      Object.freeze({ type: "prefix", value: "detalle-evaluacion-gestor/" }),
      Object.freeze({ type: "prefix", value: "vista-previa-informe/" })
    ]),
    [roles.JEFE]: Object.freeze([]),
    [roles.ADMINISTRADOR]: Object.freeze([])
  });

  function matchesRoute(rule, route) {
    if (rule.type === "exact") return route === rule.value;
    return route.startsWith(rule.value) && route.length > rule.value.length;
  }

  function canAccessRoute(role, route) {
    if (!menus[role] || typeof route !== "string" || !route) return false;
    if (menus[role].some((item) => item.id === route)) return true;
    return extraRoutes[role].some((rule) => matchesRoute(rule, route));
  }

  function isKnownRoute(route) {
    if (typeof route !== "string" || !route) return false;
    if (Object.values(menus).some((items) => items.some((item) => item.id === route))) return true;
    return Object.values(extraRoutes).some((rules) => rules.some((rule) => matchesRoute(rule, route)));
  }

  global.APP_ROLES = roles;
  global.ROLE_MENUS = menus;
  global.normalizeDemoRole = normalizeRole;
  global.DEMO_EXTRA_ROUTES = extraRoutes;
  global.canAccessDemoRoute = canAccessRoute;
  global.isKnownDemoRoute = isKnownRoute;
})(window);
