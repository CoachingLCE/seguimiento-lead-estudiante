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

// Orígenes en orden alfabético, con los 4 nuevos agregados: Blog, Campañas por estados de WhatsApp,
// Email mkt (ya existía), Sitio web.
export const ORIGENES = [
  'Blog',
  'Campaña de mkt',
  'Campañas por estados de WhatsApp',
  'Dato compartido en Instagram',
  'Ebook',
  'Email mkt',
  'Mentorías',
  'Sitio web',
  'Whatsapp - Publicidad',
  'Whatsapp - Recomendación'
].sort((a, b) => a.localeCompare(b, 'es'));

export const MEDIOS_PAGO = ['MercadoPago', 'Débito automático', 'Western Union', 'Paypal'];

export const RESULTADOS_CONTACTO = ['No contestó', 'Va a pensarlo', 'No le interesa', 'Interesado'];

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

// Un estudiante aparece automáticamente en "Inscritos" recién 24hs después de confirmada la venta.
export const HORAS_PARA_ALTA_ESTUDIANTE = 24;

export const PASSWORD_GENERICA = 'Hola123';

// Datos para el mail de bienvenida al estudiante (área de Estudiantes)
// ⚠️ Reemplazar PLATAFORMA_URL por el link real de la plataforma antes de ir a producción.
export const PLATAFORMA_URL = 'https://plataforma.institutoilce.com';
export const PREGUNTAS_FRECUENTES_URL = 'https://institutoilce.com/preguntas-frecuentes';
export const CONTACTO_ESTUDIANTES_EMAIL = 'estudiantes@institutoilce.com';
export const CONTACTO_ESTUDIANTES_TEL = '+54 9 11 6791-8829';
