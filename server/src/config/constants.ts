import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3002),
  jwtSecret: process.env.JWT_SECRET || "pacto-local-secret-2026",
  // "El valor de un café": comisión de la plataforma sobre el valor zonal.
  platformFeeRate: 0.03,
  // Carga de la comisión entre las partes. El total ingresa a la plataforma
  // como seguro de transacción + validación de identidad + soporte.
  feeSplitBase: { seller: 0.5, buyer: 0.5 },
  feeSplitWithDeliverer: { seller: 0.34, buyer: 0.33, deliverer: 0.33 },
  platformUserId: "user-plataforma",
  welcomeCredits: 50,
};

export const ZONES = [];
export const CATEGORIES = [];
