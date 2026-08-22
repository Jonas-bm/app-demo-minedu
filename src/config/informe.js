(function configureDemoReport(global) {
  global.DEMO_REPORT_CONFIG = Object.freeze({
    version: "demo-1.0",
    status: "ficticia-autorizada",
    warning: "Plantilla ficticia autorizada únicamente para demostrar el flujo. No constituye un documento oficial del MINEDU.",
    titles: Object.freeze({
      conforme: "INFORME DE CONFORMIDAD DEL ENTREGABLE",
      observada: "INFORME DE OBSERVACIÓN DEL ENTREGABLE"
    }),
    introduction: "Se deja constancia de la revisión registrada por el Macro respecto del entregable indicado en el presente documento.",
    conclusion: Object.freeze({
      conforme: "De acuerdo con la evaluación registrada, el entregable obtiene resultado CONFORME para fines de esta demostración.",
      observada: "De acuerdo con la evaluación registrada, el entregable obtiene resultado OBSERVADO y requiere atender el motivo consignado."
    }),
    pendingFields: Object.freeze(["Número de informe", "Fecha de emisión", "Responsable de emisión y firma"])
  });
})(window);
