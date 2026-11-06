-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Amigo', 'Trabajo', 'Familia', 'Otro');

-- CreateEnum
CREATE TYPE "UndoScope" AS ENUM ('ONE', 'ALL');

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "email" VARCHAR(254) NOT NULL DEFAULT '',
    "role" "Role" NOT NULL,
    "company" VARCHAR(80) NOT NULL DEFAULT '',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),
    "deletedBatchId" UUID,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "undo_batches" (
    "id" UUID NOT NULL,
    "scope" "UndoScope" NOT NULL,
    "contactCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "restoredAt" TIMESTAMPTZ(3),

    CONSTRAINT "undo_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_state" (
    "key" VARCHAR(64) NOT NULL,
    "value" VARCHAR(1024) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_state_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "contacts_deletedAt_idx" ON "contacts"("deletedAt");

-- CreateIndex
CREATE INDEX "contacts_deletedBatchId_idx" ON "contacts"("deletedBatchId");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_isFavorite_idx" ON "contacts"("isFavorite");

-- CreateIndex
CREATE INDEX "undo_batches_expiresAt_idx" ON "undo_batches"("expiresAt");

-- CreateIndex
CREATE INDEX "undo_batches_restoredAt_idx" ON "undo_batches"("restoredAt");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_deletedBatchId_fkey" FOREIGN KEY ("deletedBatchId") REFERENCES "undo_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
