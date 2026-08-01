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

// País del lead — Argentina primero porque es el valor por defecto, el resto alfabético.
export const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador',
  'España', 'Estados Unidos', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela', 'Otro'
];

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
  'Jennifer Rebasti',
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
