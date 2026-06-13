-- Política: el examen práctico (Caso Práctico) se aprueba con nota >= 70.
-- Bajamos el umbral aprobatorio de todos los exámenes type=PRACTICAL que
-- estuvieran por encima de 70 (heredados del seed que los puso en 80).
UPDATE "Exam"
SET "passingScore" = 70
WHERE type = 'PRACTICAL'
  AND "passingScore" > 70;