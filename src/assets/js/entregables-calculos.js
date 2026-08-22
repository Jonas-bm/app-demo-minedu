(function configureDeliverableCalculations(global) {
  const states = Object.freeze({
    PENDING: "pendiente",
    PRESENTED: "presentado",
    LATE: "fuera-plazo"
  });

  function resolveStatus(deliverable, referenceDate) {
    const presentationDate = deliverable?.presentacion?.fecha;
    if (presentationDate) {
      return presentationDate > deliverable.fechaMaxima ? states.LATE : states.PRESENTED;
    }
    return referenceDate > deliverable.fechaMaxima ? states.LATE : states.PENDING;
  }

  function buildExpectedDeliverables(dashboardData, personalData, presentationOverrides = [], evaluationOverrides = []) {
    if (!dashboardData?.metadata?.fechaReferencia || !Array.isArray(dashboardData.periodos)) {
      throw new TypeError("Los periodos de entregables no tienen una estructura válida.");
    }
    if (!Array.isArray(personalData?.atets)) {
      throw new TypeError("La relación de ATET y contratos no tiene una estructura válida.");
    }

    const atetsByCode = new Map(personalData.atets.map((atet) => [atet.codigo, atet]));
    const overridesById = new Map(presentationOverrides.map((item) => [item.entregableId, item]));
    const evaluationsById = new Map(evaluationOverrides.map((item) => [item.entregableId, item]));
    return dashboardData.periodos.flatMap((period) => period.entregables.map((deliverable) => {
      const atet = atetsByCode.get(deliverable.atetCodigo);
      if (!atet) throw new Error(`No existe un contrato asociado a ${deliverable.atetCodigo}.`);
      if (deliverable.numero < 1) throw new Error(`El entregable ${deliverable.id} tiene un número inválido.`);

      const presentation = overridesById.has(deliverable.id)
        ? { estado: "presentada", ...overridesById.get(deliverable.id) }
        : deliverable.presentacion;
      const effectiveDeliverable = { ...deliverable, presentacion: presentation };
      const evaluation = evaluationsById.has(deliverable.id)
        ? { estado: evaluationsById.get(deliverable.id).resultado, fecha: evaluationsById.get(deliverable.id).evaluadoEn, evaluador: evaluationsById.get(deliverable.id).evaluadoPor, ...evaluationsById.get(deliverable.id) }
        : deliverable.evaluacion;
      return {
        id: deliverable.id,
        periodoId: period.id,
        numero: deliverable.numero,
        fechaMaxima: deliverable.fechaMaxima,
        estado: resolveStatus(effectiveDeliverable, dashboardData.metadata.fechaReferencia),
        atet: {
          id: atet.id,
          codigo: atet.codigo,
          nombreCompleto: atet.nombreCompleto
        },
        contrato: {
          ordenServicio: atet.ordenServicio,
          fechaInicio: atet.fechaInicio,
          fechaTermino: atet.fechaTermino
        },
        presentacion: { ...presentation },
        evaluacion: { ...evaluation }
      };
    }));
  }

  function applyPresentationOverrides(dashboardData, presentationOverrides = []) {
    const overridesById = new Map(presentationOverrides.map((item) => [item.entregableId, item]));
    return {
      ...dashboardData,
      periodos: dashboardData.periodos.map((period) => ({
        ...period,
        entregables: period.entregables.map((deliverable) => overridesById.has(deliverable.id)
          ? { ...deliverable, presentacion: { estado: "presentada", ...overridesById.get(deliverable.id) } }
          : deliverable)
      }))
    };
  }

  function applyEvaluationOverrides(dashboardData, evaluationOverrides = []) {
    const overridesById = new Map(evaluationOverrides.map((item) => [item.entregableId, item]));
    return {
      ...dashboardData,
      periodos: dashboardData.periodos.map((period) => ({
        ...period,
        entregables: period.entregables.map((deliverable) => overridesById.has(deliverable.id)
          ? {
              ...deliverable,
              evaluacion: {
                estado: overridesById.get(deliverable.id).resultado,
                fecha: overridesById.get(deliverable.id).evaluadoEn.slice(0, 10),
                evaluador: overridesById.get(deliverable.id).evaluadoPor
              }
            }
          : deliverable)
      }))
    };
  }

  function summarizeStatuses(deliverables) {
    return deliverables.reduce((summary, deliverable) => {
      summary[deliverable.estado] = (summary[deliverable.estado] || 0) + 1;
      return summary;
    }, { [states.PENDING]: 0, [states.PRESENTED]: 0, [states.LATE]: 0 });
  }

  global.DELIVERABLE_CALCULATIONS = Object.freeze({ states, resolveStatus, buildExpectedDeliverables, summarizeStatuses, applyPresentationOverrides, applyEvaluationOverrides });
})(window);
