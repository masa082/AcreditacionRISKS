-- AlterTable: nuevos exámenes nacen con 80% y comité obligatorio.
ALTER TABLE "Exam" ALTER COLUMN "passingScore" SET DEFAULT 80,
ALTER COLUMN "requireCommittee" SET DEFAULT true;

-- Backfill conservador para exámenes existentes:
-- Solo subimos los que tenían el default anterior (70%) al nuevo (80%).
-- Si el suscriptor ya había puesto un valor distinto (75, 85, 90, etc.),
-- preservamos su elección.
UPDATE "Exam" SET "passingScore" = 80 WHERE "passingScore" = 70;

-- Activamos comité obligatorio para todos los exámenes que estaban en false.
-- Este es un cambio de política operativa del organismo: toda aprobación
-- pasa por revisión documental del comité. Si el suscriptor quiere
-- desactivarlo para un examen puntual (p. ej. evaluación diagnóstica),
-- puede hacerlo desde el editor de la evaluación.
UPDATE "Exam" SET "requireCommittee" = true WHERE "requireCommittee" = false;
