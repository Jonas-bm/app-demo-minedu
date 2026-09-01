(function configureAtetImportValidation(global) {
  const decoder = new TextDecoder("utf-8");

  function read16(view, offset) {
    return view.getUint16(offset, true);
  }

  function read32(view, offset) {
    return view.getUint32(offset, true);
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("Este navegador no permite descomprimir archivos .xlsx.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function readZipEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let endOffset = bytes.length - 22;
    while (endOffset >= 0 && read32(view, endOffset) !== 0x06054b50) endOffset -= 1;
    if (endOffset < 0) throw new Error("El archivo no contiene una estructura ZIP válida.");

    const totalEntries = read16(view, endOffset + 10);
    let directoryOffset = read32(view, endOffset + 16);
    const entries = new Map();

    for (let index = 0; index < totalEntries; index += 1) {
      if (read32(view, directoryOffset) !== 0x02014b50) throw new Error("El directorio del archivo está dañado.");
      const method = read16(view, directoryOffset + 10);
      const compressedSize = read32(view, directoryOffset + 20);
      const nameLength = read16(view, directoryOffset + 28);
      const extraLength = read16(view, directoryOffset + 30);
      const commentLength = read16(view, directoryOffset + 32);
      const localOffset = read32(view, directoryOffset + 42);
      const name = decoder.decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + nameLength));
      if (read32(view, localOffset) !== 0x04034b50) throw new Error("Una parte del archivo está dañada.");
      const localNameLength = read16(view, localOffset + 26);
      const localExtraLength = read16(view, localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
      let content;
      if (method === 0) content = compressed;
      else if (method === 8) content = await inflateRaw(compressed);
      else throw new Error("El archivo utiliza una compresión no compatible.");
      entries.set(name, decoder.decode(content));
      directoryOffset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }

  function decodeXml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function getCellValue(cellXml, type, sharedStrings) {
    if (type === "inlineStr") {
      return [...cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
        .map((match) => decodeXml(match[1])).join("");
    }
    const match = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
    if (!match) return "";
    const value = decodeXml(match[1]);
    return type === "s" ? (sharedStrings[Number(value)] || "") : value;
  }

  function columnIndex(reference) {
    const letters = (reference.match(/[A-Z]+/i) || [""])[0].toUpperCase();
    return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function parseSheet(sheetXml, sharedStrings) {
    const rows = [];
    for (const rowMatch of sheetXml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
      const values = [];
      for (const cellMatch of rowMatch[1].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attributes = cellMatch[1];
        const reference = (attributes.match(/\br="([^"]+)"/) || [null, ""])[1];
        const type = (attributes.match(/\bt="([^"]+)"/) || [null, ""])[1];
        values[columnIndex(reference)] = getCellValue(cellMatch[2], type, sharedStrings);
      }
      rows.push(values.map((value) => String(value ?? "").trim()));
    }
    if (!rows.length) throw new Error("El archivo no contiene filas.");
    return { headers: rows[0], rows: rows.slice(1).filter((row) => row.some(Boolean)) };
  }

  async function parseWorkbook(file) {
    const entries = await readZipEntries(await file.arrayBuffer());
    const sheetXml = entries.get("xl/worksheets/sheet1.xml");
    if (!sheetXml) throw new Error("No encontramos la primera hoja de la plantilla.");
    const sharedXml = entries.get("xl/sharedStrings.xml") || "";
    const sharedStrings = [...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((item) =>
      [...item[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("")
    );
    return parseSheet(sheetXml, sharedStrings);
  }

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function parseDate(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const date = new Date(`${text}T00:00:00`);
      return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? "" : text;
    }
    if (/^\d+(?:\.\d+)?$/.test(text)) {
      const date = new Date(Date.UTC(1899, 11, 30) + Number(text) * 86400000);
      return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    }
    return "";
  }

  // Maqueta: la importación es una demostración y NO bloquea filas. Cada fila se
  // acepta "Sin incidencias"; solo se resuelve la ubicación territorial contra el
  // catálogo (o el valor más cercano) y se calculan ámbito y denominación. Ver
  // AV-029 en docs/MAPA_DE_CAMBIOS.md.
  function validateWorkbook(workbook, existingAtets, catalogs) {
    const expectedHeaders = global.ATET_IMPORT_CONFIG.columns.map((column) => column.header);
    if (workbook.headers.length !== expectedHeaders.length || expectedHeaders.some((header, index) => workbook.headers[index] !== header)) {
      throw new Error("Los encabezados o su orden no corresponden a la plantilla de demostración.");
    }
    if (!workbook.rows.length) throw new Error("El archivo no contiene registros para validar.");

    const keys = global.ATET_IMPORT_CONFIG.columns.map((column) => column.key);
    const rawRows = workbook.rows.map((values, index) => ({
      rowNumber: index + 2,
      data: Object.fromEntries(keys.map((key, cellIndex) => [key, values[cellIndex] || ""]))
    }));

    const regionsByName = new Map(catalogs.regiones.map((item) => [normalize(item.nombre), item]));
    const scopes = new Map(catalogs.ambitos.map((item) => [item.id, item]));
    const zones = catalogs.zonas;
    const macroRegionId = global.MACRO_CONTEXT ? global.MACRO_CONTEXT.get().regionId : null;
    const fallbackRegion = catalogs.regiones.find((item) => item.id === macroRegionId) || catalogs.regiones[0];

    return rawRows.map(({ rowNumber, data }) => {
      const region = regionsByName.get(normalize(data.region)) || fallbackRegion;
      const scope = scopes.get(region.ambitoId) || catalogs.ambitos[0];
      const regionZones = zones.filter((item) => item.regionId === region.id);
      const digits = String(data.zona).replace(/\D/g, "");
      const zone = regionZones.find((item) => normalize(item.nombre) === normalize(data.zona))
        || (digits && regionZones.find((item) => String(item.numero) === digits))
        || regionZones[0]
        || null;

      const normalizedData = {
        ...data,
        region: region.nombre,
        zona: zone ? zone.nombre : data.zona,
        ambito: scope ? scope.nombre : "",
        regionId: region.id,
        zonaId: zone ? zone.id : "",
        fechaInicio: parseDate(data.fechaInicio),
        fechaTermino: parseDate(data.fechaTermino),
        denominacion: region && scope && zone
          ? global.SERVICE_DENOMINATION.generate({ region: region.nombre, scope: scope.nombre, zoneNumber: zone.numero })
          : ""
      };

      return {
        rowNumber,
        data: normalizedData,
        errors: [],
        warnings: [],
        status: global.ATET_IMPORT_CONFIG.rowStatuses.valid
      };
    });
  }

  global.ATET_IMPORT_VALIDATION = Object.freeze({ parseWorkbook, validateWorkbook, parseDate });
})(window);
