import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, input, button, card, verifiedBadge, roleLabel } from "../utils/theme";
import type { Listing } from "../types";

export default function ListingModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { user } = useAuth();
  const [showExchange, setShowExchange] = useState(false);
  const [live, setLive] = useState(listing);

  const isAuction = listing.mode?.type === "auction" || (listing.minBid || listing.bidStep || listing.auctionEnd) ? true : false;
  const isOwner = user?.id === listing.userId;
  const now = Date.now();
  const auctionOpen = isAuction && (!live.auctionStart || now >= new Date(live.auctionStart).getTime());
  const auctionEnded = isAuction && live.auctionEnd && now > new Date(live.auctionEnd).getTime();
  const topBid = live.bids?.[0];
  const myBid = live.bids?.find((b) => b.bidderId === user?.id);

  useEffect(() => {
    if (isAuction) {
      const t = setInterval(() => {
        api.listings.get(listing.id).then((l) => setLive(l)).catch(() => {});
      }, 15000);
      return () => clearInterval(t);
    }
  }, [listing.id]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {!showExchange ? (
          <>
            <div style={{ fontSize: 64, textAlign: "center", padding: "18px 0", background: colors.surface2, borderRadius: 14, marginBottom: 12 }}>
              {live.category.emoji}
            </div>
            <h2 style={{ margin: 0, color: colors.text }}>{live.title}</h2>
            <div style={{ color: colors.textDim, fontSize: 13, margin: "4px 0 12px" }}>
              {live.category.emoji} {live.category.name} · {live.zone.name}
            </div>

            {live.mode && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: colors.surface2, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: colors.gold, marginBottom: 10 }}>
                {isAuction ? "⚖️ " : ""}{live.mode.name}{live.mode.description ? <span style={{ color: colors.textDim, fontWeight: 400 }}> — {live.mode.description}</span> : null}
              </div>
            )}

            {isAuction && (
              <div style={{ ...card, marginTop: 4, background: "#2a241f", borderColor: colors.accentSoft }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.gold }}>⚖️ Subasta</span>
                  {live.status === "auction_closed" ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>● Cerrada</span>
                  ) : auctionEnded ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.red }}>● Terminó hace un momento</span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.green }}>● Abierta</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: colors.textDim }}>
                  {live.minBid && <span>Piso: <b style={{ color: colors.text }}>{live.minBid} 🪙</b></span>}
                  {live.maxBid && <span>Techo: <b style={{ color: colors.text }}>{live.maxBid} 🪙</b></span>}
                  {live.bidStep && <span>Paso: <b style={{ color: colors.text }}>{live.bidStep} 🪙</b></span>}
                  {live.maxParticipants && <span>Cupo: <b style={{ color: colors.text }}>{live.maxParticipants} pers.</b></span>}
                </div>
                <div style={{ fontSize: 12, color: colors.textDim, marginTop: 6 }}>
                  {live.auctionStart && new Date(live.auctionStart).getTime() > now ? (
                    <>Empieza: <b style={{ color: colors.text }}>{new Date(live.auctionStart).toLocaleString("es-AR")}</b></>
                  ) : live.auctionEnd ? (
                    <>Cierra: <b style={{ color: colors.text }}>{new Date(live.auctionEnd).toLocaleString("es-AR")}</b></>
                  ) : null}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, background: "#1d2a1a", padding: "10px 12px", borderRadius: 10 }}>
                  <div>
                    {topBid ? (
                      <>
                        <div style={{ fontSize: 11, color: colors.textDim }}>MEJOR PUJA</div>
                        <div style={{ fontWeight: 900, color: colors.gold }}>{topBid.amount} 🪙</div>
                        <div style={{ fontSize: 11, color: colors.textDim }}>por {topBid.bidder.displayName}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: colors.textDim }}>Todavía no hay pujas</div>
                    )}
                  </div>
                  {myBid && (
                    <div style={{ fontSize: 12, color: myBid.status === "active" ? colors.green : colors.textDim }}>
                      {myBid.status === "active" ? "● Tu puja manda" : myBid.status === "outbid" ? "◔ Te superaron" : "○"}
                    </div>
                  )}
                </div>

                {!isOwner && user && live.status === "active" && auctionOpen && !auctionEnded && <BidForm listing={listing} live={live} onBid={(l) => setLive(l)} />}
                {isOwner && live.status === "active" && auctionOpen && (
                  <button
                    style={{ ...button("ghost"), marginTop: 10, width: "100%" }}
                    onClick={async () => {
                      await api.bids.close(live.id);
                      api.listings.get(live.id).then((l) => setLive(l));
                    }}
                  >
                    🏁 Cerrar subasta ahora
                  </button>
                )}
                {!isOwner && live.status === "auction_closed" && topBid?.bidderId === user?.id && (
                  <div style={{ background: "#143a2c", color: colors.green, borderRadius: 12, padding: 12, fontSize: 13, marginTop: 10 }}>
                    🎉 Ganaste la subasta. El pacto está aceptado — completalo desde <b>Mis pactos</b>.
                  </div>
                )}
              </div>
            )}

            <p style={{ color: colors.textDim, fontSize: 14, lineHeight: 1.5, margin: "12px 0 0" }}>{live.description}</p>

            <div style={{ ...card, marginTop: 12, background: "#1d2a1a" }}>
              <div style={{ fontSize: 12, color: colors.green, fontWeight: 700 }}>QUÉ ACEPTA A CAMBIO</div>
              <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>{live.acceptTerms}</div>
            </div>

            <div style={{ ...card, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{live.user.displayName}</div>
                <div style={{ fontSize: 12, color: colors.textDim }}>
                  {roleLabel(live.user.role)} · ★ {live.user.ratingAvg.toFixed(1)} ({live.user.ratingCount || 0})
                </div>
                {live.user.coverageZone && (
                  <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>🗺️ Cobertura: {live.user.coverageZone}</div>
                )}
              </div>
              {live.user.verificationStatus === "verified" ? (
                <span style={verifiedBadge}>✓ identidad</span>
              ) : (
                <span style={{ background: "#3a2c22", color: colors.accentSoft, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>⏳ por validar</span>
              )}
            </div>

            <div style={{ ...card, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: colors.accentSoft }}>
              <span style={{ fontSize: 13, color: colors.textDim }}>Valor zonal de referencia</span>
              <span style={{ fontWeight: 800, color: colors.gold, fontSize: 18 }}>≈ {live.estimatedValue} 🪙</span>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: colors.textDim }}>
              El valor zonal es el "seguro" del pacto: sobre él se calcula la comisión (el valor de un café), repartida entre las partes y destinada a validación de identidad y soporte.
            </div>

            {user && !isOwner && !isAuction && (
              <button style={{ ...button(), marginTop: 14 }} onClick={() => setShowExchange(true)}>
                🤝 Proponer pacto
              </button>
            )}
            <button style={{ ...button("ghost"), marginTop: 8 }} onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <ExchangeForm listing={live} onBack={() => setShowExchange(false)} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function BidForm({ listing, live, onBid }: { listing: Listing; live: Listing; onBid: (l: Listing) => void }) {
  const minBid = live.minBid ?? listing.estimatedValue;
  const top = live.bids?.[0];
  const suggested = top ? top.amount + (live.bidStep || 10) : minBid;
  const [amount, setAmount] = useState(suggested);
  const [article, setArticle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await api.bids.place(listing.id, { amount: Number(amount), article: article.trim() || null, note: note.trim() || null });
      const fresh = await api.listings.get(listing.id);
      onBid(fresh);
      setArticle("");
      setNote("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 12, padding: "10px 12px", background: colors.surface, borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.gold, marginBottom: 8 }}>
        TU PUJA {top && <span style={{ color: colors.textDim, fontWeight: 400 }}>· superá {suggested} para liderar</span>}
      </div>
      {error && <div style={{ color: colors.red, fontSize: 12, margin: "6px 0" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...input }}
          type="number"
          min={minBid}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button style={{ ...button(), whiteSpace: "nowrap" }} onClick={submit} disabled={busy}>
          {busy ? "…" : "Pujar 🪙"}
        </button>
      </div>
      {live.allowBarter && (
        <input
          style={{ ...input, marginTop: 8 }}
          placeholder="O pujá con un artículo (ej: parlante bluetooth)"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
        />
      )}
      <input
        style={{ ...input, marginTop: 8 }}
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
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
          {listing.user.displayName} recibió tu propuesta. Lo vas a ver en <b>Mis pactos</b> cuando la acepte.
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
      <h3 style={{ color: colors.gold, margin: "8px 0" }}>Proponer pacto</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {([["barter", "🔄 Trueque"], ["mixed", "🔀 Mixto"], ["credits", "🪙 Fieles"]] as const).map(([m, label]) => (
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
          <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>EN FIELES (adicional)</label>
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