import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, card, button, input } from "../utils/theme";
import type { Exchange } from "../types";

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Propuesta", color: colors.blue },
  accepted: { label: "Aceptado", color: colors.gold },
  completed: { label: "Completado", color: colors.green },
  cancelled: { label: "Cancelado", color: colors.red },
};

export default function ExchangesPage() {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [active, setActive] = useState<Exchange | null>(null);

  const load = () => api.exchanges.list().then(setExchanges);
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Acuerdos</div>
        <div style={{ fontSize: 12, color: colors.textDim }}>Tus trueques en curso y sus estados</div>
      </header>

      {exchanges.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: colors.textDim }}>
          Todavía no tenés acuerdos. ¡Deslizá en Descubrir y proponé tu primer trueque!
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {exchanges.map((ex) => {
          const other = ex.fromUserId === user?.id ? ex.toUser : ex.fromUser;
          const st = STATUS[ex.status] || { label: ex.status, color: colors.textDim };
          return (
            <button key={ex.id} onClick={() => setActive(ex)} style={{ ...card, textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{ex.listing.title}</b>
                <span style={{ fontSize: 11, fontWeight: 800, color: st.color }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>
                con <b style={{ color: colors.text }}>{other.displayName}</b> · {ex.mode} · ≈ {ex.estimatedValue} 🪙
              </div>
              {ex.deliverer && (
                <div style={{ fontSize: 11, color: colors.green, marginTop: 4 }}>📦 {ex.deliverer.displayName} entrega</div>
              )}
            </button>
          );
        })}
      </div>

      {active && <ExchangeDetail exchange={active} onClose={() => { setActive(null); load(); }} />}
    </div>
  );
}

function ExchangeDetail({ exchange, onClose }: { exchange: Exchange; onClose: () => void }) {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cost, setCost] = useState(25);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const me = user?.id;
  const other = exchange.fromUserId === me ? exchange.toUser : exchange.fromUser;
  const otherId = exchange.fromUserId === me ? exchange.toUserId : exchange.fromUserId;
  const isDeliverer = user?.role === "deliverer";

  const act = async (action: () => Promise<any>, then?: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await action();
      await refreshUser();
      if (then) await then();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: colors.gold }}>{exchange.listing.title}</h3>
        <div style={{ color: colors.textDim, fontSize: 12, margin: "4px 0 12px" }}>
          con {other.displayName} · {exchange.mode} · ≈ {exchange.estimatedValue} 🪙
        </div>

        <div style={{ ...card, background: "#1d2a1a" }}>
          <div style={{ fontSize: 12, color: colors.green, fontWeight: 700 }}>PROPUESTA DE {exchange.fromUser.displayName}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>{exchange.offerTerms}</div>
          {exchange.creditsAmount > 0 && (
            <div style={{ fontSize: 13, color: colors.gold, marginTop: 6 }}>+ {exchange.creditsAmount} 🪙 en créditos</div>
          )}
        </div>

        <div style={{ fontSize: 11, color: colors.textDim, margin: "10px 0" }}>
          Comisión "el café": {exchange.platformFee} 🪙 ({Math.round((exchange.platformFee / exchange.estimatedValue) * 100)}% del valor zonal), repartida entre las partes.
        </div>

        {exchange.deliverer && (
          <div style={{ ...card, background: "#12251d", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: colors.green, fontWeight: 700 }}>📦 LOGÍSTICA</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {exchange.deliverer.displayName} · {exchange.deliveryCost} 🪙
            </div>
          </div>
        )}

        {error && <div style={{ color: colors.red, fontSize: 13, margin: "8px 0" }}>{error}</div>}

        {/* Acciones según estado */}
        {exchange.status === "pending" && (
          <>
            {exchange.toUserId === me && (
              <button style={{ ...button(), marginBottom: 8 }} onClick={() => act(() => api.exchanges.accept(exchange.id))} disabled={busy}>
                Aceptar propuesta
              </button>
            )}
            <button style={{ ...button("danger") }} onClick={() => act(() => api.exchanges.cancel(exchange.id))} disabled={busy}>
              Cancelar
            </button>
          </>
        )}

        {exchange.status === "accepted" && (
          <>
            {isDeliverer && !exchange.deliverer && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>COSTO DE ENTREGA (créditos)</label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input style={{ ...input, flex: 1 }} type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
                  <button style={{ ...button(), width: "auto" }} onClick={() => act(() => api.deliveries.offer(exchange.id, { costCredits: cost, pickupNote: "Entrega coordinada por la app" }))} disabled={busy}>
                    📦 Ofrecer entrega
                  </button>
                </div>
              </div>
            )}
            <button style={button()} onClick={() => act(() => api.exchanges.complete(exchange.id))} disabled={busy}>
              ✓ Marcar trueque completado
            </button>
          </>
        )}

        {exchange.status === "completed" && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>RESEÑA PARA {other.displayName.toUpperCase()}</label>
            <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  style={{
                    fontSize: 20, background: "transparent", border: "none", cursor: "pointer",
                    opacity: r <= rating ? 1 : 0.3,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <input style={input} placeholder="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <button
              style={{ ...button(), marginTop: 8 }}
              onClick={() => act(() => api.reviews.create({ exchangeId: exchange.id, revieweeId: otherId, rating, comment }))}
              disabled={busy}
            >
              Enviar reseña
            </button>
          </div>
        )}

        <button style={{ ...button("ghost"), marginTop: 10 }} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
};

const modal: React.CSSProperties = {
  background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 18, width: "100%", maxHeight: "88vh", overflowY: "auto",
};
