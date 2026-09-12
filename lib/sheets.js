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
// y se reutiliza en todas las llamadas siguientes.
// Importante: si esa autenticación se cuelga (una sola vez, por lo que sea), TODOS los pedidos
// que la estén esperando quedan colgados con ella — por eso tiene un límite de 10 segundos: si se
// pasa, se descarta el intento y el siguiente pedido arranca de cero, en vez de quedar pegado
// para siempre esperando algo que nunca va a responder.
let clientePromise = null;
async function getSheetsClient() {
  if (!clientePromise) {
    clientePromise = (async () => {
      const auth = getAuth();
      const clientePendiente = auth.getClient();
      const client = await Promise.race([
        clientePendiente,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout autenticando con Google (10s)')), 10000))
      ]);
      return google.sheets({ version: 'v4', auth: client });
    })().catch((err) => {
      clientePromise = null; // si falla o se pasa del tiempo, no dejar el error en caché para siempre
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

// Envuelve cualquier llamada a la API de Sheets con un límite de tiempo — si Google no responde
// en ese lapso (problema de red, servicio caído, etc.), se corta con un error claro en vez de
// dejar la pantalla esperando para siempre algo que puede no llegar nunca.
function conTimeout(promesa, segundos, etiqueta) {
  return Promise.race([
    promesa,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${segundos}s) esperando a Google Sheets: ${etiqueta}`)), segundos * 1000))
  ]);
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
  return conReintentoLectura(async () => {
    const sheets = await getSheetsClient();
    const res = await conTimeout(
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: tabName }),
      20, `leer ${tabName}`
    );
    const rows = res.data.values || [];
    if (rows.length === 0) return [];
    // Se recorta cualquier espacio de más al principio/final de cada encabezado (ej: "Titulo " con
    // un espacio invisible) — si no, el dato queda guardado bajo una clave distinta a la que el
    // resto del código espera, y aparece vacío en pantalla sin ningún error visible.
    const headers = rows[0].map((h) => (h || '').trim());
    return rows.slice(1).map((row, idx) => {
      const obj = { _rowIndex: idx + 2 }; // fila real en la hoja (1-indexed + header)
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return obj;
    });
  });
}

// Para hojas que solo CRECEN y nunca se achican (como Auditoria, donde se loguea cada acción de
// cada persona desde que existe la app): en vez de leerla entera cada vez —cosa que se pone más
// lenta con el tiempo sin límite—, primero se pregunta cuántas filas tiene (una consulta liviana,
// sin traer datos) y después se pide solo el "final" de la hoja, con los últimos `maxFilas` registros.
export async function readSheetCola(tabName, maxFilas = 3000) {
  return conReintentoLectura(async () => {
  const sheets = await getSheetsClient();

  // Se lee solo la columna A para saber cuántas filas tienen datos de verdad — la API de Sheets
  // recorta las filas vacías del final, así que esto da la cantidad real (a diferencia del
  // "tamaño de grilla" de la hoja, que puede incluir de antemano muchísimas filas vacías de
  // relleno y hacer que se termine leyendo un rango que no tiene ningún dato).
  const colARes = await conTimeout(
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!A:A` }),
    20, `contar filas de ${tabName}`
  );
  const totalFilas = (colARes.data.values || []).length;
  if (totalFilas <= 1) return []; // solo el header, o vacía

  const inicio = Math.max(2, totalFilas - maxFilas + 1);
  const [headerRes, datosRes] = await conTimeout(
    Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!${inicio}:${totalFilas}` })
    ]),
    20, `leer cola de ${tabName}`
  );

  const headers = (headerRes.data.values?.[0] || []).map((h) => (h || '').trim());
  const rows = datosRes.data.values || [];

  return rows.map((row, idx) => {
    const obj = { _rowIndex: inicio + idx };
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
  });
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function esErrorDeCuota(err) {
  return (err?.message || '').toLowerCase().includes('quota exceeded');
}

// Reintenta automáticamente cuando Google corta por "escrituras por minuto excedidas" — pasa
// casi siempre en cargas masivas (muchas personas seguidas). Espera antes de cada reintento
// para dar tiempo a que la cuota de ese minuto se libere.
async function conReintentoPorCuota(fn, intentosRestantes = 3, esperaMs = 15000) {
  try {
    return await fn();
  } catch (err) {
    if (esErrorDeCuota(err) && intentosRestantes > 0) {
      await esperar(esperaMs);
      return conReintentoPorCuota(fn, intentosRestantes - 1, esperaMs);
    }
    throw err;
  }
}

// Reintento para LECTURAS: a diferencia de escribir, releer nunca duplica nada, así que acá se
// reintenta ante CUALQUIER error transitorio (no solo cuota) — un corte momentáneo de red o un
// error 5xx pasajero de Google no debería tirar abajo toda la pantalla con "no se pudo conectar".
// Espera poco entre intentos (no hace falta el enfriamiento largo de cuota salvo que sea eso).
async function conReintentoLectura(fn, intentosRestantes = 2) {
  try {
    return await fn();
  } catch (err) {
    if (intentosRestantes <= 0) throw err;
    await esperar(esErrorDeCuota(err) ? 15000 : 1200);
    return conReintentoLectura(fn, intentosRestantes - 1);
  }
}

// Agrega una fila nueva al final de la hoja. `values` debe respetar el orden de columnas.
export async function appendRow(tabName, values) {
  await conReintentoPorCuota(async () => {
    const sheets = await getSheetsClient();
    await conTimeout(
      sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: tabName,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values.map(protegerValor)] }
      }),
      20, `agregar fila en ${tabName}`
    );
  });
}

// Actualiza una fila puntual (por número de fila real, 1-indexed) en un rango de columnas, ej: 'Leads!A5:N5'
export async function updateRow(tabName, rowIndex, values, startCol = 'A') {
  await conReintentoPorCuota(async () => {
    const sheets = await getSheetsClient();
    const inicioIndice = startCol.charCodeAt(0) - 65; // 'A' -> 0
    const endCol = columnaExcel(inicioIndice + values.length - 1);
    await conTimeout(
      sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tabName}!${startCol}${rowIndex}:${endCol}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values.map(protegerValor)] }
      }),
      20, `actualizar fila en ${tabName}`
    );
  });
}

async function getSheetIdByTitle(tabName) {
  const sheets = await getSheetsClient();
  const meta = await conTimeout(
    sheets.spreadsheets.get({ spreadsheetId: SHEET_ID }),
    20, 'obtener metadata del spreadsheet'
  );
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

  await conTimeout(
    sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests } }),
    20, `borrar filas de ${tabName}`
  );
}
