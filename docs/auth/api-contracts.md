# Contact Manager — M3.5: Contratos de API para M4

> Estado: **diseño aprobado** (2026-11-06), salvo D-AUTH-12 (aprobada con condiciones) y D-AUTH-13 (pendiente); ver [`decisions.md`](decisions.md). Pendiente de autorizar la implementación (M4). Amplía los contratos de `docs/fase-3-arquitectura.md` §8; no los sustituye.
> Convenciones de M3: respuestas `ApiSuccess<T> = { data: T }` y `ApiFailure = { error: { code, message, fields? } }`; `fields` solo con errores asociados a campos (§9.2).

---

## 1. Endpoints de autenticación

Todos los endpoints con cuerpo exigen `Content-Type: application/json` y un `Origin` del mismo host ([`security.md`](security.md) §2.5).

### 1.1 `POST /api/auth/register`

Solo existe si la política de registro lo permite (D-AUTH-07). Con el registro cerrado responde siempre `403 REGISTRATION_CLOSED`.

```ts
interface RegisterInput {
  name: string;      // trim, 1–80 (mismas reglas que Contact.name)
  email: string;     // normalización y formato de M2
  password: string;  // 12–128 caracteres (D-AUTH-08)
}
```

| Resultado | Respuesta |
|---|---|
| Alta correcta | `201` + `Set-Cookie` (inicia sesión) + `ApiSuccess<{ user: AuthUser }>` |
| Datos inválidos | `422 VALIDATION_ERROR` con `fields` (`name`, `email`, `password`) |
| Email ya registrado | `409 EMAIL_TAKEN` **o** respuesta genérica, según D-AUTH-07 |
| Registro cerrado | `403 REGISTRATION_CLOSED` |
| Límite superado | `429 TOO_MANY_ATTEMPTS` + `Retry-After` |
| Despliegue de solo lectura | `403 READ_ONLY` |

### 1.2 `POST /api/auth/login`

```ts
interface LoginInput {
  email: string;
  password: string;
}
```

| Resultado | Respuesta |
|---|---|
| Correcto | `200` + `Set-Cookie` + `ApiSuccess<{ user: AuthUser }>` |
| Email inexistente, contraseña errónea, cuenta `DISABLED` o sin `passwordHash` | `401 INVALID_CREDENTIALS` (mismo mensaje y tiempo similar en todos los casos) |
| Cuerpo sin la forma esperada | `422 VALIDATION_ERROR`. Solo comprueba que haya `email` y `password` de tipo texto; **no** aplica la política de longitud (no revela reglas) |
| Bloqueo por intentos | `429 TOO_MANY_ATTEMPTS` + `Retry-After` (segundos) |
| Despliegue de solo lectura | `403 READ_ONLY` |

### 1.3 `POST /api/auth/logout`

| Resultado | Respuesta |
|---|---|
| Siempre (haya o no sesión) | `204` + `Set-Cookie` que expira la cookie. Si había una sesión válida, se borra su fila |

### 1.4 `GET /api/auth/session`

Nunca devuelve `401`: informa del estado para que la UI decida.

```ts
interface AuthUser {
  id: string;
  name: string;
  email: string;
}

type SessionInfo =
  | { status: "authenticated"; user: AuthUser; accessMode: "read-write" }
  | { status: "anonymous"; demo: boolean; accessMode: "read-only" | "read-write" };
```

- `demo: true` cuando el despliegue ofrece la demo pública (despliegue `read-only`).
- Puede renovar la sesión (deslizante) como cualquier otra petición autenticada.

---

## 2. Códigos de error nuevos

Se **añaden** a `ApiErrorCode` (§8.3). Los existentes no cambian de significado.

| Código | HTTP | Causa |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Endpoint de contactos sin sesión válida en un despliegue `read-write` (sin sesión, caducada, revocada o usuario `DISABLED`) |
| `INVALID_CREDENTIALS` | 401 | Login fallido, sin distinguir la causa |
| `TOO_MANY_ATTEMPTS` | 429 | Límite de intentos de login o de registro; incluye `Retry-After` |
| `REGISTRATION_CLOSED` | 403 | Registro público desactivado |
| `EMAIL_TAKEN` | 409 | Email ya registrado (solo si D-AUTH-07 acepta este riesgo de enumeración) |
| `INVALID_ORIGIN` | 403 | Mutación sin `Origin` o con un `Origin` de otro host |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Mutación con cuerpo cuyo `Content-Type` no es `application/json` |

No se añade `FORBIDDEN`:

- un recurso de otro usuario responde `404 NOT_FOUND` o `404 UNDO_NOT_FOUND`, igual que uno inexistente;
- una escritura del visitante demo responde `403 READ_ONLY`, igual que el modo global.

Si una fase futura introduce roles, se añadirá entonces.

`FieldErrors` para autenticación es un tipo propio, no una ampliación del de contactos:

```ts
type AuthFieldErrors = Partial<Record<"name" | "email" | "password", string>>;
```

---

## 3. Mecanismo de protección

### 3.1 Obtención de la identidad

```ts
// lib/auth/session.ts (DAL). Única forma de obtener un Actor.
export async function getActor(): Promise<Actor | null>;
//  - read-only  → { kind: "demo" } (no lee cookies ni sesiones; no escribe)
//  - read-write → sesión válida de usuario ACTIVE → { kind: "user", userId }
//                 en otro caso → null
```

- `getActor()` usa `cookies()` de `next/headers`; funciona igual en Route Handlers y Server Components.
- La renovación deslizante ocurre dentro de `getActor()` (como mucho una escritura por petición; nunca en `read-only`).

### 3.2 Envoltorio de los Route Handlers

Todos los handlers de `/api/contacts/**` y `/api/auth/**` pasan por un envoltorio común (`lib/http/handler.ts`, M4) que, en este orden:

1. **Modo de despliegue.** Para métodos distintos de `GET`/`HEAD`, excepto `POST /api/auth/logout`: si `CONTACTS_ACCESS_MODE=read-only` → `403 READ_ONLY`, sin leer ni validar nada más. Es la regla de M3: en la demo, cualquier escritura responde `READ_ONLY` aunque el id, el cuerpo o las cabeceras sean inválidos.
2. **Origen y formato.** Para métodos distintos de `GET`/`HEAD`: verifica `Origin` (`INVALID_ORIGIN`) y, si hay cuerpo, `Content-Type` (`UNSUPPORTED_MEDIA_TYPE`).
3. **Identidad.** En `/api/contacts/**`: `getActor()`; si es `null` → `401 UNAUTHENTICATED`.
4. **Cuerpo.** Lee el cuerpo con `readJson` (`INVALID_JSON`).
5. **Caso de uso.** Lo llama con el `actor`. El servicio vuelve a comprobar el modo y el actor (defensa en profundidad), y después valida id y cuerpo.
6. **Errores.** Traduce `ContactsError` y los errores de autenticación a HTTP (§4). Nunca envía `details` ni causas internas.

`POST /api/auth/logout` queda fuera del paso 1 porque no escribe nada en un despliegue `read-only`: no hay sesiones que borrar. Siempre responde `204`.

`proxy.ts` (si se usa en M5) solo redirige páginas cuando falta la cookie. **No** protege la API ni sustituye a los pasos 1–6.

Consecuencia para las pruebas de humo de `docs/despliegue-demo.md` §8.2: en la demo, las escrituras devuelven `403 READ_ONLY` en el paso 1, con o sin `Origin`. En el despliegue app, una herramienta como `curl` debe enviar `Origin` y `Content-Type: application/json`; si no, recibirá `INVALID_ORIGIN` o `415`.

### 3.3 Cambios de firma en la capa de aplicación (M3 → M4)

| Hoy (M3) | M4 |
|---|---|
| `service.list(filters)` | `service.list(actor, filters)` |
| `service.get(rawId)` | `service.get(actor, rawId)` |
| `service.getDetail(rawId, filters)` | `service.getDetail(actor, rawId, filters)` |
| `service.create(body)` | `service.create(actor, body)` |
| `service.replace(rawId, body)` | `service.replace(actor, rawId, body)` |
| `service.patch(rawId, body)` | `service.patch(actor, rawId, body)` |
| `service.setFavorite(rawId, body)` | `service.setFavorite(actor, rawId, body)` |
| `service.deleteOne(rawId)` | `service.deleteOne(actor, rawId)` |
| `service.deleteAll()` | `service.deleteAll(actor)` |
| `service.restore(body)` | `service.restore(actor, body)` |
| `service.purge()` | Sin actor (mantenimiento del sistema) |
| `repository.<método>(…)` | `repository.<método>(ownerId, …)` (todos excepto `purge`) |

El orden de comprobaciones del servicio está en [`architecture.md`](architecture.md) §3.4. Las pruebas de M3 se adaptan a la firma nueva y se añade la batería de aislamiento I1–I12 ([`security.md`](security.md) §3).

---

## 4. Tabla HTTP completa (M3 + M3.5)

| Código | HTTP |
|---|---|
| `INVALID_JSON` | 400 |
| `INVALID_ID` | 400 |
| `UNAUTHENTICATED` | 401 |
| `INVALID_CREDENTIALS` | 401 |
| `READ_ONLY` | 403 |
| `REGISTRATION_CLOSED` | 403 |
| `INVALID_ORIGIN` | 403 |
| `NOT_FOUND` | 404 |
| `UNDO_NOT_FOUND` | 404 |
| `METHOD_NOT_ALLOWED` | 405 |
| `CONFLICT` | 409 |
| `UNDO_INCONSISTENT` | 409 |
| `EMAIL_TAKEN` | 409 |
| `UNDO_EXPIRED` | 410 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 |
| `VALIDATION_ERROR` | 422 |
| `TOO_MANY_ATTEMPTS` | 429 |
| `INTERNAL_ERROR` | 500 |
| `DB_UNAVAILABLE` | 503 |

---

## 5. Endpoints de contactos bajo aislamiento

Mismas rutas, cuerpos y respuestas que §8.1 de la arquitectura. Cambia de dónde sale la identidad y qué responde cada caso:

| Endpoint | Despliegue `read-only` (demo) | Despliegue `read-write` sin sesión | Con sesión |
|---|---|---|---|
| `GET /api/contacts` | `200` (datos del propietario demo) | `401 UNAUTHENTICATED` | `200` (solo los del usuario) |
| `GET /api/contacts/:id` | `200` / `404` | `401` | `200` si es suyo; `404 NOT_FOUND` si no existe **o es de otro** |
| `POST /api/contacts` | `403 READ_ONLY` | `401` | `201`; `userId` = el de la sesión |
| `PUT` / `PATCH /api/contacts/:id` | `403 READ_ONLY` | `401` | `200` / `404` |
| `PATCH /api/contacts/:id/favorite` | `403 READ_ONLY` | `401` | `200` / `404` |
| `DELETE /api/contacts/:id` | `403 READ_ONLY` | `401` | `200 UndoResult` / `404` |
| `DELETE /api/contacts` | `403 READ_ONLY` | `401` | `200 UndoResult` (solo sus contactos) |
| `POST /api/contacts/restore` | `403 READ_ONLY` | `401` | `200` / `404 UNDO_NOT_FOUND` si el lote no existe **o es de otro** / `410` |
| `GET /api/health` | `200` | `200` | `200` (sin base ni identidad) |

Reglas:

- Ningún endpoint acepta `userId` en la ruta, la query, el cuerpo ni las cabeceras. Si llega en el cuerpo, la validación lo descarta (ya ocurre en M2).
- El orden de los rechazos (modo → actor → id → cuerpo) hace que un visitante sin permisos reciba `READ_ONLY` o `UNAUTHENTICATED` **antes** que `INVALID_ID` o `VALIDATION_ERROR`.
- El DTO `Contact` **no** incluye `userId`: el cliente no lo necesita y así no se expone.
