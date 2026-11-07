# Contact Manager — M3.5: Seguridad, amenazas y controles

> Estado: **diseño aprobado** (2026-11-06), salvo D-AUTH-12 (aprobada con condiciones) y D-AUTH-13 (pendiente); ver [`decisions.md`](decisions.md). Pendiente de autorizar la implementación (M4). Define los controles que M4 (API) y M5 (frontend) deben implementar y probar.
> Referencias: OWASP Password Storage, Session Management, Authentication y CSRF Prevention Cheat Sheets; guía de autenticación de Next.js 16 (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).

---

## 1. Principios obligatorios

1. **La propiedad del recurso se verifica en el backend y en la persistencia.** El servicio deriva el propietario del `Actor`; el repositorio lo exige en cada SQL; la base lo refuerza con `NOT NULL`, FK y la FK compuesta lote↔propietario.
2. **Nunca se confía en un `userId` del cliente.** Ningún endpoint lo acepta en ruta, query, cuerpo ni cabecera; los validadores de M2 ya descartan las claves desconocidas.
3. **El modo de despliegue va primero.** `CONTACTS_ACCESS_MODE=read-only` bloquea toda escritura, también las de autenticación (login, registro, renovación de sesión).
4. **Fallar cerrado.** Sin sesión válida no hay actor de usuario; sin `CONTACTS_ACCESS_MODE` en producción, solo lectura.
5. **No revelar existencia.** Un recurso ajeno responde igual que uno inexistente.

---

## 2. Controles de autenticación

### 2.1 Contraseñas

| Control | Valor | Notas |
|---|---|---|
| Algoritmo | **Argon2id** con **`@node-rs/argon2`** | Aprobado (D-AUTH-02). Comparación con `node:crypto` en §2.1.1 |
| Parámetros | `memory = 19456` KiB (19 MiB), `passes = 2`, `parallelism = 1`, longitud de hash 32 bytes, sal de 16 bytes aleatorios | Una de las configuraciones mínimas equivalentes de OWASP para Argon2id. Justificación para serverless en §2.1.2 |
| API | Siempre **asíncrona** (`hash`/`verify` con promesa) | La variante síncrona bloquearía el event loop y, con concurrencia en la misma instancia, todas las peticiones en curso |
| Formato almacenado | Cadena PHC: `$argon2id$v=19$m=19456,t=2,p=1$<sal>$<hash>` | Incluye los parámetros: permite endurecerlos más adelante y rehacer el hash en el siguiente login correcto |
| Longitud | Mínimo **12** caracteres, máximo **128** | Sin reglas de composición. El máximo limita el coste de hashing ante abuso (D-AUTH-08) |
| Normalización | Unicode NFKC antes de hashear | La misma contraseña escrita en otra forma Unicode coincide |
| Verificación | `verify()` de la librería, que compara en tiempo constante | Con `node:crypto` habría que formatear y analizar la cadena PHC y comparar con `crypto.timingSafeEqual` en código propio |
| Email inexistente | Se verifica igualmente contra un **hash ficticio** precalculado con los mismos parámetros | Iguala el tiempo de respuesta y evita enumerar cuentas por tiempo |
| Pepper | No en el MVP | Añade un secreto que gestionar y rotar; el beneficio no compensa en esta fase |

#### 2.1.1 `node:crypto` frente a `@node-rs/argon2` (verificado el 2026-11-06)

| Criterio | `node:crypto` (`crypto.argon2`) | `@node-rs/argon2` |
|---|---|---|
| Estabilidad oficial | Añadida en Node 24.7.0. En **24.15.0** (la versión de `.nvmrc` y `engines`) está marcada **«Stability: 1.2 - Release candidate»**. Pasó a estable en **24.19.0** («mark argon2 … as stable», #63924). En **24.20.0** se corrigieron «Argon2 validation errors» (#64852) y «Argon2 bypassing FIPS mode» (#64776). Fuentes: `doc/api/crypto.md` en `v24.15.0` y `v24.x`, `CHANGELOG_V24.md` | Estable: versión 2.2.2 (2026-10-06), ~3 millones de descargas semanales, licencia MIT, repositorio `napi-rs/node-rs` |
| Versión de Node del proyecto (`24.15.0`) | Disponible, pero en *release candidate* y sin las dos correcciones de 24.20.0 | Compatible (`engines: node >= 10`) |
| Vercel | Vercel solo permite fijar la **versión mayor**; ejecuta la última 24.x, y la versión menor del build y de las funciones puede no coincidir (documentación «Supported Node.js versions»). Producción tendría una versión de la API distinta de la probada localmente con 24.15.0 | Binario precompilado `linux-x64-gnu`, publicado como dependencia opcional; independiente de la versión menor de Node |
| Instalación | Nada que instalar | Una dependencia con binarios por plataforma. No necesita compilación ni scripts de instalación (compatible con el bloqueo de scripts de pnpm) |
| Next.js | Sin configuración | Next 16 ya lo incluye en su lista de `serverExternalPackages` (`node_modules/next/dist/lib/server-external-packages.jsonc`): no se empaqueta y funciona tal cual |
| Código propio | Formato PHC, análisis de la cadena y comparación en tiempo constante | `hash()` devuelve la cadena PHC y `verify()` la comprueba: menos código criptográfico propio |
| Mantenimiento | Lo mantiene Node; sin dependencia | Dependencia externa que vigilar (avisos de seguridad, actualizaciones) |
| Pruebas | Igual en local y en CI si se fija la versión | Igual en local, CI y Vercel |

Decisión aprobada (D-AUTH-02): **`@node-rs/argon2`**. Funciona igual con la versión de Node que declara el proyecto que con la que ejecute Vercel, y reduce el código criptográfico propio.

`node:crypto` sería preferible solo si se suben `.nvmrc` y `engines` a **≥ 24.20.0**, alineando desarrollo, CI y producción. Es un cambio de configuración fuera de M3.5 que requiere aprobación. Ambos producen hashes Argon2id estándar; si en el futuro se migra a `node:crypto`, M4 debe probar que verifica las cadenas PHC existentes.

#### 2.1.2 Parámetros en un entorno serverless

| Parámetro | Valor | Motivo |
|---|---|---|
| `memory` | 19 MiB | En Vercel, por defecto, una instancia tiene 2 GB y 1 vCPU, y con Fluid compute (activo por defecto desde abril de 2025) **varias invocaciones comparten la instancia**. Con el límite de 2 hashes simultáneos, el hashing ocupa como máximo ~38 MiB por instancia. 46 o 64 MiB aumentarían esa presión sin cambiar el modelo de amenaza del MVP |
| `passes` | 2 | Con 19 MiB, OWASP lo considera equivalente a m=46 MiB/t=1 |
| `parallelism` | 1 | Con 1 vCPU, más carriles no acortan el hash; solo compiten con otras peticiones |

Mediciones locales de referencia, hechas con `crypto.argon2` de Node (mismo algoritmo y parámetros; `@node-rs/argon2` todavía no está instalado). Node 24.22.2, 20 núcleos, threadpool de 4, API asíncrona:

| Configuración | 1 hash | 8 a la vez |
|---|---|---|
| m=19 MiB, t=2, p=1 | ~39 ms | ~81 ms en total |
| m=46 MiB, t=1, p=1 | ~52 ms | ~123 ms |
| m=64 MiB, t=3, p=1 | ~178 ms | ~367 ms |

Estas cifras **no** representan Vercel ni la librería aprobada: allí hay 1 vCPU, así que los hashes concurrentes se ejecutan en serie y la latencia crece de forma lineal. Por eso (aprobado en D-AUTH-02):

1. **Límite inicial de 2 hashes simultáneos por instancia** (semáforo). El resto espera en cola. Con 1 vCPU, más concurrencia no acelera nada: solo reparte la CPU entre más peticiones y suma memoria (2 × 19 MiB ≈ 38 MiB). Si las mediciones en Preview lo justifican, el límite puede revisarse.
2. Si el semáforo está lleno más de un tiempo razonable (por ejemplo, 5 s), responder `503` en lugar de acumular peticiones.
3. El limitador de §2.4 actúa **antes** del hash: un atacante no consume CPU con claves ya bloqueadas.
4. **Requisito de aceptación de M4**: menos de **250 ms por hash** con `@node-rs/argon2` en un despliegue **Vercel Preview**. Registrar `process.version`, la duración de cada hash y el tiempo de espera en el semáforo. Si se supera, ajustar `passes` antes que `memory`, y documentar el cambio.

### 2.2 Email

Normalización y validación de M2 (`trim` + minúsculas + formato + ≤ 254), reutilizadas, sin reglas nuevas. Ver [`data-model.md`](data-model.md) §3.

### 2.3 Sesiones

| Control | Valor |
|---|---|
| Tipo | Sesión **opaca en base de datos**. Sin JWT |
| Token | 32 bytes de `crypto.randomBytes`, codificados en base64url (43 caracteres) |
| Almacenamiento | Solo `SHA-256(token)` en `sessions.id`. El token en claro solo existe en la cookie |
| Cookie | `__Host-cm_session` en producción (`cm_session` en desarrollo por HTTP): `HttpOnly`, `Secure` (producción), `SameSite=Lax`, `Path=/`, sin `Domain`, `Max-Age` igual a la caducidad deslizante |
| Caducidad deslizante | 30 días. Si quedan menos de 15, se renueva a 30 (una escritura por renovación, nunca en `read-only`) |
| Caducidad absoluta | 90 días desde `createdAt`: después hay que iniciar sesión de nuevo |
| Autoridad temporal | `clock_timestamp()` de PostgreSQL, como en M3 |
| Búsqueda y comparación | La sesión se busca por igualdad de `SHA-256(token)` sobre la clave primaria. No hace falta comparar en tiempo constante: el atacante no controla el hash, así que el tiempo de la búsqueda no revela nada útil sobre el token. La contraseña sí se compara en tiempo constante (§2.1) |
| Fijación de sesión | Cada login crea un token nuevo; nunca se acepta ni reutiliza un identificador que llegue del cliente |
| Rotación | Token nuevo en cada login y al cambiar la contraseña (se borran las demás sesiones y se emite una nueva para el dispositivo actual). La renovación deslizante **amplía** `expiresAt` sin cambiar el token: rotarlo también obligaría a resolver peticiones concurrentes con el token anterior. Con 256 bits, cookie `HttpOnly` y tope absoluto de 90 días, el beneficio no compensa esa complejidad en el MVP |
| Logout | Borra la fila y la cookie. Idempotente |
| Revocación | Inmediata, porque cada petición consulta la fila. Desactivar la cuenta o cambiar la contraseña borra **todas** las sesiones del usuario en la misma transacción |
| JWT | No se usa. No hay tokens autocontenidos ni secretos de firma |
| Usuario `DISABLED` | `getActor()` exige `users.status = 'ACTIVE'` en la misma consulta: una sesión de un usuario desactivado no vale aunque no se haya borrado |
| Limpieza | Las sesiones caducadas y las filas viejas de `login_throttle` se purgan con la purga de M3 (solo en `read-write`) |

El prefijo `__Host-` obliga al navegador a exigir `Secure`, `Path=/` y ausencia de `Domain`: la cookie no se comparte con subdominios.

### 2.4 Fuerza bruta y abuso

| Clave | Límite | Bloqueo |
|---|---|---|
| Por email (`email:<normalizado>`) | 5 fallos en 15 min | 15 min |
| Por IP (`ip:<dirección>`) | 30 fallos en 15 min | 15 min |
| Registro por IP | 5 altas por hora | 1 h |

- Persistido en `login_throttle` (claves hasheadas, reloj de PostgreSQL). Un contador en memoria no sirve en Vercel.
- Mientras una clave está bloqueada **no se verifica la contraseña** (no se gasta CPU en Argon2) y se responde `429 TOO_MANY_ATTEMPTS` con `Retry-After`.
- Un login correcto reinicia el contador del email; no el de la IP.
- IP: en Vercel, la primera dirección de `x-forwarded-for`, que fija la propia plataforma. Fuera de Vercel no se confía en esa cabecera (se usa solo la clave por email).
- Riesgo aceptado: un atacante puede bloquear 15 min el login de una cuenta concreta. Es temporal y el límite por IP lo acota.

#### 2.4.1 Controles en Vercel

El limitador del backend es **obligatorio** y suficiente por sí solo. El firewall de Vercel es un complemento, nunca la única protección.

| Control | Tipo | Motivo |
|---|---|---|
| Limitador en PostgreSQL (§2.4) | **Obligatorio** (código, M4) | Funciona con cualquier plan, en local y en las pruebas; no depende de la configuración de la plataforma |
| HTTPS | **Obligatorio** (Vercel lo da por defecto) | Requisito de las cookies `Secure` y `__Host-` |
| Proyectos y variables separados para la demo y la app | **Obligatorio** (configuración) | Ver [`architecture.md`](architecture.md) §5.3 |
| Deployment Protection en los Preview del proyecto app | **Obligatorio** (configuración) | Un Preview no debe exponer autenticación ni datos reales |
| `DATABASE_URL` marcada como **Sensitive**; la cadena del propietario nunca en Vercel | **Obligatorio** (configuración) | Mínimo privilegio |
| Regla de rate limiting del firewall para `POST /api/auth/*` | Opcional | Frena el abuso antes de que llegue a la función. Disponibilidad y límites según el plan |
| *Attack Challenge Mode* / protección de bots | Opcional, de uso temporal | Solo ante un ataque en curso |

### 2.5 CSRF

Las mutaciones son Route Handlers que reciben JSON con `fetch`. Tres controles, todos obligatorios en M4 para `POST`, `PUT`, `PATCH` y `DELETE` (incluidos login, registro y logout):

1. `SameSite=Lax`: el navegador no envía la cookie en peticiones entre sitios que no sean navegaciones `GET`.
2. **Comprobación de `Origin`**: debe existir y su host debe coincidir con el host de la petición (el mismo criterio que usan las Server Actions de Next). Si no → `403 INVALID_ORIGIN`.
3. `Content-Type: application/json` obligatorio en los cuerpos: un formulario HTML de otro sitio no puede enviarlo sin un preflight CORS, que la app no autoriza.

`GET` nunca modifica datos (garantizado por el diseño de M3, salvo la purga oportunista, que es mantenimiento idempotente).

### 2.6 XSS

- React escapa todo el contenido; está prohibido `dangerouslySetInnerHTML` con datos de usuario (regla de ESLint en M4/M5).
- La cookie es `HttpOnly`: un XSS no puede leer el token. Sí podría actuar como el usuario mientras la página esté abierta; por eso hace falta además una CSP.
- CSP en M8 (`default-src 'self'`; scripts con nonce). El script bloqueante del tema (§13.3 de la arquitectura) necesita nonce o hash: se decide en M8.

### 2.7 Secretos

- La estrategia elegida **no necesita secretos de firma** (no hay JWT ni cookies cifradas): el único secreto sigue siendo `DATABASE_URL`.
- `passwordHash`, `sessions.id` y los tokens nunca salen del servidor: el DTO de usuario es `{ id, name, email }`.
- Prohibido registrar en logs cuerpos de `/api/auth/*`, cookies, tokens o hashes.
- `ContactsError.details` (por ejemplo, `UNDO_INCONSISTENT` con `expected`/`actual`) es para logs; M4 no lo envía al cliente.

---

## 3. Aislamiento multiusuario: batería obligatoria de M4

Con dos usuarios reales, **A** y **B**, en PostgreSQL de pruebas. Cada caso compara la huella de los datos de A antes y después (como `docs/despliegue-demo.md` §8.1).

| # | Operación de B sobre recursos de A | Resultado esperado |
|---|---|---|
| I1 | `get` / `getDetail` del id de un contacto de A | `NOT_FOUND`, igual que un id inexistente |
| I2 | `list` y búsqueda con términos que coinciden con contactos de A | No aparecen; contadores sin contactos de A |
| I3 | Anterior/Siguiente | Nunca apunta a contactos de A |
| I4 | `replace`, `patch`, `setFavorite` sobre un contacto de A | `NOT_FOUND`; A intacto |
| I5 | `deleteOne` de un contacto de A | `NOT_FOUND`; no se crea lote |
| I6 | `deleteAll` de B | Solo borra los de B; los de A siguen activos |
| I7 | `restore` con el `batchId` de un lote de A | `UNDO_NOT_FOUND`; el lote de A sigue sin restaurar |
| I8 | `create` / `patch` con `userId` de A en el cuerpo | El contacto queda de B (o se ignora el campo); nunca de A |
| I9 | Vincular por SQL un contacto de B a un lote de A | PostgreSQL lo rechaza (FK compuesta, `23503`) |
| I10 | Purga | No borra lotes vigentes de ningún usuario; respeta la retención de M3 |
| I11 | Concurrencia: `deleteAll` de A y escritura de B a la vez | Sin interbloqueos; cada uno afecta solo a lo suyo |
| I12 | Sesión de A tras desactivar a A | `UNAUTHENTICATED` en la siguiente petición |

---

## 4. Modelo de amenazas

| Amenaza | Impacto | Mitigación | Fase |
|---|---|---|---|
| **IDOR**: acceder a contactos de otro usuario cambiando el id en la URL o el cuerpo | Alto: lectura o modificación de datos ajenos | Propietario del `Actor` en cada SQL; `NOT_FOUND` indistinguible; batería I1–I8 | M4 (servicio, repositorio y pruebas) |
| **Escalada de privilegios**: escribir en la demo, o actuar como otro usuario | Alto | Modo global primero; demo = actor sin escritura; sin roles ni administración en la API; `userId` nunca del cliente | M4 |
| **Robo de sesión** (XSS, red, logs) | Alto: suplantación | `HttpOnly`, `Secure`, `__Host-`, HTTPS (Vercel); solo el hash en la base; prohibición de registrar tokens; CSP | M4 (cookie), M8 (CSP) |
| **Reutilización de sesión** tras logout, desactivación o cambio de contraseña | Medio | Sesiones en base revocables; `status = 'ACTIVE'` en cada consulta; caducidad deslizante y absoluta | M4 |
| **Fijación de sesión** | Medio | Sesión nueva en cada login | M4 |
| **Fuerza bruta / credential stuffing** | Alto | `login_throttle` por email e IP; Argon2id; respuesta genérica; opcional, firewall de Vercel | M4 (+ configuración externa) |
| **Enumeración de cuentas** (login, registro, tiempos) | Medio | `INVALID_CREDENTIALS` único; hash ficticio para emails inexistentes; registro según política (D-AUTH-07); límite de altas por IP | M4 |
| **CSRF**, incluido login CSRF | Medio | `SameSite=Lax` + `Origin` + `Content-Type: application/json` | M4 |
| **XSS** | Alto | Escapado de React; sin `dangerouslySetInnerHTML`; CSP | M5, M8 |
| **Exposición de contraseñas o secretos** | Crítico | Argon2id; DTO sin hash; sin secretos de firma; `DATABASE_URL` solo en el servidor; nada de credenciales en el repositorio | M4, M8 |
| **Aislamiento roto en operaciones masivas** (`deleteAll`) | Alto: borrar datos de todos | `deleteAll` filtra por propietario en el `SELECT … FOR UPDATE` y en el `UPDATE`; prueba I6 e I11 | M4 |
| **Restauración del lote de otro usuario** | Alto | Claim y clasificación filtran por `userId`; FK compuesta; prueba I7 e I9 | M4 |
| **Filtración por errores o respuestas** | Medio | `NOT_FOUND` / `UNDO_NOT_FOUND` uniformes; `details` y causas internas solo en logs; `INTERNAL_ERROR` sin trazas | M4 |
| **Configuración insegura en producción** | Alto | `CONTACTS_ACCESS_MODE` fail-closed; autenticación obligatoria en `read-write` (sin interruptor para desactivarla); cookies `Secure` forzadas en producción; rol de solo lectura en la demo; proyectos Vercel y Neon separados para demo y app; Deployment Protection en Preview | M4, M8 y configuración de Vercel/Neon |
| **La demo accede a datos de usuarios reales** | Crítico | Los usuarios reales solo existen en la base de la app, en otro proyecto de Neon; la demo no tiene credenciales hacia ella; el rol demo solo puede leer `contacts` de su propia base | Configuración (D-AUTH-06, D-AUTH-12) |
| **DoS por concurrencia de hashes** en una instancia serverless | Medio | API asíncrona; máximo 2 hashes simultáneos por instancia; `503` si se satura; limitador antes del hash | M4 |
| **Preview con datos reales** | Alto | La base de la app no se configura en Preview, o se protege con Deployment Protection; la demo solo tiene datos semilla | Configuración (D-AUTH-06) |
| **Abuso del registro** (spam, almacenamiento) | Medio | Registro cerrado por defecto (D-AUTH-07); límite por IP; límites de longitud de M2 | M4 |
| **DoS por coste de hashing** | Medio | Longitud máxima de contraseña; no hashear con clave bloqueada; límites por IP | M4 |
| **Error de código que omite el propietario en un SQL nuevo** | Alto | `ownerId` como parámetro obligatorio en el tipo del repositorio; batería de aislamiento; revisión de cada `$queryRaw`; RLS como endurecimiento posterior (D-AUTH-10) | M4 (+ decisión futura) |

---

## 5. Configuración por entorno (resumen)

| Entorno | `CONTACTS_ACCESS_MODE` | Autenticación | Cookie | Base |
|---|---|---|---|---|
| Pruebas | `read-write` (fijado por las pruebas) | Real, contra PostgreSQL de pruebas | `cm_session` | `contact_manager_test` |
| Desarrollo | `read-write` | Real | `cm_session` (HTTP) | `contact_manager` |
| Demo (proyecto Vercel actual) | `read-only` | Desactivada en la práctica (sin escrituras posibles) | No se emite | Proyecto Neon demo, rol `contact_manager_demo_ro` con `SELECT` solo sobre `contacts` |
| App multiusuario (proyecto Vercel nuevo) | `read-write`, **explícito** | Obligatoria | `__Host-cm_session` | Proyecto Neon independiente, rol de ejecución sin propiedad de las tablas |

Detalle de variables, roles y migraciones por despliegue en [`architecture.md`](architecture.md) §5.3.
