(function configureDemoReport(global) {
  global.DEMO_REPORT_CONFIG = Object.freeze({
    version: "demo-informes-v2", status: "simulacion",
    warning: "Documento generado exclusivamente para esta demostración. La numeración, identidad, firma y contenido no tienen validez oficial.",
    titles: Object.freeze({ conforme: "INFORME DEMO DE CONFORMIDAD DEL ENTREGABLE", observada: "INFORME DEMO DE OBSERVACIONES AL ENTREGABLE" }),
    institutionalYear: "Simulación del Sistema de Gestión ATET — 2026",
    recipient: "Dirección de Innovación Tecnológica en Educación (dato demo)",
    sender: "Gestor de la Información — Usuario de demostración",
    introduction: "El presente documento simula el registro de la revisión realizada por el Macro respecto del entregable indicado.",
    conclusion: Object.freeze({ conforme: "Los ocho productos evaluados cumplen en esta simulación; corresponde registrar el entregable como CONFORME.", observada: "Uno o más productos no cumplen en esta simulación; corresponde registrar el entregable como OBSERVADO." }),
    recommendation: Object.freeze({ conforme: "Continuar con el flujo administrativo simulado correspondiente.", observada: "Solicitar la subsanación simulada de las observaciones registradas en un plazo referencial de tres días calendario." }),
    signatureName: "Firma simulada", signatureRole: "Gestor responsable · Demo sin validez oficial"
  });
})(window);
