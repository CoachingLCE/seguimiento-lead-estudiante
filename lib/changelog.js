// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '10.12.3',
    fecha: '2026-09-18',
    cambios: [
      'Historial de bajas: "Coaching Ontológico Profesional" ahora se muestra como "Coaching Ontológico" — nombres unificados, solo en esta pantalla.'
    ]
  },
  {
    version: '10.12.2',
    fecha: '2026-09-18',
    cambios: [
      'Dashboard: la tabla de "Necesita tu atención ahora" ya no parte el texto en varias líneas dentro de cada celda — ahora cada fila entra en una sola línea (con scroll horizontal si hace falta en pantallas chicas).'
    ]
  },
  {
    version: '10.12.1',
    fecha: '2026-09-18',
    cambios: [
      'Historial de bajas: si el nombre del curso quedó repetido dos veces en el dato de origen (ej: "Coaching Deportivo Coaching Deportivo"), ahora se limpia solo y se muestra una sola vez.'
    ]
  },
  {
    version: '10.12.0',
    fecha: '2026-09-17',
    cambios: [
      'Nuevo mail semanal para Macarena: resumen de "Fichas enviadas" (mismos datos que la pantalla Fichas enviadas) — leads a los que se les mandó la ficha y todavía no compraron, con hace cuánto y quién la envió. Se manda los viernes a las 8 AM junto con el resumen de alertas.',
      'El resumen semanal de alertas (Bienvenida/Alta sin confirmar) vuelve a ir solo a Lourdes, Victoria y Sofía — Macarena había quedado sumada a ese por error, ahora tiene el suyo propio.'
    ]
  },
  {
    version: '10.11.0',
    fecha: '2026-09-17',
    cambios: [
      'Fichas enviadas: la pantalla ahora es más ancha, para ver mejor la tabla completa.',
      'Resumen semanal de alertas (mail de los viernes): ahora también le llega a Macarena.',
      'Emails → "Ver mail": la vista previa ahora ocupa mucho más espacio en pantalla, para ver el mail casi completo sin tener que scrollear tanto.',
      'Nuevo lead: nuevo checkbox "Ya contactado", para cuando el lead se carga después de haberlo contactado por fuera de la app — así el Lote 0 queda exclusivamente para los que todavía nadie contactó (el seguimiento a 10 días se sigue programando igual).'
    ]
  },
  {
    version: '10.10.0',
    fecha: '2026-09-17',
    cambios: [
      'La barra de búsqueda, Herramientas y el selector de tema ahora se ven siempre en el menú de arriba, incluso con la ventana angosta (antes se ocultaban del todo por debajo de cierto ancho y solo quedaban accesibles abriendo el menú ☰).',
      'Nuevo lead: la revisión de "¿ya existe un contacto parecido?" ahora prioriza WhatsApp/email por sobre el nombre — antes, si dos contactos sin nombre coincidían por el nombre vacío, podía tapar una coincidencia real por WhatsApp.',
      'Nuevo lead: "¿Les interesan otros cursos también?" ahora se resetea al cambiar el Producto principal — antes, si se cargaban tandas de distintos cursos en la misma sesión, los cursos adicionales marcados en una tanda quedaban pegados en la siguiente.',
      'Nuevo lead: nuevo checkbox "Sin nombre" para cargar un contacto solo con el número/usuario, cuando no tenemos el nombre de quien escribió.',
      'Nuevo lead: si se pega un WhatsApp argentino sin el "9" (ej. "54 11 3031-0203"), ahora aparece un aviso con un botón para corregirlo al formato que WhatsApp reconoce.',
      'Seguimiento: el país ahora se resalta en negrita cuando NO es Argentina, para verlo más rápido de un vistazo.',
      'Seguimiento: el botón de copiar (WhatsApp/email/Instagram) ahora es más grande y fácil de tocar; si el lead no tiene WhatsApp, aparece en su lugar un botón para copiar directo el usuario de Instagram/Facebook.',
      'Emails: la tabla de "Mails automáticos que genera el sistema" ahora muestra también el remitente, el CC y el asunto de cada uno, y se puede hacer clic en cualquier fila ("Ver mail →") para ver una vista previa real de ese mail.'
    ]
  },
  {
    version: '10.9.0',
    fecha: '2026-09-17',
    cambios: [
      'Ficha del lead → Venta: se arregló el Monto, que en algunos casos se veía mal (ej: "$80,8" en vez de "$80.800") — pasaba porque el monto viene de la planilla ya formateado con punto de miles, y se estaba interpretando ese punto como decimal. Ahora se muestra y se edita correctamente en todos lados (ficha, dashboard, informes de facturación).',
      'Ficha del lead → Resumen: ahora se ve la fecha de creación del lead ("Fecha de creación del lead"), y también "Cómo llegó" (el origen), que antes solo se podía ver al editar.',
      'Ficha del lead → Resumen: nueva sección "Cómo llegaron · toda la tanda" — un botón para ver, desde la propia ficha, todos los demás leads que entraron por el mismo origen/campaña, sin tener que volver al buscador general.',
      'Seguimiento: registrar un resultado, reasignar, marcar venta o eliminar ya no tapa toda la pantalla con "Cargando…" — se actualiza en segundo plano sin interrumpir a quien está trabajando en la lista.'
    ]
  },
  {
    version: '10.8.3',
    fecha: '2026-09-15',
    cambios: [
      'Informes RRSS: el selector de mes ahora solo muestra los meses que realmente tienen datos cargados (más el mes actual, para poder empezar uno nuevo) — antes mostraba siempre los últimos 13 meses aunque estuvieran vacíos.'
    ]
  },
  {
    version: '10.8.2',
    fecha: '2026-09-15',
    cambios: [
      'Informes RRSS → Evolución: ahora tiene un selector de red social (antes sumaba todas las plataformas juntas sin decirlo, mezclando escalas muy distintas). Además, las métricas que se grafican cambian según la red elegida — cada una muestra las que realmente tiene.'
    ]
  },
  {
    version: '10.8.1',
    fecha: '2026-09-15',
    cambios: [
      'Informes RRSS: ahora se muestran SIEMPRE todas las plataformas (antes Google Business/Threads/Comunidades solo aparecían si ya tenían datos cargados justo ese mes, así que en un mes vacío no se veía dónde cargarlas). Cada plataforma tiene su propio ícono para identificarla más fácil.'
    ]
  },
  {
    version: '10.8.0',
    fecha: '2026-09-15',
    cambios: [
      'Informes RRSS: nuevos campos de métrica (nuevos seguidores, interacciones, reacciones, compartidos, comentarios, contenidos publicados, búsquedas, tiempo de visualización, visualizaciones de página) y 3 plataformas nuevas (Threads, Comunidad WhatsApp, Comunidad Instagram) — para poder cargar el historial completo sin perder ningún dato.'
    ]
  },
  {
    version: '10.7.0',
    fecha: '2026-09-15',
    cambios: [
      'Informes RRSS: nueva sección "Evolución" con gráficos de los últimos 3/6/12 meses (Seguidores, Alcance, Leads calificados, Impresiones).',
      'Informes RRSS: alertas automáticas (🟢🔴🟡) según cómo viene el mes.',
      'Informes RRSS: "Top contenidos del mes" (mayor alcance, engagement, compartidos, guardados, leads) y "Rendimiento por tipo de contenido".',
      'Informes RRSS: resumen automático del mes, redactado solo a partir de los datos cargados.',
      'Informes RRSS: "📆 Informe anual" — mejor/peor mes, mejor plataforma, mejor tipo de contenido y evolución del alcance en el año.',
      'Informes RRSS: botón para exportar el mes a Excel, y nuevo campo "Leads" en cada pieza de contenido.'
    ]
  },
  {
    version: '10.6.1',
    fecha: '2026-09-15',
    cambios: [
      'Historial de bajas: se separaron Curso y Edición en 2 columnas distintas (antes a veces quedaban mezclados en un solo texto).'
    ]
  },
  {
    version: '10.6.0',
    fecha: '2026-09-15',
    cambios: [
      'Bajas: tope de 20 mails de reactivación por día, con contador visible arriba de la pantalla.',
      'Bajas: la columna Curso ahora combina bien con la Edición cuando corresponde (antes a veces quedaba poco claro cuál era el curso y cuál el número de edición).',
      'Nueva sección "Comunidades" (por ahora "Próximamente") — acceso para Diego y quienes ya tienen acceso a Estudiantes.'
    ]
  },
  {
    version: '10.5.0',
    fecha: '2026-09-14',
    cambios: [
      'Fichas enviadas: nueva columna "Sin inscribirse" con la cantidad de días desde el envío (verde/amarillo/rojo según cuánto pasó), más un aviso arriba con el total de fichas de 3 días o más sin conversión.'
    ]
  },
  {
    version: '10.4.3',
    fecha: '2026-09-14',
    cambios: [
      'Buscador: "Ver todos los leads históricos por origen" pasa de un combo desplegable a chips clickeables — se ven todos los orígenes de una, sin tener que abrir el menú.'
    ]
  },
  {
    version: '10.4.2',
    fecha: '2026-09-14',
    cambios: [
      'Buscador vuelve a ser un ícono (🔍) arriba, junto a Herramientas — se sacó de la fila principal del menú.'
    ]
  },
  {
    version: '10.4.0',
    fecha: '2026-09-14',
    cambios: [
      'Nav: "Leads" vuelve a llamarse "Buscador".',
      'Fichas enviadas: si la persona ya compró, deja de aparecer en la lista.',
      'Académico: el desplegable de formador ahora se completa solo — cada vez que alguien escribe un docente nuevo, queda guardado para que aparezca directo en el desplegable de ahí en adelante (sin depender de que ya haya sido asignado antes a algún curso).',
      'Dashboard: "📌 Necesita tu atención ahora" ahora se puede colapsar, y cada fila indica si es un Lead o un Estudiante.',
      'Reportes → Actividad por lote: se agregó "Reactivación de bajas" (antes no se contaba su atraso), y los lotes muestran su nombre real en vez del código interno.',
      '"📋 Resumen de movimientos" ahora es específicamente de Lucila, Alex y Macarena (antes podía incluir a cualquiera que edite un mensaje o reprograme algo).',
      'Herramientas: sacado el link viejo a productos y valores del sitio externo, ya está integrado en esta app.'
    ]
  },
  {
    version: '10.3.0',
    fecha: '2026-09-14',
    cambios: [
      'Nuevo logo: el encabezado y la pantalla de inicio ahora muestran el logo oficial del Instituto ILCE (antes aparecia "ILCE Gestion" como texto). Cambia solo entre modo claro y oscuro.'
    ]
  },
  {
    version: '10.2.0',
    fecha: '2026-09-14',
    cambios: [
      'Productos y Valores: cada link de medio de pago ahora tiene un botón chico "📋" al lado para copiarlo directo, sin tener que abrirlo — útil para pegarlo en un mensaje de WhatsApp.'
    ]
  },
  {
    version: '10.1.1',
    fecha: '2026-09-12',
    cambios: [
      'Herramientas vuelve a ser un ícono (⚡) arriba, junto al selector de modo claro/oscuro — se sacó de la lista de Configuración.'
    ]
  },
  {
    version: '10.1.0',
    fecha: '2026-09-12',
    cambios: [
      'Nav: los grupos (antes desplegables por clic) ahora se ven siempre abiertos, sin necesidad de tocar nada. El grupo antes llamado "Gestión" pasa a llamarse "Académico". "+ Nuevo lead" se movió a la izquierda, junto a Dashboard.'
    ]
  },
  {
    version: '10.0.0',
    fecha: '2026-09-12',
    cambios: [
      'Rediseño completo de la navegación: menú centralizado (Dashboard | Seguimiento | Leads | Gestión | Reportes | Configuración, con submenús desplegables) y "+ Nuevo lead" como acción destacada aparte — antes eran varias filas de botones sueltos.',
      'Cambio importante de permisos: ahora TODOS los usuarios ven todas las secciones en el menú. Si no tenés acceso a alguna, al entrar ves "🔒 No tenés acceso" en vez de la pantalla — antes esas secciones ni se mostraban y a veces redirigía sin explicación.',
      'Menú con versión para celular (☰) con todo apilado y accesible.'
    ]
  },
  {
    version: '9.6.3',
    fecha: '2026-09-12',
    cambios: [
      'Encontrada la causa real de "No se pudo conectar con el servidor" en Académico: faltaba reexportar la función tienePermisoAcademicoVer desde lib/auth.js — el endpoint se rompía siempre, no era un problema de conexión ni de velocidad. Arreglado.'
    ]
  },
  {
    version: '9.6.2',
    fecha: '2026-09-12',
    cambios: [
      'Académico: las 4 hojas ahora se leen una por una en vez de las 4 al mismo tiempo, para descartar que la causa fuera fricción con pedidos simultáneos a Google. También se muestra el detalle real del error si vuelve a fallar, para poder diagnosticarlo mejor.'
    ]
  },
  {
    version: '9.6.1',
    fecha: '2026-09-12',
    cambios: [
      'Académico: extendido el tiempo límite del endpoint (lee 4 hojas en paralelo, incluida Leads completa, que crece sin parar) — para que la plataforma no corte la función a mitad de camino en momentos de mucha carga.'
    ]
  },
  {
    version: '9.6.0',
    fecha: '2026-09-12',
    cambios: [
      'Arreglado un problema de fondo: las LECTURAS de Google Sheets no tenían reintento automático (solo las escrituras lo tenían) — un corte momentáneo de Google podía tirar el mensaje "No se pudo conectar con el servidor" en cualquier pantalla. Ahora las lecturas también reintentan solas antes de mostrar un error.'
    ]
  },
  {
    version: '9.5.2',
    fecha: '2026-09-12',
    cambios: [
      'La alerta "Revisar valor" ya no aplica a productos Pausados o Próximamente — solo tiene sentido para productos Activos, que son los que realmente se están vendiendo.'
    ]
  },
  {
    version: '9.5.1',
    fecha: '2026-09-12',
    cambios: [
      'Arreglado un bug real: los botones de medios de pago (MercadoPago/PayPal) solo se mostraban adentro de la tabla de descuentos, así que un producto SIN descuentos (como los ebooks) se quedaba sin mostrar sus botones aunque los tuviera cargados. Ahora se muestran siempre.'
    ]
  },
  {
    version: '9.5.0',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: nuevo botón "☑️ Seleccionar varios" — elegí varios productos con checkbox y sacales los descuentos a todos de una con "🗑 Quitar descuentos de los seleccionados" (útil para los Ebooks, que no deberían tener descuentos por nivel).'
    ]
  },
  {
    version: '9.4.2',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: el badge de formato ya no dice "ASINCRÓNICO" en Ebooks/Comunidad/Servicio/Otro producto — ahí muestra la modalidad real (ej: "EBOOK"). El badge Sincrónico/Asincrónico/Híbrido queda solo para los cursos.'
    ]
  },
  {
    version: '9.4.1',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: los botones de medios de pago ahora dicen explícitamente el proveedor — "Contado (MercadoPago)", "Débito automático (MercadoPago)" y "PayPal (USD)" en vez del genérico "Exterior".'
    ]
  },
  {
    version: '9.4.0',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: nuevo botón ARS/USD que convierte todos los precios mostrados usando un tipo de cambio configurable (cargalo con "+ Cargar tipo de cambio", solo Admin/Macarena).'
    ]
  },
  {
    version: '9.3.1',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: al entrar, arranca filtrado en "Activos" por defecto (antes mostraba todo). Nuevo chip "Cursos" que junta Sincrónico + On demand en un solo filtro.'
    ]
  },
  {
    version: '9.3.0',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: sacada la caja grande que repetía el valor de lista. Nueva sección compacta "Precios y beneficios" — cada fila se lee de izquierda a derecha (beneficio, descuento, precio destacado con el total chico debajo, medios de pago).'
    ]
  },
  {
    version: '9.2.1',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: sacada la duración en semanas/meses de la tarjeta (ej: "8 semanas") — se mantiene solo la cantidad de cuotas, que es el dato comercial relevante.'
    ]
  },
  {
    version: '9.2.0',
    fecha: '2026-09-12',
    cambios: [
      'Arreglado un error importante de cálculo en Productos y Valores: el valor de lista es POR CUOTA, no el total de la formación — se sacó la división incorrecta ("4 cuotas: $30.188/mes") y ahora se muestra correctamente "$120.750 / cuota" y, en cada descuento, "4 cuotas de $48.300".'
    ]
  },
  {
    version: '9.1.1',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: nueva alerta "⚠️ Revisar valor" en cada producto que no se actualiza hace más de 30 días (o que ya pasó su fecha de "próxima actualización" indicada), más un resumen arriba con la lista completa. Cada vez que se guarda un producto, la fecha se refresca sola.'
    ]
  },
  {
    version: '9.1.0',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores: tarjetas colapsadas por defecto (clic para ver el detalle), valor de lista bien diferenciado de los precios con descuento, tabla clara de Beneficio/Descuento/Precio/Medios de pago, cuotas mostradas cuando corresponde ("N cuotas de $X/mes"), 3 filas de filtros (estado, tipo, formato), y un badge de FORMATO (Sincrónico/Asincrónico/Híbrido) bien visible junto al de estado en cada tarjeta.'
    ]
  },
  {
    version: '9.0.0',
    fecha: '2026-09-12',
    cambios: [
      'Productos y Valores — reconstruido para soportar el catálogo real: niveles de descuento configurables (con override por producto), cuotas escalonadas, múltiples medios de pago (contado/débito automático/exterior), productos variantes (cambio de cursada, re cursada, etc.), y estados Activo/Pausado/Próximamente/Archivado.',
      'Nuevos chips para filtrar por modalidad (Sincrónico, On demand, Ebook, etc.) y por estado.'
    ]
  },
  {
    version: '8.7.0',
    fecha: '2026-09-12',
    cambios: [
      'Renombrada la app: "Seguimiento de LEAD-Estudiante" pasa a llamarse "ILCE Gestión" — en el header, el título de la pestaña del navegador y la pantalla de login.'
    ]
  },
  {
    version: '8.6.1',
    fecha: '2026-09-12',
    cambios: [
      'Reportes → Actividad: nueva sección "📦 Actividad por lote" — cuántos toques (contactos) se hicieron este mes en cada lote, y cuántos quedan atrasados ahora mismo.'
    ]
  },
  {
    version: '8.6.0',
    fecha: '2026-09-12',
    cambios: [
      'Nueva pestaña "💲 Productos y Valores": Macarena (y Admin) carga el valor de cada curso (cuotas + valor de cuota) y hasta 5 descuentos independientes (48hs, a los 30 días en pago único, docente por cuota, comunidad, pago único) + los links de MercadoPago y PayPal. La app calcula los precios con descuento sola. Visible para todos los usuarios logueados, editable solo por Macarena/Admin.'
    ]
  },
  {
    version: '8.5.0',
    fecha: '2026-09-09',
    cambios: [
      'Admin ahora puede eliminar un lead con venta confirmada si es necesario ("Eliminar igual (tiene venta)"), en vez de estar bloqueado sin excepción.',
      '"Sesiones gratuitas" agregado como nuevo Origen en Nuevo Lead.',
      'Académico ahora es visible para cualquier usuario logueado (antes solo algunos roles) — cargar/editar sigue restringido a los mismos roles de siempre.',
      'Reportes → Embudo: nueva sección "⏱ Retraso por lote" — cuántos contactos vencidos hay pendientes en cada lote y hace cuántos días en promedio esperan.',
      '"Resumen Estudiantes" renombrado a "Reportes Inscripciones", con selector de mes y chips por curso.',
      'Dashboard: nuevo resumen del día ("Contactar Lote X: N") para quien tiene contactos asignados.',
      'Buscador: nuevo desplegable para ver TODOS los leads históricos de un origen puntual (ej: "Campaña de Marketing"), con fecha — sin el límite de 30 resultados de la búsqueda normal.',
      'Reportes → "Leads por curso": clickear una barra (incluido "Sin curso definido") ahora abre el detalle real de esos leads, con acceso directo a la ficha de cada uno.'
    ]
  },
  {
    version: '8.4.1',
    fecha: '2026-09-09',
    cambios: [
      'Arreglado el select de Formador en Académico: elegir un docente cerraba la edición antes de terminar de guardar (por eso parecía "reiniciarse" sin guardar), y la opción "Escribir otro nombre" nunca se mostraba por un error en la condición. Se agregó también un botón para cancelar sin guardar.',
      'Nuevo Lead: sacados 3 orígenes duplicados ("Web", "Wpp - campaña", "Whatsapp - Recomendación") que ya estaban cubiertos por otras opciones existentes.'
    ]
  },
  {
    version: '8.4.0',
    fecha: '2026-09-08',
    cambios: [
      'Arreglado: la detección de leads duplicados por WhatsApp no reconocía "+54 11..." y "+54 9 11..." como el mismo número (por el 9 de celular argentino) — ahora los compara ignorando esa diferencia, tanto en Nuevo Lead como al cargar bajas.',
      'Estudiantes: nuevos chips para filtrar por mes de inscripción (Agosto, Septiembre, etc.), con el conteo de cada uno.'
    ]
  },
  {
    version: '8.3.0',
    fecha: '2026-09-08',
    cambios: [
      'Informes RRSS pasó de ícono suelto a pestaña real en el menú principal ("📊 Informes RRSS"), y su acceso quedó restringido puntualmente a Diego y Jennifer (antes cualquier Admin lo veía).'
    ]
  },
  {
    version: '8.2.0',
    fecha: '2026-09-08',
    cambios: [
      'Nueva pestaña "✉️ Emails": documenta los 5 mails automáticos que manda el sistema (bienvenida, alta en plataforma, credenciales, reactivación de bajas, resumen semanal) y muestra el registro real de cada envío (Enviado/Falló), con buscador y filtros por tipo/estado.'
    ]
  },
  {
    version: '8.1.0',
    fecha: '2026-09-08',
    cambios: [
      'Arreglado un bug real en Cargar bajas: si la segunda carga traía el email pero el registro existente todavía no lo tenía guardado, la búsqueda cortaba ahí y creaba un lead duplicado en vez de reconocer a la persona. Ahora prueba en cascada (email → whatsapp → nombre) hasta encontrarla.',
      'Bajas: nuevo chip "⚠️ Duplicados" en el Historial que agrupa por nombre+fecha, columna de Email agregada a la tabla, y las filas duplicadas quedan resaltadas para revisarlas y elegir cuál dejar.'
    ]
  },
  {
    version: '8.0.0',
    fecha: '2026-09-08',
    cambios: [
      'Informes RRSS — mejora integral: nuevo "📊 Resumen del mes" con totales (seguidores, alcance, impresiones, visitas, leads, contenidos) y comparación con el mes anterior (↑/↓ % o puntos de engagement).',
      'Contenido destacado: el engagement de cada pieza se calcula solo, y la de mejor rendimiento se marca con "🏆 Mejor contenido del mes". Cada pieza ahora tiene un ID propio (compatible con las que ya estaban cargadas).',
      'Nueva sección "🎯 Objetivos del mes" — lista simple con check de cumplido, sin metas numéricas complejas.',
      'Análisis mensual: agregada una ayuda corta debajo de cada campo (Resumen/Causas/Propuestas) aclarando qué va ahí.',
      'Comentarios: quedan registrados también en el Historial de acciones, con fecha/hora en formato amigable (Hoy, Ayer, etc.).',
      'Validación de campos numéricos (enteros ≥0, engagement entre 0-100) en el formulario y en el servidor. Los formularios ya no se cierran solos si el guardado falla — muestran el error y no pierden lo cargado. Confirmaciones claras al guardar (✓/✕).',
      'Rediseño: orden de secciones, selector de mes con ícono, estados de carga tipo esqueleto, y ajustes de responsive en celular.'
    ]
  },
  {
    version: '7.19.2',
    fecha: '2026-09-08',
    cambios: [
      'Cargar bajas: el error de conexión ahora dice el nombre de la persona que falló (antes salía el mismo mensaje genérico repetido, sin saber cuál era cuál).'
    ]
  },
  {
    version: '7.19.1',
    fecha: '2026-09-06',
    cambios: [
      'Cargar bajas: ahora se manda de a una persona por vez, mostrando "Cargando X de Y…" con una barra de progreso — antes parecía trabado durante toda la carga.'
    ]
  },
  {
    version: '7.19.0',
    fecha: '2026-09-06',
    cambios: [
      'Bajas: nuevo selector para filtrar el Historial por curso, junto a los chips de estado.',
      'Cargar bajas: si una persona ya estaba registrada sin email, y esta vez la carga trae el email, se completa automáticamente en su ficha (antes se ignoraba en "Ya existentes").'
    ]
  },
  {
    version: '7.18.0',
    fecha: '2026-09-06',
    cambios: [
      'Nueva pestaña "📊 Informes RRSS": métricas mensuales por red social (Instagram, LinkedIn, YouTube, Google Business, Blog), contenido destacado con sus métricas, análisis del mes (resumen/causas/propuestas) y comentarios — para el nuevo rol Coordinadora de MKT y Comunicación.'
    ]
  },
  {
    version: '7.17.1',
    fecha: '2026-09-06',
    cambios: [
      'Mensajes frecuentes: la vista compacta (solo título, mensaje colapsado) ahora es la que se ve por defecto al entrar — antes había que tocar el botón primero.'
    ]
  },
  {
    version: '7.17.0',
    fecha: '2026-09-06',
    cambios: [
      'Mensajes frecuentes: se puede arrastrar (desde el ⠿) para reordenar las plantillas — el orden queda guardado para todos. Nuevo botón "☰ Vista compacta" que colapsa cada mensaje a solo el título (con un toque para desplegarlo).'
    ]
  },
  {
    version: '7.16.1',
    fecha: '2026-09-06',
    cambios: [
      'Estudiantes: nuevo resumen arriba de todo con el total de acciones pendientes (ej: "8 acciones pendientes: 5 bienvenida · 2 confirmar recepción · 1 alta en plataforma"), y cada chip de estado ahora muestra su conteo al lado.'
    ]
  },
  {
    version: '7.16.0',
    fecha: '2026-09-06',
    cambios: [
      'Historial de acciones: chips para filtrar por tipo de acción (Venta, Lead, Editó, Eliminó, etc.), con la misma categorización que ya tenían los colores.',
      'Reportes → Alertas: nueva alerta de "contactos programados sin resolver" — leads a los que alguien pidió contactar en una fecha que ya pasó, y todavía nadie los contactó.',
      'Arreglado: en modo claro, el texto de los tooltips de los gráficos de Reportes se veía oscuro sobre un fondo también oscuro (ilegible) — ahora el texto queda siempre claro, sin importar el tema de la app.'
    ]
  },
  {
    version: '7.15.4',
    fecha: '2026-09-06',
    cambios: [
      'Historial de acciones: cada persona ahora se ve como una etiqueta con color propio, para distinguirla rápido sin tener que leer el nombre.'
    ]
  },
  {
    version: '7.15.3',
    fecha: '2026-09-06',
    cambios: [
      'Historial de acciones: cuando la fila tiene un lead relacionado (ej: "📩 Creó un lead"), el detalle es un link a su ficha — Ctrl/Cmd+click abre en pestaña nueva.'
    ]
  },
  {
    version: '7.15.2',
    fecha: '2026-09-06',
    cambios: [
      'Habilitado el acceso a "Historial de acciones" para el rol Coordinador (Jennifer y Macarena) — antes era exclusivo de Admin.'
    ]
  },
  {
    version: '7.15.1',
    fecha: '2026-09-06',
    cambios: [
      'Buscador: "Ver ficha", "Editar" y los últimos alumnos vistos ahora son links reales — Ctrl/Cmd+click (o click con el botón del medio) abre la ficha en una pestaña nueva.'
    ]
  },
  {
    version: '7.15.0',
    fecha: '2026-09-06',
    cambios: [
      'Historial de acciones: ahora se puede buscar también por email o WhatsApp del lead relacionado (se muestran chiquitos debajo del detalle de cada fila). Las acciones de "Eliminó" tienen su propio color rojo e ícono 🗑️.'
    ]
  },
  {
    version: '7.14.2',
    fecha: '2026-09-06',
    cambios: [
      '"Evolución de ventas por día": el tooltip ahora también muestra el acumulado del mes anterior hasta ese mismo día, no solo el de este mes.'
    ]
  },
  {
    version: '7.14.1',
    fecha: '2026-09-06',
    cambios: [
      'Selector de mes en Reportes: sacados los meses anteriores a junio 2026 (leads viejos/de prueba sin info real).'
    ]
  },
  {
    version: '7.14.0',
    fecha: '2026-09-06',
    cambios: [
      'Arreglado bug real en Seguimiento: un lead con un contacto programado para más adelante seguía apareciendo en su lote numérico original (ej: Lote 1) si ese lote ya estaba vencido — ahora se oculta de ahí hasta que llegue la fecha programada, y recién ahí aparece en LOTE PROGRAMADO.',
      '"Evolución de ventas por día" en Reportes: el tooltip ahora muestra también el acumulado del mes hasta ese día, no solo las ventas de esa jornada puntual.',
      'Académico: arreglado que casi todos los cursos figuraban como "cerrados" — antes se decidía por días desde el inicio (30 días), ahora se decide por si todos los alumnos ya tienen una situación académica definida.',
      'Académico: el campo Formador por edición pasó de escribir texto libre a un menú desplegable con los docentes ya cargados (con opción de escribir uno nuevo) — arregla que a veces no guardaba lo escrito.'
    ]
  },
  {
    version: '7.13.1',
    fecha: '2026-09-05',
    cambios: [
      'Estudiantes: el filtro por estado pasó de desplegable a chips (Todas / Falta bienvenida / Falta confirmar recepción / Falta alta / Falta confirmar alta / Falta grupo WhatsApp / Completo), mismo estilo que los filtros de Bajas.'
    ]
  },
  {
    version: '7.13.0',
    fecha: '2026-09-05',
    cambios: [
      'Bajas: sacada la tarjeta "Acciones pendientes" — el botón para enviar el mail de reactivación ahora vive directo en la columna "Reactivación" de la tabla (donde antes decía "Listo para enviar"). Tabla del Historial más ancha y alta, y siempre abierta (sin necesitar tocar "Ver historial").'
    ]
  },
  {
    version: '7.12.3',
    fecha: '2026-09-05',
    cambios: [
      'Reforzado el arreglo de "Quota exceeded": ahora cualquier escritura a Google Sheets (no solo bajas) reintenta sola hasta 3 veces, esperando 15 segundos entre intento e intento, en vez de fallar directo. Aplica a toda la app.'
    ]
  },
  {
    version: '7.12.2',
    fecha: '2026-09-05',
    cambios: [
      'Arreglado "Quota exceeded" al cargar muchas bajas de una sola vez: se agregó una pequeña pausa entre cada persona procesada, para no exceder el límite de escrituras por minuto de Google Sheets.'
    ]
  },
  {
    version: '7.12.1',
    fecha: '2026-09-05',
    cambios: [
      'Arreglado "Cargar bajas": si se pegaban varias filas de planilla (una persona por línea, separadas por tabulaciones, sin línea en blanco entre cada una), se cargaba todo como una sola persona. Ahora detecta ese formato y separa cada línea correctamente.'
    ]
  },
  {
    version: '7.12.0',
    fecha: '2026-09-05',
    cambios: [
      'Nueva pestaña "📐 Escala Inscripciones" en Reportes: tabla de referencia (Rango de inscripciones, Rango, Valor) con fecha de actualización — editable solo por Admin.'
    ]
  },
  {
    version: '7.11.1',
    fecha: '2026-09-05',
    cambios: [
      'Arreglado el chip "Lucila" en Reportes → Compras: buscaba por ese nombre literal, pero en el sistema figura como "Jesabel Reigada" (Jesabel Lucila Reigada) — ahora busca por el nombre real y sigue mostrando "Lucila" como etiqueta. Los 2 chips (Lucila/Alexander) quedan siempre visibles, aunque tengan 0 ventas ese mes.'
    ]
  },
  {
    version: '7.11.0',
    fecha: '2026-09-04',
    cambios: [
      'Agregados en Herramientas: "Valores de los cursos (alternativo)" y "Cronograma ILCE".'
    ]
  },
  {
    version: '7.9.0',
    fecha: '2026-09-04',
    cambios: [
      'Reportes → Compras: chips rápidos para filtrar por Lucila o Alexander con el conteo de ventas al lado, sin tener que buscarlos en el ranking.'
    ]
  },
  {
    version: '7.8.1',
    fecha: '2026-09-04',
    cambios: [
      'Agregada la hora junto a la fecha en la ficha del lead (Ingresó, Fecha de venta, Historial de acciones, Notas) — antes solo mostraba el día.'
    ]
  },
  {
    version: '7.8.0',
    fecha: '2026-09-03',
    cambios: [
      'Botones de acción en las alertas de Estudiantes: "🔄 Reenviar bienvenida"/"🔄 Reenviar alta" en la alerta de sin confirmar, y "📩 Enviar bienvenida" en la de bienvenida pendiente — mandan el mail real, ya no hace falta ir a la ficha para reenviarlo.'
    ]
  },
  {
    version: '7.7.0',
    fecha: '2026-09-03',
    cambios: [
      '"Evolución de ventas por día" en Reportes ahora superpone la misma serie del mes anterior, para comparar día a día (no solo el total).',
      'Renombrado "Resumen Estudiantes" a "Reportes Estudiantes" en el menú, y agregado el título en la propia pantalla.'
    ]
  },
  {
    version: '7.6.0',
    fecha: '2026-09-02',
    cambios: [
      'Estudiantes: nuevo filtro rápido por estado (Falta bienvenida, Falta confirmar recepción, Falta alta, Falta confirmar alta, Falta grupo WhatsApp, Completo).',
      'Arreglado un bug importante en Reportes: "Ventas del mes" contaba leads que ENTRARON ese mes en vez de los que COMPRARON ese mes — una venta de alguien que entró un mes distinto al que compró no se contaba. Corregido en Total ventas, Facturación, Ticket promedio, Evolución de ventas por día, todos los rankings, Días hasta la conversión y Detalle de compras.',
      'Ficha del lead: nuevo botón "📄 Ficha enviada" y selector "Otro resultado…" en cada lote pendiente, para registrar el resultado directo sin ir a Seguimiento.',
      'Dashboard: nuevo "💰 Listado de ventas" con las últimas 30 ventas (estudiante, curso, vendedor, monto, fecha).'
    ]
  },
  {
    version: '7.5.0',
    fecha: '2026-09-02',
    cambios: [
      'Estudiantes: al marcar/modificar un casillero, la pantalla ya no vuelve al inicio del listado — se mantiene en la misma posición.',
      '"Omitir bienvenida" vuelve a marcar automáticamente "Confirmó recepción" — se entiende que omitirla da por completado ese paso.',
      'Lourdes y Victoria (rol Estudiantes) ya pueden omitir el envío de la bienvenida directamente, sin pedírselo a Diego.',
      'Nueva pantalla "📄 Fichas enviadas" (ícono nuevo en el header): lista todos los leads a los que se les marcó "Ficha enviada", con fecha y quién la mandó — disponible para quien ya tiene acceso a Seguimiento.'
    ]
  },
  {
    version: '7.4.2',
    fecha: '2026-08-30',
    cambios: [
      'Arreglado: el encabezado fijo de la tabla de Estudiantes no funcionaba porque le faltaba un scroll propio al contenedor — ahora sí queda pegado arriba al bajar por la lista.'
    ]
  },
  {
    version: '7.4.1',
    fecha: '2026-08-30',
    cambios: [
      'Estudiantes: el encabezado de la tabla (Fecha de inscripción, Estudiante, Curso, etc.) queda fijo arriba al scrollear hacia abajo.'
    ]
  },
  {
    version: '7.4.0',
    fecha: '2026-08-30',
    cambios: [
      'Nuevo mail automático semanal (viernes 8 AM): resumen de "Sin confirmar recepción" a Lourdes, Victoria y Sofía — mismos estudiantes que muestra la alerta en Estudiantes.'
    ]
  },
  {
    version: '7.3.1',
    fecha: '2026-08-30',
    cambios: [
      'Mail de bienvenida: el botón "Confirmar recepción" ahora aparece antes del párrafo de espacios de encuentro (WhatsApp/Instagram), no al final del mail.'
    ]
  },
  {
    version: '7.3.0',
    fecha: '2026-08-30',
    cambios: [
      'Agregado checkbox "🎓 Venta 100% becada" en Marcar venta — al tildarlo, se salta la obligación de cargar un monto y registra la venta con $0, sin cuotas.'
    ]
  },
  {
    version: '7.2.2',
    fecha: '2026-08-28',
    cambios: [
      'Ampliado aún más el panel de Reportes (1600px → 1900px) para que "Detalle de compras" entre mejor en una sola línea por fila.'
    ]
  },
  {
    version: '7.1.2',
    fecha: '2026-08-28',
    cambios: [
      'Agrandada la tabla de "Detalle de compras" en Reportes (Compras) para que se vean más filas a la vez sin necesitar tanto scroll.'
    ]
  },
  {
    version: '7.0.0',
    fecha: '2026-08-28',
    cambios: [
      'Reportes reorganizado en pestañas: 📊 General, ⚠️ Alertas, 🎯 Objetivos, 🔻 Embudo, 👤 Actividad, 📈 Análisis y 🧾 Compras — todo el mismo contenido de antes, reorganizado para que General se entienda de un vistazo y el resto se explore por tema. Ningún cálculo ni API existente se modificó.',
      'Nueva pestaña "🎯 Objetivos": Admin define metas mensuales de facturación, ventas, leads, conversión y ticket promedio (y opcionalmente por curso) — tarjetas de cumplimiento, gráfico comparativo, mensajes automáticos, proyección al cierre del mes y objetivos por curso. Los objetivos quedan guardados por mes, sin afectar a otros meses.'
    ]
  },
  {
    version: '6.8.3',
    fecha: '2026-08-28',
    cambios: [
      'Corregido el tooltip de "Días hasta la conversión": en vez de listar los nombres de los compradores, muestra cuántas ventas cerró cada vendedor en ese grupo.'
    ]
  },
  {
    version: '6.8.2',
    fecha: '2026-08-28',
    cambios: [
      'En "Días hasta la conversión" (Reportes), al pasar el mouse por una barra ahora se ven los nombres de quiénes fueron esas ventas, no solo la cantidad.'
    ]
  },
  {
    version: '6.8.1',
    fecha: '2026-08-28',
    cambios: [
      'Ampliado el panel de Reportes y evitado que las columnas de "Detalle de compras" (Lead, Monto, Vendedor, etc.) se corten en varias líneas.'
    ]
  },
  {
    version: '6.8.0',
    fecha: '2026-08-28',
    cambios: [
      'Rediseño visual completo de Bajas (sin tocar lógica/APIs): encabezado con indicadores (bajas registradas, listas para recontactar, próximas al día 90), "Acciones pendientes" destacada como cards compactas, "Cargar bajas" más limpio con preview visual y botón "Registrar N bajas", resultado de carga en chips de color, "Historial de bajas" con filtros rápidos (Todas/Recontactar/Próximas al día 90/En Lote Bajas/Contactadas), columnas "Reactivación"/"Seguimiento" con badges de estado, y vista en cards para mobile. Pantalla más ancha.'
    ]
  },
  {
    version: '6.7.1',
    fecha: '2026-08-26',
    cambios: [
      'Tabla "Ver todas las bajas registradas": las columnas ahora dicen explícitamente "Acción 1 — Día 85: envío de mail" y "Acción 2 — Día 90: WhatsApp por lote", cada una con su fecha o estado (pendiente, listo para enviar, enviado, confirmado, contactado).'
    ]
  },
  {
    version: '6.7.0',
    fecha: '2026-08-26',
    cambios: [
      'Bajas: nueva sección "📬 Listas para recontactar" — a los 85 días de la baja, se habilita enviar un mail de reactivación (desde Info ILCE) con un botón "Información" que lleva a WhatsApp con el mensaje precargado. Si la persona toca el botón, se marca sola "Confirmó recepción y solicitó info", sin que nadie del equipo tenga que hacer nada.'
    ]
  },
  {
    version: '6.6.0',
    fecha: '2026-08-26',
    cambios: [
      'Estudiantes: ampliado el panel y sacados los saltos de línea forzados en los encabezados (Confirmó recepción, Alta plataforma, Confirmó Alta, Grupo WhatsApp) — ahora entran en una sola línea.',
      'Rediseñada "⚠ Alertas" en Reportes: título con la cantidad total, tarjetas por curso con ventas del mes actual/anterior, leads activos y prioridad (🔴 crítica / 🟡 atención / ⚪ informativa), botones Ver ventas/Ver leads/Analizar, y "Ver todas las alertas" cuando hay muchas. Se descartan cursos realmente inactivos para no generar ruido.'
    ]
  },
  {
    version: '6.5.1',
    fecha: '2026-08-26',
    cambios: [
      'Arreglado en Nuevo Lead: si se arrastraba el mouse por accidente (ej: intentando seleccionar texto) sobre una tarjeta de contacto, se disparaba el "arrastrar para reordenar" y la tarjeta quedaba pegada semi-transparente. Ahora el arrastre solo se activa tocando el ícono ⠿, y nunca queda colgado aunque se suelte afuera.'
    ]
  },
  {
    version: '6.5.0',
    fecha: '2026-08-26',
    cambios: [
      'Nueva columna "Confirmó Alta" en Estudiantes: antes, confirmar el mail de Alta en plataforma marcaba el mismo check que la Bienvenida — ahora son 2 campos independientes, uno por cada mail. Estado y alertas actualizados para reflejar esto (ahora son 5 tareas, no 4).',
      'Actualizado el mail de Bienvenida con el nuevo texto y diseño trabajado (saludo más cálido, mención del curso, bloque "¿Qué sigue?", videos introductorios con mejor formato, y recomendación del blog).'
    ]
  },
  {
    version: '6.4.1',
    fecha: '2026-08-26',
    cambios: [
      'Agregado "In Company" a la lista de productos en Nuevo Lead.'
    ]
  },
  {
    version: '6.4.0',
    fecha: '2026-08-26',
    cambios: [
      'Si un lead marcó interés en varios cursos, al marcar la venta ahora se pregunta cuál es el de esa venta puntual (antes se usaba siempre el curso principal, aunque el comprado fuera otro).',
      'Admin puede corregir el Curso directo en la tabla de Estudiantes (click sobre el curso) — por si se cargó un error al marcar la venta.'
    ]
  },
  {
    version: '6.3.4',
    fecha: '2026-08-25',
    cambios: [
      'Agregado tip en la Ayuda de Nuevo Lead: si el mensaje dice "🚀 Hola, quiero más información sobre...", es el mensaje automático de un anuncio de Instagram.'
    ]
  },
  {
    version: '6.3.3',
    fecha: '2026-08-25',
    cambios: [
      '"Omitir bienvenida" ya no marca automáticamente "Confirmó recepción" — solo omite el envío del mail. La confirmación queda pendiente hasta que el estudiante confirme de verdad (o se tilde a mano).'
    ]
  },
  {
    version: '6.3.2',
    fecha: '2026-08-25',
    cambios: [
      'Sacado el filtro "Todos los docentes" en Estudiantes — no se usaba.'
    ]
  },
  {
    version: '6.3.1',
    fecha: '2026-08-25',
    cambios: [
      'Sacadas las ventas confirmadas de "Sin lote" en Seguimiento — esa sección ahora es solo para leads que se fueron SIN comprar (No le interesa, etc.), una venta es un resultado positivo que no pertenece ahí.'
    ]
  },
  {
    version: '6.3.0',
    fecha: '2026-08-25',
    cambios: [
      'Historial de acciones: ahora se ve el nombre y curso del lead en "Registró contacto", "Reasignó", "Programó contacto" y "Deshizo un resultado" — antes solo mostraba el resultado o el lote, sin decir de quién se trataba.'
    ]
  },
  {
    version: '6.2.2',
    fecha: '2026-08-25',
    cambios: [
      'Agregado color (magenta) e ícono (📝) a las acciones de Mensajes frecuentes (crear/editar/eliminar) en el Historial de acciones, igual que el resto de acciones destacadas.'
    ]
  },
  {
    version: '6.2.1',
    fecha: '2026-08-25',
    cambios: [
      'Arreglo de fondo: si un encabezado de columna en cualquier hoja tiene un espacio de más al final (invisible, fácil de tipear por accidente), el dato quedaba guardado bajo una clave distinta y aparecía vacío en pantalla sin ningún error. Ahora se recortan los espacios de los encabezados automáticamente en toda la app.'
    ]
  },
  {
    version: '6.2.0',
    fecha: '2026-08-25',
    cambios: [
      'Nueva sección "💬 Mensajes frecuentes" (ícono al lado del Buscador): plantillas de mensajes para copiar y pegar en WhatsApp. Admin y Coordinador (ej: Macarena) pueden crear/editar/borrar; todo el circuito comercial (incluido Inscripciones) puede verlos y copiarlos con un botón.'
    ]
  },
  {
    version: '6.1.0',
    fecha: '2026-08-21',
    cambios: [
      'Académico: el formador ahora se puede definir por EDICIÓN puntual (columna editable en la tabla del reporte) — para cursos como Oratoria, donde distintas ediciones tienen distintos formadores. El formador "por defecto" del curso sigue existiendo como respaldo si una edición no tiene el suyo propio.',
      'Agregada la opción "— Todos los cursos —" en el selector de arriba (reemplaza el checkbox que había antes) — al elegirla, el reporte muestra la vista institucional completa y se ocultan las secciones que necesitan un curso puntual.'
    ]
  },
  {
    version: '6.0.2',
    fecha: '2026-08-21',
    cambios: [
      'Arreglado "Invalid Date" en Académico al escribir la fecha de inicio directo en el Sheet en formato argentino (día/mes/año, ej: 20/01/2026) — antes se interpretaba al revés (mes/día/año) y rompía. Ahora entiende ambos formatos.'
    ]
  },
  {
    version: '6.0.1',
    fecha: '2026-08-21',
    cambios: [
      'Académico: el Reporte por edición ahora respeta el curso elegido arriba por defecto (antes mostraba siempre todos los cursos mezclados). Agregado un checkbox "Ver todos los cursos" para volver a la vista institucional completa cuando se quiera comparar docentes.'
    ]
  },
  {
    version: '6.0.0',
    fecha: '2026-08-21',
    cambios: [
      'Rediseño grande del Reporte por edición en Académico: ahora muestra TODAS las ediciones de TODOS los cursos juntas (antes solo del curso seleccionado arriba).',
      'Tarjetas resumen: total de ediciones, inscriptos, certificados, bajas, % certificación y % bajas.',
      'Ordenado por fecha de inicio, más reciente primero.',
      'Semáforos de color en % Certificados (verde >70%, amarillo 50-70%, rojo <50%) y % Bajas (verde <10%, amarillo 10-20%, rojo >20%).',
      'Fila clickeable: abre una ficha detallada con listado de alumnos, situación académica, pagos vinculados (por email contra Leads) y observaciones editables.',
      'Sparklines de evolución de inscriptos, % certificación y % bajas a lo largo de las ediciones.',
      'Encabezado fijo al scrollear en tablas largas.',
      'Filtros rápidos: Todas, Activas, Finalizadas, Con altas bajas, Baja certificación.',
      'Filtro por docente, con comparación contra el promedio institucional de certificación.'
    ]
  },
  {
    version: '5.8.0',
    fecha: '2026-08-21',
    cambios: [
      'Reemplazado "Ventas por lote de conversión" (mostraba casi todo como "sin dato" porque no capturaba las ventas marcadas directo) por "Días hasta la conversión": histograma de barras que muestra cuánto tardó cada comprador desde que ingresó como lead (mismo día, 1-2 días, 3-7 días, etc.) — usa datos que siempre están completos.'
    ]
  },
  {
    version: '5.7.1',
    fecha: '2026-08-21',
    cambios: [
      'Arreglado el caso de "cierro la laptop y al abrirla la pestaña queda en blanco": si una pestaña estuvo oculta/dormida 20 minutos o más, ahora se recarga sola automáticamente al volver a estar visible, sin esperar a que aparezca un error técnico.'
    ]
  },
  {
    version: '5.7.0',
    fecha: '2026-08-21',
    cambios: [
      'Agregada "⚡ Acción" sugerida en cada lote de Seguimiento (0 a 6), con color destacado y botón para copiar el mensaje sugerido cuando lo tiene.',
      'Nuevo gráfico "Ventas por lote de conversión" en Reportes: en qué lote de Seguimiento se cerró finalmente cada venta del mes.'
    ]
  },
  {
    version: '5.6.2',
    fecha: '2026-08-21',
    cambios: [
      'Arreglada la alerta "días sin ventas": contaba TODOS los días sueltos sin venta del mes (aunque hubiera ventas después), mostrando una racha vieja como si siguiera activa. Ahora cuenta la racha real, desde hoy hacia atrás, cortando en cuanto encuentra un día con ventas.'
    ]
  },
  {
    version: '5.6.1',
    fecha: '2026-08-20',
    cambios: [
      'Sacado Diego Lerner de la alerta "sin ventas registradas este mes" en Reportes — sigue disponible en el desplegable "Quién cerró la venta".'
    ]
  },
  {
    version: '5.6.0',
    fecha: '2026-08-20',
    cambios: [
      'Agregado "LOTE 6 – Contactar a los 6 meses" en Seguimiento, después del Lote 5. Se crea automáticamente con cada lead nuevo, y ya está integrado en Reportes (Actividad por persona, columna L6).'
    ]
  },
  {
    version: '5.5.0',
    fecha: '2026-08-20',
    cambios: [
      'Rehecho "pegar varios contactos" en Nuevo Lead: antes dependía del evento exacto de pegado (Ctrl+V) y no se activaba si se escribía a mano o se pegaba de otra forma. Ahora detecta el contenido en cualquier momento y ofrece un botón "Separar en N tarjetas" — más confiable y visible, en vez de intentar adivinar en automático.'
    ]
  },
  {
    version: '5.4.2',
    fecha: '2026-08-20',
    cambios: [
      'Arreglado "pegar varios contactos" en Nuevo Lead: antes solo funcionaba si había una línea completamente en blanco entre cada contacto. Ahora también detecta varias filas pegadas de una planilla (una persona por línea, sin línea en blanco), siempre que más de una tenga pinta de WhatsApp.'
    ]
  },
  {
    version: '5.4.1',
    fecha: '2026-08-20',
    cambios: [
      'Nuevo Lead: "Curso (para toda la tanda)" ahora dice "Producto (para toda la tanda)". Agregada "Comunidades" a la lista de opciones.'
    ]
  },
  {
    version: '5.4.0',
    fecha: '2026-08-20',
    cambios: [
      'Arreglado: una venta cerrada a la tarde tenía que esperar un día EXTRA en aparecer en Estudiantes, porque el sistema exigía 24hs reales completas y el proceso corre a las 7 AM. Ahora es por día calendario — cualquier venta de ayer o antes ya está lista en el proceso de hoy, sin importar la hora exacta en que se cerró.'
    ]
  },
  {
    version: '5.3.3',
    fecha: '2026-08-14',
    cambios: [
      'Agregados en Herramientas: "Evaluación Coaching Deportivo" y "Ver feedback de estudiantes".'
    ]
  },
  {
    version: '5.3.2',
    fecha: '2026-08-14',
    cambios: [
      'Agregado resumen destacado en la pestaña Seguimiento de la ficha: si el lead ya está en el "LOTE PROGRAMADO" o cuándo va a aparecer, sin tener que revisar lote por lote.'
    ]
  },
  {
    version: '5.3.1',
    fecha: '2026-08-14',
    cambios: [
      'Arreglado bug importante: si escribías un monto con punto de miles (ej: "40.400", como se escribe en Argentina), se guardaba mal como 40,4 — los campos de número siempre interpretan el punto como decimal, sin importar el idioma. Corregido en Monto/Cuotas al marcar venta, editar venta, y en los filtros de Reportes.'
    ]
  },
  {
    version: '5.3.0',
    fecha: '2026-08-13',
    cambios: [
      'Estudiantes: sacada la fila verde "✓ TODO CARGADO" debajo de cada registro (aumentaba mucho la altura de la tabla). En su lugar, columna "Estado" antes de Acciones: 🟢 Completo, 🟡 X/4 tareas, o 🔴 Pendiente.'
    ]
  },
  {
    version: '5.2.3',
    fecha: '2026-08-13',
    cambios: [
      'Tabla "Permisos por rol" en Accesos completada con TODOS los roles que existen hoy (incluido el rol "Academico" solo), y aclarado que Diplomas/Historial/Accesos son exclusivos de Admin sin excepción.'
    ]
  },
  {
    version: '5.2.2',
    fecha: '2026-08-13',
    cambios: [
      'Arreglado: si la columna Roles en Usuarios se escribe con "+" (ej: "Coordinador + Academico") en vez de coma, ahora el sistema lo entiende igual. La app siempre guarda con coma, pero tolera que se edite a mano con "+".'
    ]
  },
  {
    version: '5.2.1',
    fecha: '2026-08-13',
    cambios: [
      'Arreglado: el botón de "Omitir bienvenida" (exclusivo de la Coordinadora académica) no le aparecía a Diego (Admin). Revisado también el resto de la app para confirmar que Admin siempre tiene acceso a todo lo nuevo que se agregue.'
    ]
  },
  {
    version: '5.2.0',
    fecha: '2026-08-13',
    cambios: [
      'Nombres de rol más claros en pantalla (sin cambiar los permisos reales): "Coordinadora de inscripciones" (Coordinador), "Coordinadora de MKT" (Coordinador + Académico), "Coordinadora académica" (antes CoordinadorEstudiantes).',
      'Nuevo rol "Academico" para dar acceso puntual al módulo Académico sin sumar el resto de permisos de Estudiantes — usado para dar ese acceso a Jennifer.',
      'Nuevo botón exclusivo para la Coordinadora académica (Sofía): omitir el envío de la Bienvenida y su confirmación de recepción, para casos puntuales.'
    ]
  },
  {
    version: '5.1.0',
    fecha: '2026-08-13',
    cambios: [
      'Agregados botones rápidos "Hoy", "Ayer", "Semana pasada" y "Mes pasado" en "Actividad por persona" (Reportes) — el filtro por día ahora soporta rangos, no solo un día puntual.'
    ]
  },
  {
    version: '5.0.3',
    fecha: '2026-08-13',
    cambios: [
      'Actualizada la tabla de "Permisos por rol" en Accesos para incluir el módulo Académico (Admin, Estudiantes, CoordinadorEstudiantes).'
    ]
  },
  {
    version: '5.0.2',
    fecha: '2026-08-13',
    cambios: [
      'Académico: agregado exportar a Excel y a CSV (el CSV se importa perfecto en Google Sheets con Archivo > Importar).'
    ]
  },
  {
    version: '5.0.1',
    fecha: '2026-08-13',
    cambios: [
      'Activado "Valores de los cursos" en Herramientas — ya no dice "Próximamente", abre coachingeducativolider.com/productos-y-valores.'
    ]
  },
  {
    version: '5.0.0',
    fecha: '2026-08-13',
    cambios: [
      'Nuevo módulo "🎓 Académico" (prototipo): listado de estudiantes con situación académica (Certificado/No se certificó/Baja/Cambio de cursada), carga masiva pegando desde Sheets/Excel, y reporte por edición (inscritos, certificados, bajas, CC, % de cada uno, formador, fecha de inicio y si el curso está cerrado a los 30 días). Acceso para Diego, Lourdes, Victoria y Sofía.'
    ]
  },
  {
    version: '4.19.0',
    fecha: '2026-08-13',
    cambios: [
      'Agregado filtro por día en "Actividad por persona" (Reportes) — se puede ver un día puntual en vez de todo el mes, sin afectar el resto de la pantalla.'
    ]
  },
  {
    version: '4.18.1',
    fecha: '2026-08-13',
    cambios: [
      'Historial de acciones: el contenedor ahora usa ~88% del ancho de la pantalla (antes tenía un max-width fijo angosto). Fecha/Usuario/Acción quedan compactas y Detalle se estira para ocupar el espacio sobrante.',
      'Agregado color (turquesa) e ícono (💬) a "Incorporación al grupo de WhatsApp" en el Historial de acciones.'
    ]
  },
  {
    version: '4.18.0',
    fecha: '2026-08-13',
    cambios: [
      'Agregado botón para eliminar una baja registrada, y selección múltiple para eliminar varias de una. No toca el lead ni su historial, solo saca la baja de la lista y del Lote Bajas.'
    ]
  },
  {
    version: '4.17.2',
    fecha: '2026-08-13',
    cambios: [
      'El aviso de "contacto similar" al cargar un lead ahora también muestra el WhatsApp del lead ya cargado, para poder comparar rápido si es la misma persona.'
    ]
  },
  {
    version: '4.17.1',
    fecha: '2026-08-13',
    cambios: [
      'Actividad por persona: los contactos ya NO caen de respaldo en "a quién está asignado" cuando falta el dato nuevo — los contactos viejos (de antes de agregar la columna ContactadoPorNombre) simplemente no se cuentan para nadie, en vez de atribuirse mal.'
    ]
  },
  {
    version: '4.17.0',
    fecha: '2026-08-13',
    cambios: [
      'Corregido bug de atribución en "Actividad por persona": los contactos se contaban por "a quién está asignado el lead", no por quién realmente lo contactó. Ahora se guarda quién marcó cada contacto de verdad — requiere agregar la columna ContactadoPorNombre en Seguimiento (columna L).'
    ]
  },
  {
    version: '4.16.0',
    fecha: '2026-08-13',
    cambios: [
      'Nueva tabla "👤 Actividad por persona" en Reportes: leads cargados, contactos hechos por cada lote (1 a 5), y ventas cerradas — todo del mes seleccionado, por cada persona del equipo.'
    ]
  },
  {
    version: '4.15.0',
    fecha: '2026-08-13',
    cambios: [
      'Arreglo de fondo para "todo lento"/login trabado en "Ingresando…": si la conexión con Google Sheets se colgaba una sola vez, con el cacheo de autenticación TODOS los pedidos siguientes quedaban esperando esa misma conexión colgada. Ahora cada llamada a Sheets tiene un límite de 20 segundos (10s para autenticar) — si se pasa, se corta con un error claro y el siguiente intento arranca en limpio, en vez de quedar pegado para siempre.'
    ]
  },
  {
    version: '4.14.1',
    fecha: '2026-08-13',
    cambios: [
      'Corregido un bug en el fix anterior de Auditoria: calculaba qué filas leer usando el "tamaño de grilla" de la hoja, que puede incluir de más muchas filas vacías de relleno, apuntando a un rango sin datos reales. Ahora se calcula de forma confiable leyendo la columna A.'
    ]
  },
  {
    version: '4.14.0',
    fecha: '2026-08-13',
    cambios: [
      'Arreglo de fondo para la lentitud en Historial de acciones y "Ver ficha": Auditoria ya no se lee entera cada vez (esa hoja solo crece) — ahora se leen solo los últimos 5.000 registros, así la velocidad no sigue empeorando con el tiempo.',
      'Agregado manejo de errores real en Historial de acciones (antes se quedaba pegado en "Cargando…" sin avisar).'
    ]
  },
  {
    version: '4.13.2',
    fecha: '2026-08-13',
    cambios: [
      'Arreglado bug importante en Buscador y Ficha: si algo fallaba (timeout, error de red), la pantalla se quedaba pegada en "Cargando…" para siempre, sin ningún aviso. Ahora muestra un mensaje claro con botón de Reintentar.'
    ]
  },
  {
    version: '4.13.1',
    fecha: '2026-08-13',
    cambios: [
      'Optimizado el Buscador: antes se recorría todo Seguimiento e Inscritos por cada lead (se multiplicaban entre sí), ahora se resuelve todo en un solo recorrido — debería sentirse notablemente más rápido, sobre todo con muchos leads cargados.'
    ]
  },
  {
    version: '4.13.0',
    fecha: '2026-08-13',
    cambios: [
      'Mejora de performance importante: antes la app se re-autenticaba con Google Sheets en cada lectura/escritura de datos. Ahora reutiliza la misma autenticación — pantallas que necesitan varias hojas a la vez (Reportes, Estudiantes, Buscador) deberían sentirse notablemente más rápidas.'
    ]
  },
  {
    version: '4.12.2',
    fecha: '2026-08-13',
    cambios: [
      'El Buscador también se movió: ahora es un ícono chico (🔍) al lado de Herramientas y el selector de tema, en vez de estar suelto al final de la fila de botones.'
    ]
  },
  {
    version: '4.12.1',
    fecha: '2026-08-13',
    cambios: [
      'Sacado "Herramientas" de la fila de botones principales — ahora es un ícono chico (⚡) al lado del selector de tema, para que no compita visualmente con las secciones principales.'
    ]
  },
  {
    version: '4.12.0',
    fecha: '2026-08-13',
    cambios: [
      'Arreglado el modal de Marcar venta: no tenía scroll interno, así que en pantallas más chicas/verticales quedaba cortado el botón de Confirmar. Se agregó el mismo resguardo a otros modales largos de la app.',
      'Nuevo "Agregar cuotas por rango" en cuotas variables: elegís cuota desde/hasta + valor y completa varias de una, en vez de tipear una por una.',
      'Agregado resultado "Ya fue estudiante del curso consultado" — saca al lead de los lotes activos, para leads que se cargan de un sistema anterior.',
      'Admin ahora puede eliminar un lead directo desde su ficha (Buscador), con confirmación — protegido si ya tiene una venta.',
      'Arreglado bug en Estudiantes: si fallaba la carga, la pantalla quedaba en blanco para siempre sin aviso. Ahora muestra un mensaje claro con botón de Reintentar.'
    ]
  },
  {
    version: '4.11.0',
    fecha: '2026-08-13',
    cambios: [
      'Agregado gráfico "Leads por origen" en Reportes, al lado de "Ventas por origen" — antes solo se veía el origen de las VENTAS, no de todos los leads que entran por cada canal.'
    ]
  },
  {
    version: '4.10.4',
    fecha: '2026-08-13',
    cambios: [
      'Unificados orígenes duplicados en el desplegable: "Email Marketing"/"Email mkt" y "Campaña de Marketing"/"Campaña de mkt" quedaron cada uno como una sola opción.'
    ]
  },
  {
    version: '4.10.3',
    fecha: '2026-08-13',
    cambios: [
      'Los registros creados automáticamente al cargar una baja de alguien que no existía en el sistema ya no aparecen en la tabla de Estudiantes ni en Resumen Estudiantes — no son estudiantes reales.'
    ]
  },
  {
    version: '4.10.2',
    fecha: '2026-08-13',
    cambios: [
      'Los registros creados automáticamente al cargar una baja de alguien que no existía en el sistema ("Carga manual (baja)") ya no aparecen en Reportes — ni en Detalle de compras, ni en los totales/rankings/leads por curso. No son ventas ni leads reales.'
    ]
  },
  {
    version: '4.10.1',
    fecha: '2026-08-12',
    cambios: [
      'Agregado tooltip al pasar el mouse sobre Bienvenida, Confirmó recepción, Alta plataforma y Grupo WhatsApp en Estudiantes, explicando qué hace cada uno.'
    ]
  },
  {
    version: '4.10.0',
    fecha: '2026-08-12',
    cambios: [
      'Estudiantes: cuando una inscripción tiene los 4 pasos completos (Bienvenida, Confirmó recepción, Alta plataforma, Grupo WhatsApp), aparece un discreto "✓ TODO CARGADO" debajo de esa fila.',
      'Agregado resumen arriba de la tabla: Inscripciones totales, Completas y Pendientes, calculado automáticamente.'
    ]
  },
  {
    version: '4.9.2',
    fecha: '2026-08-12',
    cambios: [
      'Actualizada la tabla "Permisos por rol" en Accesos: Coordinador ahora sí ve Estudiantes y Bajas, agregado Buscador y Herramientas (disponible para todos) — antes estaba desactualizada.'
    ]
  },
  {
    version: '4.9.1',
    fecha: '2026-08-12',
    cambios: [
      'Arreglado bug en Bajas: una fecha escrita con guiones (12-08-2026 en vez de 12/08/2026) se detectaba mal como WhatsApp. Ahora reconoce fecha con "/" o con "-".'
    ]
  },
  {
    version: '4.9.0',
    fecha: '2026-08-12',
    cambios: [
      'Movida "Gestión de bajas" a su propia pestaña "🔴 Bajas" en el menú — ya no está dentro de Accesos.',
      'Ahora tienen acceso a Bajas también Jennifer y Macarena (antes era solo Admin) — cualquiera con rol Coordinador.'
    ]
  },
  {
    version: '4.8.1',
    fecha: '2026-08-12',
    cambios: [
      'La carga masiva de bajas ya no borra el texto ni falla en silencio si algo sale mal — muestra el error real y deja el texto para reintentar.'
    ]
  },
  {
    version: '4.8.0',
    fecha: '2026-08-12',
    cambios: [
      'La carga masiva de bajas ahora tiene vista previa en vivo (igual que Nuevo Lead), mostrando qué se detectó de cada persona antes de cargar.',
      'Si escribís sin etiquetas (sin "Nombre:", "Fecha:", etc.), ahora también detecta por heurística: primera línea = nombre, fecha dd/mm/aaaa, email, WhatsApp — antes solo funcionaba con etiquetas explícitas.'
    ]
  },
  {
    version: '4.7.1',
    fecha: '2026-08-12',
    cambios: [
      'Nuevo Lead ahora también reconoce etiquetas explícitas (Nombre:, Email:, WhatsApp:, País:, Instagram:) en el texto pegado, con o sin saltos de línea entre ellas — antes solo detectaba por heurística sin etiquetas.'
    ]
  },
  {
    version: '4.7.0',
    fecha: '2026-08-12',
    cambios: [
      'La carga de bajas ahora crea el registro automáticamente si la persona no existe todavía en el sistema (es alumna real pero nunca quedó cargada) — con lo que se le pase, y le registra la baja igual.'
    ]
  },
  {
    version: '4.6.1',
    fecha: '2026-08-12',
    cambios: [
      'Arreglado el parser de carga masiva de bajas: ahora reconoce a cada persona aunque se pegue todo junto sin líneas en blanco entre ellas (antes se mezclaban los datos de dos personas en una sola).'
    ]
  },
  {
    version: '4.6.0',
    fecha: '2026-08-12',
    cambios: [
      'Nueva pestaña "🔔 Alertas" en Estudiantes: avisa cuando alguien no confirmó recepción del mail (48hs hábiles o más), y cuando un estudiante nuevo todavía no recibió la Bienvenida (48hs hábiles o más desde que ingresó). Las horas hábiles no cuentan sábados ni domingos.'
    ]
  },
  {
    version: '4.5.1',
    fecha: '2026-08-12',
    cambios: [
      'La carga masiva de bajas ahora acepta Nombre, Curso, Email y WhatsApp (todos opcionales) por bloque de texto, no solo email — busca a la persona con el mejor dato disponible.'
    ]
  },
  {
    version: '4.5.0',
    fecha: '2026-08-12',
    cambios: [
      'Nueva sección "🔴 Gestión de bajas" en Accesos: cargar varias bajas de una (por email), y ver la lista completa de todas las bajas registradas, incluidas las que todavía están esperando sus 90 días.'
    ]
  },
  {
    version: '4.4.0',
    fecha: '2026-08-12',
    cambios: [
      'Nuevo "🔴 LOTE BAJAS" en Seguimiento: cuando un estudiante se da de baja de la cursada (desde su ficha, pestaña Alumno), reaparece a los 90 días para ofrecerle volver a información y ver si se reincorpora.'
    ]
  },
  {
    version: '4.3.2',
    fecha: '2026-08-11',
    cambios: [
      'Corregido bug: "Edición 16" y "edición 16" (mayúscula/minúscula distinta) se contaban como cosas separadas en "Estudiantes por edición" y en el filtro de edición de Estudiantes. Ahora se unifican automáticamente.'
    ]
  },
  {
    version: '4.3.1',
    fecha: '2026-08-11',
    cambios: [
      'Revertido el filtro de País en Reportes: vuelve a mostrar solo los países que tuvieron ventas ese mes (como estaba antes).'
    ]
  },
  {
    version: '4.3.0',
    fecha: '2026-08-11',
    cambios: [
      'Resumen Estudiantes ahora muestra: Estudiantes por curso (con color), Estudiantes por edición, y las métricas de Confirmaron recepción / En grupo WhatsApp.'
    ]
  },
  {
    version: '4.2.7',
    fecha: '2026-08-11',
    cambios: [
      'Reordenadas las columnas de Estudiantes: Fecha de inscripción → Estudiante desde → Estudiante → Curso → Edición → ...'
    ]
  },
  {
    version: '4.2.6',
    fecha: '2026-08-11',
    cambios: [
      'Sacada la columna Docente(s) de la tabla de Estudiantes (el filtro por docente sigue disponible arriba de la tabla).'
    ]
  },
  {
    version: '4.2.5',
    fecha: '2026-08-11',
    cambios: [
      'Reordenadas las columnas de estado en Estudiantes: Bienvenida → Confirmó recepción → Alta plataforma → Grupo WhatsApp.'
    ]
  },
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
