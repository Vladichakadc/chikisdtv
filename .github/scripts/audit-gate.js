#!/usr/bin/env node
// Freno de dependencias: corre `npm audit --json` en el directorio actual y falla con
// cualquier aviso alto o crítico, salvo los declarados en .github/audit-exceptions.json.
//
// Una excepción es para un aviso SIN versión corregida publicada (no se puede arreglar
// actualizando). Lleva GHSA, paquete, motivo y fecha de caducidad (30 días como mucho):
// al caducar el check vuelve a fallar y obliga a revisar si ya salió el arreglo.
// Si una excepción ya no hace falta, se avisa para retirarla.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_DIAS = 30;
const GRAVES = new Set(['high', 'critical']);
const archivoExcepciones = path.join(__dirname, '..', 'audit-exceptions.json');

function leerExcepciones() {
  const lista = JSON.parse(fs.readFileSync(archivoExcepciones, 'utf8'));
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + MAX_DIAS * 864e5).toISOString().slice(0, 10);
  const vigentes = new Map();
  let errores = 0;
  for (const e of lista) {
    if (!/^GHSA-[\w-]+$/.test(e.ghsa || '') || !e.paquete || !e.motivo || !/^\d{4}-\d{2}-\d{2}$/.test(e.caduca || '')) {
      console.error(`::error::Excepción mal formada (requiere ghsa, paquete, motivo y caduca AAAA-MM-DD): ${JSON.stringify(e)}`);
      errores++;
    } else if (e.caduca < hoy) {
      console.error(`::error::La excepción de ${e.ghsa} (${e.paquete}) caducó el ${e.caduca}: revisar si ya hay versión corregida y actualizar, o renovarla con su motivo.`);
      errores++;
    } else if (e.caduca > limite) {
      console.error(`::error::La excepción de ${e.ghsa} caduca el ${e.caduca}, más de ${MAX_DIAS} días: acórtala.`);
      errores++;
    } else {
      vigentes.set(e.ghsa, e);
    }
  }
  return { vigentes, errores };
}

function auditar() {
  let salida;
  try {
    salida = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    salida = err.stdout; // npm audit sale con código != 0 cuando hay avisos
  }
  const datos = JSON.parse(salida || '{}');
  if (datos.error) throw new Error(`npm audit falló: ${datos.error.summary || JSON.stringify(datos.error)}`);
  return datos;
}

function main() {
  const { vigentes, errores } = leerExcepciones();
  const datos = auditar();
  const avisos = new Map(); // ghsa -> { paquete, titulo, url }
  for (const v of Object.values(datos.vulnerabilities || {})) {
    for (const via of v.via) {
      if (typeof via !== 'object' || !GRAVES.has(via.severity)) continue;
      const ghsa = (via.url || '').split('/').pop();
      avisos.set(ghsa, { paquete: via.name, titulo: via.title, url: via.url, severidad: via.severity });
    }
  }

  let bloqueantes = 0;
  for (const [ghsa, a] of avisos) {
    if (vigentes.has(ghsa)) {
      const e = vigentes.get(ghsa);
      console.log(`::warning::Aviso ${a.severidad} tolerado hasta ${e.caduca}: ${a.paquete} — ${a.titulo} (${a.url}). Motivo: ${e.motivo}`);
    } else {
      console.error(`::error::Aviso ${a.severidad} sin excepción: ${a.paquete} — ${a.titulo} (${a.url})`);
      bloqueantes++;
    }
  }
  for (const [ghsa, e] of vigentes) {
    if (!avisos.has(ghsa)) console.log(`::notice::La excepción de ${ghsa} (${e.paquete}) ya no hace falta en este directorio: retírala si tampoco aplica en los demás.`);
  }

  const m = (datos.metadata || {}).vulnerabilities || {};
  console.log(`Resumen npm audit: ${m.critical || 0} críticas, ${m.high || 0} altas, ${m.moderate || 0} moderadas, ${m.low || 0} bajas; ${avisos.size} aviso(s) alto(s)/crítico(s) distinto(s), ${bloqueantes} sin excepción.`);
  if (bloqueantes || errores) process.exit(1);
}

main();
