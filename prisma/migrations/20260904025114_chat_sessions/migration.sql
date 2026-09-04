/*
  El historial de chat pasa de una lista plana por usuario a conversaciones.

  Los 10 mensajes que ya existen no se tiran: se recogen en una conversación por
  usuario, fechada con su mensaje más antiguo, para que la retención de 30 días
  cuente desde cuando se escribieron de verdad y no desde el despliegue.
*/

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatSession_expiresAt_idx" ON "ChatSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: nullable primero, para poder rellenarla.
ALTER TABLE "ChatMessage" ADD COLUMN "sessionId" TEXT;

-- Backfill: una conversación por usuario con mensajes previos.
INSERT INTO "ChatSession" ("id", "userId", "title", "createdAt", "updatedAt", "expiresAt")
SELECT
    'legacy-' || "userId",
    "userId",
    'Conversación anterior',
    MIN("createdAt"),
    MAX("createdAt"),
    MIN("createdAt") + INTERVAL '30 days'
FROM "ChatMessage"
GROUP BY "userId";

UPDATE "ChatMessage" SET "sessionId" = 'legacy-' || "userId" WHERE "sessionId" IS NULL;

-- Ya no hay huérfanos: la columna pasa a obligatoria.
ALTER TABLE "ChatMessage" ALTER COLUMN "sessionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
