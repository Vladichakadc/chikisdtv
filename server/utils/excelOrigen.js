// Lectura de los Excel de origen (carpeta Tablas/). Esos archivos tienen datos
// de clientes y contraseñas, así que ya NO se versionan en el repositorio ni
// llegan al servidor de producción. Los importadores siguen funcionando en
// local (donde la carpeta existe); en producción la BD es la fuente de verdad.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

class ArchivoOrigenNoDisponible extends Error {
  constructor(filePath) {
    super(`El archivo de origen "${path.basename(filePath)}" no está en este servidor (los Excel con datos de clientes ya no se suben al repositorio). Importa desde tu equipo local o edita los datos en la app.`);
    this.name = 'ArchivoOrigenNoDisponible';
  }
}

function leerExcelOrigen(filePath, opciones) {
  if (!fs.existsSync(filePath)) throw new ArchivoOrigenNoDisponible(filePath);
  return XLSX.readFile(filePath, opciones);
}

// Para las auto-importaciones "si la tabla está vacía" de los GET: sin el
// archivo, la página carga vacía en lugar de fallar con 500.
async function autoImportarSiDisponible(importar) {
  try {
    return await importar();
  } catch (e) {
    if (e instanceof ArchivoOrigenNoDisponible) {
      console.warn(`[IMPORT EXCEL] ${e.message}`);
      return 0;
    }
    throw e;
  }
}

module.exports = { leerExcelOrigen, autoImportarSiDisponible, ArchivoOrigenNoDisponible };
