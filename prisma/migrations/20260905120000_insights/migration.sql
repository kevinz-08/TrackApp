/*
  Insights proactivos.

  Tabla nueva y aditiva: no toca ninguna columna existente, así que es segura de
  aplicar con la app en marcha.

  El único sobre ("userId", "fingerprint") es la pieza que impide que el análisis
  diario notifique el mismo hecho todas las mañanas: el cron hace upsert contra
  esa clave, así que un cobro duplicado detectado tres días seguidos es una sola
  fila y una sola notificación.
*/

-- CreateEnum
CREATE TYPE "InsightKind" AS ENUM ('DUPLICATE_CHARGE', 'SPENDING_SPIKE', 'SUBSCRIPTION_STALE', 'GOAL_OFF_PACE');

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "InsightKind" NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insight_userId_fingerprint_key" ON "Insight"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "Insight_userId_createdAt_idx" ON "Insight"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
