const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const fs = require('fs');
const filepath = path.join(__dirname, 'Tablas', 'Tabla_Costo_Pantalla.xlsx');
const wb = XLSX.readFile(filepath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
const cols = Object.keys(rows[0]);
const output = [];
output.push(`TOTAL COLUMNAS: ${cols.length}`);
cols.forEach((c, i) => {
  const sample = rows.find(r => r[c] !== null && r[c] !== '' && r[c] !== undefined);
  const nonNull = rows.filter(r => r[c] !== null && r[c] !== '' && r[c] !== undefined).length;
  output.push(`  ${i+1}. "${c}" (${nonNull}/${rows.length} con datos) ejemplo: "${sample ? sample[c] : 'N/A'}"`);
});
output.push('');
output.push('PRIMERA FILA:');
output.push(JSON.stringify(rows[0], null, 2));
output.push('');
output.push('SEGUNDA FILA:');
output.push(JSON.stringify(rows[1], null, 2));

const result = output.join('\n');
console.log(result);
fs.writeFileSync(path.join(__dirname, 'bajas_columns.txt'), result);
console.log('\n=> Guardado en bajas_columns.txt');
process.exit(0);
