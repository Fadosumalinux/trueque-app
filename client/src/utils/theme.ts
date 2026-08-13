import type { CSSProperties } from "react";

export const colors = {
  bg: "#171412",
  surface: "#221d19",
  surface2: "#2a241f",
  border: "#3a332c",
  text: "#e8e0d6",
  textDim: "#9c9184",
  accent: "#d9a441",
  accentSoft: "#8a6a2b",
  gold: "#e8b64c",
  green: "#7ac7a4",
  red: "#d9776a",
  blue: "#7aa8c7",
};

export const roleColor = (role?: string) =>
  role === "professional" ? colors.blue : role === "deliverer" ? colors.green : colors.accent;

export const roleLabel = (role?: string) =>
  role === "professional" ? "Profesional" : role === "deliverer" ? "Repartidor" : "Vecino";

export const card: CSSProperties = {
  background: colors.surface,
  borderRadius: 16,
  border: `1px solid ${colors.border}`,
  padding: 16,
};

export const button = (variant: "primary" | "ghost" | "danger" = "primary"): CSSProperties => ({
  background: variant === "primary" ? colors.accent : variant === "danger" ? colors.red : "transparent",
  color: variant === "ghost" ? colors.text : "#171412",
  border: variant === "ghost" ? `1px solid ${colors.border}` : "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  width: "100%",
});

export const input: CSSProperties = {
  background: colors.surface2,
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box",
};

export const verifiedBadge: CSSProperties = {
  background: "#143a2c",
  color: colors.green,
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 700,
};
