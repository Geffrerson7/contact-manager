# Contact Manager — M3.5: Decisiones de autenticación y multiusuario

> Estado (2026-11-06): **14 decisiones aprobadas**, **D-AUTH-12 aprobada con condiciones** y **D-AUTH-13 pendiente**. La implementación (M4) todavía no está autorizada.
> Rama de trabajo: `docs/m3.5-auth-design`, creada desde `main` en `2b90e06` (M3 integrado).
> Detalle técnico en los demás documentos de `docs/auth/`.

---

## 1. Tabla de decisiones

| ID | Decisión | Resolución | Justificación | Estado |
|---|---|---|---|---|
| D-AUTH-01 | Estrategia de sesiones | Sesiones propias en PostgreSQL con cookie opaca; sin JWT ni Auth.js | Solo hace falta email y contraseña. Revocación inmediata. PostgreSQL como autoridad (igual que M3). Auth.js con *Credentials* obliga a JWT | **Aprobada** |
| D-AUTH-02 | Implementación de Argon2id | `@node-rs/argon2`: m=19 MiB, t=2, p=1, API asíncrona, **máximo 2 hashes simultáneos por instancia** | `crypto.argon2` es *release candidate* en Node 24.15.0 (la versión del proyecto) y Vercel no permite fijar la versión menor | **Aprobada**, con requisito de rendimiento: < 250 ms por hash en Vercel Preview |
| D-AUTH-03 | Recuperación de contraseña y verificación de email | Fuera del MVP | Requieren envío de correo | **Aprobada** |
| D-AUTH-04 | Duración de la sesión | 30 días deslizante, 90 absoluta; token nuevo en login y cambio de contraseña | Equilibrio entre comodidad y riesgo; la rotación en cada renovación añade carreras sin beneficio claro | **Aprobada** |
| D-AUTH-05 | Propagación de la identidad | `Actor` explícito como primer parámetro de cada caso de uso | TypeScript impide olvidarlo; fácil de probar | **Aprobada** |
| D-AUTH-06 | Topología | Dos proyectos de Vercel y dos proyectos de Neon: demo `read-only` y app `read-write` | Mantiene las dos capas de M3; la demo no tiene ninguna ruta hacia datos reales | **Aprobada** |
| D-AUTH-07 | Registro | Cerrado; altas mediante script controlado | Sin spam ni enumeración; sin panel de administración | **Aprobada** |
| D-AUTH-08 | Política de contraseñas | 12–128 caracteres, NFKC, sin reglas de composición | NIST SP 800-63B / OWASP; el máximo limita el coste de hashing | **Aprobada** |
| D-AUTH-09 | Fuerza bruta | Limitador obligatorio en el backend (PostgreSQL); firewall de Vercel solo como complemento opcional | No depender de la configuración de la plataforma | **Aprobada** (el firewall de Vercel queda como opción, no obligatoria) |
| D-AUTH-10 | Row Level Security | Después del MVP | Coste alto en Prisma y en las pruebas; el MVP tiene otras cuatro barreras | **Aprobada** (RLS fuera del MVP) |
| D-AUTH-11 | Mutex estructural | Se mantiene global | Corrección ya probada en M3 | **Aprobada** |
| D-AUTH-12 | Permisos del rol demo | `SELECT` solo sobre `contacts`; revocar las concesiones genéricas y las predeterminadas | `0005` crea tablas de autenticación también en la base demo | **Aprobada con condiciones** (§7.6 de `data-model.md`) |
| D-AUTH-13 | Datos existentes | Asignarlos a `DEMO_OWNER_ID` en `0005`, con respaldo y ensayo previos | Sin pérdida; la demo sigue funcionando | **Pendiente**: requiere inventario real, confirmación de datos demo, respaldo recuperable y ensayo |
| D-AUTH-14 | Ciclo de vida de las cuentas | Desactivar; FK `RESTRICT`; borrado definitivo por script | Evita borrados en cascada accidentales | **Aprobada** |
| D-AUTH-15 | Recursos ajenos | `404 NOT_FOUND` / `UNDO_NOT_FOUND`; sin `FORBIDDEN` | No revela que el recurso existe | **Aprobada** |
| D-AUTH-16 | CSRF | `SameSite=Lax` + `Origin` + `Content-Type: application/json` | Suficiente para una API JSON del mismo origen; sin estado adicional | **Aprobada** |

---

## 2. Detalle

### D-AUTH-01 — Estrategia de sesiones

| Alternativa | Seguridad | Complejidad | Mantenimiento | Encaje con el stack | Pruebas |
|---|---|---|---|---|---|
| **Sesiones propias en BD** (recomendada) | Alta si se siguen OWASP y primitivas probadas; revocación inmediata | Media: unos 6 módulos pequeños | Código propio, con superficie pequeña y conocida | Total: Prisma 7, PostgreSQL como autoridad | Fácil: PostgreSQL real, igual que M3 |
| Auth.js (`next-auth` v5) | Alta para OAuth | Media-alta | Dependencia mayor | Según su documentación, el proveedor *Credentials* solo funciona con sesiones **JWT** y se desaconseja; no incluye registro, hashing ni limitador. Adaptador Prisma con Prisma 7 sin verificar | Más difícil |
| Better Auth | Alta; email y contraseña, sesiones en BD y limitador incluidos | Media | Dependencia nueva que controla sus tablas | Adaptador Prisma, sin verificar con Prisma 7 | Media |
| JWT propio | Revocación difícil; secretos de firma | Media | Fácil equivocarse | Bueno | Media |

Comprobaciones pedidas, todas cubiertas en [`security.md`](security.md) §2.3:

| Requisito | Cómo se cumple |
|---|---|
| Generación segura del token | 32 bytes de `crypto.randomBytes` (CSPRNG) |
| Solo el hash en la base | `sessions.id` = SHA-256 del token |
| Comparación segura | Contraseña con `verify()` en tiempo constante. La sesión se busca por igualdad del hash en la clave primaria, sin riesgo de tiempo explotable |
| Expiración absoluta y deslizante | 90 días desde `createdAt` / 30 días renovables |
| Rotación | Token nuevo en cada login y al cambiar la contraseña. Sin rotación en la renovación deslizante (motivo en `security.md` §2.3) |
| Revocación inmediata | Cada petición consulta la fila de la sesión; logout la borra |
| Fijación de sesión | Nunca se acepta un identificador que llegue del cliente; siempre se genera uno nuevo |
| Desactivación y cambio de contraseña | Borran todas las sesiones del usuario; además `getActor()` exige `status = 'ACTIVE'` |
| JWT | No se usa en ninguna parte |

La guía de Next 16 recomienda usar librerías de autenticación. Se asume conscientemente la alternativa propia porque el alcance es mínimo. Si se prefiriera una librería, la candidata sería Better Auth, no Auth.js.

### D-AUTH-02 — Argon2id (**aprobada**)

Verificado el 2026-11-06 en las fuentes oficiales (detalle y fuentes en [`security.md`](security.md) §2.1.1):

- `crypto.argon2` se añadió en Node 24.7.0.
- En **24.15.0**, la versión de `.nvmrc` y `engines`, está marcada «Stability: 1.2 - Release candidate».
- Es estable desde **24.19.0**; **24.20.0** corrigió errores de validación y un *bypass* del modo FIPS.
- Vercel solo permite fijar la versión mayor de Node, y la menor del build y de las funciones puede variar.

| Opción | A favor | En contra |
|---|---|---|
| **`@node-rs/argon2`** (aprobada) | Estable con cualquier versión de Node 24; binario precompilado para Vercel; ya está en `serverExternalPackages` de Next 16; `hash()` y `verify()` con formato PHC, menos código propio | Dependencia nueva con binarios nativos |
| `node:crypto` | Sin dependencias | En la versión fijada es *release candidate* y no tiene las correcciones de 24.20.0. Producción (última 24.x de Vercel) y pruebas (24.15.0) usarían implementaciones distintas. Habría que escribir el formato PHC y la comparación |
| `node:crypto` subiendo `.nvmrc`/`engines` a ≥ 24.20.0 | Sin dependencias; estable | Cambio de configuración fuera de M3.5 (requiere aprobación); sigue habiendo código propio para el formato PHC |

Parámetros aprobados: `memory` 19 MiB, `passes` 2, `parallelism` 1, sal de 16 bytes, hash de 32 bytes y API asíncrona siempre.

Límite inicial: **2 hashes simultáneos por instancia**, con cola y `503` si la espera supera 5 s.

**Requisito de aceptación de M4:** menos de 250 ms por hash con `@node-rs/argon2`, medido en Vercel Preview y registrando `process.version`, la duración y la espera en cola (`security.md` §2.1.2). Si no se cumple, se ajusta `passes` antes que `memory` y se documenta.

La instalación de `@node-rs/argon2` forma parte de M4 y queda pendiente de que se autorice M4.

### D-AUTH-03 — Recuperación de contraseña y verificación de email

Fuera del MVP. Mientras tanto, el administrador restablece contraseñas con un script. Cuando se diseñe: token de un solo uso guardado como hash, 30 minutos de validez y respuesta genérica.

### D-AUTH-04 — Duración y rotación de la sesión

30 días deslizante (se renueva al quedar menos de 15), 90 días absoluta. Token nuevo en el login y en el cambio de contraseña. La renovación amplía `expiresAt` sin cambiar el token. Son constantes, fáciles de endurecer más adelante (por ejemplo, 7/30 días).

### D-AUTH-05 — Propagación de la identidad

`Actor` explícito como parámetro. Se descarta `AsyncLocalStorage` (los fallos aparecen en ejecución, no al compilar) y también recibir `userId` en los Route Handlers (invita a tomarlo de la petición).

### D-AUTH-06 — Dos despliegues

Detalle completo en [`architecture.md`](architecture.md) §5.3:

| Pregunta | Respuesta |
|---|---|
| ¿Bases independientes? | Sí: **proyectos de Neon distintos**, con host, roles y credenciales diferentes |
| Variables de la demo | `DATABASE_URL` con el rol `contact_manager_demo_ro` y `CONTACTS_ACCESS_MODE=read-only` |
| Variables de la app | `DATABASE_URL` con el rol `contact_manager_app` (sin propiedad de las tablas) y `CONTACTS_ACCESS_MODE=read-write` explícito |
| Permisos del rol demo | `CONNECT`, `USAGE` sobre `public` y `SELECT` **solo** sobre `contacts`, con `default_transaction_read_only = on` (D-AUTH-12) |
| ¿Cómo se impide que la demo lea las tablas de autenticación? | Otra base sin usuarios reales, un rol sin `SELECT` sobre esas tablas y código que en modo `read-only` no las consulta |
| ¿Cómo se independiza la app de la demo? | Proyectos de Vercel separados, sin variables compartidas, y modo `read-write` explícito. Si faltara la variable, la app fallaría cerrada (sin login) en lugar de abrirse |
| Migraciones | Mismos archivos, aplicados a cada base con su propio rol propietario, desde una máquina de confianza (o CI en M8). Nunca desde el build de Vercel. Siempre la migración antes que el código |

Con esta separación no queda ninguna ruta por la que la demo pueda consultar o modificar datos de usuarios reales: esos datos están en otra base para la que la demo no tiene credenciales.

### D-AUTH-07 — Registro

Cerrado inicialmente; las altas se hacen con un script de servidor (`tsx`) que valida igual que la API y registra la operación. `POST /api/auth/register` existe en el contrato y responde `403 REGISTRATION_CLOSED`. Si se abre en el futuro: límite por IP y elegir entre `409 EMAIL_TAKEN` y una respuesta genérica (que requiere correo).

### D-AUTH-08 — Política de contraseñas

12–128 caracteres, cualquier carácter, normalización NFKC, sin reglas de composición ni caducidad periódica. Comprobar la contraseña contra listas de contraseñas filtradas queda fuera del MVP.

### D-AUTH-09 — Fuerza bruta

| Control | Tipo |
|---|---|
| `login_throttle` en PostgreSQL: 5 fallos en 15 min por email, 30 por IP, comprobado **antes** de verificar la contraseña | **Obligatorio** (M4) |
| Semáforo de hashes por instancia y `503` si se satura | **Obligatorio** (M4) |
| HTTPS, Deployment Protection en los Preview de la app, variables *Sensitive*, proyectos separados | **Obligatorio** (configuración de Vercel) |
| Regla de rate limiting del firewall de Vercel para `POST /api/auth/*` | Opcional |
| *Attack Challenge Mode* / protección de bots | Opcional, ante un ataque en curso |

El firewall nunca es la única protección.

### D-AUTH-10 — Row Level Security

Después del MVP. Antes de eso, la propiedad se garantiza con cuatro barreras:

- predicados obligatorios en el repositorio;
- `NOT NULL` y FK hacia `users`;
- la FK compuesta lote↔propietario;
- la batería de aislamiento I1–I12.

### D-AUTH-11 — Mutex estructural

Se mantiene global. Un mutex por usuario reduciría la contención, pero obligaría a rehacer el análisis de bloqueos; se aplaza hasta medir.

### D-AUTH-12 — Permisos del rol demo (**aprobada con condiciones**, paso manual)

El rol `contact_manager_demo_ro` solo puede leer `contacts`. No puede consultar `users`, `sessions`, `login_throttle`, `undo_batches`, `system_state` ni `_prisma_migrations`, ni crear objetos.

| Nivel | Permiso |
|---|---|
| Base de datos | Solo `CONNECT` (sin `CREATE` ni `TEMPORARY`) |
| Esquema `public` | Solo `USAGE` (sin `CREATE`) |
| Tablas | Solo `SELECT` sobre `contacts` |
| Privilegios por defecto | Ninguno: las tablas futuras no le dan acceso |
| Rol | `default_transaction_read_only = on`; sin atributos elevados ni pertenencias |

`GRANT`, `REVOKE` y consultas de verificación en [`data-model.md`](data-model.md) §7.6.1–§7.6.3. Se ejecuta con el rol propietario de la demo, nunca desde la app. Verificado en local contra PostgreSQL 17: el rol pasó de leer `users` (con las concesiones genéricas anteriores) a leer solo `contacts`; una tabla creada después no le dio acceso; el SQL es idempotente.

**Condiciones:**
1. Aplicarlo después de `0005`.
2. Las consultas de §7.6.3 dan el resultado esperado con las cadenas de Production y de Preview.
3. Actualizar `docs/despliegue-demo.md` §5.1 y §5.2 (fuera de M3.5).

### D-AUTH-13 — Datos existentes (**pendiente**)

Estrategia propuesta, **no aprobada**. La migración `0005` no se ejecuta en Neon ni se da la decisión por aprobada hasta que el responsable:

1. haya verificado el inventario real de la base demo de Neon;
2. haya confirmado que esos datos son de la demo (solo datos semilla, sin datos reales de personas);
3. disponga de un respaldo recuperable (rama de Neon y `pg_dump`, comprobados);
4. haya obtenido un ensayo satisfactorio sobre una copia.

Procedimiento completo en [`data-model.md`](data-model.md) §7.7.

| Pregunta | Respuesta |
|---|---|
| ¿Qué base contiene hoy los contactos? | La de Neon demo (datos semilla, si ya se cargaron) y la local de desarrollo. La app multiusuario todavía no existe. El estado real de Neon debe confirmarlo el responsable (no se accede desde el repositorio) |
| ¿Dónde se ejecuta `0005`? | En la base demo, en la nueva base de la app (desde cero), en desarrollo y en pruebas |
| ¿A quién se asignan los contactos existentes? | A `DEMO_OWNER_ID`: un usuario fijo sin contraseña, que no puede iniciar sesión |
| ¿Cómo sigue funcionando la demo? | El visitante anónimo lee `WHERE "userId" = DEMO_OWNER_ID`; el orden «migración → permisos → código» la mantiene operativa en cada paso |
| ¿Cómo se verifica que no hay huérfanos? | Consultas «Después» de [`data-model.md`](data-model.md) §7.4 (contactos y lotes sin propietario = 0, de otro propietario = 0, cruzados = 0) y comprobación de las restricciones `NOT NULL` y FK |
| ¿Qué respaldo hace falta? | Rama de Neon a partir del estado actual **y** `pg_dump` lógico, más un ensayo en la copia antes de la base real. Recuperación por rama, por volcado o con la vuelta atrás documentada (§7.5 y §7.7) |

### D-AUTH-14 — Ciclo de vida de las cuentas

`ACTIVE` / `DISABLED`. Desactivar es la operación normal; el borrado definitivo es explícito, por script y transaccional. FK `RESTRICT` desde `contacts` y `undo_batches`; `CASCADE` desde `sessions`.

### D-AUTH-15 — Recursos ajenos

`404 NOT_FOUND` / `404 UNDO_NOT_FOUND`, idénticos a «no existe». Las escrituras del visitante demo responden `403 READ_ONLY`. Sin `FORBIDDEN` hasta que haya roles.

### D-AUTH-16 — CSRF

`SameSite=Lax` + verificación de `Origin` + `Content-Type: application/json` en todas las mutaciones. En la demo, el modo `read-only` se comprueba antes y responde `403 READ_ONLY` ([`api-contracts.md`](api-contracts.md) §3.2).

---

## 3. Alternativas descartadas

- **Auth.js con *Credentials***: obliga a JWT y no resuelve registro, hashing ni limitador.
- **JWT propio**: revocación difícil y secretos adicionales.
- **`node:crypto` con Node 24.15.0**: API en *release candidate* y sin las correcciones de 24.20.0.
- **Una sola base o un solo proyecto de Neon para la demo y la app**: un error de credenciales daría a la demo acceso a datos reales.
- **Cuenta demo compartida con login** y **demo efímera por visitante** ([`architecture.md`](architecture.md) §5.1).
- **`userId` nullable permanente** y **borrar los datos sin propietario** ([`data-model.md`](data-model.md) §7.2).
- **Contexto implícito con `AsyncLocalStorage`**.
- **Responder `403` ante recursos ajenos**.
- **Firewall de Vercel como única protección** contra la fuerza bruta.
- **Panel de administración** en el MVP.

---

## 4. Estado de aprobación

| Estado | Decisiones |
|---|---|
| **Aprobadas** | D-AUTH-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 14, 15, 16 |
| **Aprobada con condiciones** | D-AUTH-12: condiciones en la sección anterior |
| **Pendiente** | D-AUTH-13: requiere inventario real de Neon, confirmación de que los datos son de la demo, respaldo recuperable y ensayo satisfactorio |

Requisitos que M4 debe demostrar para dar por cumplidas las decisiones aprobadas:

- **D-AUTH-02:** menos de 250 ms por hash en Vercel Preview, con el límite de 2 hashes simultáneos.
- **D-AUTH-09:** el limitador del backend funciona sin depender del firewall.
- **Aislamiento:** la batería I1–I12 de `security.md` §3, en verde.

La implementación (M4) sigue sin autorizar.

---

## 5. Efecto en documentos existentes (tras la aprobación)

- `docs/fase-3-arquitectura.md`: §1 (advertencia de despliegue), §8 (códigos y endpoints nuevos), §18 (V-8 resuelto).
- `docs/despliegue-demo.md`: §5.1 y §5.2 (concesión explícita solo sobre `contacts`) y §8.2 (pruebas de humo sin login).
- `README.md`: sigue describiendo M0 como estado actual; conviene actualizarlo en un cambio aparte.

En M3.5 no se modifica ninguno de ellos: solo los documentos de `docs/auth/`.
