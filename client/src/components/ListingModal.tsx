import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, input, button, card, verifiedBadge, roleLabel } from "../utils/theme";
import type { Listing } from "../types";

export default function ListingModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { user } = useAuth();
  const [showExchange, setShowExchange] = useState(false);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {!showExchange ? (
          <>
            <div style={{ fontSize: 64, textAlign: "center", padding: "18px 0", background: colors.surface2, borderRadius: 14, marginBottom: 12 }}>
              {listing.category.emoji}
            </div>
            <h2 style={{ margin: 0, color: colors.text }}>{listing.title}</h2>
            <div style={{ color: colors.textDim, fontSize: 13, margin: "4px 0 12px" }}>
              {listing.category.emoji} {listing.category.name} · {listing.zone.name}
            </div>

            <p style={{ color: colors.textDim, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{listing.description}</p>

            <div style={{ ...card, marginTop: 12, background: "#1d2a1a" }}>
              <div style={{ fontSize: 12, color: colors.green, fontWeight: 700 }}>QUÉ ACEPTA A CAMBIO</div>
              <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>{listing.acceptTerms}</div>
            </div>

            <div style={{ ...card, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{listing.user.displayName}</div>
                <div style={{ fontSize: 12, color: colors.textDim }}>
                  {roleLabel(listing.user.role)} · ★ {listing.user.ratingAvg.toFixed(1)} ({listing.user.ratingCount || 0})
                </div>
                {listing.user.coverageZone && (
                  <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>🗺️ Cobertura: {listing.user.coverageZone}</div>
                )}
              </div>
              {listing.user.verificationStatus === "verified" ? (
                <span style={verifiedBadge}>✓ identidad</span>
              ) : (
                <span style={{ background: "#3a2c22", color: colors.accentSoft, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>⏳ por validar</span>
              )}
            </div>

            <div style={{ ...card, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: colors.accentSoft }}>
              <span style={{ fontSize: 13, color: colors.textDim }}>Valor zonal de referencia</span>
              <span style={{ fontWeight: 800, color: colors.gold, fontSize: 18 }}>≈ {listing.estimatedValue} 🪙</span>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: colors.textDim }}>
              El valor zonal es el "seguro" del trueque: sobre él se calcula la comisión (el valor de un café), repartida entre las partes y destinada a validación de identidad y soporte.
            </div>

            {user && user.id !== listing.user.id && (
              <button style={{ ...button(), marginTop: 14 }} onClick={() => setShowExchange(true)}>
                🤝 Proponer trueque
              </button>
            )}
            <button style={{ ...button("ghost"), marginTop: 8 }} onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <ExchangeForm listing={listing} onBack={() => setShowExchange(false)} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ExchangeForm({ listing, onBack, onClose }: { listing: Listing; onBack: () => void; onClose: () => void }) {
  const [mode, setMode] = useState<"barter" | "mixed" | "credits">("barter");
  const [offerTerms, setOfferTerms] = useState("");
  const [creditsAmount, setCreditsAmount] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await api.exchanges.create({
        listingId: listing.id,
        mode,
        offerTerms,
        creditsAmount: mode === "barter" ? 0 : creditsAmount,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 52 }}>✉️</div>
        <h3 style={{ color: colors.gold, margin: "8px 0" }}>Propuesta enviada</h3>
        <p style={{ color: colors.textDim, fontSize: 14 }}>
          {listing.user.displayName} recibió tu propuesta. Lo vas a ver en <b>Acuerdos</b> cuando la acepte.
        </p>
        <button style={button()} onClick={onClose}>Entendido</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: colors.textDim, fontSize: 13, cursor: "pointer", padding: 0 }}>
        ← Volver
      </button>
      <h3 style={{ color: colors.gold, margin: "8px 0" }}>Proponer trueque</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {([["barter", "🔄 Trueque"], ["mixed", "🔀 Mixto"], ["credits", "🪙 Créditos"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: mode === m ? colors.accent : colors.surface, color: mode === m ? "#171412" : colors.textDim,
              border: `1px solid ${mode === m ? colors.accent : colors.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>QUÉ OFRECÉS</label>
      <textarea
        style={{ ...input, minHeight: 90, marginTop: 6 }}
        placeholder="Ej: te doy el taladro + una docena de facturas, y lo paso por tu casa"
        value={offerTerms}
        onChange={(e) => setOfferTerms(e.target.value)}
      />

      {mode !== "barter" && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>EN CRÉDITOS (adicional)</label>
          <input style={{ ...input, marginTop: 6 }} type="number" min={0} value={creditsAmount} onChange={(e) => setCreditsAmount(Number(e.target.value))} />
        </div>
      )}

      {error && <div style={{ color: colors.red, fontSize: 13, margin: "10px 0" }}>{error}</div>}

      <button style={{ ...button(), marginTop: 12 }} onClick={submit} disabled={busy || offerTerms.trim().length < 10}>
        {busy ? "Enviando…" : "Enviar propuesta"}
      </button>
    </>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
};

const modal: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 18, width: "100%", maxHeight: "88vh", overflowY: "auto",
};
