// Script temporal para inspeccionar order_inventario2026.xlsx
const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, 'Tablas', 'order_inventario2026.xlsx');
const wb = XLSX.readFile(file);

console.log('Hojas:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
  console.log(`\n--- Hoja: "${name}" | filas: ${data.length}`);
  console.log('Encabezados:', JSON.stringify(data[0]));
  if (data[1]) console.log('Fila 1:', JSON.stringify(data[1]));
  if (data[2]) console.log('Fila 2:', JSON.stringify(data[2]));
  if (data.length > 2) console.log('Última fila:', JSON.stringify(data[data.length - 1]));
}
process.exit(0);
