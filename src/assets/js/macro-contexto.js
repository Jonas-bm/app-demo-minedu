(function configureMacroContext(global) {
  const adminUsersKey = "demoAdminUsers";
  const assignmentsKey = "demoMacroAssignments";
  const DEMO_MACRO_USER = "macro.demo";
  const DEMO_MACRO_ID = "macro-demo-01";

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn(`Se ignoró "${key}" por contenido inválido.`, error);
      return [];
    }
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem("demoSession") || "null");
    } catch (error) {
      return null;
    }
  }

  // Contexto del Macro con sesión iniciada.
  // - `macro.demo` conserva los datos de demostración precargados.
  // - Un Macro creado por el Administrador ve solo su propia información:
  //   el cupo que le asignaron y los ATET que él mismo registra o importa.
  function get() {
    const session = readSession();
    const usuario = session?.usuario || "";
    const nombre = session?.nombre || "";
    const role = session?.rol && global.normalizeDemoRole ? global.normalizeDemoRole(session.rol) : session?.rol || null;
    const macroRole = global.APP_ROLES ? global.APP_ROLES.MACRO : "Macro";
    // Solo un Macro creado por el Administrador recibe datos acotados;
    // el resto de roles (y `macro.demo`) usan la información de demostración tal cual.
    const isDemoMacro = !usuario || usuario === DEMO_MACRO_USER || (role != null && role !== macroRole);

    if (isDemoMacro) {
      return {
        usuario: usuario || DEMO_MACRO_USER,
        nombre: nombre || "Macro Demo",
        isDemoMacro: true,
        macroUserId: DEMO_MACRO_ID,
        assignment: null,
        assignments: [],
        assignedQuota: null,
        regionId: null,
        regionIds: [],
        quotaByRegion: {}
      };
    }

    const user = readList(adminUsersKey).find((item) => item.usuario === usuario);
    const macroUserId = user?.id || usuario;
    // Un Macro creado por el Administrador puede tener VARIAS regiones a su cargo.
    // Solo cuentan las asignaciones activas; una liberada/desactivada no otorga
    // cupo ni región.
    const activeAssignments = readList(assignmentsKey)
      .filter((item) => item.macroId === macroUserId && item.status === "Activo");
    const quotaByRegion = {};
    activeAssignments.forEach((item) => {
      const quota = Math.max(0, Number(item.assigned) || 0);
      quotaByRegion[item.regionId] = (quotaByRegion[item.regionId] || 0) + quota;
    });
    const regionIds = Object.keys(quotaByRegion);
    const assignedQuota = Object.values(quotaByRegion).reduce((sum, value) => sum + value, 0);

    return {
      usuario,
      nombre,
      isDemoMacro: false,
      macroUserId,
      assignment: activeAssignments[0] || null,
      assignments: activeAssignments,
      assignedQuota,
      regionId: regionIds[0] || null,
      regionIds,
      quotaByRegion
    };
  }

  function parseMonth(dateStr) {
    const [year, month] = String(dateStr || "").split("-").map(Number);
    return year && month ? year * 12 + (month - 1) : null;
  }

  function monthIdFromIndex(index) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  // "Fecha máxima" del entregable de un mes: el primer día del mes siguiente
  // (cuando "se cumple el mes" de servicio). Ej.: servicio que trabaja
  // septiembre → fecha máxima 2026-10-01.
  function dueDateForMonthIndex(index) {
    return `${monthIdFromIndex(index + 1)}-01`;
  }

  // Entregables mensuales de un ATET según su ventana de servicio
  // (`fechaInicio`..`fechaTermino`). El entregable N.º 1 corresponde al primer
  // mes de servicio, con su fecha máxima el 1.º del mes siguiente.
  function serviceDeliverables(atet) {
    const start = parseMonth(atet.fechaInicio);
    if (!atet.codigo || start === null) return [];
    const end = parseMonth(atet.fechaTermino);
    const last = end !== null && end >= start ? end : start;
    const list = [];
    for (let index = start; index <= last && list.length < 60; index += 1) {
      const periodoId = monthIdFromIndex(index);
      list.push({
        periodoId,
        deliverable: {
          id: `ent-${periodoId}-${atet.codigo}`,
          atetCodigo: atet.codigo,
          atetNombre: atet.nombreCompleto || atet.nombresApellidos || atet.codigo,
          numero: index - start + 1,
          fechaMaxima: dueDateForMonthIndex(index),
          presentacion: { estado: "pendiente", fecha: null },
          evaluacion: { estado: "pendiente", fecha: null, evaluador: null }
        }
      });
    }
    return list;
  }

  // Devuelve los periodos/entregables que corresponde ver al Macro.
  // - El Macro demo conserva los entregables precargados de `dashboard.json`.
  // - Los entregables de cada ATET propio se generan mes a mes a partir de su
  //   ventana de servicio: nunca hay entregables antes de la fecha de inicio ni
  //   después de la fecha de término, y la numeración parte de 1 en el primer
  //   mes de servicio (ver AV-030).
  function effectiveDashboard(dashboardData, context = get(), personalData) {
    const ownAtets = personalData ? effectivePersonal(personalData, context).atets : [];
    const registrationCodes = new Set(ownRegistrations(context).map((item) => item.codigo));
    const periodMap = new Map();
    (dashboardData.periodos || []).forEach((period) => {
      periodMap.set(period.id, {
        ...period,
        entregables: context.isDemoMacro ? [...(period.entregables || [])] : []
      });
    });
    ownAtets.forEach((atet) => {
      // El Macro demo conserva intactos los entregables precargados de sus ATET
      // semilla; solo se generan entregables mes a mes para los ATET que el
      // Macro registró o importó.
      if (context.isDemoMacro && !registrationCodes.has(atet.codigo)) return;
      serviceDeliverables(atet).forEach(({ periodoId, deliverable }) => {
        if (!periodMap.has(periodoId)) periodMap.set(periodoId, { id: periodoId, entregables: [] });
        const bucket = periodMap.get(periodoId);
        if (!bucket.entregables.some((item) => item.atetCodigo === deliverable.atetCodigo)) {
          bucket.entregables.push(deliverable);
        }
      });
    });
    const periodos = [...periodMap.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return { ...dashboardData, periodos };
  }

  // Padrón de ATET que corresponde ver al Macro, con el formato de `personal.json`.
  function effectivePersonal(personalData, context = get()) {
    if (context.isDemoMacro) {
      return { ...personalData, atets: personalData.atets.concat(ownRegistrations(context)) };
    }
    return { ...personalData, atets: ownRegistrations(context) };
  }

  // Marca un registro/importación de ATET como propiedad del Macro que lo crea.
  function stampOwnership(record, context = get()) {
    return { ...record, macroUserId: context.macroUserId, macroNombre: context.nombre };
  }

  // ATET que pertenecen al Macro con sesión iniciada.
  function ownRegistrations(context = get()) {
    const registrations = global.DEMO_STORE ? global.DEMO_STORE.getRegistrations() : [];
    if (context.isDemoMacro) {
      return registrations.filter((item) => !item.macroUserId || item.macroUserId === context.macroUserId);
    }
    return registrations.filter((item) => item.macroUserId === context.macroUserId);
  }

  // ¿El registro (presentación, evaluación, etc.) lo hizo el Macro de la sesión?
  function isOwnAuthor(author, context = get()) {
    const name = author || "";
    if (context.isDemoMacro) return !name || name === context.nombre || name === "Macro Demo";
    return name === context.nombre;
  }

  // Filtra una lista por el campo de autor indicado, dejando solo lo del Macro.
  function ownBy(records, authorField, context = get()) {
    return (records || []).filter((item) => isOwnAuthor(item && item[authorField], context));
  }

  function ownPresentations(context = get()) {
    const list = global.DEMO_STORE ? global.DEMO_STORE.getPresentations() : [];
    return ownBy(list, "registradoPor", context);
  }

  function ownEvaluations(context = get()) {
    const list = global.DEMO_STORE ? global.DEMO_STORE.getEvaluations() : [];
    return ownBy(list, "evaluadoPor", context);
  }

  global.MACRO_CONTEXT = Object.freeze({
    get,
    stampOwnership,
    ownRegistrations,
    ownPresentations,
    ownEvaluations,
    ownBy,
    isOwnAuthor,
    effectiveDashboard,
    effectivePersonal,
    DEMO_MACRO_USER,
    DEMO_MACRO_ID
  });
})(window);
