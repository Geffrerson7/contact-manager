-- Integridad del borrado lógico y de los lotes de deshacer (§5.2).

-- Un contacto está borrado si y solo si pertenece a un lote.
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_deleted_pair_check"
  CHECK (("deletedAt" IS NULL) = ("deletedBatchId" IS NULL));

-- Un lote nunca está vacío.
ALTER TABLE "undo_batches"
  ADD CONSTRAINT "undo_batches_count_check"
  CHECK ("contactCount" > 0);

-- La ventana de restauración siempre es posterior a la creación del lote.
ALTER TABLE "undo_batches"
  ADD CONSTRAINT "undo_batches_window_check"
  CHECK ("expiresAt" > "createdAt");
