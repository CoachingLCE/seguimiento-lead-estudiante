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

// Autenticarse con Google (auth.getClient()) es un viaje de ida y vuelta a sus servidores, y antes
// se hacía en CADA llamada a readSheet/appendRow/updateRow/deleteRows — si una sola pantalla
// necesitaba 3 hojas, eran 3 autenticaciones separadas antes de pedir un solo dato. Ahora el
// cliente autenticado se guarda una sola vez (dura mientras la función serverless esté "tibia")
// y se reutiliza en todas las llamadas siguientes — la optimización de performance más grande
// disponible sin cambiar de base de datos.
let clientePromise = null;
async function getSheetsClient() {
  if (!clientePromise) {
    clientePromise = (async () => {
      const auth = getAuth();
      const client = await auth.getClient();
      return google.sheets({ version: 'v4', auth: client });
    })().catch((err) => {
      clientePromise = null; // si falla, no dejar el error en caché para siempre
      throw err;
    });
  }
  return clientePromise;
}

// Google Sheets interpreta cualquier valor que arranca con +, - o = como el inicio de una
// fórmula (con USER_ENTERED). Un WhatsApp como "+549..." rompe y guarda "#ERROR!" en la celda.
// Se le agrega un apóstrofe adelante para forzar texto — Sheets lo usa solo como señal, no se guarda.
function protegerValor(v) {
  if (typeof v === 'string' && /^[+\-=]/.test(v)) return `'${v}`;
  return v;
}

// Convierte un índice de columna (0-based) a su letra de Google Sheets: 0->A, 25->Z, 26->AA, ...
function columnaExcel(indice) {
  let letras = '';
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
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
    requestBody: { values: [values.map(protegerValor)] }
  });
}

// Actualiza una fila puntual (por número de fila real, 1-indexed) en un rango de columnas, ej: 'Leads!A5:N5'
export async function updateRow(tabName, rowIndex, values, startCol = 'A') {
  const sheets = await getSheetsClient();
  const inicioIndice = startCol.charCodeAt(0) - 65; // 'A' -> 0
  const endCol = columnaExcel(inicioIndice + values.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!${startCol}${rowIndex}:${endCol}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values.map(protegerValor)] }
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
