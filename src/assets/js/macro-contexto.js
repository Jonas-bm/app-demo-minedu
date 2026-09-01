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
        assignedQuota: null,
        regionId: null
      };
    }

    const user = readList(adminUsersKey).find((item) => item.usuario === usuario);
    const macroUserId = user?.id || usuario;
    const assignments = readList(assignmentsKey).filter((item) => item.macroId === macroUserId);
    const assignment = assignments.find((item) => item.status === "Activo") || assignments[0] || null;

    return {
      usuario,
      nombre,
      isDemoMacro: false,
      macroUserId,
      assignment,
      assignedQuota: assignment ? Math.max(0, Number(assignment.assigned) || 0) : 0,
      regionId: assignment?.regionId || null
    };
  }

  function monthEnd(periodId) {
    const [year, month] = String(periodId).split("-").map(Number);
    if (!year || !month) return periodId;
    const day = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Metadatos por periodo (número de entregable y fecha máxima). Si el periodo ya
  // trae entregables se toman de ahí; si no, se deducen del orden y del mes.
  function periodMeta(dashboardData) {
    const meta = new Map();
    (dashboardData.periodos || []).forEach((period, index) => {
      const sample = (period.entregables || [])[0];
      meta.set(period.id, {
        numero: sample ? sample.numero : index + 1,
        fechaMaxima: sample ? sample.fechaMaxima : monthEnd(period.id)
      });
    });
    return meta;
  }

  function syntheticDeliverable(periodId, atet, meta) {
    return {
      id: `ent-${periodId}-${atet.codigo}`,
      atetCodigo: atet.codigo,
      atetNombre: atet.nombreCompleto,
      numero: meta.numero,
      fechaMaxima: meta.fechaMaxima,
      presentacion: { estado: "pendiente", fecha: null },
      evaluacion: { estado: "pendiente", fecha: null, evaluador: null }
    };
  }

  // Devuelve los periodos/entregables que corresponde ver al Macro.
  // - El Macro demo conserva los entregables de `dashboard.json`.
  // - Un Macro creado por el Administrador parte sin entregables precargados.
  // - En ambos casos, si se pasa `personalData`, se generan entregables para
  //   cada ATET propio que aún no tenga uno en el periodo (así el ATET recién
  //   registrado aparece en el módulo de Entregables).
  function effectiveDashboard(dashboardData, context = get(), personalData) {
    const ownAtets = personalData ? effectivePersonal(personalData, context).atets : [];
    const meta = personalData ? periodMeta(dashboardData) : null;
    const periodos = (dashboardData.periodos || []).map((period, index) => {
      const base = context.isDemoMacro ? (period.entregables || []) : [];
      if (!ownAtets.length) return { ...period, entregables: base };
      const covered = new Set(base.map((item) => item.atetCodigo));
      const periodInfo = meta.get(period.id) || { numero: index + 1, fechaMaxima: monthEnd(period.id) };
      const extra = ownAtets
        .filter((atet) => atet.codigo && !covered.has(atet.codigo))
        .map((atet) => syntheticDeliverable(period.id, atet, periodInfo));
      return { ...period, entregables: [...base, ...extra] };
    });
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
