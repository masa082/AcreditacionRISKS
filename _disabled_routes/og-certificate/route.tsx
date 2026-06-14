/// Imagen Open Graph (1200 × 630) del certificado para previews de
/// LinkedIn, WhatsApp y Twitter/X. Se construye con `next/og`
/// (`ImageResponse`) — devuelve PNG dinámico sin instalar deps nuevas.
///
/// La insignia muestra:
///   - Marca "CERTIFICADO VERIFICADO" + ✓
///   - Nombre del titular (mayúsculas)
///   - Título del esquema certificado
///   - Organismo emisor + ISO/IEC 17024
///   - Código del certificado y URL pública del verificador

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const cert = await prisma.certificate.findFirst({
    where: { OR: [{ code }, { verifyToken: code }] },
    include: {
      subscriber: { select: { tradeName: true, legalName: true } },
      scheme: { select: { name: true, normReference: true } },
    },
  });

  // Caso no encontrado: insignia genérica con marca CIOC.
  if (!cert) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#0a1032 0%,#181d49 100%)",
            color: "white", fontFamily: "ui-sans-serif, system-ui",
          }}
        >
          <div style={{ fontSize: 70, fontWeight: 800 }}>Certificado no encontrado</div>
          <div style={{ marginTop: 24, opacity: 0.7, fontSize: 28 }}>okacreditado.com</div>
        </div>
      ),
      { width: W, height: H },
    );
  }

  const isExpired = cert.expiresAt && cert.status === "VALID" && cert.expiresAt < new Date();
  const effective = isExpired ? "VENCIDO" : cert.status === "VALID" ? "VIGENTE" : cert.status;
  const isValid = effective === "VIGENTE";

  const org = (cert.subscriber.tradeName ?? cert.subscriber.legalName).toUpperCase();
  const holder = cert.holderName.toUpperCase();
  const title = cert.title;
  const issuedYear = cert.issuedAt.getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          background: "#FBFAF4",
          fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
          color: "#0A1032",
          position: "relative",
        }}
      >
        {/* Banda superior con organismo */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "32px 60px",
            background: "linear-gradient(90deg,#0A1032 0%,#181D49 100%)",
            color: "white",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 18, letterSpacing: 4, opacity: 0.85, fontWeight: 700 }}>
              ORGANISMO CERTIFICADOR
            </span>
            <span style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: 1.2 }}>
              {org}
            </span>
          </div>
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              fontSize: 16, opacity: 0.85,
            }}
          >
            <span style={{ letterSpacing: 2, fontWeight: 700 }}>ISO/IEC 17024</span>
            <span style={{ fontSize: 13, marginTop: 4 }}>okacreditado.com</span>
          </div>
        </div>

        {/* Marco dorado */}
        <div
          style={{
            position: "absolute", left: 30, right: 30, top: 130, bottom: 30,
            border: "3px solid #C9A23C",
            borderRadius: 6,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute", left: 42, right: 42, top: 142, bottom: 42,
            border: "1px solid #E8CD77",
            borderRadius: 4,
            display: "flex",
          }}
        />

        {/* Cuerpo */}
        <div
          style={{
            flex: 1,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "20px 80px",
            textAlign: "center",
          }}
        >
          {/* Badge VIGENTE / VENCIDO */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 22px",
              borderRadius: 999,
              background: isValid ? "#ECFDF5" : "#FEF3C7",
              color: isValid ? "#047857" : "#92400E",
              border: `2px solid ${isValid ? "#10B981" : "#F59E0B"}`,
              fontSize: 22, fontWeight: 800, letterSpacing: 2,
            }}
          >
            <span style={{ fontSize: 28 }}>{isValid ? "✓" : "⚠"}</span>
            CERTIFICADO {effective}
          </div>

          {/* Nombre del titular */}
          <div
            style={{
              marginTop: 36,
              fontSize: holder.length > 28 ? 56 : 72,
              fontWeight: 800,
              fontStyle: "italic",
              color: "#0A1032",
              maxWidth: 1060,
              lineHeight: 1.1,
            }}
          >
            {holder}
          </div>

          {/* Línea decorativa dorada */}
          <div
            style={{
              display: "flex",
              width: 440, height: 3, marginTop: 18,
              background: "linear-gradient(90deg,transparent 0%,#C9A23C 50%,transparent 100%)",
            }}
          />

          {/* Esquema certificado */}
          <div
            style={{
              marginTop: 22,
              fontSize: title.length > 70 ? 26 : 32,
              fontWeight: 700,
              color: "#BB8E23",
              maxWidth: 980,
              lineHeight: 1.25,
            }}
          >
            {title}
          </div>

          {/* Pie */}
          <div
            style={{
              display: "flex", gap: 28, marginTop: 36,
              fontSize: 18, color: "#777C82",
            }}
          >
            <span>Código <strong style={{ color: "#0A1032" }}>{cert.code}</strong></span>
            <span>·</span>
            <span>Emitido en {issuedYear}</span>
            <span>·</span>
            <span style={{ color: "#BB8E23", fontWeight: 700 }}>VERIFIQUE EN okacreditado.com/verificar/{cert.code}</span>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
