# TrackApp — Especificación Técnica y Arquitectura del MVP

**Versión:** 1.0
**Fecha:** Septiembre 2026
**Autor:** Santiago Gutiérrez
**Alcance:** MVP monousuario, costo operativo $0

---

## 0. Principios de diseño del MVP

Cinco decisiones que atraviesan todo el documento:

1. **Un solo despliegue.** Next.js App Router sirve el frontend y la API. No hay backend separado, no hay CORS, no hay dos pipelines de deploy.
2. **Node.js runtime por defecto.** Edge solo donde aporte latencia real y no toque Prisma. La complejidad de mezclar runtimes no se justifica en un MVP.
3. **La IA no es crítica.** Si Groq falla, la app registra transacciones igual. Todo camino que dependa de un LLM tiene un fallback determinista.
4. **`userId` desde el día uno.** Aunque haya un solo usuario, cada query filtra por él. Evita una migración dolorosa después.
5. **Dinero en enteros.** Nunca `Float`. Se almacena en la unidad mínima como `Int` para eliminar errores de redondeo.

---

## 1. Arquitectura del Sistema

### 1.1 Flujo de datos

```mermaid
flowchart TD
    A[iOS Shortcut / Botón de acción]
    B[PWA - Navegador y móvil]
    C[Tauri - Desktop]
    D[Next.js en Vercel<br/>Server Components + Route Handlers]
    E[Prisma Client]
    F[(Neon PostgreSQL<br/>Serverless)]
    G[Groq API<br/>LLM]
    H[Cloudinary<br/>Imágenes de metas]

    A -->|POST /api/quick-log<br/>Bearer API Key| D
    B -->|Server Actions + fetch| D
    C -->|Carga la misma URL| D
    D --> E
    E --> F
    D -->|Chat e insights| G
    B -->|Upload directo firmado| H
```

**Puntos clave del flujo:**

- El **atajo de iOS** es el único cliente que no usa sesión de navegador. Entra por un carril propio (`/api/quick-log`) con autenticación por API Key.
- La **PWA y Tauri consumen exactamente la misma aplicación desplegada.** Tauri no es un build separado: es una ventana nativa que carga la URL de producción.
- **Cloudinary recibe la imagen directamente desde el cliente** mediante un preset firmado. El archivo nunca pasa por Vercel, lo que evita consumir ancho de banda y el límite de tamaño de payload de las funciones serverless.

### 1.2 Estrategia de autenticación

Se usan **dos mecanismos separados**, porque los casos de uso son distintos:

#### A. Sesión de usuario — Auth.js v5 (NextAuth) con JWT

Para la web, PWA y desktop.

- **Estrategia `jwt`, no `database`.** No se guarda sesión en Postgres: menos queries, menos consumo del free tier de Neon, y no se necesita el adapter de Prisma.
- **Credentials provider** con email y password hasheado con `bcrypt`. Para un MVP monousuario no tiene sentido montar OAuth.
- La sesión vive en una cookie `httpOnly` firmada. Duración larga (30 días) porque es una app personal.

```ts
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const user = await prisma.user.findUnique({
          where: { email: String(creds?.email) },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(String(creds?.password), user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
```

#### B. API Key — para el atajo de iOS

Los Atajos no pueden manejar el flujo de login ni refrescar tokens. Necesitan una credencial estática.

- Token opaco de alta entropía, generado una vez y mostrado al usuario **una sola vez**.
- Se almacena **hasheado** (SHA-256) en la tabla `ApiKey`. Si la base se compromete, el token no es recuperable.
- **Alcance restringido:** esta credencial solo habilita `/api/quick-log`. No sirve para leer datos ni para el chat.
- **Revocable individualmente** y con registro de último uso, para detectar si quedó activa en un dispositivo perdido.

```ts
// lib/auth/api-key.ts
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const hashKey = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

export function generateApiKey() {
  const raw = `tk_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashKey(raw) };
}

export async function resolveApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(authHeader.slice(7)) },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;
  return record;
}
```

---

## 2. Estructura de Directorios

```
trackapp/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                      # Categorías base + usuario inicial
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           # Shell autenticado + nav
│   │   │   ├── page.tsx             # Home: balance y gráficos
│   │   │   ├── transactions/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── cards/page.tsx
│   │   │   ├── chat/page.tsx
│   │   │   └── settings/
│   │   │       └── api-keys/page.tsx  # Generar token para Shortcuts
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── quick-log/route.ts     # ← Endpoint del atajo de iOS
│   │   │   ├── chat/route.ts          # Streaming de Groq
│   │   │   ├── transactions/route.ts
│   │   │   ├── cloudinary/sign/route.ts
│   │   │   └── cron/
│   │   │       ├── recurring/route.ts # Materializa fijos del mes
│   │   │       └── alerts/route.ts    # Alertas de suscripciones
│   │   │
│   │   ├── manifest.ts               # PWA manifest
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── actions/                      # Server Actions
│   │   ├── transactions.ts
│   │   ├── goals.ts
│   │   ├── categories.ts
│   │   └── cards.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   ├── charts/
│   │   │   ├── category-donut.tsx
│   │   │   ├── monthly-trend.tsx
│   │   │   └── fixed-vs-variable.tsx
│   │   ├── transactions/
│   │   ├── goals/
│   │   └── chat/
│   │
│   ├── lib/
│   │   ├── prisma.ts                 # Singleton del client
│   │   ├── auth/
│   │   │   ├── api-key.ts
│   │   │   └── guards.ts             # requireUser() / requireApiKey()
│   │   ├── money.ts                  # Helpers de enteros y formato COP
│   │   ├── dates.ts
│   │   └── validation/               # Esquemas Zod
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── groq.ts               # Cliente y wrapper del SDK
│   │   │   ├── context.ts            # Construcción del snapshot financiero
│   │   │   ├── prompts.ts            # System prompts
│   │   │   ├── tools.ts              # Function calling
│   │   │   └── parse-transaction.ts  # NL → transacción estructurada
│   │   ├── finance/
│   │   │   ├── balance.ts
│   │   │   ├── aggregations.ts       # Queries de gráficos
│   │   │   └── recurring.ts
│   │   └── categorization.ts         # Reglas + memoria de correcciones
│   │
│   └── types/
│       └── index.ts
│
├── public/
│   ├── icons/                        # Íconos PWA (192, 512, maskable)
│   └── sw.js
│
├── src-tauri/                        # Solo si se compila desktop nativo
│   ├── tauri.conf.json
│   └── src/main.rs
│
├── .env.local
├── next.config.ts
├── vercel.json                       # Definición de crons
└── package.json
```

**Nota sobre `actions/` vs `api/`:** la regla es simple. Si el consumidor es la propia UI de React, usa **Server Action**. Si el consumidor es externo (Shortcuts) o necesita streaming (chat), usa **Route Handler**. Esto evita crear endpoints REST que solo consume tu propio frontend.

---

## 3. Modelo de Datos (Prisma Schema)

### 3.1 Decisiones del modelo

- **Montos como `Int` en unidad mínima.** Para COP se guardan pesos enteros; si más adelante se agregan divisas con decimales, se guarda en centavos. `Float` produce errores de redondeo inaceptables en finanzas y `Decimal` complica la serialización a JSON sin aportar nada en este caso.
- **`Transaction` es la tabla central.** Ingresos y egresos comparten tabla, diferenciados por `type`. Simplifica todas las agregaciones.
- **Los recurrentes se materializan.** `RecurringRule` es la plantilla; un cron genera las `Transaction` reales cada período. Así los gráficos no necesitan lógica especial para movimientos fijos.
- **`Subscription` es un caso particular de `RecurringRule`.** Se modela como una bandera y campos extra en lugar de una tabla aparte, para no duplicar la lógica de recurrencia.

### 3.2 Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Conexión pooled de Neon
  directUrl = env("DIRECT_URL")         // Conexión directa, para migraciones
}

// ─────────────────────────────────────────────
// Usuario y credenciales
// ─────────────────────────────────────────────

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  passwordHash   String
  currency       String   @default("COP")
  locale         String   @default("es-CO")
  monthStartDay  Int      @default(1)    // Día de corte del mes financiero
  createdAt      DateTime @default(now())

  apiKeys        ApiKey[]
  accounts       Account[]
  categories     Category[]
  transactions   Transaction[]
  recurringRules RecurringRule[]
  creditCards    CreditCard[]
  savingGoals    SavingGoal[]
  chatMessages   ChatMessage[]
}

model ApiKey {
  id         String    @id @default(cuid())
  userId     String
  name       String                        // "iPhone — botón de acción"
  keyHash    String    @unique             // SHA-256 del token
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ─────────────────────────────────────────────
// Cuentas y categorías
// ─────────────────────────────────────────────

enum AccountType {
  CASH
  BANK
  DIGITAL_WALLET      // Nequi, Daviplata
  CREDIT_CARD
}

model Account {
  id             String      @id @default(cuid())
  userId         String
  name           String
  type           AccountType
  initialBalance Int         @default(0)
  isArchived     Boolean     @default(false)
  createdAt      DateTime    @default(now())

  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   Transaction[]
  creditCard     CreditCard?

  @@index([userId])
}

enum CategoryKind {
  INCOME
  EXPENSE
}

model Category {
  id        String       @id @default(cuid())
  userId    String
  name      String
  kind      CategoryKind @default(EXPENSE)
  color     String       @default("#888780")
  icon      String?
  isDefault Boolean      @default(false)

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   Transaction[]
  recurringRules RecurringRule[]
  budgets        Budget[]

  @@unique([userId, name])
  @@index([userId])
}

// ─────────────────────────────────────────────
// Transacciones
// ─────────────────────────────────────────────

enum TransactionType {
  INCOME
  EXPENSE
}

enum TransactionSource {
  MANUAL
  QUICK_LOG        // Vino del atajo de iOS
  RECURRING        // Generada por el cron
  AI_CHAT          // Creada por function calling
}

model Transaction {
  id           String            @id @default(cuid())
  userId       String
  accountId    String?
  categoryId   String?
  type         TransactionType
  amount       Int                             // Unidad mínima, siempre positivo
  description  String
  rawInput     String?                         // Texto original del quick-log
  occurredAt   DateTime          @default(now())
  source       TransactionSource @default(MANUAL)
  isFixed      Boolean           @default(false)
  needsReview  Boolean           @default(false)  // Parsing con baja confianza
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  account         Account?       @relation(fields: [accountId], references: [id], onDelete: SetNull)
  category        Category?      @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  recurringRule   RecurringRule? @relation(fields: [recurringRuleId], references: [id], onDelete: SetNull)
  recurringRuleId String?
  savingGoal      SavingGoal?    @relation(fields: [savingGoalId], references: [id], onDelete: SetNull)
  savingGoalId    String?

  @@index([userId, occurredAt])
  @@index([userId, categoryId])
  @@index([userId, type, occurredAt])
}

// ─────────────────────────────────────────────
// Recurrentes y suscripciones
// ─────────────────────────────────────────────

enum Frequency {
  WEEKLY
  MONTHLY
  BIMONTHLY
  QUARTERLY
  YEARLY
}

model RecurringRule {
  id             String          @id @default(cuid())
  userId         String
  categoryId     String?
  name           String
  type           TransactionType
  amount         Int
  frequency      Frequency       @default(MONTHLY)
  dayOfMonth     Int             @default(1)
  isSubscription Boolean         @default(false)
  nextRunAt      DateTime
  lastRunAt      DateTime?
  isActive       Boolean         @default(true)
  cancelledAt    DateTime?
  createdAt      DateTime        @default(now())

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category     Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  transactions Transaction[]

  @@index([userId, isActive])
  @@index([nextRunAt])
}

// ─────────────────────────────────────────────
// Tarjetas de crédito (módulo educativo)
// ─────────────────────────────────────────────

model CreditCard {
  id            String   @id @default(cuid())
  userId        String
  accountId     String?  @unique
  name          String                        // "Visa Bancolombia"
  description   String?
  creditLimit   Int      @default(0)
  currentDebt   Int      @default(0)
  statementDay  Int      @default(1)          // Fecha de corte
  paymentDay    Int      @default(15)         // Fecha límite de pago
  annualRate    Float    @default(0)          // Tasa efectiva anual (0.28 = 28%)
  createdAt     DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  account Account? @relation(fields: [accountId], references: [id], onDelete: SetNull)

  @@index([userId])
}

// ─────────────────────────────────────────────
// Metas de ahorro
// ─────────────────────────────────────────────

model SavingGoal {
  id            String    @id @default(cuid())
  userId        String
  name          String
  targetAmount  Int
  currentAmount Int       @default(0)
  imageUrl      String?                       // Cloudinary
  imagePublicId String?                       // Para poder borrarla
  targetDate    DateTime?
  completedAt   DateTime?
  createdAt     DateTime  @default(now())

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([userId])
}

// ─────────────────────────────────────────────
// Presupuestos
// ─────────────────────────────────────────────

model Budget {
  id         String   @id @default(cuid())
  categoryId String
  period     String                            // "2026-09"
  limit      Int

  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, period])
}

// ─────────────────────────────────────────────
// Chat con IA
// ─────────────────────────────────────────────

enum ChatRole {
  USER
  ASSISTANT
}

model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      ChatRole
  content   String   @db.Text
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

### 3.3 Singleton de Prisma

Obligatorio en Next.js: el hot reload crea múltiples instancias y agota las conexiones de Neon.

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 4. Diseño de la API

### 4.1 Server Actions (consumidas por la propia UI)

| Action | Archivo | Descripción |
|---|---|---|
| `createTransaction` | `actions/transactions.ts` | Crear ingreso o egreso |
| `updateTransaction` | `actions/transactions.ts` | Editar, incluidas las de quick-log |
| `deleteTransaction` | `actions/transactions.ts` | Eliminar |
| `createCategory` / `updateCategory` | `actions/categories.ts` | Gestión de categorías |
| `createGoal` / `contributeToGoal` | `actions/goals.ts` | Metas y aportes |
| `createRecurringRule` | `actions/transactions.ts` | Fijos y suscripciones |
| `cancelSubscription` | `actions/transactions.ts` | Marca como cancelada |
| `upsertCreditCard` | `actions/cards.ts` | Alta y edición de tarjetas |
| `simulateInstallments` | `actions/cards.ts` | Simulador (cálculo puro, sin persistir) |
| `generateApiKey` / `revokeApiKey` | `actions/settings.ts` | Tokens para Shortcuts |

### 4.2 Route Handlers (consumidores externos o streaming)

| Método | Ruta | Auth | Runtime | Propósito |
|---|---|---|---|---|
| `POST` | `/api/quick-log` | Bearer API Key | Node | Registro desde Shortcuts |
| `GET` | `/api/quick-log/summary` | Bearer API Key | Node | Balance rápido para mostrar en el atajo |
| `POST` | `/api/chat` | Sesión | Node | Chat con Groq, respuesta en streaming |
| `POST` | `/api/cloudinary/sign` | Sesión | Node | Firma para upload directo |
| `GET` | `/api/cron/recurring` | `CRON_SECRET` | Node | Materializa recurrentes del día |
| `GET` | `/api/cron/alerts` | `CRON_SECRET` | Node | Dispara alertas de suscripciones |
| `*` | `/api/auth/[...nextauth]` | — | Node | Auth.js |

### 4.3 `/api/quick-log` — el endpoint crítico

Es el endpoint que define la experiencia del producto. Objetivo: **respuesta en menos de 800 ms** para que el flujo completo desde el botón de acción quede bajo 5 segundos.

#### Estrategia de latencia

El problema: interpretar "almuerzo 25 mil" con un LLM añade entre 300 y 900 ms. La solución es un **parser en dos niveles**:

1. **Parser determinista primero.** Una expresión regular resuelve el 80–90% de los casos reales (`"<concepto> <monto>"`). Costo: ~0 ms.
2. **Groq solo como fallback**, cuando el parser determinista no logra extraer un monto con confianza.
3. **Categorización diferida.** La transacción se guarda de inmediato con la categoría sugerida por reglas locales; el refinamiento con IA ocurre después de responder, usando `waitUntil` de Vercel. El usuario nunca espera por esto.

#### Implementación

```ts
// app/api/quick-log/route.ts
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveApiKey } from "@/lib/auth/api-key";
import { parseFast } from "@/services/ai/parse-transaction";
import { refineCategory } from "@/services/categorization";

export const runtime = "nodejs";
export const maxDuration = 10;

const bodySchema = z.object({
  text: z.string().min(1).max(280),
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
});

export async function POST(req: NextRequest) {
  const key = await resolveApiKey(req.headers.get("authorization"));
  if (!key) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Formato inválido" },
      { status: 400 }
    );
  }

  const { text, type } = parsed.data;

  // Nivel 1: parser determinista. Si falla, cae a Groq internamente.
  const result = await parseFast(text, key.userId);

  if (!result.amount) {
    return NextResponse.json(
      { ok: false, message: "No entendí el monto. Intenta: almuerzo 25000" },
      { status: 422 }
    );
  }

  const tx = await prisma.transaction.create({
    data: {
      userId: key.userId,
      type: type ?? result.type ?? "EXPENSE",
      amount: result.amount,
      description: result.description,
      categoryId: result.categoryId,
      rawInput: text,
      source: "QUICK_LOG",
      needsReview: result.confidence < 0.7,
      occurredAt: new Date(),
    },
    select: { id: true, amount: true, description: true },
  });

  // Trabajo diferido: no bloquea la respuesta
  waitUntil(
    Promise.all([
      prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      }),
      result.confidence < 0.7
        ? refineCategory(tx.id, text, key.userId)
        : Promise.resolve(),
    ])
  );

  return NextResponse.json({
    ok: true,
    message: `Registrado: ${result.description} — ${formatCOP(result.amount)}`,
    transactionId: tx.id,
  });
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
```

#### Parser determinista

```ts
// services/ai/parse-transaction.ts
const MULTIPLIERS: Record<string, number> = {
  k: 1_000, mil: 1_000, miles: 1_000,
  m: 1_000_000, millon: 1_000_000, millón: 1_000_000, millones: 1_000_000,
};

export function parseAmount(text: string): number | null {
  const normalized = text.toLowerCase().replace(/[.,](?=\d{3}\b)/g, "");
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(k|mil(?:es)?|m|mill[oó]n(?:es)?)?/
  );
  if (!match) return null;

  const base = parseFloat(match[1].replace(",", "."));
  const mult = match[2] ? MULTIPLIERS[match[2]] ?? 1 : 1;
  return Math.round(base * mult);
}
```

Este parser resuelve las formas reales de escribir montos en Colombia: `25000`, `25.000`, `25k`, `25 mil`, `1.5 millones`.

#### Rate limiting

Sin control de tasa, una API Key filtrada permite llenar la base de datos y agotar el free tier de Neon. Para el MVP basta un contador simple en la propia base:

```ts
const recent = await prisma.transaction.count({
  where: {
    userId: key.userId,
    source: "QUICK_LOG",
    createdAt: { gte: new Date(Date.now() - 60_000) },
  },
});
if (recent > 20) {
  return NextResponse.json({ ok: false, message: "Demasiadas peticiones" }, { status: 429 });
}
```

---

## 5. Integración con Groq

### 5.1 Runtime: Node.js, no Edge

Aunque el SDK de Groq funciona en Edge, **Prisma Client no funciona en Edge sin driver adapters**. Y el chat necesita leer la base de datos para construir el contexto.

Opciones evaluadas:

| Opción | Veredicto |
|---|---|
| Edge + `@prisma/adapter-neon` | Funciona, pero añade configuración y una capa de fallos para ganar ~100 ms |
| Node.js runtime con conexión pooled de Neon | **Elegida.** Simple, sin sorpresas, latencia suficiente |

La latencia real del chat está dominada por la inferencia del modelo, no por el arranque de la función. Groq es lo bastante rápido para que la diferencia entre runtimes sea imperceptible.

```ts
// services/ai/groq.ts
import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export const MODELS = {
  chat: "llama-3.3-70b-versatile",   // Razonamiento y function calling
  fast: "llama-3.1-8b-instant",      // Parsing y clasificación
} as const;
```

**Regla de asignación de modelos:** el modelo grande solo para conversación con el usuario. El modelo pequeño para tareas mecánicas (parsear un texto, sugerir una categoría). Esto multiplica el margen dentro del free tier de Groq.

### 5.2 Inyección de contexto: el snapshot financiero

El error costoso sería enviar el historial completo en cada mensaje. La estrategia es construir un **resumen denso y de tamaño acotado** (~400–600 tokens) que se recalcula por consulta.

```ts
// services/ai/context.ts
import { prisma } from "@/lib/prisma";

export async function buildSnapshot(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [byCategory, totals, goals, subs, cards] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", occurredAt: { gte: monthStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, occurredAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.savingGoal.findMany({
      where: { userId, completedAt: null },
      select: { name: true, targetAmount: true, currentAmount: true, targetDate: true },
      take: 5,
    }),
    prisma.recurringRule.findMany({
      where: { userId, isSubscription: true, isActive: true },
      select: { name: true, amount: true, frequency: true, nextRunAt: true },
      take: 15,
    }),
    prisma.creditCard.findMany({
      where: { userId },
      select: { name: true, currentDebt: true, creditLimit: true, paymentDay: true, annualRate: true },
    }),
  ]);

  return { period: monthStart, byCategory, totals, goals, subs, cards };
}
```

El snapshot se serializa como **texto compacto, no como JSON crudo**. El JSON gasta tokens en llaves, comillas y nombres de campo repetidos:

```ts
// services/ai/prompts.ts
export function renderSnapshot(s: Snapshot, categoryNames: Map<string, string>) {
  const lines = [
    `PERIODO: ${s.period.toISOString().slice(0, 7)}`,
    `INGRESOS: ${sum(s.totals, "INCOME")}`,
    `EGRESOS: ${sum(s.totals, "EXPENSE")}`,
    `BALANCE: ${sum(s.totals, "INCOME") - sum(s.totals, "EXPENSE")}`,
    ``,
    `GASTO POR CATEGORIA:`,
    ...s.byCategory.map(
      (c) => `- ${categoryNames.get(c.categoryId ?? "") ?? "Sin categoría"}: ${c._sum.amount}`
    ),
    ``,
    `METAS: ${s.goals.map((g) => `${g.name} ${g.currentAmount}/${g.targetAmount}`).join(" | ") || "ninguna"}`,
    `SUSCRIPCIONES: ${s.subs.map((x) => `${x.name} ${x.amount}/${x.frequency}`).join(" | ") || "ninguna"}`,
    `TARJETAS: ${s.cards.map((c) => `${c.name} deuda ${c.currentDebt} de cupo ${c.creditLimit}`).join(" | ") || "ninguna"}`,
  ];
  return lines.join("\n");
}
```

Este formato reduce el consumo aproximadamente a la mitad frente a `JSON.stringify` del mismo contenido.

### 5.3 System prompt

```ts
export const SYSTEM_PROMPT = `Eres el asistente financiero de TrackApp. Hablas español colombiano, directo y sin tecnicismos innecesarios.

REGLAS:
- Todos los montos están en pesos colombianos (COP), sin decimales.
- Responde SIEMPRE basándote en los datos del resumen. Nunca inventes cifras.
- Si te falta información para responder, usa las herramientas disponibles.
- No juzgues ni regañes al usuario por sus gastos. Informa y sugiere.
- Sé breve: dos o tres frases salvo que pidan un análisis detallado.
- Si detectas un riesgo financiero real (deuda creciendo, gasto muy por encima del ingreso), menciónalo con calma y una acción concreta.

DATOS FINANCIEROS ACTUALES:
{{SNAPSHOT}}`;
```

### 5.4 Function calling

Para lo que no cabe en el snapshot:

```ts
// services/ai/tools.ts
export const tools = [
  {
    type: "function" as const,
    function: {
      name: "consultarGastos",
      description: "Consulta transacciones en un rango de fechas, opcionalmente filtradas por categoría.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: "string", description: "Fecha inicial ISO (YYYY-MM-DD)" },
          hasta: { type: "string", description: "Fecha final ISO (YYYY-MM-DD)" },
          categoria: { type: "string", description: "Nombre de la categoría (opcional)" },
        },
        required: ["desde", "hasta"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrarTransaccion",
      description: "Registra un nuevo ingreso o egreso.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["INCOME", "EXPENSE"] },
          monto: { type: "number" },
          descripcion: { type: "string" },
          categoria: { type: "string" },
        },
        required: ["tipo", "monto", "descripcion"],
      },
    },
  },
];
```

> **Regla de seguridad no negociable:** el `userId` **nunca** se toma de los argumentos generados por el modelo. Se inyecta desde la sesión autenticada en el momento de ejecutar la herramienta. Un modelo puede alucinar un ID; la sesión no.

```ts
// Ejecución de herramientas
async function runTool(name: string, args: any, userId: string) {
  switch (name) {
    case "consultarGastos":
      return prisma.transaction.findMany({
        where: {
          userId, // ← siempre de la sesión
          occurredAt: { gte: new Date(args.desde), lte: new Date(args.hasta) },
          ...(args.categoria && { category: { name: { contains: args.categoria, mode: "insensitive" } } }),
        },
        select: { amount: true, description: true, occurredAt: true },
        take: 50,
      });
    // ...
  }
}
```

### 5.5 Endpoint de chat con streaming

```ts
// app/api/chat/route.ts
import { auth } from "@/auth";
import { groq, MODELS } from "@/services/ai/groq";
import { buildSnapshot, renderSnapshot } from "@/services/ai/context";
import { SYSTEM_PROMPT } from "@/services/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("No autorizado", { status: 401 });

  const { messages } = await req.json();
  const snapshot = await buildSnapshot(session.user.id);

  const stream = await groq.chat.completions.create({
    model: MODELS.chat,
    stream: true,
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT.replace("{{SNAPSHOT}}", renderSnapshot(snapshot)) },
      ...messages.slice(-8), // Ventana corta de historial
    ],
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
```

**Nota sobre `maxDuration`:** el plan Hobby de Vercel limita la duración de las funciones. Mantener el límite en 30 s y `max_tokens` acotado evita cortes a mitad de respuesta.

---

## 6. Estrategia Multi-plataforma

### 6.1 PWA — la base

```ts
// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrackApp",
    short_name: "TrackApp",
    description: "Control de gastos sin fricción",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d9e75",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

**Restricción crítica de iOS:** las notificaciones push web solo funcionan si el usuario **añade la app a la pantalla de inicio** (iOS 16.4+). No hay forma de evitarlo. El onboarding debe incluir este paso de forma explícita, con instrucciones visuales, porque de lo contrario todo el sistema de alertas queda inutilizado en el cliente principal.

Para el service worker, `next-pwa` o `@serwist/next` son suficientes. Estrategia recomendada:

- **Assets estáticos:** cache-first.
- **Datos de la API:** network-first con fallback a caché.
- **Cola offline:** las transacciones creadas sin conexión se guardan en IndexedDB y se sincronizan al recuperar red.

### 6.2 Desktop

**Opción A — PWA instalable (recomendada para el MVP).** Chrome y Edge permiten instalar la PWA como aplicación de escritorio con un clic. Costo de implementación: cero, ya está hecho con el manifest.

**Opción B — Tauri v2.** Solo si necesitas integración nativa real (bandeja del sistema, atajos globales de teclado, arranque automático). El binario pesa alrededor de 5 MB frente a los ~100 MB de Electron.

La configuración mínima apunta directamente a la URL de producción:

```json
// src-tauri/tauri.conf.json
{
  "productName": "TrackApp",
  "version": "0.1.0",
  "identifier": "dev.ksga.trackapp",
  "app": {
    "windows": [
      {
        "title": "TrackApp",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600
      }
    ],
    "security": { "csp": null }
  },
  "build": {
    "frontendDist": "https://trackapp.vercel.app"
  }
}
```

Con `frontendDist` apuntando a la URL desplegada, Tauri actúa como una ventana nativa sobre la app de producción. No hay build de frontend separado y las actualizaciones son instantáneas: al desplegar en Vercel, la app de escritorio ya está actualizada.

> **Recomendación:** deja Tauri para después del MVP. La PWA instalable cubre el caso de escritorio sin añadir Rust, firma de código ni un pipeline de release al proyecto.

### 6.3 Contrato del Atajo de iOS

#### Configuración del atajo

```
1. Pedir entrada        → Tipo: Texto  → Pregunta: "¿Qué gastaste?"
                           (Permitir dictado por voz habilitado)
2. Obtener contenido de → URL: https://trackapp.vercel.app/api/quick-log
   URL                    Método: POST
                           Encabezados:
                             Authorization: Bearer tk_xxxxxxxxxxxx
                             Content-Type: application/json
                           Cuerpo (JSON):
                             text: [Entrada proporcionada]
3. Obtener valor del    → Clave: message
   diccionario
4. Mostrar notificación → [Resultado del paso 3]
```

Luego se asigna en **Ajustes → Botón de Acción → Atajo → TrackApp**.

#### Request

```json
{
  "text": "almuerzo 25 mil",
  "type": "EXPENSE"
}
```

`type` es opcional. Si se omite, el backend asume `EXPENSE`, que es el caso mayoritario. Conviene crear un segundo atajo con `"type": "INCOME"` para registrar ingresos.

#### Response — éxito (200)

```json
{
  "ok": true,
  "message": "Registrado: almuerzo — $ 25.000",
  "transactionId": "clx8f2k9a0001"
}
```

#### Response — no se entendió el monto (422)

```json
{
  "ok": false,
  "message": "No entendí el monto. Intenta: almuerzo 25000"
}
```

El campo `message` está diseñado para mostrarse **tal cual** en la notificación de iOS, sin que el atajo tenga que construir texto. Toda la lógica de presentación vive en el backend, de modo que mejorar los mensajes no requiere reconfigurar el atajo en el teléfono.

#### Atajo secundario: consulta de balance

```
1. Obtener contenido de → GET /api/quick-log/summary
   URL                    Authorization: Bearer tk_xxx
2. Mostrar notificación → [message]
```

Respuesta:

```json
{
  "ok": true,
  "message": "Septiembre: gastaste $ 1.240.000 de $ 3.000.000. Te quedan $ 1.760.000."
}
```

---

## 7. Configuración y Variables de Entorno

### 7.1 `.env.local`

```bash
# ── Base de datos (Neon) ──────────────────────────────
# Pooled: para la aplicación en runtime
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/trackapp?sslmode=require"
# Directa: solo para migraciones de Prisma
DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/trackapp?sslmode=require"

# ── Autenticación (Auth.js v5) ────────────────────────
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="https://trackapp.vercel.app"
AUTH_TRUST_HOST="true"

# ── IA (Groq) ─────────────────────────────────────────
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"

# ── Imágenes (Cloudinary) ─────────────────────────────
CLOUDINARY_CLOUD_NAME="xxx"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="xxx"

# ── Cron ──────────────────────────────────────────────
CRON_SECRET="<openssl rand -hex 32>"

# ── Push (Web Push VAPID) ─────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY="xxx"
VAPID_PRIVATE_KEY="xxx"
VAPID_SUBJECT="mailto:kevingutierrez.dev@gmail.com"

# ── App ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://trackapp.vercel.app"
```

**Detalle importante de Neon:** son dos cadenas de conexión distintas. La *pooled* (con `-pooler` en el host) para la aplicación, porque las funciones serverless abren y cierran conexiones constantemente y agotarían el límite sin pooler. La *directa* para `prisma migrate`, que requiere una sesión persistente y falla contra el pooler.

### 7.2 Configuración de crons

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/recurring", "schedule": "0 5 * * *" },
    { "path": "/api/cron/alerts", "schedule": "0 13 * * *" }
  ]
}
```

Las horas están en UTC. `0 5 * * *` corresponde a medianoche en Colombia (UTC-5); `0 13 * * *` a las 8:00 a.m.

> **Límite del plan Hobby:** permite crons con frecuencia diaria como máximo. Suficiente para materializar recurrentes y disparar alertas.

Protección del endpoint:

```ts
// app/api/cron/recurring/route.ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }
  // ... materializar recurrentes
}
```

### 7.3 Pasos de despliegue

1. **Neon:** crear proyecto y base `trackapp`. Copiar ambas cadenas de conexión.
2. **Local:** `npx prisma migrate dev --name init` y luego `npx prisma db seed` para cargar categorías base y el usuario inicial.
3. **Groq:** generar API Key en la consola.
4. **Cloudinary:** crear un *upload preset* sin firmar, restringido a la carpeta `trackapp/goals`.
5. **Vercel:** importar el repositorio, cargar todas las variables de entorno y desplegar.
6. **Build command:** debe ser `prisma generate && next build`. Sin `prisma generate`, el build falla en Vercel porque el cliente no se regenera desde la caché de dependencias.
7. **Post-deploy:** entrar a `/settings/api-keys`, generar el token del atajo y configurarlo en el iPhone.

### 7.4 Límites de los planes gratuitos

| Servicio | Límite relevante | Riesgo para el MVP |
|---|---|---|
| **Vercel Hobby** | 100 GB de ancho de banda, funciones de 10 s (60 s configurable) | Nulo con un usuario |
| **Neon Free** | ~0.5 GB de almacenamiento, autosuspensión tras inactividad | Cold start de 1–3 s tras inactividad prolongada. Mitigable con un ping desde el cron diario |
| **Groq Free** | Límites por minuto y por día según modelo | El riesgo real. Mitigar usando el modelo pequeño para parsing y cacheando los insights del agente |
| **Cloudinary Free** | 25 créditos mensuales | Nulo para imágenes de metas |

**Advertencia sobre la autosuspensión de Neon:** es el punto que más puede degradar la experiencia del quick-log. Si la base lleva horas dormida, el primer registro del día puede tardar varios segundos, rompiendo la promesa de los 5 segundos. La mitigación más simple es que el cron diario haga una query trivial para mantenerla despierta en horario activo.

---

## 8. Orden de Construcción Sugerido

| # | Entregable | Por qué en este orden |
|---|---|---|
| 1 | Schema de Prisma + migración + seed | Todo lo demás depende del modelo de datos |
| 2 | Auth.js con credenciales + página de login | Sin sesión no se puede construir la UI autenticada |
| 3 | CRUD de transacciones (Server Actions) + listado | El núcleo funcional |
| 4 | Generación de API Keys + `/api/quick-log` | Es la hipótesis central del producto; validarla temprano |
| 5 | Configurar el atajo en el iPhone y usarlo una semana | Validación real antes de invertir en lo demás |
| 6 | Dashboard con gráficos (Recharts) | Convierte los datos acumulados en valor visible |
| 7 | Categorías, recurrentes y cron | Automatiza lo predecible |
| 8 | PWA (manifest + service worker) e instalación | Habilita push y el caso desktop |
| 9 | Chat con Groq | Solo tiene sentido con datos históricos reales acumulados |
| 10 | Metas con imagen, tarjetas y simuladores | Features de valor que no bloquean el núcleo |

El punto 5 es deliberado: **antes de construir el resto, valida durante una semana que efectivamente usas el quick-log.** Si ese hábito no se sostiene, el resto del producto no importa y conviene replantear el enfoque antes de invertir más tiempo.

---

*Documento técnico vivo. Las decisiones marcadas como "recomendadas" son revisables conforme se valide el MVP.*