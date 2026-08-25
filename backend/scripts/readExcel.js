const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, 'Client Data 02032026.xlsm');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

fs.writeFileSync(path.join(__dirname, 'client_data.json'), JSON.stringify(data, null, 2), 'utf8');
