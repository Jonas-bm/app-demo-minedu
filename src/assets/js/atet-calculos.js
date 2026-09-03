(function configureAtetCalculations(global) {
  function calculateAssignment(data) {
    if (!data || !data.asignacion || !Array.isArray(data.atets)) {
      throw new TypeError("Los datos de asignación ATET no son válidos.");
    }

    const assigned = Number(data.asignacion.plazasAsignadas);
    if (!Number.isInteger(assigned) || assigned < 0) {
      throw new RangeError("La cantidad de plazas asignadas debe ser un entero no negativo.");
    }

    const uniqueAtets = new Map();
    data.atets.forEach((atet, index) => {
      const identifier = atet?.codigo || atet?.id || `atet-${index}`;
      if (!uniqueAtets.has(identifier)) uniqueAtets.set(identifier, atet);
    });
    const totalRegistered = uniqueAtets.size;
    const registered = Math.min(assigned, totalRegistered);
    const pending = Math.max(assigned - registered, 0);
    const coverage = assigned === 0 ? 0 : Math.round((registered / assigned) * 1000) / 10;

    return {
      asignados: assigned,
      registrados: registered,
      registradosTotales: totalRegistered,
      pendientes: pending,
      excedentes: Math.max(totalRegistered - assigned, 0),
      cobertura: coverage
    };
  }

  function calculateMacroAssignments({ personal, registrations = [], assignments = [], users = [] }) {
    const activeAssignments = assignments.filter((item) => item.status === "Activo");
    if (!activeAssignments.length) {
      const summary = calculateAssignment(personal);
      return [{ macroId: personal.asignacion.macroId, macro: "Macro Demo", ...summary }];
    }

    const grouped = new Map();
    activeAssignments.forEach((item) => {
      const current = grouped.get(item.macroId) || {
        macroId: item.macroId,
        macro: item.macro || "Macro sin nombre",
        asignados: 0
      };
      current.asignados += Math.max(0, Number(item.assigned) || 0);
      grouped.set(item.macroId, current);
    });

    return [...grouped.values()].map((group) => {
      const user = users.find((item) => item.id === group.macroId);
      const isDemoMacro = user?.usuario === "macro.demo" || group.macro === "Macro Demo";
      const ownedRegistrations = registrations.filter((item) => isDemoMacro
        ? !item.macroUserId || [group.macroId, "macro-demo-01"].includes(item.macroUserId)
        : item.macroUserId === group.macroId);
      const atets = isDemoMacro ? personal.atets.concat(ownedRegistrations) : ownedRegistrations;
      const summary = calculateAssignment({ asignacion: { plazasAsignadas: group.asignados }, atets });
      return { ...group, ...summary };
    });
  }

  global.ATET_CALCULATIONS = Object.freeze({ calculateAssignment, calculateMacroAssignments });
})(window);
