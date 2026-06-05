import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Diagnóstico temporal de stock del banco + defaults de exámenes en
 * producción. Sin auth de sesión (sería complicado desde curl), protegido
 * por token en header `x-diag-token` o querystring `?token=…` contra la
 * env var BANK_STOCK_TOKEN. No expone PII — solo conteos agregados y
 * configuración pública del examen (sin contenido de preguntas).
 *
 * Se removerá cuando termine la verificación del banco de 250.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-diag-token") ?? req.nextUrl.searchParams.get("token") ?? "";
  const expected = process.env.BANK_STOCK_TOKEN;
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "token inválido" }), {
      status: 403, headers: { "content-type": "application/json" },
    });
  }

  // Stock por banco con desglose por status.
  const banks = await prisma.questionBank.findMany({
    select: {
      id: true, code: true, name: true,
      subscriber: { select: { tradeName: true } },
    },
    orderBy: { name: "asc" },
  });
  const stockByBank = await Promise.all(banks.map(async (b) => {
    const groups = await prisma.question.groupBy({
      by: ["status"],
      where: { bankId: b.id },
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      byStatus[g.status] = g._count._all;
      total += g._count._all;
    }
    return {
      bank: b.code,
      name: b.name,
      subscriber: b.subscriber?.tradeName ?? null,
      total,
      byStatus,
    };
  }));

  // Configuración pública de todos los exámenes (sin contenido).
  const exams = await prisma.exam.findMany({
    select: {
      code: true, name: true, status: true,
      maxQuestions: true, questionSwapsAllowed: true,
      passingScore: true, requireCommittee: true,
      durationMin: true, attemptsAllowed: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return new Response(JSON.stringify({
    ok: true,
    summary: {
      totalBanks: banks.length,
      totalQuestionsAcrossAllBanks: stockByBank.reduce((a, b) => a + b.total, 0),
      banksWithAt250: stockByBank.filter((b) => b.total === 250).map((b) => b.bank),
    },
    stockByBank,
    exams: exams.map((e) => ({
      ...e,
      passingScore: Number(e.passingScore),
    })),
  }, null, 2), { status: 200, headers: { "content-type": "application/json" } });
}
