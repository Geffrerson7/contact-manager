-- Al menos un medio de contacto (§5.4, §9.1, regla cruzada).
-- El servicio ya lo valida y responde VALIDATION_ERROR con el campo `contactMethod`;
-- este CHECK es la defensa en profundidad frente a escrituras concurrentes o directas.
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_contactable_check"
  CHECK ("email" <> '' OR "phone" <> '');
