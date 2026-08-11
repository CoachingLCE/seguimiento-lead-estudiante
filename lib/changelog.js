// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '4.2.4',
    fecha: '2026-08-11',
    cambios: [
      'El filtro de País en Reportes ahora muestra todos los países posibles (no solo los que tuvieron ventas ese mes puntual).'
    ]
  },
  {
    version: '4.2.3',
    fecha: '2026-08-11',
    cambios: [
      '"Detalle de compras" en Reportes ahora se ordena por Fecha de compra (más reciente primero) — antes aparecían mezcladas sin ningún orden. Se puede tocar el encabezado de la columna para invertir el orden.'
    ]
  },
  {
    version: '4.2.2',
    fecha: '2026-08-11',
    cambios: [
      'Corregido el efecto de "+N se agregan mañana": ahora es un shimmer real (reflejo fino que pasa por encima), con el texto base 100% sólido y nítido en su color ámbar normal — sin blur, sin sombra, sin nube de luz alrededor.'
    ]
  },
  {
    version: '4.2.1',
    fecha: '2026-08-11',
    cambios: [
      'Agregado un destello animado a "+N se agregan mañana" en Seguimiento — un brillo sutil recorre el texto cada pocos segundos, con pausas, para que se note de un vistazo sin resultar molesto.'
    ]
  },
  {
    version: '4.2.0',
    fecha: '2026-08-10',
    cambios: [
      'El selector de mes en Reportes ahora solo muestra los meses que tienen al menos un lead cargado — ya no aparecen meses vacíos de antes de empezar a usar la app, y se ajusta solo sin que haya que tocarlo de nuevo.'
    ]
  },
  {
    version: '4.1.2',
    fecha: '2026-08-10',
    cambios: [
      'Arreglado bug importante: si algo fallaba al cargar Reportes, la pantalla se quedaba pegada en "cargando" para siempre, sin ningún aviso. Ahora muestra un mensaje claro con botón de Reintentar.',
      'Protegido el cálculo de Ingresos contra datos raros (cantidad de cuotas inválida) que podían romper todo el reporte.'
    ]
  },
  {
    version: '4.1.1',
    fecha: '2026-08-10',
    cambios: [
      'Forzar formato de hora 24hs (00 a 23:59) en toda la app — antes dependía de la configuración regional del navegador de cada persona, y podía mostrarse en formato 12hs sin AM/PM.'
    ]
  },
  {
    version: '4.1.0',
    fecha: '2026-08-10',
    cambios: [
      'Agregado "Ingresos" al gráfico de facturación por día en Reportes (mismo gráfico, dos colores): proyecta cuándo se cobra cada cuota (cada 30 días desde la venta). Aclarado como estimación, no como dato confirmado de cobro real.'
    ]
  },
  {
    version: '4.0.0',
    fecha: '2026-08-10',
    cambios: [
      'Agregado botón "Confirmar recepción" en los mails de Bienvenida y Alta en plataforma — el estudiante lo toca sin necesitar login, se marca el check en Estudiantes y se avisa automáticamente a estudiantes@institutoilce.com.',
      '"Confirmó recepción" ya no dice "Próximamente" — es un checkbox real, y también se puede tildar a mano si hace falta.'
    ]
  },
  {
    version: '3.9.6',
    fecha: '2026-08-10',
    cambios: [
      'Activado: el mail de "Alta en plataforma" ahora se envía automáticamente al tildar el check, completando curso/edición/nombre del estudiante.'
    ]
  },
  {
    version: '3.9.5',
    fecha: '2026-08-10',
    cambios: [
      'Arreglado el gráfico "Leads por curso": la altura ahora se adapta a la cantidad de cursos, y los nombres largos se parten en 2 líneas en vez de superponerse — sin achicar la tipografía.'
    ]
  },
  {
    version: '3.9.4',
    fecha: '2026-08-10',
    cambios: [
      'Recuperación automática de pantalla en blanco: si el navegador de alguien queda con una versión vieja de la app justo cuando se sube una actualización, ahora se recarga solo en vez de quedar roto.',
      'Agregado un mensaje claro ("Algo salió mal, recargá la página") para cualquier otro error inesperado, en vez de una pantalla en blanco sin explicación.',
      'El rol Estudiantes ahora puede editar Nombre, Email y WhatsApp de sus alumnos ya inscriptos (antes no podía corregir estos datos).'
    ]
  },
  {
    version: '3.9.3',
    fecha: '2026-08-10',
    cambios: [
      'Reducido el "flash" blanco/oscuro que se veía un instante al recargar la página — el tema correcto (claro/oscuro) ahora se decide antes de pintar cualquier cosa en pantalla.'
    ]
  },
  {
    version: '3.9.2',
    fecha: '2026-08-10',
    cambios: [
      'Configurado el sitio para que el navegador siempre pida la versión más nueva de cada página — antes hacía falta forzar Ctrl+Shift+R después de cada actualización para ver los cambios.'
    ]
  },
  {
    version: '3.9.1',
    fecha: '2026-08-10',
    cambios: [
      'Arreglado bug visual reportado por video: el checkbox vacío (⬜) aparecía como un cuadrado violeta sólido en algunos navegadores/sistemas. Ahora se dibuja con CSS puro, sin depender de emojis.'
    ]
  },
  {
    version: '3.9.0',
    fecha: '2026-08-10',
    cambios: [
      'Rediseño de "Accesos rápidos" (antes "Herramientas de trabajo"): íconos consistentes, 3 columnas, sección de Recursos institucionales (Campus, Admin Campus, Preguntas frecuentes).',
      'Corregido bug importante: se podía confirmar una venta sin completar cantidad/valor de cuotas, guardando $0. Ahora esos campos son obligatorios y avisa si falta algo.',
      'Se agregaron más países a la detección automática (Alemania, Francia, Italia, Portugal, Reino Unido, Suiza, Brasil, Canadá, Australia), y se corrige el error típico de poner un "0" de más después del "+".',
      'Cada lote en Seguimiento ahora muestra cuántos leads se le van a agregar mañana.',
      'Nuevo gráfico "Leads por curso" en Reportes — antes solo se veían las VENTAS por curso, no los leads totales de cada formación.'
    ]
  },
  {
    version: '3.8.0',
    fecha: '2026-08-08',
    cambios: [
      'Tabla de Estudiantes rediseñada: nuevo orden de columnas, más espacio entre columnas, columna "Estudiante desde".',
      'Cada formación tiene ahora un color fijo y bien diferenciado (no tonos parecidos entre cursos).',
      'Nueva sección "Sin lote" en Seguimiento: muestra quiénes salieron del seguimiento activo y por qué.',
      '"Confirmó recepción" queda marcado como "Próximamente" — todavía no está activo.'
    ]
  },
  {
    version: '3.7.0',
    fecha: '2026-08-08',
    cambios: [
      'Corregido bug: un lead ya contactado en un lote ahora desaparece de ese lote (antes seguía apareciendo aunque ya estuviera resuelto).',
      'Los vencimientos de lote (48hs, 10 días, etc.) se redondean al inicio del día, para que todo el lote del día aparezca junto desde la mañana.',
      'Se puede programar "contactame el [fecha]" directo desde la ficha, no solo desde Seguimiento.',
      'Botón "Marcar venta" agregado en la ficha, para registrar una venta sin depender de los lotes.',
      'Nuevos checkboxes en Estudiantes: "Confirmó recepción" y "Grupo WhatsApp".'
    ]
  },
  {
    version: '3.6.0',
    fecha: '2026-08-05',
    cambios: [
      'Nueva pestaña "⚡ Herramientas" con accesos directos a Slack, Gmail, Calendar, Drive, Sheets, Zoom y el Baúl IN HOUSE.',
      'Buscador rediseñado: busca mientras escribís (desde 2 letras), en muchos más campos, y te dice en cuál encontró la coincidencia.',
      'Botón de Email arreglado: ahora abre Gmail web directo (antes dependía de tener un programa de mail configurado).',
      'Gráficos de Reportes con más detalle: número grande arriba de cada uno, exportar por gráfico, gráficos circulares como dona.',
      'Navegación reorganizada en 3 categorías (Operativo / Análisis / Administración), con "Nuevo lead" siempre destacado en violeta.',
      'Nuevo "Lote Programado": si alguien pide que lo contactes en una fecha puntual, reaparece ahí ese día.',
      'Sistema de tema Claro / Oscuro / Automático (según la hora), con selector arriba de todo.',
      'Corregido un bug importante: un solo monto mal guardado rompía el total de facturación de todo el mes en Reportes.',
      'Se puede editar toda la ficha de un lead/venta (Admin y Coordinador), y deshacer un resultado marcado por error.',
      'Los lotes en Seguimiento ahora arrancan plegados, para ver todo más ordenado de un vistazo.'
    ]
  },
  {
    version: '3.5.0',
    fecha: '2026-08-03',
    cambios: [
      'Reportes pasó a ser un panel comercial completo: comparación con el mes anterior, alertas automáticas, embudo de conversión, rankings de vendedores/cursos/orígenes.',
      'La ficha de cada lead ahora tiene pestañas (Resumen, Actividad, Seguimiento, Venta, Alumno, Notas) y muestra todo el progreso de un vistazo.',
      'Se puede eliminar un lead puntual (o varios a la vez) desde Seguimiento, protegiendo siempre los que ya tengan una venta confirmada.',
      'El login de cada usuario (y los intentos fallidos) queda registrado en el Historial de acciones.'
    ]
  },
  {
    version: '3.4.0',
    fecha: '2026-08-01',
    cambios: [
      'Rediseño completo de Nuevo Lead y de Seguimiento, con look más parecido a un CRM: tarjetas, colores por estado, tiempo restante de cada lote.',
      'Gestión completa de usuarios en Accesos: editar roles, activar/desactivar, eliminar (con confirmación y protección del último Admin).',
      'Herramienta para limpiar leads de prueba de un email puntual, con vista previa antes de borrar.',
      'La sesión ahora se puede mantener abierta, con vencimiento diario a las 23:59 para todos salvo Admin.'
    ]
  },
  {
    version: '3.3.0',
    fecha: '2026-07-31',
    cambios: [
      'Nuevo Lead: campo de País, Email, detección automática de duplicados antes de crear un lead repetido.',
      'El WhatsApp ya no es obligatorio — alcanza con tener al menos un medio de contacto.',
      'Se puede registrar el pago con cuotas variables/progresivas, y quién cerró la venta.',
      'Nuevos resultados de seguimiento y más opciones en "Cómo llegó el lead".'
    ]
  },
  {
    version: '3.2.0',
    fecha: '2026-07-27',
    cambios: [
      'Dashboard operativo: todo lo urgente del día (altas, bienvenidas, leads sin contactar) en un solo lugar.',
      'Ficha unificada de cada lead/estudiante, accesible como panel lateral desde cualquier pantalla.',
      'Se pueden cargar varios contactos de una sola vez en Nuevo Lead.',
      'Campo Docente(s), filtros por Formación y Edición, y los Lotes 4 y 5 de seguimiento.'
    ]
  }
];
