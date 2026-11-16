ALTER TABLE deudas ADD COLUMN tipo TEXT CHECK(tipo IN ('real','fictional'));
ALTER TABLE perfil ADD COLUMN oferta_hipoteca_anos INTEGER CHECK(oferta_hipoteca_anos BETWEEN 1 AND 60);
ALTER TABLE perfil ADD COLUMN oferta_hipoteca_banco TEXT CHECK(length(oferta_hipoteca_banco) <= 100);
