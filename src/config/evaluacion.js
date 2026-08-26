(function configureDemoEvaluation(global) {
  const yearKey = "demoEvaluationCatalogYear";
  const defaultYear = 2026;
  const itemTemplates = [
    { id: "producto-01", number: 1, activity: "Elaborar el plan de trabajo respecto a la asistencia tecnológica para la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas con tabletas, en el marco del Plan de Cierre de Brecha Digital.", product: "Documento con la elaboración del plan de trabajo respecto a la asistencia tecnológica para la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-02", number: 2, activity: "Elaborar planes de trabajo con las GRE/DRE o UGEL para el desarrollo de las actividades propias de la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas con tabletas, en el marco del Plan de Cierre de Brecha Digital.", product: "Documento con el plan de trabajo aprobado con las GRE/DRE o UGEL para el desarrollo de las actividades propias de la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas con tabletas, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-03", number: 3, activity: "Brindar inducción y soporte en tecnología de información (TI), a directivos y docentes, sobre las tabletas educativas designadas en las II.EE., para la actualización de los materiales educativos digitales {{year}}, en el marco del Plan de Cierre de Brecha Digital.", product: "Documento conteniendo las evidencias de la inducción y soporte en tecnologías de información (TI) (Anexo 2) a directivos y docentes, sobre las tabletas educativas designadas en las II.EE., para la actualización de los materiales educativos digitales {{year}}, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-04", number: 4, activity: "Desarrollar la evaluación y el rendimiento operativo de las tabletas encontradas en las II.EE. focalizadas, documentando a través de actas y/o fichas y/o matrices.", product: "Documento con las evidencias (Anexo 1) de la evaluación de la operatividad e incidencias de las tabletas encontradas en las II.EE. focalizadas, documentando a través de actas y/o fichas y/o matrices." },
    { id: "producto-05", number: 5, activity: "Realizar la instalación del gestor de contenidos y aplicaciones educativas en las tabletas de las Instituciones Educativas beneficiadas con tabletas, en el marco del Plan de Cierre de Brecha Digital.", product: "Reporte de la instalación del gestor de contenidos y aplicaciones en las tabletas de las Instituciones Educativas beneficiadas, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-06", number: 6, activity: "Realizar el reporte de avances en el sistema digital facilitado por la DITE para la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas con tabletas, en el marco del Plan de Cierre de Brecha Digital.", product: "Documento que evidencia el reporte de avances en el sistema digital (Power BI) facilitado por la DITE para la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-07", number: 7, activity: "Realizar el reporte de las tabletas que tuvieron incidencias en la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas, en el marco del Plan de Cierre de Brecha Digital.", product: "Reporte de las tabletas que tuvieron incidencias en la actualización de los materiales educativos digitales {{year}} de las Instituciones Educativas beneficiadas, en el marco del Plan de Cierre de Brecha Digital." },
    { id: "producto-08", number: 8, activity: "Realizar el reporte de dispositivos electrónicos que se identifiquen en las instituciones educativas beneficiadas en el marco del Plan de Cierre de Brecha Digital.", product: "Documento que contenga el reporte de dispositivos electrónicos identificados en las Instituciones Educativas beneficiadas en el marco del Plan de Cierre de Brecha Digital." }
  ];

  function getYear() {
    const stored = Number(global.localStorage.getItem(yearKey));
    return Number.isInteger(stored) && stored >= 2000 && stored <= 2100 ? stored : defaultYear;
  }

  function setYear(value) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("El año debe estar entre 2000 y 2100.");
    global.localStorage.setItem(yearKey, String(year));
    return year;
  }

  function getItems() {
    const year = String(getYear());
    return Object.freeze(itemTemplates.map((item) => {
      const resolved = { ...item, activity: item.activity.replaceAll("{{year}}", year), product: item.product.replaceAll("{{year}}", year) };
      return Object.freeze({ ...resolved, criterion: resolved.product, required: true });
    }));
  }

  const responseOptions = Object.freeze([Object.freeze({ id: "cumple", label: "Cumple" }), Object.freeze({ id: "no-cumple", label: "No cumple" })]);

  function calculateResult(responses = {}) {
    const items = getItems();
    const missing = items.filter((item) => !responseOptions.some((option) => option.id === responses[item.id]));
    if (missing.length) return { complete: false, result: "pendiente", missing: missing.map((item) => item.id), compliant: 0, observed: 0 };
    const observed = items.filter((item) => responses[item.id] === "no-cumple").length;
    return { complete: true, result: observed ? "observada" : "conforme", missing: [], compliant: items.length - observed, observed };
  }

  function validateEntry(response, analysis, pageStart, pageEnd) {
    const start = Number(pageStart);
    const end = Number(pageEnd);
    if (!responseOptions.some((option) => option.id === response)) return "Selecciona Cumple o No cumple.";
    if (response === "no-cumple" && !String(analysis || "").trim()) return "Escribe el motivo del incumplimiento.";
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < start) return "Registra un rango de páginas válido.";
    return "";
  }

  global.DEMO_EVALUATION_CONFIG = Object.freeze({
    version: "segundo-entregable-v2",
    status: "modelo-demo-basado-en-informes",
    warning: "Simulación basada en los modelos de conformidad y observación proporcionados. No registra ni reemplaza documentos oficiales.",
    deliverableNumber: 2,
    get year() { return getYear(); },
    get items() { return getItems(); },
    setYear, responseOptions,
    rule: "Los 8 productos son obligatorios. Todos deben cumplir para obtener Conforme; cualquier No cumple produce Observado.",
    calculateResult, validateEntry
  });
})(window);
