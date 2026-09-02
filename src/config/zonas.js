(function configureDemoZonas(global) {
  // Las zonas de una región NO son un catálogo fijo: son tantas como ATET haya
  // contratados en esa región. El Administrador asigna una cantidad a cada Macro
  // por región y con eso quedan habilitadas la Zona 1 … Zona N (ver AV-032).
  // Este ayudante genera y resuelve zonas a partir de su id, con el formato
  // histórico `zona-<región sin "reg-">-<NN>` (p. ej. `zona-amazonas-01`).

  // Cantidad de zonas visibles cuando no hay un cupo contratado que las acote
  // (Macro demo, tableros de Gestor/Jefe, respaldo de importación).
  const DEFAULT_COUNT = 40;

  function slug(regionId) {
    return String(regionId || "").replace(/^reg-/, "");
  }

  function pad(numero) {
    return String(numero).padStart(2, "0");
  }

  function id(regionId, numero) {
    return `zona-${slug(regionId)}-${pad(numero)}`;
  }

  function build(regionId, numero) {
    return {
      id: id(regionId, numero),
      regionId,
      numero,
      nombre: `Zona ${numero}`,
      estado: "disponible",
      disponible: true
    };
  }

  // Lista de zonas de una región: `count` zonas (Zona 1 … Zona count).
  function forRegion(regionId, count) {
    const total = Number.isFinite(count) && count > 0 ? Math.floor(count) : DEFAULT_COUNT;
    return Array.from({ length: total }, (unused, index) => build(regionId, index + 1));
  }

  // Reconstruye la zona a partir de su id. Devuelve `null` si el id no tiene el
  // formato esperado.
  function resolve(zonaId) {
    const match = /^zona-(.+)-(\d+)$/.exec(String(zonaId || ""));
    if (!match) return null;
    return build(`reg-${match[1]}`, Number(match[2]));
  }

  global.DEMO_ZONAS = Object.freeze({ DEFAULT_COUNT, id, forRegion, resolve });
})(window);
