# Contact Manager — Despliegue de demostración de solo lectura

> Estado: diseño e implementación de M3. Los pasos sobre Neon y Vercel de las secciones 4–8 son **manuales**: los ejecuta el propietario del proyecto y **no se han ejecutado** desde el código ni desde las pruebas. Ningún comando de este documento debe mostrar ni copiar credenciales en un chat, un issue o un log.

## 1. Problema

El MVP no tiene autenticación (§1 y N-03 de `fase-3-arquitectura.md`). No existe ningún dato fiable en la petición que permita distinguir a un «usuario demo» de otro usuario: cabeceras, cookies o campos como `isDemo` los controla el cliente.

Por eso el usuario demo **se define por despliegue**, no por petición: quien visita el despliegue de demostración es el usuario demo. El modo lo decide la configuración del servidor y el cliente no puede cambiarlo.

## 2. Dos capas de protección

| Capa | Mecanismo | Qué protege |
|---|---|---|
| 1. Aplicación | `CONTACTS_ACCESS_MODE=read-only` (variable de servidor) | El servicio rechaza `create`, `replace`, `patch`, `setFavorite`, `deleteOne`, `deleteAll`, `restore` y `purge` con `READ_ONLY` (403 en M4) **antes** de validar el id o el cuerpo y sin tocar la base. Las lecturas no ejecutan la purga oportunista. |
| 2. Base de datos | Rol de Neon con solo `SELECT` y `default_transaction_read_only = on` | Aunque la capa 1 estuviera mal configurada, PostgreSQL rechaza cualquier escritura (`25006`/`42501`), que el servicio traduce a `READ_ONLY`. |

Reglas de `CONTACTS_ACCESS_MODE` (`src/lib/env.ts`):

- `read-only` o `read-write`: valor explícito, en minúsculas. Se ignoran los espacios en los extremos.
- Sin valor: `read-only` si `NODE_ENV=production` (incluidos los despliegues Preview de Vercel); `read-write` en desarrollo y pruebas. Si falta la variable, el resultado es seguro (fail-closed).
- Cualquier otro valor (`Read-Only`, `readonly`, `true`…): error de configuración. La aplicación falla en lugar de adivinar.
- Nunca con prefijo `NEXT_PUBLIC_`: no debe llegar al navegador.

Ambas capas están cubiertas por `tests/integration/read-only.int.test.ts`, que crea un rol equivalente **solo en el PostgreSQL local de pruebas** y lo elimina al terminar.

Este modo es específico de la demostración. Un futuro usuario autenticado con permisos de escritura necesitará un modelo de autorización por petición (V-8, `ownerId`); el modo de despliegue no lo sustituye.

## 3. Entornos

| Entorno | Base | `DATABASE_URL` | `CONTACTS_ACCESS_MODE` | Operaciones destructivas |
|---|---|---|---|---|
| Pruebas | Docker local `contact_manager_test` | — (`TEST_DATABASE_URL`) | `read-write` (las pruebas lo fijan) | Sí: `globalSetup` recrea el esquema. Las pruebas abortan si la URL no es `contact_manager_test` o si apunta a `*.neon.tech`. |
| Desarrollo | Docker local `contact_manager` | Rol propietario local | `read-write` (por defecto) | Solo `pnpm db:deploy` y los casos de uso. |
| Demostración | Neon | Rol **de solo lectura** | `read-only` | Ninguna desde la aplicación. |

Las migraciones y el seed (M7) sobre Neon se ejecutan solo con el rol propietario desde una máquina de confianza, nunca desde Vercel ni desde las pruebas. El `build` de Vercel (`prisma generate && next build`) no se conecta a la base ni ejecuta migraciones.

## 4. Neon: migraciones (manual, con el rol propietario)

### 4.1 Comprobación previa a `0004_contactable_check`

La migración `0004` añade `CHECK ("email" <> '' OR "phone" <> '')`. Si algún contacto existente tiene a la vez correo y teléfono vacíos, la migración falla y no se aplica. Antes de aplicarla, con cualquier rol que pueda leer `contacts`:

```sql
-- Debe devolver 0. Solo lectura: no modifica nada.
SELECT count(*) AS "incompatibles"
  FROM "contacts"
 WHERE "email" = '' AND "phone" = '';
```

Si devuelve más de 0, no aplicar la migración: corregir antes esos contactos con el rol propietario (decisión manual del propietario; la aplicación nunca lo hace).

### 4.2 Aplicación

- `pnpm db:deploy` con la cadena del **rol propietario** en `DATABASE_URL`, desde una máquina de confianza. Nunca con la cadena de solo lectura (fallaría) ni desde Vercel.
- Después, `prisma migrate status` debe indicar que no hay migraciones pendientes.
- Crear o revisar el rol de solo lectura (sección 5) **después** de las migraciones, para que `GRANT SELECT ON ALL TABLES` cubra todas las tablas.

## 5. Neon: rol de solo lectura (manual)

### 5.1 Creación

Ejecutar en el editor SQL de Neon con el rol propietario de la base. Sustituir `<contraseña>`, `<base>` y `<rol_propietario>`; no guardar la contraseña en el repositorio.

Crear el rol **con SQL**, no desde la consola de Neon: los roles creados desde la consola pueden pertenecer a `neon_superuser`, que concede más que el `SELECT` previsto (ver 5.3).

```sql
CREATE ROLE contact_manager_demo_ro LOGIN PASSWORD '<contraseña>';

-- Toda transacción de este rol es de solo lectura, también las que abra Prisma.
ALTER ROLE contact_manager_demo_ro SET default_transaction_read_only = on;

GRANT CONNECT ON DATABASE <base> TO contact_manager_demo_ro;
GRANT USAGE ON SCHEMA public TO contact_manager_demo_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO contact_manager_demo_ro;

-- Tablas creadas por migraciones futuras del rol propietario: solo SELECT.
-- Debe ejecutarlo el propio <rol_propietario>.
ALTER DEFAULT PRIVILEGES FOR ROLE <rol_propietario> IN SCHEMA public
  GRANT SELECT ON TABLES TO contact_manager_demo_ro;
```

### 5.2 Privilegios efectivos

Conectado **como `contact_manager_demo_ro`**. Solo lectura: no modifica nada.

```sql
SELECT current_user,
       current_setting('default_transaction_read_only')        AS "ro_por_defecto",    -- on
       has_table_privilege('"contacts"', 'INSERT')              AS "ins_contacts",      -- false
       has_table_privilege('"contacts"', 'UPDATE')              AS "upd_contacts",      -- false
       has_table_privilege('"contacts"', 'DELETE')              AS "del_contacts",      -- false
       has_table_privilege('"undo_batches"', 'INSERT')          AS "ins_lotes",         -- false
       has_table_privilege('"undo_batches"', 'UPDATE')          AS "upd_lotes",         -- false
       has_table_privilege('"system_state"', 'INSERT')          AS "ins_estado",        -- false
       has_table_privilege('"contacts"', 'SELECT')              AS "sel_contacts",      -- true
       (SELECT rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls
          FROM pg_roles WHERE rolname = current_user)           AS "privilegios_altos"; -- false

-- El rol no debe ser dueño de ninguna tabla: el dueño no depende de los GRANT.
SELECT tablename, tableowner
  FROM pg_tables
 WHERE schemaname = 'public' AND tableowner = current_user;      -- 0 filas
```

### 5.3 Pertenencia a `neon_superuser` y `pg_write_all_data`

Conectado como `contact_manager_demo_ro`. Solo lectura.

```sql
-- Pertenencias directas e indirectas del rol: debe devolver 0 filas.
WITH RECURSIVE "memberships" AS (
  SELECT m."roleid"
    FROM pg_auth_members m
   WHERE m."member" = (SELECT oid FROM pg_roles WHERE rolname = current_user)
  UNION
  SELECT m."roleid"
    FROM pg_auth_members m
    JOIN "memberships" s ON m."member" = s."roleid"
)
SELECT r.rolname
  FROM "memberships" s
  JOIN pg_roles r ON r.oid = s."roleid";

-- Comprobaciones explícitas (false en ambos casos).
SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neon_superuser')
            THEN pg_has_role(current_user, 'neon_superuser', 'MEMBER')
            ELSE false END                                       AS "neon_superuser",
       pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS "pg_write_all_data";
```

Si aparece `neon_superuser`, `pg_write_all_data` o cualquier otra pertenencia, el rol no sirve para la demo: crear uno nuevo con SQL (5.1) y sustituir la cadena en Vercel.

### 5.4 Rechazo de escrituras

Conectado como `contact_manager_demo_ro`. Cada intento va en su propia transacción con `ROLLBACK`: aunque el rol estuviera mal configurado, **nada persiste**.

```sql
-- Esperado: ERROR 25006 (cannot execute INSERT in a read-only transaction).
BEGIN;
INSERT INTO "system_state" ("key", "value") VALUES ('verificacion', 'x');
ROLLBACK;

-- Segunda capa, saltándose el modo de solo lectura de la transacción.
-- Esperado: ERROR 42501 (permission denied for table system_state).
BEGIN READ WRITE;
INSERT INTO "system_state" ("key", "value") VALUES ('verificacion', 'x');
ROLLBACK;
```

Si el segundo bloque **no** falla, el rol tiene privilegios de escritura y la protección depende solo de `default_transaction_read_only`: revisar 5.2 y 5.3. El `ROLLBACK` evita que el cambio quede guardado.

## 6. Vercel: variables de entorno (manual)

En **Settings → Environment Variables**, para **Production** y **Preview**:

| Variable | Valor | Comprobar |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon con el rol `contact_manager_demo_ro` | Nunca la del propietario. Marcada como **Sensitive**. |
| `CONTACTS_ACCESS_MODE` | `read-only` | Exactamente así, en minúsculas. |

No deben existir en Vercel la cadena del rol propietario, `TEST_DATABASE_URL` ni ninguna variante `NEXT_PUBLIC_` de estas variables.

> **Importante:** Vercel aplica las variables de entorno **solo a los despliegues creados después del cambio**. Tras crear o modificar cualquiera de estas variables, hay que crear un despliegue nuevo (Redeploy, o un push nuevo) en cada entorno. Los despliegues existentes siguen usando los valores anteriores.

### 6.1 Verificación sin exponer credenciales

En una máquina de confianza, con la CLI de Vercel vinculada al proyecto:

```sh
# 1. Descargar las variables a un archivo ignorado por Git (.gitignore: `.env.*.local`).
vercel env pull .env.vercel.local --environment=production

# 2. Mostrar solo datos no secretos: rol, host, base y modo. Nunca la contraseña.
node --env-file=.env.vercel.local -e "const u=new URL(process.env.DATABASE_URL);console.log({user:u.username,host:u.hostname,db:u.pathname.slice(1),mode:JSON.stringify(process.env.CONTACTS_ACCESS_MODE)})"
```

Esperado: `user` = `contact_manager_demo_ro` (no el propietario), `host` termina en `.neon.tech`, `mode` = `"read-only"` (con comillas y sin espacios).

3. Con esa misma cadena, ejecutar las consultas de 5.2–5.4, cargándola desde el archivo sin pegarla en la terminal ni en un chat. Por ejemplo, en bash, con las consultas guardadas en un archivo local:

   ```sh
   set -a; . ./.env.vercel.local; set +a
   psql "$DATABASE_URL" -f verificacion.sql
   ```
4. Repetir 1–3 con `--environment=preview`.
5. Borrar el archivo: `rm .env.vercel.local`.

## 7. Vercel: Deployment Protection (manual, antes de conectar Neon)

- Revisar **Settings → Deployment Protection**. Los despliegues Preview son públicos por defecto y comparten las variables de Preview.
- Con las dos capas activas, un Preview solo puede **leer** los datos semilla. Aun así, conviene proteger los Preview (Vercel Authentication) si no deben ser públicos.
- La base de demostración no debe contener datos reales ni sensibles: solo los datos semilla.

## 8. Pruebas de humo

### 8.1 Ahora: nivel PostgreSQL (no requiere M4 ni M5)

Hoy ningún Route Handler ni página usa la base, así que la configuración solo puede comprobarse en PostgreSQL. Todo se ejecuta conectado como `contact_manager_demo_ro`, con la cadena obtenida en 6.1.

**Paso 1 — Huella antes.** Guardar el resultado:

```sql
SELECT (SELECT count(*) FROM "contacts")     AS "contactos",
       (SELECT count(*) FROM "undo_batches") AS "lotes",
       (SELECT count(*) FROM "system_state") AS "estado",
       md5(coalesce((SELECT string_agg(c::text, '|' ORDER BY c."id")  FROM "contacts" c), ''))     AS "md5_contactos",
       md5(coalesce((SELECT string_agg(b::text, '|' ORDER BY b."id")  FROM "undo_batches" b), '')) AS "md5_lotes",
       md5(coalesce((SELECT string_agg(s::text, '|' ORDER BY s."key") FROM "system_state" s), '')) AS "md5_estado";
```

**Paso 2 — Lectura.** Debe devolver los datos semilla:

```sql
SELECT "id", "name", "role", "isFavorite"
  FROM "contacts"
 WHERE "deletedAt" IS NULL
 ORDER BY "createdAt", "id";
```

**Paso 3 — Rechazo de escrituras.** Cada bloque debe fallar con `ERROR 25006` (`cannot execute … in a read-only transaction`). El `ROLLBACK` garantiza que nada persista aunque alguno no fallara:

```sql
-- Creación (POST)
BEGIN;
INSERT INTO "contacts" ("id", "name", "email", "role")
VALUES (gen_random_uuid(), 'Humo', 'humo@example.com', 'Otro');
ROLLBACK;

-- Actualización (PUT / PATCH)
BEGIN;
UPDATE "contacts" SET "name" = "name" || ' (humo)'
 WHERE "id" = (SELECT "id" FROM "contacts" ORDER BY "id" LIMIT 1);
ROLLBACK;

-- Favorito (PATCH /favorite)
BEGIN;
UPDATE "contacts" SET "isFavorite" = NOT "isFavorite"
 WHERE "id" = (SELECT "id" FROM "contacts" ORDER BY "id" LIMIT 1);
ROLLBACK;

-- Eliminación (DELETE: el borrado lógico empieza creando un lote)
BEGIN;
INSERT INTO "undo_batches" ("id", "scope", "contactCount", "expiresAt")
VALUES (gen_random_uuid(), 'ONE', 1, now() + interval '5 seconds');
ROLLBACK;

-- Restauración (POST /restore)
BEGIN;
UPDATE "undo_batches" SET "restoredAt" = now() WHERE "restoredAt" IS NULL;
ROLLBACK;
```

**Paso 4 — Segunda capa.** Forzando transacciones de lectura y escritura, cada bloque debe fallar con `ERROR 42501` (`permission denied`):

```sql
BEGIN READ WRITE;
INSERT INTO "contacts" ("id", "name", "email", "role")
VALUES (gen_random_uuid(), 'Humo', 'humo@example.com', 'Otro');
ROLLBACK;

BEGIN READ WRITE;
UPDATE "contacts" SET "isFavorite" = NOT "isFavorite";
ROLLBACK;

BEGIN READ WRITE;
UPDATE "undo_batches" SET "restoredAt" = now() WHERE "restoredAt" IS NULL;
ROLLBACK;
```

**Paso 5 — Huella después.** Repetir el paso 1. Los seis valores deben ser **idénticos** a los del paso 1. Cualquier diferencia indica una escritura: detener la demo y revisar las secciones 5 y 6.

### 8.2 Cuando M4 y M5 estén desplegados

Requiere los Route Handlers (M4) y las páginas que leen la base (M5) desplegados con la configuración de la sección 6. Ejecutar contra la URL de Production y de al menos un Preview, entre una huella antes y otra después (8.1, pasos 1 y 5):

| Prueba | Petición | Esperado |
|---|---|---|
| Lectura | `GET /api/contacts` y la página `/` | `200` con los datos semilla |
| Detalle | `GET /api/contacts/:id` y `/contact/:id` | `200` |
| Creación | `POST /api/contacts` con un contacto válido | `403 READ_ONLY` |
| Actualización | `PUT /api/contacts/:id` y `PATCH /api/contacts/:id` | `403 READ_ONLY` |
| Favorito | `PATCH /api/contacts/:id/favorite` | `403 READ_ONLY` |
| Eliminación | `DELETE /api/contacts/:id` y `DELETE /api/contacts` | `403 READ_ONLY` |
| Restauración | `POST /api/contacts/restore` con cualquier `batchId` | `403 READ_ONLY` |
| Orden de comprobaciones | Escrituras con un id inválido o un cuerpo inválido | `403 READ_ONLY` (no `400` ni `422`): el modo se comprueba primero |
| Manipulación | Las mismas escrituras con `isDemo: false`, `accessMode: "read-write"` o cabeceras inventadas | `403 READ_ONLY` |
| Sin cambios | Huella antes y después | Idéntica |

La traducción de `READ_ONLY` a HTTP 403 la implementa M4.

## 9. Limitaciones

- Sin autenticación, el modo es **por despliegue**: no hay usuarios con distintos permisos en un mismo despliegue.
- La capa 2 depende de que la `DATABASE_URL` de Vercel use el rol de solo lectura. Si se configura la del propietario, solo queda la capa 1.
- Restaurar y purgar también son escrituras: en la demo no hay deshacer ni purga, porque no hay borrados.
- Mientras M4 y M5 no estén desplegados, solo pueden ejecutarse las comprobaciones de 8.1.
