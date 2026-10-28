ALTER TABLE perfil ADD COLUMN salario_neto_mensual_centimos INTEGER CHECK(salario_neto_mensual_centimos >= 0 AND salario_neto_mensual_centimos <= 9007199254740991);
