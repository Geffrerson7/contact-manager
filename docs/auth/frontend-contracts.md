# Contact Manager — M3.5: Contratos de frontend para M5

> Estado: **diseño aprobado** (2026-11-06), salvo D-AUTH-12 (aprobada con condiciones) y D-AUTH-13 (pendiente); ver [`decisions.md`](decisions.md). Pendiente de autorizar la implementación (M4). Respeta la dirección visual (`docs/direccion-visual.md`) y la regla de §3.2 de la arquitectura: sin store global; el estado vive en el servidor, la URL y el estado local.

---

## 1. Principio

La interfaz **refleja** la autorización; nunca la decide. Ocultar un botón es una mejora de experiencia: la protección real está en la API ([`api-contracts.md`](api-contracts.md)). Cualquier acción que la UI permita por error termina en `401`, `403` o `404` del servidor.

---

## 2. Pantallas

| Ruta | Tipo | Contenido | Disponible |
|---|---|---|---|
| `/login` | RSC + formulario cliente | Email, contraseña, enviar; enlace a registro si está abierto | Despliegue `read-write` |
| `/register` | RSC + formulario cliente | Nombre, email, contraseña | Solo si el registro está abierto (D-AUTH-07); si no, `notFound()` |
| `/`, `/search`, `/contact/**` | RSC | Las de M5, con los datos del actor | Según el actor (§4) |
| `/about` | RSC | Pública | Siempre |

En el despliegue demo (`read-only`) no hay `/login` ni `/register`: responden `notFound()`.

Formularios:

- `<label>` asociado, `aria-invalid`, `aria-describedby` y `autocomplete` (`email`, `current-password`, `new-password`, `name`).
- Botón con estado pendiente y deshabilitado mientras se envía; sin doble envío.
- Errores de campo junto a cada campo (`fields`). Error de login **genérico**: «Email o contraseña incorrectos.»
- `429`: mensaje con el tiempo de espera de `Retry-After` («Demasiados intentos. Inténtalo de nuevo en 15 minutos.»).
- No se guarda la contraseña en estado más allá del formulario; se limpia tras un error.

---

## 3. Estado de autenticación

- **Fuente de verdad: el servidor.** Los Server Components llaman a `getActor()` (DAL) y reciben datos ya filtrados por propietario.
- La cabecera (`SiteHeader`, Server Component) muestra el nombre del usuario o «Iniciar sesión». La comprobación de autorización **no** se hace en el layout (la guía de Next 16 advierte que los layouts no se vuelven a renderizar en cada navegación); se hace en cada página o en la DAL.
- Los Client Components que necesiten saber si hay sesión (por ejemplo, para mostrar «Cerrar sesión») la reciben como prop desde el servidor o consultan `GET /api/auth/session`. No hay contexto ni store global de autenticación.
- El token nunca es accesible desde JavaScript (`HttpOnly`): el cliente solo conoce `AuthUser`.

---

## 4. Protección de rutas

| Situación | Comportamiento |
|---|---|
| Despliegue `read-write`, sin sesión, ruta de contactos | Redirección del servidor a `/login?next=<ruta actual>` |
| Usuario con sesión que visita `/login` o `/register` | Redirección a `/` |
| Despliegue `read-only` | Todas las rutas de contactos muestran la demo; no hay redirecciones |

- `next` se valida igual que `?from=` (F2-05): solo rutas internas que empiezan por `/` y no por `//`; nunca URL externas. Inválido → `/`.
- `proxy.ts` puede adelantar la redirección cuando falta la cookie (comprobación optimista), pero la página vuelve a comprobarlo con `getActor()`.

---

## 5. Sesión expirada

| Dónde se detecta | Qué hace la UI |
|---|---|
| Navegación a una página (RSC) | El servidor redirige a `/login?next=…&reason=expired` |
| `fetch` de un Client Component que recibe `401 UNAUTHENTICATED` | `apiRequest` lanza `ApiClientError` con ese código; un manejador común navega a `/login?next=<ruta actual>&reason=expired` |
| `/login?reason=expired` | Aviso no intrusivo con `role="status"`: «Tu sesión ha caducado. Vuelve a iniciar sesión.» |

Las acciones en curso no se reintentan solas después del login: el usuario vuelve a la página y repite la acción. Así se evitan escrituras duplicadas.

---

## 6. Cierre de sesión

- Botón «Cerrar sesión» en la cabecera (Client Component pequeño).
- `POST /api/auth/logout` → `router.replace("/login")` → `router.refresh()` para descartar los datos renderizados del usuario.
- Si la petición falla por red, se navega igualmente a `/login`: la cookie caducará o se borrará en el siguiente intento.

---

## 7. Demo pública (despliegue `read-only`)

- Banner persistente y accesible (`role="note"`): «Demostración de solo lectura: puedes explorar los contactos, pero no modificarlos.»
- Los controles de escritura (crear, editar, favorito, borrar, borrar todo, deshacer) se muestran **deshabilitados** con un texto que explica por qué (`aria-disabled` + descripción). No se ocultan, para que la demo enseñe la funcionalidad.
- Si una acción llega igualmente al servidor, `403 READ_ONLY` se muestra con el mensaje de M3: «Esta demostración es de solo lectura.»
- La UI sabe que es una demo por `GET /api/auth/session` (`demo: true`) o por la prop que le pase el servidor, nunca por una variable `NEXT_PUBLIC_`.

---

## 8. Estados de carga y error

| Estado | Comportamiento |
|---|---|
| Carga de página | `loading.tsx` existente |
| Envío de formularios de autenticación | Botón con indicador y texto («Iniciando sesión…»), `aria-busy` |
| `401 INVALID_CREDENTIALS` | Mensaje genérico bajo el formulario, con `role="alert"` |
| `422 VALIDATION_ERROR` | Errores de campo |
| `429 TOO_MANY_ATTEMPTS` | Mensaje con el tiempo de espera; botón deshabilitado hasta entonces |
| `403 REGISTRATION_CLOSED` | Mensaje: «El registro no está disponible.» |
| `403 INVALID_ORIGIN` / `415` | Error genérico («No se pudo completar la acción»): no deberían ocurrir desde la propia app |
| `503 DB_UNAVAILABLE` | Mensaje de servicio no disponible, con opción de reintentar |
| `500 INTERNAL_ERROR` | `error.tsx` existente |

---

## 9. Fuera del alcance de M5

- Recuperación de contraseña y verificación de email (requieren envío de correo; D-AUTH-03).
- Gestión de sesiones activas o dispositivos.
- Edición del perfil y cambio de contraseña (diseñados en la API cuando se aprueben; no en el MVP).
- Login social, MFA y roles.
