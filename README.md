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
| `pnpm db:demo` | Carga movimientos de ejemplo para ver el panel con forma |
| `pnpm db:demo:clear` | Borra todas las transacciones del usuario |
| `pnpm db:studio` | Explorador de la base |

## Estado

El detalle completo de lo hecho y lo pendiente está en **[TASKS.md](TASKS.md)**.

En resumen: el núcleo transaccional, el endpoint de quick-log y el panel con
gráficos funcionan de punta a punta contra la base real. Falta la UI de edición
de transacciones y categorías, la del chat, y las de metas, tarjetas y
suscripciones — su lógica de negocio ya está escrita detrás.

## Instalar en el iPhone

Los iconos y el manifest están listos, pero **iOS solo permite añadir a la
pantalla de inicio desde HTTPS**: `localhost` no sirve desde el teléfono. Hay que
desplegar (o exponer el puerto por un túnel HTTPS) antes de este paso.

1. Abrir la URL en **Safari** (Chrome en iOS no ofrece la opción).
2. Compartir → **Añadir a pantalla de inicio**.
3. Sin este paso no hay notificaciones push en iOS, así que todo el sistema de
   alertas queda inutilizado.

Para regenerar los iconos si cambia la marca, la fuente vectorial está en
`public/icons/icon.svg` y `public/icons/maskable.svg`.

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
