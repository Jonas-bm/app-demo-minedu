(function configureAtetImport(global) {
  const columns = [
    { key: "codigo", header: "Código ATET", required: true, input: true, format: "Texto no vacío" },
    { key: "nombresApellidos", header: "Nombres y apellidos", required: true, input: true, format: "Texto no vacío" },
    { key: "dni", header: "DNI", required: true, input: true, format: "8 dígitos" },
    { key: "sinad", header: "SINAD", required: true, input: true, format: "Texto no vacío" },
    { key: "celular", header: "Celular", required: true, input: true, format: "9 dígitos; empieza en 9" },
    { key: "correo", header: "Correo", required: true, input: true, format: "Correo electrónico válido" },
    { key: "ordenServicio", header: "Orden de Servicio", required: true, input: true, format: "Texto no vacío" },
    { key: "region", header: "Región", required: true, input: true, format: "Nombre exacto del catálogo demo" },
    { key: "ambito", header: "Ámbito", required: true, input: false, format: "Calculado desde Región" },
    { key: "zona", header: "Zona", required: true, input: true, format: "Nombre exacto de una zona de la región" },
    { key: "fechaInicio", header: "Fecha de inicio", required: true, input: true, format: "Fecha Excel o AAAA-MM-DD" },
    { key: "fechaTermino", header: "Fecha de término", required: true, input: true, format: "Fecha Excel o AAAA-MM-DD" }
  ];

  const blockingRules = [
    { id: "archivo-vacio", scope: "archivo", message: "El archivo no contiene filas de datos." },
    { id: "estructura-columnas", scope: "archivo", message: "Faltan columnas requeridas, sobran columnas no reconocidas o el orden no corresponde a la plantilla." },
    { id: "campo-obligatorio", scope: "fila", message: "Existe al menos un campo requerido vacío." },
    { id: "codigo-duplicado", scope: "fila", message: "El código ATET ya existe o se repite dentro del archivo." },
    { id: "dni-invalido", scope: "fila", message: "El DNI no contiene exactamente 8 dígitos." },
    { id: "dni-duplicado", scope: "fila", message: "El DNI ya existe o se repite dentro del archivo." },
    { id: "celular-invalido", scope: "fila", message: "El celular no contiene 9 dígitos o no empieza en 9." },
    { id: "correo-invalido", scope: "fila", message: "El correo electrónico no tiene un formato válido." },
    { id: "region-desconocida", scope: "fila", message: "La región no pertenece al catálogo de demostración." },
    { id: "zona-invalida", scope: "fila", message: "La zona no corresponde a la región o ya está asignada." },
    { id: "fecha-invalida", scope: "fila", message: "Una fecha no es válida o la fecha de término es anterior a la de inicio." }
  ];

  const warningRules = [
    { id: "sinad-duplicado", scope: "fila", message: "El SINAD coincide con otro registro; su unicidad oficial está pendiente de confirmación." },
    { id: "orden-servicio-duplicada", scope: "fila", message: "La orden de servicio coincide con otro registro y debe revisarse." },
    { id: "correo-no-institucional", scope: "fila", message: "El correo es válido, pero no utiliza un dominio institucional." },
    { id: "ambito-recalculado", scope: "fila", message: "El ámbito de la hoja no coincide con la región y será reemplazado por el valor calculado." }
  ];

  global.ATET_IMPORT_CONFIG = Object.freeze({
    version: "demo-1.0",
    status: "provisional",
    sheetName: "ATET",
    acceptedExtensions: Object.freeze([".xlsx"]),
    maximumBytes: 5 * 1024 * 1024,
    columns: Object.freeze(columns.map(Object.freeze)),
    blockingRules: Object.freeze(blockingRules.map(Object.freeze)),
    warningRules: Object.freeze(warningRules.map(Object.freeze)),
    rowStatuses: Object.freeze({ valid: "importada", warning: "importada-advertencia", blocked: "no-importada" })
  });
})(window);
