import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Vercel guarda los saltos de línea como \n literal en la env var
      private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// Lee un rango y lo devuelve como array de objetos usando la primera fila como headers
export async function readSheet(tabName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: tabName
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 }; // fila real en la hoja (1-indexed + header)
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}

// Agrega una fila nueva al final de la hoja. `values` debe respetar el orden de columnas.
export async function appendRow(tabName, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: tabName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
}

// Actualiza una fila puntual (por número de fila real, 1-indexed) en un rango de columnas, ej: 'Leads!A5:N5'
export async function updateRow(tabName, rowIndex, values, startCol = 'A') {
  const sheets = await getSheetsClient();
  const endCol = String.fromCharCode(startCol.charCodeAt(0) + values.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!${startCol}${rowIndex}:${endCol}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
}

async function getSheetIdByTitle(tabName) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const hoja = meta.data.sheets.find((s) => s.properties.title === tabName);
  return hoja ? hoja.properties.sheetId : null;
}

// Borra filas puntuales (por número de fila real, 1-indexed, incluyendo el offset del header)
export async function deleteRows(tabName, rowIndexes) {
  if (!rowIndexes || rowIndexes.length === 0) return;
  const sheetId = await getSheetIdByTitle(tabName);
  if (sheetId === null) return;

  const sheets = await getSheetsClient();
  // Hay que borrar de abajo hacia arriba para que los índices no se corran entre sí
  const ordenadas = [...rowIndexes].sort((a, b) => b - a);
  const requests = ordenadas.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex - 1, // la API usa índice 0
        endIndex: rowIndex
      }
    }
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests }
  });
}
