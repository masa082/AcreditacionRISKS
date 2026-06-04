-- Siembra las claves Rapyd de producción de RISKS INTERNATIONAL S.A.S. en su
-- fila de Subscriber. Idempotente: solo coloca las claves cuando todavía no
-- hay nada configurado, así no sobreescribe rotaciones futuras hechas por el
-- propio admin del suscriptor o el SUPERADMIN.
--
-- Match flexible: por NIT normalizado (sin puntos/guiones) o por nombre legal
-- que contenga "RISKS INTERNATIONAL", porque el formato del taxId difiere
-- entre los entornos local y producción.
UPDATE "Subscriber"
   SET "rapydAccessKey"   = 'rak_E0AE6BBCEE830E142AB5',
       "rapydSecretKey"   = 'rsk_6a07d43b7fdb10cc961690e52214c90437aece8fd9ecaa8ff39114c8a64d328d46abd040eefe707e',
       "rapydEnv"         = 'production',
       "rapydEnabled"     = true,
       "rapydMerchantNote"= 'RISKS INTERNATIONAL S.A.S. — NIT 900.352.786'
 WHERE ("rapydAccessKey" IS NULL OR "rapydAccessKey" = '')
   AND (
        regexp_replace(coalesce("taxId",''), '[^0-9]', '', 'g') = '900352786'
        OR upper("legalName") LIKE '%RISKS INTERNATIONAL%'
        OR upper(coalesce("tradeName",'')) LIKE '%RISKS INTERNATIONAL%'
   );
