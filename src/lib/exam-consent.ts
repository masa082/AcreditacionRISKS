/**
 * Texto canónico del consentimiento que debe firmar el candidato antes de
 * iniciar la prueba. Cualquier cambio aquí queda inmortalizado en cada
 * intento (ExamAttempt.consentText es un snapshot al momento de firmar),
 * así si el operador del organismo cambia las reglas, los intentos previos
 * no se ven afectados.
 *
 * Está aislado en este módulo (no en `src/lib/actions/attempt.ts`) porque
 * Next.js prohíbe exports no-función desde archivos `"use server"`.
 */
export const EXAM_CONSENT_TEXT = `\
1) Acepto que esta evaluación se realiza bajo mi responsabilidad personal y
   que respondo a conciencia, sin uso de ayudas externas, materiales no
   autorizados ni asistencia de terceros.

2) Acepto los resultados que arroje el sistema y entiendo que éstos
   dependen exclusivamente de las respuestas que yo registre durante la
   presentación. No habrá modificación de la calificación por causas
   ajenas a la prueba misma.

3) Entiendo que la prueba está bajo monitoreo: se registran salidas de
   pantalla, cambios de pestaña, intentos de copia, captura y el tiempo
   en cada pregunta. Esta información queda asociada al intento para
   auditoría.

4) Entiendo que las preguntas y respuestas son confidenciales y que su
   reproducción total o parcial (capturas, fotos, divulgación) está
   estrictamente prohibida.

5) Conozco que puedo reportar cualquier novedad durante la prueba
   (corte de luz, problema técnico, duda) usando el botón "Reportar
   novedad", y que cada reporte queda registrado para revisión del
   organismo.`;
