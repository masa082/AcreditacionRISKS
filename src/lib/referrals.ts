// Configuración del programa de referidos. Centralizado para que cualquier
// módulo (UI, server actions, webhook Rapyd, panel admin) consulte una
// única fuente de verdad. Si en el futuro RISKS quiere variar los
// porcentajes por esquema, este archivo se reemplaza por una consulta a BD.

import { randomBytes } from "node:crypto";

export const REFERRAL_PROGRAM = {
  /** % de descuento que recibe el referido sobre el monto del programa. */
  discountPercent: 10,
  /** % del monto pagado por el referido que se entrega como recompensa al referidor. */
  rewardPercent: 10,
  currency: "COP",
};

/// Genera un código de referido único de 8 caracteres alfanuméricos.
export function generateReferralCode(): string {
  return randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
}

export const REFERRAL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

export const REFERRER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
};
