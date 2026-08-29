(function configureDemoReport(global) {
  // Textos institucionales fijos de la sección ANTECEDENTES. Provienen de los
  // modelos de informe proporcionados (INFORME-01666 conformidad e
  // INFORME-03166 observación). Los marcadores {clave} se completan con datos
  // respaldados por el sistema al componer el informe.
  const antecedentesInstitucionales = Object.freeze([
    'El artículo 132º del Reglamento de Organización y Funciones (ROF) del Ministerio de Educación, aprobado con Decreto Supremo Nº 001-2015-MINEDU, establece que la Dirección de Innovación Tecnológica en Educación-DITE es responsable de "Formular y proponer articuladamente con los órganos del Despacho Viceministerial de Gestión Pedagógica, la política de incorporación de innovaciones en tecnologías de la información y comunicación, en los procesos educativos en el aula".',
    'Que, mediante MEMORANDUM N°02627-2022-MINEDU/VMGP-DITE, se hace de conocimiento las funciones como COORDINADOR DE APRENDIZAJE DIGITAL a Ladislao Gallardo Rodríguez, de conformidad con lo señalado en su Contrato Administrativo de Servicio N°0776-2020/MINEDU-U.E.026; y en el marco del Decreto Legislativo N°1057 y su Reglamento, aprobado por el Decreto Supremo N°075-2008-PCM, modificado por el Decreto Supremo N° 065-2011-PCM.',
    'La Coordinación de Aprendizaje Digital actúa en el marco de la referencia de memorándum del numeral 1.2., de acuerdo con las funciones descritas en el mismo, liderando la estrategia territorial denominada "Actualización de los materiales educativos digitales para el uso y aprovechamiento de los docentes y estudiantes en el marco del Plan de Cierre de Brecha Digital", que busca la actualización de las tabletas y dispositivos electrónicos de las instituciones educativas focalizadas a nivel nacional.'
  ]);

  global.DEMO_REPORT_CONFIG = Object.freeze({
    version: "demo-informes-v4", status: "simulacion",
    warning: "Documento generado exclusivamente para esta demostración. La numeración, identidad, firma y contenido no tienen validez oficial.",
    titles: Object.freeze({ conforme: "INFORME DEMO DE CONFORMIDAD DEL ENTREGABLE", observada: "INFORME DEMO DE OBSERVACIONES AL ENTREGABLE" }),
    institutionalYear: "Simulación del Sistema de Gestión ATET — 2026",
    recipient: "Dirección de Innovación Tecnológica en Educación (dato demo)",
    sender: "Gestor de la Información — Usuario de demostración",
    introduction: "El presente documento simula el registro de la revisión realizada por el Macro respecto del entregable indicado.",
    signatureName: "Firma simulada", signatureRole: "Gestor responsable · Demo sin validez oficial",
    subsanacionDias: 3,

    // Sección I. ANTECEDENTES (numerales 1.1 a 1.4). "institucionales" son los
    // párrafos fijos; el último numeral se arma con datos del sistema.
    antecedentes: Object.freeze({
      institucionales: antecedentesInstitucionales,
      conforme: Object.freeze([
        'Que, mediante el documento de la referencia se contrata los servicios de {locador} para el "{servicio}".'
      ]),
      observada: Object.freeze([
        'Con fecha {fechaOrden}, se emite y notifica la Orden de Servicio N.° {ordenServicio}, a nombre de {locador} para el "{servicio}".',
        'El {fechaPresentacion}, el/la locador(a) {locador}, a través de MINEDU en Línea, remite el {entregable} de "{servicio}".'
      ])
    }),

    // Sección II. ANÁLISIS.
    analisis: Object.freeze({
      conforme: Object.freeze({
        plazo: "La locadora {locador} presentó el {entregable} el día {fechaPresentacion}, siendo la fecha máxima de entrega el día {fechaMaxima}. Por ello, el producto {resultadoPlazo}.",
        evaluacion: "El presente entregable es evaluado de acuerdo con las actividades descritas indicadas en los términos de referencia. En ese sentido, para dar conformidad al {entregable}, se ha evaluado la consistencia del producto solicitado, de acuerdo con lo descrito en el mismo.",
        introActividades: "De la evaluación realizada a las actividades ejecutadas, se evidencia que en el {entregable} se cumple con lo solicitado:",
        introProductos: "De la evaluación del producto solicitado, se evidencia que el producto del {entregable} cumple con lo solicitado:"
      }),
      observada: Object.freeze({
        intro: "Al respecto, de la revisión del {entregable} remitido por el locador, se determina que el mismo presenta {conteoTexto} {relacionadas} a las actividades descritas en los Términos de Referencia.",
        detalle: 'Es decir, el informe presentado por {locador} correspondiente al "{servicio}", fue revisado en función a las actividades indicadas en los términos de referencia, determinándose lo siguiente:',
        cierre: "Por lo expuesto, se requiere la subsanación de {conteoTexto}, mencionadas en el numeral 2.2 del presente informe, en un plazo máximo de {plazoDias} días calendario contados a partir de notificado al proveedor por parte de la Oficina de Logística."
      })
    }),

    // Sección III. CONCLUSIONES.
    conclusiones: Object.freeze({
      conforme: Object.freeze([
        'El informe presentado en el {entregable} de la Orden de Servicio N.° {ordenServicio} del "{servicio}" ha cumplido con los Términos de Referencia, tanto en las actividades y productos requeridos, y se ha determinado que ha cumplido con la calidad, cantidad y condiciones contractuales.',
        'Se otorga conformidad al {entregable} en el informe del "{servicio}", que cumple lo solicitado en la Orden de Servicio N.° {ordenServicio}.',
        "Se concluye que el Entregable presentado cumple con las actividades establecidas en el numeral 6 de los Términos de Referencia, lo cual permite brindar la Conformidad del servicio."
      ]),
      observada: Object.freeze([
        'El {entregable} de la Orden de Servicio N.° {ordenServicio} del "{servicio}" presentado por {locador}, tiene {conteoTexto}. Por lo que, se determina observar el {entregableTitulo} presentado por el locador.',
        "En ese sentido, se requiere la subsanación de las observaciones en el plazo máximo de {plazoDias} días calendario contados a partir de notificado al proveedor por parte de la Oficina de Logística."
      ])
    }),

    // Sección IV. RECOMENDACIÓN.
    recomendaciones: Object.freeze({
      conforme: "Se recomienda remitir el presente Informe al Área de Ejecución Contractual, para la atención correspondiente.",
      observada: "Se recomienda remitir el presente Informe a la Oficina de Logística, para la atención e implementación de las acciones que correspondan."
    }),

    // Resultado resumido que se muestra en el detalle de evaluación del Gestor.
    resultadoInforme: Object.freeze({
      conforme: "Conforme cumple con las 8 actividades",
      observada: "Observado presenta actividades que requieren mayor sustento y precisión"
    })
  });
})(window);
