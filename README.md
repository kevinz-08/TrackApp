# TrackApp

Finanzas personales para quienes odian llevar cuentas. La hipótesis central es el
**registro sin fricción**: menos de 5 segundos desde el botón de acción del iPhone
hasta la transacción guardada, sin abrir la app.

Ver `Track-App-noTecnico.md` (visión y alcance) y `TrackApp-Tecnico.md`
(arquitectura del MVP).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local     # rellenar las variables
pnpm db:migrate                # crea el schema en Neon
pnpm db:seed                   # categorías base + usuario inicial
pnpm dev
```

Mínimo para arrancar: `DATABASE_URL`, `DIRECT_URL` y `AUTH_SECRET`.
`GROQ_API_KEY` es opcional — sin ella el chat se apaga y el parser se queda en su
nivel determinista, pero registrar transacciones sigue funcionando.

Generar secretos:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # CRON_SECRET
```

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | `prisma generate && next build` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Migración de desarrollo |
| `pnpm db:seed` | Categorías base y usuario inicial |
| `pnpm db:studio` | Explorador de la base |

## Estado

Andamiaje completo y compilando. Implementado:

- Schema de Prisma completo con seed de categorías base.
- Auth.js v5 con credenciales, sesión JWT y guardias (`requireUser`, `requireApiKey`).
- API Keys para Atajos: generación, hash SHA-256, revocación y registro de último uso.
- `POST /api/quick-log` y `GET /api/quick-log/summary` con parser determinista,
  fallback a Groq, categorización diferida y control de tasa.
- `POST /api/chat` con snapshot financiero y streaming; herramientas de function
  calling con `userId` inyectado desde la sesión.
- Crons de recurrentes y alertas, protegidos por `CRON_SECRET`.
- Servicios de balance, agregaciones para gráficos y simuladores de crédito
  (cuotas diferidas y pago mínimo).
- Server Actions de transacciones, categorías, metas, tarjetas y ajustes.
- Manifest PWA y shell del dashboard.

Pendiente (siguiendo el orden de construcción del §8 del doc técnico):
gráficos con Recharts, UI de categorías/metas/tarjetas/chat, service worker con
cola offline e íconos PWA, y Web Push.

## Configurar el atajo de iOS

1. Entrar a `/settings/api-keys` y generar un token (se muestra una sola vez).
2. En Atajos: **Pedir entrada** (texto, dictado habilitado) → **Obtener contenido
   de URL** `POST /api/quick-log` con `Authorization: Bearer tk_...` y cuerpo JSON
   `{ "text": <entrada> }` → **Obtener valor del diccionario** `message` →
   **Mostrar notificación**.
3. Asignarlo en **Ajustes → Botón de Acción → Atajo**.

El campo `message` viene listo para mostrarse tal cual: toda la lógica de
presentación vive en el backend, así que mejorar los mensajes no obliga a
reconfigurar el atajo en el teléfono.
