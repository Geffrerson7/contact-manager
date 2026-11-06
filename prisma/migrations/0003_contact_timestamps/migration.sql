-- PostgreSQL como única autoridad de los timestamps de contacto (§5.3, §6).

-- Invariante 4 (§5.5). El trigger depende de ella: como OLD."updatedAt" >= OLD."createdAt",
-- OLD."updatedAt" + 1 ms ya es posterior a "createdAt" sin necesidad de compararlo (§6.3).
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_timestamps_check"
  CHECK ("updatedAt" >= "createdAt");

CREATE OR REPLACE FUNCTION "contacts_before_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- createdAt es inmutable
  NEW."createdAt" := OLD."createdAt";

  IF NEW."name"    IS DISTINCT FROM OLD."name"
  OR NEW."phone"   IS DISTINCT FROM OLD."phone"
  OR NEW."email"   IS DISTINCT FROM OLD."email"
  OR NEW."role"    IS DISTINCT FROM OLD."role"
  OR NEW."company" IS DISTINCT FROM OLD."company"
  THEN
    -- Estrictamente creciente: nunca retrocede, ni con el reloj del servidor atrasado.
    NEW."updatedAt" := GREATEST(
      clock_timestamp(),
      OLD."updatedAt" + interval '1 millisecond'
    );
  ELSE
    -- Favorito, borrado lógico, restauración, cambios sin efecto real: intacto.
    NEW."updatedAt" := OLD."updatedAt";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "contacts_before_update" ON "contacts";

CREATE TRIGGER "contacts_before_update"
BEFORE UPDATE ON "contacts"
FOR EACH ROW
EXECUTE FUNCTION "contacts_before_update"();
