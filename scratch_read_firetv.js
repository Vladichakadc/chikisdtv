const path = require('path');
const XLSX = require('./server/node_modules/xlsx');

try {
  const filepath = path.join(__dirname, 'Tablas', '1-orders_table_Ventas_Firetv2024.xlsx');
  const wb = XLSX.readFile(filepath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
  
  if (rows.length > 0) {
    console.log('Columnas de FireTV2024:');
    console.log(Object.keys(rows[0]));
    console.log('\nPrimer registro:');
    console.log(JSON.stringify(rows[0], null, 2));
  } else {
    console.log('El archivo está vacío.');
  }
} catch (e) {
  console.error(e);
}
