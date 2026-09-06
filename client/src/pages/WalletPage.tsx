import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, card } from "../utils/theme";
import type { LedgerEntry } from "../types";

const TYPE_ICON: Record<string, string> = {
  welcome: "🎁",
  generated_barter: "🌾",
  commission: "☕",
  payment: "🪙",
  refund: "↩️",
  delivery_fee: "📦",
  fee_split: "🍰",
};

export default function WalletPage() {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    api.wallet.get().then((w) => setLedger(w.ledger));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold, marginBottom: 12 }}>Monedero</div>

      <div style={{ ...card, background: "linear-gradient(135deg,#2a241f,#1d2a1a)", textAlign: "center", padding: 28 }}>
        <div style={{ fontSize: 13, color: colors.textDim }}>SALDO EN FIELES</div>
        <div style={{ fontSize: 46, fontWeight: 900, color: colors.gold }}>{user?.credits.toFixed(0)} <span style={{ fontSize: 24 }}>🪙</span></div>
        <div style={{ fontSize: 11, color: colors.textDim, marginTop: 8 }}>
          Los fieles nacen del intercambio. No se compran con dinero de bancos.
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textDim, margin: "16px 4px 8px" }}>MOVIMIENTOS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ledger.length === 0 && <div style={{ ...card, color: colors.textDim }}>Todavía no hay movimientos.</div>}
        {ledger.map((e) => (
          <div key={e.id} style={{ ...card, display: "flex", gap: 12, alignItems: "center", padding: 12 }}>
            <span style={{ fontSize: 22 }}>{TYPE_ICON[e.type] || "·"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>{e.label}</div>
              <div style={{ fontSize: 11, color: colors.textDim }}>{new Date(e.createdAt).toLocaleString("es-AR")}</div>
            </div>
            <b style={{ fontSize: 16, color: e.amount >= 0 ? colors.green : colors.red }}>
              {e.amount >= 0 ? "+" : ""}{e.amount}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
