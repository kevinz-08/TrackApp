# TrackApp

App de finanzas personales cuya hipótesis central es el **registro sin fricción**:
menos de 5 segundos desde el botón de acción del iPhone hasta la transacción
guardada, sin abrir la app.

Documentos fuente (mandan sobre este archivo si hay conflicto):
- `Track-App-noTecnico.md` — visión, alcance y prioridades de producto.
- `TrackApp-Tecnico.md` — arquitectura, schema y contratos del MVP.
- `TASKS.md` — estado detallado: qué está hecho y qué falta. Mantenerlo al día.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + PostgreSQL (Neon)
· Auth.js v5 (JWT) · Groq · Recharts · **pnpm**.

Un solo despliegue: Next.js sirve el frontend y la API. No hay backend separado.

## Principios no negociables

1. **Dinero en enteros.** `Int` en la unidad mínima. Nunca `Float`.
2. **`userId` en toda query**, aunque hoy haya un solo usuario. En las
   herramientas de IA el `userId` sale de la sesión, **jamás** de los argumentos
   que genera el modelo.
3. **La IA no es crítica.** Si Groq falla, la app registra transacciones igual.
   Todo camino que dependa de un LLM tiene un fallback determinista.
4. **Node.js runtime** por defecto en los Route Handlers.
5. **`actions/` vs `api/`:** si el consumidor es la propia UI, Server Action. Si
   es externo (Shortcuts) o necesita streaming (chat), Route Handler.

## Comandos

```bash
pnpm dev            # servidor de desarrollo
pnpm build          # prisma generate && next build
pnpm typecheck      # tsc --noEmit
pnpm db:migrate     # prisma migrate dev
pnpm db:seed        # categorías base + usuario inicial
pnpm db:demo        # movimientos de ejemplo (db:demo:clear los borra)
pnpm db:studio      # explorar la base
```

## Notas de entorno

- Neon expone **dos** cadenas: `DATABASE_URL` (pooled, la usa la app vía el
  driver adapter de Prisma 7) y `DIRECT_URL` (directa, la usa la CLI para
  migrar). Prisma 7 ya no acepta `url` dentro de `datasource`: vive en
  `prisma.config.ts`.
- El build de Vercel **debe** ser `prisma generate && next build`.

## Gráficos

Los colores de serie salen de `lib/chart-palette.ts`, no de valores sueltos. El
orden de los ocho slots es el mecanismo que garantiza la separación bajo
daltonismo, no una decisión estética: no reordenarlo ni añadir un noveno color.
El texto (leyendas, ejes, etiquetas) usa tokens de texto, nunca el color de la
serie; la identidad la aporta la marca de color que va al lado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
