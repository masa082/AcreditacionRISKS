/// Genera dos PDFs de muestra (diploma + constancia) usando el nuevo
/// diseño y los guarda en /tmp para revisión visual.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { renderCertificatePdf } from "../../src/lib/certificate-design";

const qrBytes = existsSync("/tmp/qr-sample.png") ? new Uint8Array(readFileSync("/tmp/qr-sample.png")) : null;

async function main() {
  const baseSubscriber = {
    tradeName: "RISKS INTERNATIONAL — CIOC",
    legalName: "RISKS INTERNATIONAL S.A.S.",
    authorizedSigner: "Dr. Carlos Andrés Rincón",
    taxId: "900352786",
  };
  const baseScheme = { normReference: "ISO/IEC 17024 · Decreto 830 de 2021" };

  const diploma = await renderCertificatePdf({
    cert: {
      type: "CERTIFICATION",
      code: "CIOC-2026-1F773B6D",
      title: "Certificación Profesional de Oficial de Cumplimiento SARLAFT (Supertransporte)",
      scope: "Prevención del lavado de activos y financiación del terrorismo en el sector transporte de carga — Resolución 20203040016585 de 2020.",
      holderName: "SAMUEL SÁNCHEZ",
      documentNumber: "7182416",
      issuedAt: new Date("2026-06-13T16:41:12Z"),
      expiresAt: new Date("2029-06-13T16:41:12Z"),
      status: "VALID",
      subscriber: baseSubscriber,
      scheme: baseScheme,
    },
    qrPngBytes: qrBytes,
    logoBytes: null,
    logoIsPng: true,
    signatureBytes: null,
    signatureIsPng: true,
    tokenPreview: "6b8f13ce…6c85d894",
  });
  writeFileSync("/tmp/sample-diploma.pdf", diploma);
  console.log("Diploma → /tmp/sample-diploma.pdf");

  const constancia = await renderCertificatePdf({
    cert: {
      type: "EXAM_PRESENTATION",
      code: "PRES-2026-BC128BA1",
      title: "Constancia de presentación · Examen Teórico SARLAFT (Supertransporte)",
      scope: "Marco normativo SARLAFT del sector transporte, debida diligencia, monitoreo transaccional, ROS/ROI.",
      holderName: "SAMUEL SÁNCHEZ",
      documentNumber: "7182416",
      issuedAt: new Date("2026-06-12T23:28:14Z"),
      expiresAt: null,
      status: "VALID",
      subscriber: baseSubscriber,
      scheme: baseScheme,
    },
    qrPngBytes: qrBytes,
    logoBytes: null,
    logoIsPng: true,
    signatureBytes: null,
    signatureIsPng: true,
    tokenPreview: "6b8f13ce…6c85d894",
  });
  writeFileSync("/tmp/sample-constancia.pdf", constancia);
  console.log("Constancia → /tmp/sample-constancia.pdf");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
