(function configureAtetImport(global) {
  // `essential`: sin esta columna no se puede ubicar la fila y la validación se
  // detiene con un mensaje claro. El resto son opcionales: si faltan, la fila se
  // importa igual con un valor por defecto (la importación es demostrativa y no
  // bloquea filas — ver AV-029 / AV-032).
  // `aliases`: encabezados equivalentes aceptados (además del `header`), sin
  // distinguir mayúsculas, tildes ni espacios. Así se admite tanto la plantilla
  // demo como el consolidado real de la DITE.
  const columns = [
    { key: "codigo", header: "Código ATET", essential: false, input: true, format: "Texto (si falta, se genera)", aliases: ["codigo", "cod atet", "n", "nº", "n°", "no", "item"] },
    { key: "nombresApellidos", header: "Nombres y apellidos", essential: true, input: true, format: "Texto no vacío", aliases: ["nombres y apellidos", "apellidos y nombres", "nombre completo", "nombres", "nombres del atet"] },
    { key: "dni", header: "DNI", essential: true, input: true, format: "Documento de identidad", aliases: ["documento", "dni del atet", "nro dni"] },
    { key: "sinad", header: "SINAD", essential: false, input: true, format: "Texto", aliases: ["codigo sinad", "n sinad", "nro sinad", "expediente sinad"] },
    { key: "celular", header: "Celular", essential: false, input: true, format: "Número de contacto", aliases: ["telefono", "nro celular", "numero de celular", "celular del atet", "telefono celular"] },
    { key: "correo", header: "Correo", essential: false, input: true, format: "Correo electrónico", aliases: ["correo electronico", "email", "e-mail", "correo del atet"] },
    { key: "ordenServicio", header: "Orden de Servicio", essential: false, input: true, format: "Texto (si falta, se genera)", aliases: ["orden de servicio", "o/s", "os", "nro de o/s", "numero de ods", "n ods", "ods", "numero de orden de servicio"] },
    { key: "region", header: "Región", essential: true, input: true, format: "Nombre de la región", aliases: ["region", "region del servicio", "departamento"] },
    { key: "ambito", header: "Ámbito", essential: false, input: false, format: "Calculado desde Región", aliases: ["ambito"] },
    { key: "zona", header: "Zona", essential: true, input: true, format: "Número o nombre de zona", aliases: ["zona", "numero", "nro zona", "n zona", "numero de zona", "zona del servicio"] },
    { key: "fechaInicio", header: "Fecha de inicio", essential: true, input: true, format: "Fecha Excel o AAAA-MM-DD", aliases: ["fecha inicio", "fecha de inicio del servicio", "inicio del servicio", "fecha de inicio de servicio"] },
    { key: "fechaTermino", header: "Fecha de término", essential: true, input: true, format: "Fecha Excel o AAAA-MM-DD", aliases: ["fecha termino", "fecha de termino", "fecha fin", "fecha de fin", "fecha fin del servicio", "fecha de fin del servicio", "fecha fin de servicio", "termino del servicio", "fecha de culminacion"] }
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
    version: "demo-1.1",
    status: "provisional",
    sheetName: "ATET",
    // Hojas preferidas al leer un libro con varias pestañas (la plantilla demo
    // trae "ATET"; el consolidado real, "CONSOLIDADO ATET"). Si no aparece
    // ninguna, se usa la primera hoja del libro.
    preferredSheets: Object.freeze(["atet", "consolidado atet", "consolidado", "hoja1"]),
    acceptedExtensions: Object.freeze([".xlsx", ".xlsm"]),
    maximumBytes: 5 * 1024 * 1024,
    columns: Object.freeze(columns.map(Object.freeze)),
    blockingRules: Object.freeze(blockingRules.map(Object.freeze)),
    warningRules: Object.freeze(warningRules.map(Object.freeze)),
    rowStatuses: Object.freeze({ valid: "importada", warning: "importada-advertencia", blocked: "no-importada" })
  });
})(window);
