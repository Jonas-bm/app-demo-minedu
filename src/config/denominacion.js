(function configureServiceDenomination(global) {
  const prefix = "SERVICIO DE ASISTENCIA TECNOLÓGICA PARA LA ACTUALIZACIÓN DE LOS MATERIALES EDUCATIVOS DIGITALES DE LAS INSTITUCIONES EDUCATIVAS BENEFICIADAS CON TABLETAS, EN EL MARCO DEL PLAN DE CIERRE DE BRECHA DIGITAL";

  function generate({ region, scope, zoneNumber }) {
    if (!region || !scope || !Number.isInteger(zoneNumber)) return "";
    return `${prefix} EN EL ÁMBITO ${scope.toLocaleUpperCase("es")} DE LA REGIÓN ${region.toLocaleUpperCase("es")} - ${zoneNumber}.`;
  }

  global.SERVICE_DENOMINATION = Object.freeze({
    status: "provisional",
    generate
  });
})(window);
