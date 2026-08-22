(function configureDemoEvaluation(global) {
  const items = [
    { id: "item-01", number: 1, criterion: "El entregable corresponde al ATET, periodo y número de producto seleccionados.", required: true },
    { id: "item-02", number: 2, criterion: "La identificación del ATET y la Orden de Servicio son consistentes con el registro.", required: true },
    { id: "item-03", number: 3, criterion: "El documento presenta una estructura ordenada y permite identificar sus secciones.", required: true },
    { id: "item-04", number: 4, criterion: "Las actividades reportadas se encuentran completas para el periodo evaluado.", required: true },
    { id: "item-05", number: 5, criterion: "Las evidencias descritas guardan relación con las actividades reportadas.", required: true },
    { id: "item-06", number: 6, criterion: "Las fechas y datos consignados son coherentes entre sí.", required: true },
    { id: "item-07", number: 7, criterion: "La redacción es clara y permite comprender los resultados del servicio.", required: true },
    { id: "item-08", number: 8, criterion: "El entregable cumple el formato y las condiciones generales usadas en esta demostración.", required: true }
  ];

  const responseOptions = Object.freeze([
    Object.freeze({ id: "cumple", label: "Cumple" }),
    Object.freeze({ id: "no-cumple", label: "No cumple" })
  ]);

  function calculateResult(responses = {}) {
    const missing = items.filter((item) => item.required && !responseOptions.some((option) => option.id === responses[item.id]));
    if (missing.length) return { complete: false, result: "pendiente", missing: missing.map((item) => item.id) };
    return {
      complete: true,
      result: items.some((item) => responses[item.id] === "no-cumple") ? "observada" : "conforme",
      missing: []
    };
  }

  global.DEMO_EVALUATION_CONFIG = Object.freeze({
    version: "demo-1.0",
    status: "ficticia-autorizada",
    warning: "Criterios inventados exclusivamente para demostrar el flujo. No constituyen criterios oficiales del MINEDU.",
    items: Object.freeze(items.map(Object.freeze)),
    responseOptions,
    rule: "Los 8 ítems son obligatorios. Todos deben cumplir para obtener Conforme; cualquier No cumple produce Observado.",
    calculateResult
  });
})(window);
