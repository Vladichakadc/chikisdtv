const path = require('path');
const XLSX = require(path.join(__dirname, 'server', 'node_modules', 'xlsx'));
const wb = XLSX.readFile(path.join(__dirname, 'Tablas', 'Tabla_Costo_Pantalla.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('Sheet:', wb.SheetNames[0]);
console.log('Headers:', JSON.stringify(data[0]));
console.log('Total rows:', data.length - 1);
for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
  console.log('Row ' + i + ':', JSON.stringify(data[i]));
}
process.exit(0);
