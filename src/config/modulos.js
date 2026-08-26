(function configureModules(global) {
  global.MODULE_VIEWS = Object.freeze({
    dashboard: {
      title: "Dashboard",
      description: "Consulta el resumen del periodo y el seguimiento general de los ATET a tu cargo."
    },
    "mis-atet": {
      title: "Mis ATET",
      description: "Consulta y localiza los ATET registrados a tu cargo."
    },
    "detalle-atet": {
      title: "Detalle ATET",
      description: "Consulta la información registrada del ATET y su servicio asignado."
    },
    "registrar-atet": {
      title: "Registrar ATET",
      description: "Registra manualmente los datos y la asignación de un ATET."
    },
    "importar-atet": {
      title: "Importar ATET",
      description: "Carga y revisa registros ATET mediante una plantilla de Excel."
    },
    entregables: {
      title: "Entregables",
      description: "Consulta y realiza el seguimiento de entregables por periodo."
    },
    "registrar-presentacion": {
      title: "Presentación del entregable",
      description: "Consulta o registra la presentación asociada al entregable seleccionado."
    },
    "evaluar-entregable": {
      title: "Evaluar entregable",
      description: "Registra el cumplimiento, análisis y páginas de los ocho productos del entregable."
    },
    historial: {
      title: "Historial",
      description: "Consulta las acciones y registros anteriores asociados a tu gestión."
    },
    perfil: {
      title: "Perfil",
      description: "Consulta la información de tu cuenta y el rol activo."
    },
    "dashboard-gestor": {
      title: "Dashboard",
      description: "Consulta el resumen de evaluaciones recibidas e informes por gestionar."
    },
    "entregables-pendientes": {
      title: "Entregables pendientes",
      description: "Revisa las evaluaciones registradas por los Macros que requieren gestión."
    },
    "detalle-evaluacion-gestor": {
      title: "Detalle de evaluación",
      description: "Consulta la evaluación publicada por el Macro en modo de solo lectura."
    },
    "vista-previa-informe": {
      title: "Vista previa del informe",
      description: "Revisa la composición provisional del informe antes de generarlo."
    },
    "historial-informes": {
      title: "Historial de informes",
      description: "Consulta los informes generados y su estado de gestión."
    },
    "dashboard-ejecutivo": {
      title: "Dashboard ejecutivo",
      description: "Consulta indicadores consolidados del Sistema de Gestión ATET."
    },
    "avance-macro": {
      title: "Avance por Macro",
      description: "Compara la cobertura y el avance de ATET por responsable Macro."
    },
    "estado-entregables": {
      title: "Estado de entregables",
      description: "Consulta el estado consolidado de presentación y evaluación de entregables."
    },
    "informes-macro": {
      title: "Informes por Macro",
      description: "Consulta la cantidad y el estado de informes agrupados por Macro."
    },
    "productividad-gestor": {
      title: "Productividad por Gestor",
      description: "Consulta la carga recibida y los informes gestionados por responsable."
    },
    "dashboard-admin": { title: "Panel de Administración", description: "Vista general operativa de la demostración y sus registros." },
    "usuarios-admin": { title: "Usuarios", description: "Administra usuarios y accesos ficticios de la demostración." },
    "macros-admin": { title: "Macros", description: "Consulta grupos Macro y sus ATET asignados." },
    "atet-admin": { title: "Administración de ATET", description: "Corrige o desactiva registros demo con trazabilidad." },
    "parametros-admin": { title: "Parámetros generales", description: "Consulta los catálogos y los ocho productos configurados." },
    "auditoria-admin": { title: "Historial de actividades", description: "Consulta las acciones funcionales registradas en la demo." },
    "bitacora-admin": { title: "Bitácora del sistema", description: "Consulta accesos, procesos, advertencias y errores simulados." }
  });
})(window);
