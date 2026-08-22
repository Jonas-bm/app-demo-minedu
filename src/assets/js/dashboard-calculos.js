(function configureDashboardCalculations(global) {
  const PRESENTED_STATES = new Set(["presentada", "fuera-plazo"]);
  const REVIEWED_STATES = new Set(["conforme", "observada"]);

  function percentage(value, total) {
    if (!total) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  function calculatePeriod(period) {
    if (!period || !Array.isArray(period.entregables)) {
      throw new TypeError("El periodo no contiene una lista válida de entregables.");
    }

    const expected = period.entregables.length;
    const atetInCharge = new Set(period.entregables.map((item) => item.atetCodigo)).size;
    const presentedItems = period.entregables.filter((item) => PRESENTED_STATES.has(item.presentacion.estado));
    const conformingItems = presentedItems.filter((item) => item.evaluacion.estado === "conforme");
    const observedItems = presentedItems.filter((item) => item.evaluacion.estado === "observada");
    const reviewedItems = presentedItems.filter((item) => REVIEWED_STATES.has(item.evaluacion.estado));
    const upcomingItems = period.entregables
      .filter((item) => item.presentacion.estado === "pendiente")
      .sort((first, second) => first.fechaMaxima.localeCompare(second.fechaMaxima));
    const latestReviews = reviewedItems
      .filter((item) => item.evaluacion.fecha)
      .sort((first, second) => second.evaluacion.fecha.localeCompare(first.evaluacion.fecha));

    return {
      periodoId: period.id,
      atetACargo: atetInCharge,
      esperados: expected,
      presentados: presentedItems.length,
      conformes: conformingItems.length,
      observados: observedItems.length,
      pendientesPresentacion: expected - presentedItems.length,
      pendientesEvaluacion: presentedItems.length - reviewedItems.length,
      avancePresentacion: percentage(presentedItems.length, expected),
      porcentajeConformes: percentage(conformingItems.length, presentedItems.length),
      porcentajeObservados: percentage(observedItems.length, presentedItems.length),
      proximosVencimientos: upcomingItems,
      ultimasRevisiones: latestReviews
    };
  }

  global.DASHBOARD_CALCULATIONS = Object.freeze({ calculatePeriod, percentage });
})(window);
