-- ============================================================================
--  Row-Level Security (RLS) — Aislamiento multitenant de defensa en profundidad
--  AcreditaPro · ISO/IEC 17024
-- ----------------------------------------------------------------------------
--  Enforcement primario: capa de aplicación (src/lib/tenant.ts -> tenantPrisma).
--  Este archivo añade RLS a nivel de base de datos como segunda barrera.
--
--  IMPORTANTE: PostgreSQL NO aplica RLS a superusuarios ni al dueño de la tabla
--  salvo FORCE. Para que RLS realmente proteja, la aplicación debe conectarse
--  con un rol NO superusuario (ver paso 1) y fijar el GUC app.current_subscriber_id
--  por transacción (ver función set_tenant + uso en la app).
--
--  Cómo aplicar (producción/staging):
--    1) Cree el rol de aplicación no-superusuario y otórguele permisos.
--    2) Ejecute este archivo como dueño del esquema:
--         psql "$DIRECT_URL" -f prisma/rls.sql
--    3) Apunte DATABASE_URL al rol de aplicación; mantenga DIRECT_URL (migraciones)
--       al rol dueño.
-- ============================================================================

-- 1) Rol de aplicación (descomente y ajuste la contraseña):
-- CREATE ROLE acreditapro_app LOGIN PASSWORD 'CAMBIAR_ESTA_CLAVE' NOSUPERUSER;
-- GRANT USAGE ON SCHEMA public TO acreditapro_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acreditapro_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO acreditapro_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acreditapro_app;

-- 2) Función que lee el tenant del contexto de sesión (vacío => sin filtro).
CREATE OR REPLACE FUNCTION app_current_subscriber() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_subscriber_id', true), '') $$;

-- 3) Habilitar RLS + políticas por tabla de tenant.
--    Política: ver/escribir filas del tenant actual; si el GUC está vacío
--    (contexto de plataforma / migraciones) se permiten todas las filas.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'Role','User','Candidate','CertificationScheme','Program','Competency',
    'Topic','QuestionBank','Question','Exam','Enrollment','Payment','FeeConfig',
    'RequiredDocument','ExamSession','ExamAttempt','Certificate',
    'PrivacyPolicyVersion','ConsentPurpose','DataConsent','CommitteeReview','Appeal'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($pol$
      CREATE POLICY tenant_isolation ON %I
        USING (
          app_current_subscriber() IS NULL
          OR "subscriberId" = app_current_subscriber()
        )
        WITH CHECK (
          app_current_subscriber() IS NULL
          OR "subscriberId" = app_current_subscriber()
        )
    $pol$, t);
  END LOOP;
END $$;

-- 4) En la aplicación, antes de las consultas del tenant, dentro de la misma
--    transacción/conexión, ejecutar:
--      SELECT set_config('app.current_subscriber_id', '<subscriberId>', true);
--    (true => LOCAL a la transacción). Prisma: envolver en $transaction y usar
--    $executeRaw para el set_config antes de las operaciones.
