(function configureAtetCalculations(global) {
  function calculateAssignment(data) {
    if (!data || !data.asignacion || !Array.isArray(data.atets)) {
      throw new TypeError("Los datos de asignación ATET no son válidos.");
    }

    const assigned = Number(data.asignacion.plazasAsignadas);
    if (!Number.isInteger(assigned) || assigned < 0) {
      throw new RangeError("La cantidad de plazas asignadas debe ser un entero no negativo.");
    }

    const registered = data.atets.length;
    const pending = Math.max(assigned - registered, 0);
    const coverage = assigned === 0 ? 0 : Math.round((registered / assigned) * 1000) / 10;

    return {
      asignados: assigned,
      registrados: registered,
      pendientes: pending,
      excedentes: Math.max(registered - assigned, 0),
      cobertura: coverage
    };
  }

  global.ATET_CALCULATIONS = Object.freeze({ calculateAssignment });
})(window);
