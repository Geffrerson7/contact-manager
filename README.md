# 📱 Contact Manager

Aplicación full-stack para gestionar contactos. Fase 3 del proyecto: un único
proyecto Next.js con App Router, TypeScript, Tailwind CSS v4, Prisma 7 y
PostgreSQL.

> Estado actual: **M0 completado** (infraestructura y verificación del entorno).
> La funcionalidad de contactos se implementa a partir de M1.
> Diseño completo: [`docs/fase-3-arquitectura.md`](docs/fase-3-arquitectura.md).

## 🚀 Tecnologías

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Route Handlers) |
| Lenguaje | TypeScript 5.9 (`strict`, `noUncheckedIndexedAccess`) |
| Estilos | Tailwind CSS v4 (tokens CSS, claro/oscuro) |
| Persistencia | PostgreSQL 17 + Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Pruebas | Vitest 5, Testing Library, jsdom, `user-event` |
| Lint | ESLint 9 (flat config) + `eslint-config-next` |

## ✅ Requisitos

- Node.js `>= 24.15.0` (ver `.nvmrc`)
- pnpm `12.11.2` (`packageManager` en `package.json`)
- Docker y Docker Compose

## 🛠️ Instalación

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:deploy
```

`.env` define dos conexiones: `DATABASE_URL` (aplicación) y
`TEST_DATABASE_URL` (pruebas de integración). El contenedor crea ambas bases en
la primera inicialización del volumen.

## ▶️ Desarrollo

```bash
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`.

## 📜 Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | `prisma generate` + build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Todas las suites |
| `pnpm test:unit` | Suite unitaria (jsdom) |
| `pnpm test:integration` | Suite de integración (PostgreSQL real) |
| `pnpm test:coverage` | Cobertura |
| `pnpm db:generate` | Genera Prisma Client en `src/generated/prisma` |
| `pnpm db:migrate` | Crea y aplica migraciones (desarrollo) |
| `pnpm db:deploy` | Aplica migraciones existentes |

## 🗄️ Base de datos

`docker-compose.yaml` levanta PostgreSQL 17 con:

| Base | Uso |
|---|---|
| `contact_manager` | Aplicación |
| `contact_manager_test` | Pruebas de integración |

Las credenciales de desarrollo están en `docker-compose.yaml` y `.env.example`.

## 📁 Estructura (M0)

```text
contact-manager/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/            # App Router (layout, page, globals.css)
│   ├── lib/            # env.ts, prisma.ts
│   └── test/           # setup y pruebas unitarias
├── tests/
│   └── integration/    # pruebas contra PostgreSQL real
├── docker/init/        # creación de la base de pruebas
├── compose.yaml
├── prisma.config.ts
├── next.config.ts
├── eslint.config.mjs
├── vitest.config.ts
└── tsconfig.json
```

## ⚠️ Nota de seguridad

El MVP usa un único conjunto de datos **sin autenticación**. No debe desplegarse
públicamente sin un modelo de autorización.
