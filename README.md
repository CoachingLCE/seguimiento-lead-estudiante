# Seguimiento de LEAD-Estudiante — ILCE (v2.2)

## 1. Roles y permisos (definitivo)

| Rol | Personas | Ve |
|---|---|---|
| **Admin** | Diego Lerner | Todo, incluida Auditoría, Diplomas y Accesos |
| **Coordinador** | Jennifer Rebasti, Macarena Juncos | Nuevo lead, Dashboard, Seguimiento, Reasignar, Reportes, Estudiantes, Resumen diario |
| **Inscripciones** | Jesabel Reigada, Alexander Juncos | Nuevo lead, Dashboard, Seguimiento (marcar venta) — **ya NO ve Reportes** |
| **Estudiantes** | Lourdes Barrantes, Victoria Defilippe | Solo pantalla Estudiantes (altas/bienvenidas) |
| **CoordinadorEstudiantes** | Sofía Salgueiro | Estudiantes + Resumen de Estudiantes — nada del circuito comercial |

Jennifer sigue siendo Coordinador + Inscripciones (doble rol).

## 2. Esquema del Google Sheet

### Tab "Usuarios"
```
Email | Nombre | Roles | PasswordHash
```
Ejemplo de `Roles` con varios valores: `Coordinador,Inscripciones` (separados por coma, sin espacios).
Usuarios a cargar (con `PasswordHash` vacío al principio — se completa solo desde "Accesos" → "Restablecer contraseña"):

| Nombre | Email | Roles |
|---|---|---|
| Diego Lerner | diegolernerdl@gmail.com | Admin |
| Macarena Juncos | macarena.juncos@institutoilce.com | Coordinador |
| Jennifer Rebasti | jennifer.rebasti@institutoilce.com | Coordinador,Inscripciones |
| Sofía Salgueiro | sofia.salgueiro@institutoilce.com | CoordinadorEstudiantes |
| Jesabel Reigada | jesabel.reigada@institutoilce.com | Inscripciones |
| Alexander Juncos | alexander.juncos@institutoilce.com | Inscripciones |
| Lourdes Barrantes | lourdes.barrantes@institutoilce.com | Estudiantes |
| Victoria Defilippe | victoria.defilippe@institutoilce.com | Estudiantes |

### Tab "Leads"
```
ID | Nombre | Apellido | WhatsApp | Curso | CursosAdicionales | Origen | FechaIngreso |
CargadoPorEmail | CargadoPorNombre | Estado | FechaVenta | MedioPago | Modalidad | CantCuotas |
ValorCuota | MontoTotal | Edicion | EmailEstudiante | NotasInternas
```
- `Curso` puede quedar vacío ("sin definir") y completarse después.
- `CursosAdicionales`: lista separada por coma de otros cursos de interés.
- `Edicion` y `EmailEstudiante` se cargan al marcar la venta (modal), y viajan al estudiante generado automáticamente.
- `NotasInternas`: observaciones internas del personal (editable desde la ficha del buscador). No se envían por mail ni se muestran al estudiante.

### Tab "Seguimiento"
```
LeadID | Lote | FechaVence | AsignadoAEmail | AsignadoANombre | Contactado | Resultado |
FechaContacto | Observaciones | ProximaAccion
```
- **Lote 0**: no se guarda como fila — es simplemente "todos los leads de los últimos 30 días", calculado al vuelo desde la hoja Leads.
- **Lote 1**: se crea al cargar el lead, vence a las 48hs.
- **Lote 2**: se genera solo (dinámicamente) cuando el Lote 1 se marca contactado con un resultado no definitivo ("No contestó" o "Va a pensarlo"); vence a los 10 días desde ese contacto.
- **Lote 3**: se crea al cargar el lead, vence al mes, sin asignar (`AsignadoAEmail` vacío) hasta que un Coordinador/Admin lo asigne.

### Tab "Inscritos"
```
ID | LeadId | NombreEstudiante | EmailEstudiante | Curso | Edicion | FechaInscripcion |
AltaPlataforma | AltaPorEmail | AltaPorNombre | FechaAlta | BienvenidaEnviada |
BienvenidaPorEmail | BienvenidaPorNombre | FechaBienvenida | AbonoTotalidad
```
**Ya no se carga a mano.** Se genera sola, una vez por día (cron), 24hs después de que un lead se marca "Comprado". `FechaInscripcion` = fecha de la venta.

### Tab "Auditoria" (nueva, no se borra nunca)
```
Fecha | UsuarioEmail | UsuarioNombre | Accion | Detalle | LeadIdRelacionado
```
Se completa sola desde el código — no hace falta tocarla. A diferencia del modo prueba, estos registros **no se borran automáticamente**.

## 3. Service Account, Gmail y variables de entorno

Sin cambios respecto a la versión anterior — Service Account para Sheets, cuenta de Gmail + App Password para los mails. Variables:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
GOOGLE_SHEET_ID=...
GMAIL_SENDER_EMAIL=...
GMAIL_APP_PASSWORD=...
CRON_SECRET=...                    (protege los 2 crons)
PASSWORD_ENCRYPTION_KEY=...
```

## 4. Cron jobs (`vercel.json`)

- `/api/cron/limpiar-pruebas` — diario 6am UTC. Borra leads/inscritos de prueba (nombre "Prueba") con 24hs+.
- `/api/cron/generar-estudiantes` — diario 7am UTC. Genera el registro de estudiante para ventas con 24hs+ de antigüedad.

## 5. Pantallas nuevas en esta versión

- **Historial de acciones** (`/auditoria`, solo Admin): filtra por usuario y rango de fechas, exporta a Excel, imprime.
- **Resumen de Estudiantes** (`/resumen-estudiantes`, CoordinadorEstudiantes + Admin): altas/bienvenidas pendientes y de hoy, actividad por usuario (Lourdes, Victoria, Sofía).
- **Diplomas** (`/diplomas`, solo Admin): marca "abonó la totalidad" por estudiante.
- **Buscador global** (`/buscador`, ícono 🔍 en el header, todos los roles operativos/estudiantes): busca por nombre, apellido, WhatsApp o email; abre una ficha con datos personales, formación/ventas, estado académico, seguimiento comercial e historial de acciones.

  ⚠️ **Limitación real**: la ficha **no puede mostrar** último ingreso al campus, cantidad de ingresos, cursos activos en un LMS, tarjeta usada ni número de referencia de pago — esos datos viven en una plataforma externa (campus/pagos) que hoy no está conectada a esta app. Si esa plataforma tiene una API, se puede integrar más adelante; mientras tanto la ficha lo marca explícitamente como "no disponible".

## 6. Pendiente / a confirmar

- Si Estudiantes (Lourdes/Victoria) además de Coordinador/Coordinador de Estudiantes debería poder ver el Resumen de Estudiantes, o queda reservado solo a Sofía + Admin (hoy: solo Sofía + Admin).
- Integración real con la plataforma/campus para completar la ficha del alumno (pendiente de que confirmes si existe y tiene API).
- Reemplazar el link placeholder de la plataforma en `lib/constants.js` → `PLATAFORMA_URL`.
- Deploy real a Vercel/GitHub — el código está listo, pero subirlo requiere tus credenciales (no lo puedo hacer yo).
- Mockup HTML: todavía no se actualizó a la v2.0 (el cambio fue tan grande que quedó para una entrega aparte).
