(function configureDemoStore(global) {
  const registrationsKey = "demoAtetRegistrations";
  const presentationsKey = "demoDeliverablePresentations";
  const auditKey = "demoAtetAudit";
  const evaluationDraftsKey = "demoEvaluationDrafts";
  const evaluationsKey = "demoEvaluations";
  const reportsKey = "demoReports";
  const flashKey = "demoAtetFlash";

  function getRegistrations() {
    try {
      const value = JSON.parse(localStorage.getItem(registrationsKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron registros locales ATET inválidos.", error);
      return [];
    }
  }

  function addRegistration(atet) {
    const registrations = getRegistrations();
    registrations.push(atet);
    localStorage.setItem(registrationsKey, JSON.stringify(registrations));
  }

  function addRegistrations(atets) {
    if (!Array.isArray(atets) || !atets.length) return 0;
    const registrations = getRegistrations();
    registrations.push(...atets);
    localStorage.setItem(registrationsKey, JSON.stringify(registrations));
    return atets.length;
  }

  function getPresentations() {
    try {
      const value = JSON.parse(localStorage.getItem(presentationsKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron presentaciones locales inválidas.", error);
      return [];
    }
  }

  function savePresentation(presentation) {
    const presentations = getPresentations();
    const index = presentations.findIndex((item) => item.entregableId === presentation.entregableId);
    const action = index >= 0 ? "actualizacion" : "creacion";
    if (index >= 0) presentations[index] = presentation;
    else presentations.push(presentation);
    localStorage.setItem(presentationsKey, JSON.stringify(presentations));
    const audit = getAudit();
    audit.push({
      id: `audit-${Date.now()}-${presentation.entregableId}`,
      entidad: "presentacion-entregable",
      entidadId: presentation.entregableId,
      accion: action,
      usuario: presentation.registradoPor || "Macro Demo",
      fecha: presentation.registradoEn || new Date().toISOString(),
      detalle: `${action === "creacion" ? "Registro" : "Actualización"} de presentación con referencia ${presentation.referenciaDocumento}.`
    });
    localStorage.setItem(auditKey, JSON.stringify(audit));
    return presentation;
  }

  function getAudit() {
    try {
      const value = JSON.parse(localStorage.getItem(auditKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron registros locales de auditoría inválidos.", error);
      return [];
    }
  }

  function getEvaluationDrafts() {
    try {
      const value = JSON.parse(localStorage.getItem(evaluationDraftsKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron borradores de evaluación inválidos.", error);
      return [];
    }
  }

  function saveEvaluationDraft(draft) {
    const drafts = getEvaluationDrafts();
    const index = drafts.findIndex((item) => item.entregableId === draft.entregableId);
    if (index >= 0) drafts[index] = draft;
    else drafts.push(draft);
    localStorage.setItem(evaluationDraftsKey, JSON.stringify(drafts));
    return draft;
  }

  function removeEvaluationDraft(deliverableId) {
    const drafts = getEvaluationDrafts().filter((item) => item.entregableId !== deliverableId);
    localStorage.setItem(evaluationDraftsKey, JSON.stringify(drafts));
  }

  function getEvaluations() {
    try {
      const value = JSON.parse(localStorage.getItem(evaluationsKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron evaluaciones locales inválidas.", error);
      return [];
    }
  }

  function saveEvaluation(evaluation) {
    const evaluations = getEvaluations();
    const index = evaluations.findIndex((item) => item.entregableId === evaluation.entregableId);
    const action = index >= 0 ? "actualizacion" : "creacion";
    const publishedEvaluation = {
      ...evaluation,
      estadoPublicacion: "publicada",
      publicadaEn: evaluation.publicadaEn || evaluation.evaluadoEn || new Date().toISOString(),
      estadoGestion: evaluation.estadoGestion || "pendiente-informe"
    };
    if (index >= 0) evaluations[index] = publishedEvaluation;
    else evaluations.push(publishedEvaluation);
    localStorage.setItem(evaluationsKey, JSON.stringify(evaluations));
    const audit = getAudit();
    audit.push({
      id: `audit-${Date.now()}-${evaluation.entregableId}`,
      entidad: "evaluacion-entregable",
      entidadId: evaluation.entregableId,
      accion: action,
      usuario: publishedEvaluation.evaluadoPor || "Macro Demo",
      fecha: publishedEvaluation.evaluadoEn || new Date().toISOString(),
      detalle: `${action === "creacion" ? "Registro y publicación" : "Actualización"} de evaluación con resultado ${publishedEvaluation.resultado}.`
    });
    localStorage.setItem(auditKey, JSON.stringify(audit));
    removeEvaluationDraft(evaluation.entregableId);
    return publishedEvaluation;
  }

  function getReports() {
    try {
      const value = JSON.parse(localStorage.getItem(reportsKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Se ignoraron informes locales inválidos.", error);
      return [];
    }
  }

  function saveReport(report) {
    const reports = getReports();
    const index = reports.findIndex((item) => item.entregableId === report.entregableId);
    const action = index >= 0 ? "actualizacion" : "creacion";
    if (index >= 0) reports[index] = report;
    else reports.push(report);
    localStorage.setItem(reportsKey, JSON.stringify(reports));
    const audit = getAudit();
    audit.push({
      id: `audit-${Date.now()}-${report.id}`,
      entidad: "informe",
      entidadId: report.id,
      accion: action,
      usuario: report.autor || "Gestor Demo",
      fecha: report.generadoEn || new Date().toISOString(),
      detalle: `${action === "creacion" ? "Generación" : "Actualización"} del informe ${report.numero} con estado ${report.estado}.`
    });
    localStorage.setItem(auditKey, JSON.stringify(audit));
    return report;
  }

  function setFlash(message) {
    sessionStorage.setItem(flashKey, message);
  }

  function takeFlash() {
    const message = sessionStorage.getItem(flashKey) || "";
    sessionStorage.removeItem(flashKey);
    return message;
  }

  global.DEMO_STORE = Object.freeze({ getRegistrations, addRegistration, addRegistrations, getPresentations, savePresentation, getAudit, getEvaluationDrafts, saveEvaluationDraft, removeEvaluationDraft, getEvaluations, saveEvaluation, getReports, saveReport, setFlash, takeFlash });
})(window);
