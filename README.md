# AcreditaPro

[![CI](https://github.com/masa082/AcreditacionRISKS/actions/workflows/ci.yml/badge.svg)](https://github.com/masa082/AcreditacionRISKS/actions/workflows/ci.yml)

🌐 **En vivo:** https://www.okacreditado.com · 🔎 **Verificación pública:** https://www.okacreditado.com/verificar

Plataforma **SaaS multitenant** para crear, administrar, presentar, calificar y
certificar evaluaciones para acreditación/certificación de personas, basada en
los principios de la norma **ISO/IEC 17024**.

Cada **SUSCRIPTOR** (organismo certificador) opera su propio espacio aislado:
usuarios, candidatos, esquemas, bancos de preguntas, evaluaciones, pagos,
certificados, reportes y configuración.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend + Backend | **Next.js 15** (App Router, React 19, Server Actions) · TypeScript |
| Estilos | **Tailwind CSS v4** |
| ORM / BD | **Prisma 6** · **PostgreSQL 18** |
| Auth | Sesiones JWT (`jose`) httpOnly + revocables en BD · contraseñas `bcryptjs` |
| Multitenancy | BD compartida + `subscriberId` por fila + RLS opcional (`prisma/rls.sql`) |
| Pagos | Capa de proveedores abstracta (Wompi/PayU/Mercado Pago/Stripe) — *Fase 3* |

---

## Puesta en marcha (local)

Requisitos: Node 20+, PostgreSQL en ejecución.

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno (ya provisto .env para desarrollo local)
cp .env.example .env   # y ajuste DATABASE_URL / DIRECT_URL si aplica

# 3. Crear el esquema y poblar datos demo
npx prisma migrate deploy   # o: npx prisma migrate dev
npm run db:seed

# 4. Levantar
npm run dev                 # http://localhost:3000  (o -p 3100)
```

> En este entorno la BD local corre con **Postgres.app en el puerto 5433**
> (auth `trust`, sin contraseña). `DATABASE_URL` ya apunta allí.

### Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos (tsc) |
| `npm run db:seed` | Datos de demostración |
| `npm run db:reset` | Reinicia BD + migra + siembra |
| `npm run prisma:studio` | Explorador visual de la BD |

---

## Credenciales de demostración

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Superadministrador | `superadmin@acreditapro.com` | `Admin1234*` |
| Admin del suscriptor | `admin@certizo.co` | `Demo1234*` |
| Creador de preguntas | `autor@certizo.co` | `Demo1234*` |
| Revisor de preguntas | `revisor@certizo.co` | `Demo1234*` |
| Evaluador | `evaluador@certizo.co` | `Demo1234*` |
| Miembro de comité | `comite@certizo.co` | `Demo1234*` |
| Candidato | `candidato@example.com` | `Demo1234*` |

Suscriptor demo (tenant): **Certizo** (`/certizo`).

---

## Arquitectura

```
src/
  app/
    page.tsx                # Landing pública
    login/                  # Inicio de sesión
    registro/               # Registro de candidato (Fase 3)
    admin/                  # Dashboard SUPERADMIN
    panel/                  # Dashboard SUSCRIPTOR
    portal/                 # Dashboard CANDIDATO
    verificar/[code]/       # Verificación pública de certificados (QR)
  components/               # UI reutilizable + shell de dashboard
  lib/
    prisma.ts               # Cliente Prisma (singleton)
    auth.ts                 # Hash de contraseñas + firma/verificación JWT
    session.ts              # Sesión actual, login, logout, guards de permisos
    permissions.ts          # Catálogo de permisos + roles del sistema (RBAC)
    tenant.ts               # Aislamiento multitenant (scoping por subscriberId)
    actions/auth.ts         # Server Actions de autenticación
prisma/
  schema.prisma             # Modelo de datos completo (~40 modelos)
  seed.ts                   # Datos de demostración
  rls.sql                   # Hardening RLS para producción
```

### Roles y permisos (RBAC)

Tres tipos de identidad (`UserType`): `PLATFORM`, `SUBSCRIBER`, `CANDIDATE`.
Los subroles del suscriptor son **configurables por permisos** (ver
`src/lib/permissions.ts`): Administrador, Coordinador, Creador de preguntas,
Revisor, Evaluador, Comité, Auditor interno, Soporte.

### Aislamiento multitenant

1. **Aplicación (activo):** todas las consultas de tenant se filtran por
   `subscriberId`; `tenantPrisma(subscriberId)` lo inyecta automáticamente.
2. **Base de datos (producción):** `prisma/rls.sql` activa Row-Level Security
   con un rol de aplicación no-superusuario y un GUC de sesión por tenant.

---

## Estado por módulo (roadmap)

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Roles, multitenancy, auth, RBAC | ✅ Fase 1 |
| 2 | Dashboards (superadmin/suscriptor/candidato) | ✅ Fase 1 |
| 3 | Verificación pública de certificados (QR) | ✅ Fase 1 (UI) |
| 4 | Modelo de datos completo (~40 entidades) | ✅ Fase 1 |
| 5 | Esquemas de certificación (CRUD) | ✅ Fase 2 |
| 6 | Banco de preguntas (10 tipos) + flujo editorial + competencias/temas | ✅ Fase 2 |
| 7 | Evaluaciones (config + secciones + publicación) | ✅ Fase 2 |
| 8 | Registro candidato + consentimiento de datos | 🔜 Fase 3 |
| 8 | Pagos (pasarelas) | 🔜 Fase 3 |
| 9 | Agenda de pruebas | 🔜 Fase 3 |
| 10 | Presentación de examen + antifraude | 🔜 Fase 4 |
| 11 | Calificación automática y manual | 🔜 Fase 4 |
| 12 | Comité evaluador | 🔜 Fase 4 |
| 13 | Emisión de certificados/diplomas + PDF | 🔜 Fase 5 |
| 14 | Vencimientos + recertificación | 🔜 Fase 6 |
| 15 | Reportes (PDF/Excel/CSV) | 🔜 Fase 6 |
| 16 | Auditoría / trazabilidad | 🔜 Fase 6 |

---

## Despliegue (producción)

El sitio en vivo corre en **Vercel** con base de datos **PostgreSQL gestionada en Railway**.

| Componente | Detalle |
|------------|---------|
| Hosting | Vercel (proyecto `okacreeditado`) · dominio `www.okacreditado.com` |
| Base de datos | Railway PostgreSQL (proyecto `acreditapro`) |
| Variables en Vercel | `DATABASE_URL`, `DIRECT_URL` (URL pública de Railway), `AUTH_SECRET`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` |
| Migraciones | `prisma migrate deploy` contra la URL pública de Railway |
| CI/CD | Push a `main` → CI (GitHub Actions) + deploy automático en Vercel |

Pasos para reproducir el despliegue:

```bash
# 1. Provisionar Postgres (Railway / Neon / Vercel Postgres) y obtener la URL pública.
# 2. Configurar variables en Vercel (Production):
vercel env add DATABASE_URL production    # URL pública de la BD
vercel env add DIRECT_URL production       # igual a DATABASE_URL
vercel env add AUTH_SECRET production       # secreto aleatorio >= 32 chars
# 3. Aplicar migraciones + datos demo contra la BD de producción:
DATABASE_URL="<url-publica>" DIRECT_URL="<url-publica>" npx prisma migrate deploy
DATABASE_URL="<url-publica>" DIRECT_URL="<url-publica>" npm run db:seed
# 4. Desplegar:
vercel --prod
```

> Para escalar en serverless, considere un pooler (PgBouncer / Prisma Accelerate)
> o `?connection_limit=1` en `DATABASE_URL`.

## Seguridad

- Contraseñas con `bcrypt` (coste 11). Sesiones JWT httpOnly revocables.
- Aislamiento por tenant en aplicación + RLS opcional en BD.
- Guards de permisos por ruta (`requirePermission`).
- Verificación pública sin exponer datos personales sensibles (documento
  enmascarado).
- Registro de IP/navegador en sesiones, consentimientos e intentos de examen.

> `.env` incluye un `AUTH_SECRET` de desarrollo. **Cámbielo en producción.**
