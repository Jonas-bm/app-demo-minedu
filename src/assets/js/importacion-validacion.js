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

  function resolveWorksheetPart(target) {
    if (!target) return "";
    let path = String(target).replace(/^\//, "");
    if (path.startsWith("xl/")) return path;
    if (path.startsWith("../")) return path.replace(/^\.\.\//, "");
    return `xl/${path}`;
  }

  async function parseWorkbook(file) {
    const entries = await readZipEntries(await file.arrayBuffer());
    const workbookXml = entries.get("xl/workbook.xml") || "";
    const relsXml = entries.get("xl/_rels/workbook.xml.rels") || "";
    const relTargets = new Map(
      [...relsXml.matchAll(/<Relationship\b[^>]*>/g)].map((match) => [
        (match[0].match(/\bId="([^"]*)"/) || [null, ""])[1],
        (match[0].match(/\bTarget="([^"]*)"/) || [null, ""])[1]
      ])
    );
    const candidates = [...workbookXml.matchAll(/<sheet\b[^>]*>/g)]
      .map((match) => {
        const rid = (match[0].match(/r:id="([^"]*)"/) || match[0].match(/\bid="([^"]*)"/i) || [null, ""])[1];
        return {
          name: decodeXml((match[0].match(/\bname="([^"]*)"/) || [null, ""])[1]),
          xml: entries.get(resolveWorksheetPart(relTargets.get(rid)))
        };
      })
      .filter((item) => item.xml);

    const preferred = global.ATET_IMPORT_CONFIG.preferredSheets || [];
    let chosen = null;
    for (const name of preferred) {
      chosen = candidates.find((item) => normalize(item.name).replace(/\s+/g, " ") === name);
      if (chosen) break;
    }
    if (!chosen) chosen = candidates[0];
    if (!chosen && entries.get("xl/worksheets/sheet1.xml")) {
      chosen = { name: "Hoja1", xml: entries.get("xl/worksheets/sheet1.xml") };
    }
    if (!chosen) throw new Error("No encontramos ninguna hoja con datos dentro del archivo.");

    const sharedXml = entries.get("xl/sharedStrings.xml") || "";
    const sharedStrings = [...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((item) =>
      [...item[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("")
    );
    return { ...parseSheet(chosen.xml, sharedStrings), sheetName: chosen.name };
  }

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Encabezado normalizado para comparar: sin tildes, en min\u00fasculas, con los
  // saltos de l\u00ednea y espacios m\u00faltiples colapsados y sin puntuaci\u00f3n final.
  function normalizeHeader(value) {
    return normalize(value).replace(/\s+/g, " ").replace(/[.:;\u00b7]+$/g, "").trim();
  }

  // Empareja cada columna esperada con la posici\u00f3n real en la hoja usando su
  // encabezado o cualquiera de sus alias. Devuelve { clave: \u00edndice | -1 }.
  function buildHeaderMap(headers) {
    const normalized = headers.map(normalizeHeader);
    const map = {};
    global.ATET_IMPORT_CONFIG.columns.forEach((column) => {
      const accepted = [column.header, ...(column.aliases || [])].map(normalizeHeader);
      map[column.key] = normalized.findIndex((header) => header && accepted.includes(header));
    });
    return map;
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

  // Maqueta: la importación es una demostración y NO bloquea filas. Los
  // encabezados se emparejan por nombre/alias (no por orden), de modo que se
  // admite tanto la plantilla demo como el consolidado real de la DITE. Cada
  // fila se acepta "Sin incidencias"; solo se resuelve la ubicación territorial
  // contra el catálogo (o el valor más cercano) y se calculan ámbito, zona y
  // denominación. Ver AV-029 / AV-032 en docs/MAPA_DE_CAMBIOS.md.
  function validateWorkbook(workbook, existingAtets, catalogs) {
    if (!workbook.rows.length) throw new Error("El archivo no contiene registros para importar.");

    const headerMap = buildHeaderMap(workbook.headers);
    const missing = global.ATET_IMPORT_CONFIG.columns
      .filter((column) => column.essential && headerMap[column.key] === -1)
      .map((column) => column.header);
    if (missing.length) {
      const hoja = workbook.sheetName ? ` de la hoja "${workbook.sheetName}"` : "";
      throw new Error(`No pudimos identificar${hoja} las columnas obligatorias: ${missing.join(", ")}. Revisa los encabezados o descarga la plantilla demo.`);
    }

    const cell = (values, key) => {
      const index = headerMap[key];
      return index >= 0 ? String(values[index] ?? "").trim() : "";
    };

    const regionsByName = new Map(catalogs.regiones.map((item) => [normalize(item.nombre), item]));
    const scopes = new Map(catalogs.ambitos.map((item) => [item.id, item]));
    const macroRegionId = global.MACRO_CONTEXT ? global.MACRO_CONTEXT.get().regionId : null;
    const fallbackRegion = catalogs.regiones.find((item) => item.id === macroRegionId) || catalogs.regiones[0];

    return workbook.rows
      // Se ignoran las filas que no representan a una persona (sin nombre ni DNI):
      // en el consolidado real hay filas de zona todavía sin contratar.
      .map((values, index) => ({ values, index }))
      .filter(({ values }) => cell(values, "nombresApellidos") || cell(values, "dni"))
      .map(({ values, index }) => {
        const rawRegion = cell(values, "region");
        const region = regionsByName.get(normalize(rawRegion))
          || (rawRegion && catalogs.regiones.find((item) => normalize(item.nombre).startsWith(normalize(rawRegion))))
          || fallbackRegion;
        const scope = scopes.get(region.ambitoId) || catalogs.ambitos[0];
        const zoneDigits = cell(values, "zona").replace(/\D/g, "");
        const zoneNumber = Math.max(1, zoneDigits ? Number(zoneDigits) : index + 1);
        const zone = global.DEMO_ZONAS.resolve(global.DEMO_ZONAS.id(region.id, zoneNumber));
        const slug = region.id.replace(/^reg-/, "").toLocaleUpperCase("es");

        const data = {
          codigo: cell(values, "codigo") || `IMP-${slug}-${String(zoneNumber).padStart(2, "0")}`,
          nombresApellidos: cell(values, "nombresApellidos"),
          dni: cell(values, "dni"),
          sinad: cell(values, "sinad") || "—",
          celular: cell(values, "celular") || "—",
          correo: cell(values, "correo") || "—",
          ordenServicio: cell(values, "ordenServicio") || "—",
          region: region.nombre,
          zona: zone.nombre,
          ambito: scope ? scope.nombre : "",
          regionId: region.id,
          zonaId: zone.id,
          fechaInicio: parseDate(cell(values, "fechaInicio")),
          fechaTermino: parseDate(cell(values, "fechaTermino")),
          denominacion: scope
            ? global.SERVICE_DENOMINATION.generate({ region: region.nombre, scope: scope.nombre, zoneNumber: zone.numero })
            : ""
        };

        return {
          rowNumber: index + 2,
          data,
          errors: [],
          warnings: [],
          status: global.ATET_IMPORT_CONFIG.rowStatuses.valid
        };
      });
  }

  global.ATET_IMPORT_VALIDATION = Object.freeze({ parseWorkbook, validateWorkbook, parseDate });
})(window);
