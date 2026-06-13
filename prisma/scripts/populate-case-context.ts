/**
 * Script idempotente — añade el TEXTO COMPLETO DEL CASO al
 * `contextText` de las preguntas de Caso Práctico SARLAFT y
 * SAGRILAFT, y opcionalmente RESETEA un intento específico de un
 * candidato (cuando descubrimos que presentó el examen sin ver el
 * caso porque el contextText estaba vacío).
 *
 * Modos:
 *   1) Sin args: solo actualiza el contextText de las dos preguntas.
 *   2) `--reset-attempt <attemptId>`: además de actualizar el caso,
 *      marca ese intento como VOID y libera la inscripción a READY
 *      para que el candidato pueda iniciar un intento nuevo desde
 *      cero (sin que cuente como reintento porque el material estaba
 *      incompleto en el primer intento — falla del organismo).
 *
 * Uso:
 *   LOCAL:  npm run populate:case-context
 *   PROD:   DATABASE_URL=<url> npm run populate:case-context -- --reset-attempt <attemptId>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Caso SARLAFT (Supertransporte). Empresa real-shaped: razonable,
// con anomalías detectables y un nivel de detalle suficiente para
// que el candidato pueda construir la respuesta completa.
const SARLAFT_CASE = `
ESCENARIO — EMPRESA TRANSPORTES ANDINOS S.A.S.

Transportes Andinos S.A.S. es una empresa colombiana del sector
transporte terrestre de carga, vigilada por la Superintendencia de
Transporte. Tiene 14 años de operación, 47 vehículos propios, una
flota tercerizada de 28 vehículos adicionales y opera en las rutas
Bogotá–Medellín–Barranquilla y Bogotá–Cali–Buenaventura. La empresa
factura aproximadamente COP $42.000 millones al año.

ESTRUCTURA Y GOBIERNO

  • Representante Legal: Sra. Patricia Cárdenas Moreno (15 años en
    el cargo, accionista mayoritaria con el 55%).
  • Junta Directiva: 5 miembros, sesiona trimestralmente.
  • Oficial de Cumplimiento (OC) Principal: Sr. José Restrepo Vélez
    (administrador de empresas, 2 años en el cargo, dedicación
    parcial — también dirige el área de Talento Humano).
  • Oficial Suplente: no designado a la fecha.
  • Equipo de cumplimiento: una analista junior (recientemente
    contratada, 4 meses).

CLIENTES Y CONTRATOS

  • 312 clientes activos en los últimos 12 meses.
  • Cliente #1 (35% de los ingresos): "Compañía Internacional Trade
    & Logistics CITL Ltd.", domiciliada en Panamá, contrata viajes
    semanales con pagos por anticipado en efectivo recibidos en una
    cuenta corriente del Banco de Bogotá. CITL fue presentada por
    un intermediario en 2024; no se cuenta con visita comercial al
    domicilio del cliente.
  • Cliente #7: "Suministros Mineros del Pacífico", cuyo
    beneficiario final final (UBO) no ha podido determinarse — la
    sociedad tiene 3 niveles de accionistas con compañías en BVI y
    Panamá.
  • 12 clientes han realizado pagos en efectivo por valores
    individuales superiores a 10.000 USD durante los últimos 6 meses,
    sin que se haya generado reporte interno alguno.

EVENTOS Y SEÑALES DE ALERTA RECIENTES

  1. El conductor del vehículo de placa XYZ-123 reportó haber
     transportado mercancía declarada como "insumos químicos
     industriales" desde Buenaventura hasta Medellín, sin
     documentación SAE-DIAN ni manifiestos completos. El conductor
     no firmó acta. Esto ocurrió 4 veces en los últimos 60 días.
  2. La caja menor del patio operativo recibió COP $48.000.000 en
     efectivo en una sola consignación a nombre de "tercero
     anónimo" para "anticipo de fletes futuros". No se generó
     identificación del depositante.
  3. Un cliente nuevo, "Distribuciones del Norte Sociedad de
     Inversión", solicitó realizar pagos de fletes contra una
     cuenta en una jurisdicción no cooperante (Belice). La
     analista junior aprobó la vinculación sin verificar listas
     vinculantes (ONU/OFAC/CV).
  4. El OC no asistió a las dos últimas reuniones de Junta y no
     ha presentado los informes trimestrales del año en curso.
  5. La empresa no tiene Sistema de Administración del Riesgo
     LA/FT aprobado por la Junta — opera con un manual heredado
     del año 2018.

DOCUMENTACIÓN DISPONIBLE PARA SU ANÁLISIS

  • Estados financieros de los últimos 3 años.
  • Listado de los 50 principales clientes con monto, frecuencia
    y modalidad de pago.
  • Manual SARLAFT vigente (2018).
  • Reporte mensual del oficial — solo enero a marzo del año en
    curso.
  • Comunicación oficial de la Superintendencia de Transporte
    requiriendo el reporte SARLAFT del año anterior (fecha de
    vencimiento: hace 45 días).

USTED HA SIDO CONTRATADO COMO OFICIAL DE CUMPLIMIENTO PRINCIPAL
SUPLENTE PARA ASESORAR A LA EMPRESA Y REGULARIZAR SU SARLAFT.
Tiene 4 horas para entregar su análisis y plan de acción siguiendo
las instrucciones de la pregunta.
`.trim();

const SAGRILAFT_CASE = `
ESCENARIO — INDUSTRIAS DELTA S.A.

Industrias Delta S.A. es una sociedad anónima del sector real con
sede en Bogotá, vigilada por la Superintendencia de Sociedades.
Se dedica a la fabricación y comercialización de productos
químicos especializados para minería y agroindustria. Tiene 23
años de operación, 380 empleados directos y factura
aproximadamente COP $185.000 millones al año.

ESTRUCTURA Y GOBIERNO CORPORATIVO

  • Representante Legal: Sr. Carlos Eduardo Ramírez Posada (8 años).
  • Junta Directiva: 7 miembros (incluye 2 independientes).
  • Oficial de Cumplimiento: Dra. Lina Marcela Torres (abogada,
    11 meses en el cargo, dedicación 50% — el otro 50% es del área
    jurídica).
  • Comité de Auditoría: 3 miembros, sesiona cuatrimestralmente.
  • Programa de Transparencia y Ética Empresarial (PTEE): aprobado
    por la Junta en 2023, pendiente de actualización a 2026.

CONTRAPARTES Y RELACIONES COMERCIALES

  • 84 proveedores activos. El proveedor #3 ("Quimitech Holding")
    aporta el 28% de las compras anuales y está domiciliado en
    Islas Vírgenes Británicas (BVI). El beneficiario final aún no
    ha sido determinado por la empresa.
  • 217 clientes activos en los últimos 12 meses.
  • 6 clientes son Personas Expuestas Políticamente (PEP) — uno de
    ellos, hijo de un congresista de la región, vinculado en 2025
    sin que se realizara la debida diligencia reforzada.
  • Existe una sociedad relacionada: "Delta Energy LLC" en Delaware
    (EE.UU.). El representante legal de Industrias Delta es también
    director de Delta Energy. Las transacciones intercompañía
    superaron USD 4.200.000 en el último año.

EVENTOS Y SEÑALES DE ALERTA RECIENTES

  1. Operación con un proveedor ocasional ("Servicios Andinos
     Express") por COP $720.000.000 pagada en una sola transacción
     bancaria sin proceso de selección documentado, sin contrato
     formal y con un detalle vago de "servicios logísticos".
  2. Cinco facturas de "Quimitech Holding" fueron pagadas a una
     cuenta distinta a la registrada en el RUT del proveedor, en
     una entidad financiera de Hong Kong.
  3. Una donación a una fundación recién creada, vinculada a un
     funcionario público de Min. Ambiente, por COP $185.000.000
     justo antes del trámite de una licencia.
  4. El sistema de monitoreo transaccional generó 38 alertas el
     último trimestre. Ninguna se documentó ni se cerró.
  5. La empresa no ha aplicado debida diligencia reforzada sobre
     el cliente PEP de mayor riesgo, ni sobre los 12 clientes
     ubicados en jurisdicciones no cooperantes.
  6. El PTEE no ha sido socializado con la fuerza comercial.

DOCUMENTACIÓN DISPONIBLE PARA SU ANÁLISIS

  • Manual SAGRILAFT vigente (versión 2023).
  • Listado de proveedores y clientes con su rotación, monto y
    jurisdicción.
  • Estados financieros últimos 3 años.
  • Actas de Junta Directiva y Comité de Auditoría.
  • Reporte de alertas del monitoreo transaccional.
  • Comunicación de la Supersociedades requiriendo plan de cierre
    de brechas en el SAGRILAFT (vencimiento: hace 30 días).

USTED HA SIDO CONTRATADO COMO ASESOR EXTERNO PARA REVISAR EL
SAGRILAFT DE INDUSTRIAS DELTA S.A. Y CONSTRUIR EL PLAN DE
REMEDIACIÓN. Tiene 4 horas para entregar su análisis y plan de
acción siguiendo las instrucciones de la pregunta.
`.trim();

async function main() {
  const args = process.argv.slice(2);
  const resetIdx = args.indexOf("--reset-attempt");
  const resetAttemptId = resetIdx >= 0 ? args[resetIdx + 1] : null;

  // 1) Actualizar el contextText de las dos preguntas Case Study.
  const sarlaft = await prisma.question.findFirst({
    where: { code: "ST-CASO-01" },
    select: { id: true, code: true, statement: true },
  });
  const sagrilaft = await prisma.question.findFirst({
    where: { code: "SG-CASO-01" },
    select: { id: true, code: true, statement: true },
  });

  if (sarlaft) {
    await prisma.question.update({
      where: { id: sarlaft.id },
      data: { contextText: SARLAFT_CASE },
    });
    console.log(`✓ Caso SARLAFT (${sarlaft.code}) — contextText actualizado (${SARLAFT_CASE.length} chars).`);
  } else {
    console.log("⚠ No se encontró ST-CASO-01");
  }
  if (sagrilaft) {
    await prisma.question.update({
      where: { id: sagrilaft.id },
      data: { contextText: SAGRILAFT_CASE },
    });
    console.log(`✓ Caso SAGRILAFT (${sagrilaft.code}) — contextText actualizado (${SAGRILAFT_CASE.length} chars).`);
  } else {
    console.log("⚠ No se encontró SG-CASO-01");
  }

  // 2) Reset COMPLETO del intento si se pidió. Borra el ExamAttempt y
  //    sus respuestas/eventos asociados — así NO cuenta para el límite
  //    de reintentos (el fallo fue del organismo: el caso no estaba
  //    disponible al candidato porque contextText estaba vacío). La
  //    inscripción vuelve a READY para que pueda iniciar uno nuevo.
  //
  //    Registra una entrada en AuditLog para tener trazabilidad del
  //    reseteo de oficio.
  if (resetAttemptId) {
    console.log(`\n→ Reseteando intento ${resetAttemptId} ...`);
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: resetAttemptId },
      select: {
        id: true,
        candidateId: true,
        enrollmentId: true,
        subscriberId: true,
        status: true,
        attemptNumber: true,
        scorePercent: true,
      },
    });
    if (!attempt) {
      console.log("✗ Intento no encontrado.");
    } else {
      // Recopilar IDs de AttemptQuestion para borrar respuestas en cascada
      // (algunas relaciones tienen onDelete Cascade, otras no — somos
      // explícitos para no dejar huérfanos).
      const aqIds = await prisma.attemptQuestion.findMany({
        where: { attemptId: attempt.id },
        select: { id: true },
      });
      const aqIdList = aqIds.map((a) => a.id);

      await prisma.$transaction([
        // Bitácora del reseteo de oficio (queda incluso después de
        // borrar el intento).
        prisma.auditLog.create({
          data: {
            action: "attempt.void_reset_by_organizer",
            entity: "ExamAttempt",
            entityId: attempt.id,
            subscriberId: attempt.subscriberId,
            after: {
              reason:
                "Caso Práctico sin contextText — material incompleto durante el intento. Reseteo de oficio para que el candidato presente de nuevo SIN consumir cupo.",
              previousScore: attempt.scorePercent?.toString() ?? null,
              previousStatus: attempt.status,
              previousAttemptNumber: attempt.attemptNumber,
            },
          },
        }),
        prisma.attemptAnswer.deleteMany({
          where: { attemptQuestionId: { in: aqIdList } },
        }),
        prisma.attemptQuestion.deleteMany({
          where: { attemptId: attempt.id },
        }),
        prisma.attemptEvent.deleteMany({
          where: { attemptId: attempt.id },
        }),
        prisma.examAttempt.delete({ where: { id: attempt.id } }),
        prisma.enrollment.update({
          where: { id: attempt.enrollmentId },
          data: { status: "READY" },
        }),
      ]);
      console.log(
        `✓ Intento ${attempt.id} ELIMINADO (no cuenta como cupo). Enrollment ${attempt.enrollmentId} → READY. Reseteo registrado en AuditLog.`,
      );
    }
  }

  console.log("\n✅ Listo.");
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
