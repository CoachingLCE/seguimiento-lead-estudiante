export const CURSOS = [
  'Coaching de Equipos',
  'Coaching Deportivo',
  'Coaching Educativo',
  'Coaching Inmobiliario',
  'Coaching Ontológico Profesional',
  'Coaching Vocacional',
  'Copywriting para redes sociales',
  'Formación para formadores',
  'OKR - Objetivos y Resultados Clave',
  'Oratoria'
].sort((a, b) => a.localeCompare(b, 'es'));

// Opción para elegir "Otros" en el curso: al seleccionarla se muestra un campo de texto libre
// y ese texto pasa a ser el valor real guardado como Curso.
export const CURSO_OTROS = 'Otros';

// Opción para "Nuevo lead" cuando todavía no se sabe el curso — se completa después desde Seguimiento.
export const CURSO_SIN_DEFINIR = 'Sin definir (a confirmar)';

// Paleta fija por formación — a propósito NO es por hash, para poder elegir colores realmente
// distinguibles entre sí (no varios tonos de violeta/verde parecidos). Si se agrega un curso nuevo
// que no está en esta lista, se le asigna uno de PALETA_CURSOS_RESERVA por hash, como respaldo.
export const COLOR_POR_CURSO = {
  'Coaching Educativo': '#3b82f6',                 // azul
  'Coaching de Equipos': '#22c55e',                 // verde
  'Coaching Ontológico Profesional': '#a855f7',     // violeta
  'Coaching Deportivo': '#f97316',                  // naranja
  'Coaching Vocacional': '#eab308',                  // amarillo/ámbar
  'Coaching Inmobiliario': '#06b6d4',               // celeste
  'Copywriting para redes sociales': '#ec4899',     // rosa/fucsia
  'Formación para formadores': '#14b8a6',           // verde azulado (teal)
  'OKR - Objetivos y Resultados Clave': '#6366f1',  // índigo
  'Oratoria': '#ef4444'                             // rojo
};
const PALETA_CURSOS_RESERVA = ['#84cc16', '#f43f5e', '#0ea5e9', '#d946ef'];

export function colorParaCurso(curso) {
  if (COLOR_POR_CURSO[curso]) return COLOR_POR_CURSO[curso];
  const n = (curso || 'Sin curso').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETA_CURSOS_RESERVA[n % PALETA_CURSOS_RESERVA.length];
}

// Lista consolidada de orígenes — incluye los agregados en distintas rondas de pedidos.
export const ORIGENES = [
  'Baja (vuelve a cursar)',
  'Blog',
  'Campaña de Marketing',
  'Campaña de mkt',
  'Campañas por estados de WhatsApp',
  'Consulta anterior',
  'Dato compartido en Instagram',
  'Ebook',
  'Email Marketing',
  'Email mkt',
  'Equipo ILCE',
  'Estudiante',
  'Facebook',
  'Google',
  'Google Ads',
  'Instagram',
  'Mentorías',
  'Publicidad Meta',
  'Recomendación de estudiante',
  'Sitio web',
  'Web',
  'Whatsapp - Publicidad',
  'Whatsapp - Recomendación',
  'Whatsapp historias',
  'Wpp - campaña',
  'Wpp - consulta anterior'
].sort((a, b) => a.localeCompare(b, 'es'));

// Opción "Otro" para Origen: al elegirla se muestra un campo de texto libre, igual que Curso.
export const ORIGEN_OTRO = 'Otro';
export const ORIGEN_SIN_DEFINIR = 'Sin definir';

// País del lead — Argentina primero porque es el valor por defecto, el resto alfabético.
export const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador',
  'España', 'Estados Unidos', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela',
  'Alemania', 'Francia', 'Italia', 'Portugal', 'Reino Unido', 'Suiza', 'Brasil', 'Canadá', 'Australia', 'Otro'
];

// Detecta el país a partir del código de un número de WhatsApp/teléfono (con o sin "+").
// Los códigos de 3 dígitos van primero para no confundirlos con prefijos de 2 o 1 dígito.
const CODIGOS_PAIS = [
  { codigo: '591', pais: 'Bolivia' },
  { codigo: '506', pais: 'Costa Rica' },
  { codigo: '593', pais: 'Ecuador' },
  { codigo: '503', pais: 'El Salvador' },
  { codigo: '502', pais: 'Guatemala' },
  { codigo: '504', pais: 'Honduras' },
  { codigo: '505', pais: 'Nicaragua' },
  { codigo: '507', pais: 'Panamá' },
  { codigo: '595', pais: 'Paraguay' },
  { codigo: '598', pais: 'Uruguay' },
  // +1 es compartido por EEUU, Puerto Rico y República Dominicana — se distingue por el código de área.
  { codigo: '1809', pais: 'República Dominicana' },
  { codigo: '1829', pais: 'República Dominicana' },
  { codigo: '1849', pais: 'República Dominicana' },
  { codigo: '1787', pais: 'Puerto Rico' },
  { codigo: '1939', pais: 'Puerto Rico' },
  { codigo: '54', pais: 'Argentina' },
  { codigo: '56', pais: 'Chile' },
  { codigo: '57', pais: 'Colombia' },
  { codigo: '53', pais: 'Cuba' },
  { codigo: '34', pais: 'España' },
  { codigo: '52', pais: 'México' },
  { codigo: '51', pais: 'Perú' },
  { codigo: '58', pais: 'Venezuela' },
  { codigo: '49', pais: 'Alemania' },
  { codigo: '33', pais: 'Francia' },
  { codigo: '39', pais: 'Italia' },
  { codigo: '351', pais: 'Portugal' },
  { codigo: '44', pais: 'Reino Unido' },
  { codigo: '41', pais: 'Suiza' },
  { codigo: '55', pais: 'Brasil' },
  { codigo: '61', pais: 'Australia' },
  { codigo: '1', pais: 'Estados Unidos' }
];

export function detectarPaisPorWhatsapp(numero) {
  const digitos = (numero || '').replace(/[^\d]/g, '');
  if (!digitos) return '';
  for (const { codigo, pais } of CODIGOS_PAIS) {
    if (digitos.startsWith(codigo)) return pais;
  }
  // Error típico: poner un "0" de más justo después del "+" (ej: "+049..." en vez de "+49...").
  // Si no matcheó nada arriba, se reintenta sacando ese cero inicial.
  if (digitos.startsWith('0')) {
    const sinCero = digitos.slice(1);
    for (const { codigo, pais } of CODIGOS_PAIS) {
      if (sinCero.startsWith(codigo)) return pais;
    }
  }
  return '';
}

export const PRIORIDADES = ['Alta', 'Media', 'Baja'];

export const MEDIOS_PAGO = ['MercadoPago', 'Débito automático', 'Western Union', 'Paypal'];

// Resultados "de progreso" (no truncan el seguimiento, pero indican que hay algo más avanzado
// que un simple contacto): mostrar también en la ficha del lead como hitos.
export const RESULTADOS_PROGRESO = ['Ficha enviada', 'Ficha recibida', 'Link de pago enviado', 'Pago recibido'];

export const RESULTADOS_CONTACTO = [
  'No contestó',
  'Va a pensarlo',
  'No le interesa',
  'Interesado',
  ...RESULTADOS_PROGRESO
];

// Resultados que NO requieren seguir escalando de lote (el lead ya dio una respuesta definitiva
// o está en un estado de avance activo hacia la venta — no tiene sentido seguir "molestando").
export const RESULTADOS_FINALES = ['Interesado', 'No le interesa', ...RESULTADOS_PROGRESO];

// Personas que cerraron la venta, para el desplegable de "Quién cerró la venta" en el modal.
// Se puede elegir "Otro" y escribir un nombre libre si no está en la lista.
export const EQUIPO_VENTAS = [
  'Jesabel Reigada',
  'Alexander Juncos',
  'Macarena Juncos',
  'Diego Lerner'
];

// Roles posibles. Un usuario puede tener más de uno (ej: Jennifer = Coordinador + Inscripciones).
// "CoordinadorEstudiantes" es el rol de Sofía: ve y controla todo el área de Estudiantes
// (altas, bienvenidas, resumen del área) pero no el circuito comercial.
export const ROLES = [
  'Admin',
  'Coordinador',
  'CoordinadorEstudiantes',
  'Estudiantes',
  'Inscripciones'
];

// Personas cuyos leads no pasan por el seguimiento 48hs/10días/mes sino que van directo a Lote 0
// (consultas de Facebook / MKT). Se identifica por email.
export const EMAILS_LOTE_CERO = ['jennifer.rebasti@institutoilce.com'];

export const HORAS_LOTE_1 = 48;
export const DIAS_LOTE_2 = 10;
export const DIAS_LOTE_3 = 30; // "al mes"
export const DIAS_LOTE_4 = 60; // "a los 2 meses"
export const DIAS_LOTE_5 = 90; // "a los 3 meses"

// Un estudiante aparece automáticamente en "Inscritos" recién 24hs después de confirmada la venta.
export const HORAS_PARA_ALTA_ESTUDIANTE = 24;

export const PASSWORD_GENERICA = 'Hola123';

// Datos para el mail de bienvenida al estudiante (área de Estudiantes)
// ⚠️ Reemplazar PLATAFORMA_URL por el link real de la plataforma antes de ir a producción.
export const PLATAFORMA_URL = 'https://plataforma.institutoilce.com';
export const PREGUNTAS_FRECUENTES_URL = 'https://institutoilce.com/preguntas-frecuentes';
export const CONTACTO_ESTUDIANTES_EMAIL = 'estudiantes@institutoilce.com';
export const CONTACTO_ESTUDIANTES_TEL = '+54 9 11 6791-8829';

// Abre Gmail web para redactar un mail — a diferencia de "mailto:", funciona siempre,
// sin depender de que la compu tenga un programa de mail configurado como predeterminado.
export function enlaceGmail(email, asunto = '') {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: email || '' });
  if (asunto) params.set('su', asunto);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
