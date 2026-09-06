import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, roleColor, verifiedBadge } from "../utils/theme";
import type { Listing } from "../types";
import ListingModal from "../components/ListingModal";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [stack, setStack] = useState<Listing[]>([]);
  const [filters, setFilters] = useState({ type: "", categoryId: "" });
  const [categories, setCategories] = useState<any[]>([]);
  const [active, setActive] = useState<Listing | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const dragX = useRef(0);

  const load = async () => {
    const feed = await api.discovery.feed(filters.type ? { type: filters.type } : {});
    setStack(feed);
  };

  useEffect(() => {
    load();
    api.catalog.categories().then(setCategories);
  }, [filters.type]);

  const swipe = async (direction: "like" | "pass") => {
    const top = stack[0];
    if (!top) return;
    setStack((s) => s.slice(1));
    try {
      const res = await api.discovery.like(top.id, direction);
      if (res.match) setMatchToast(`✨ ¡Match con ${top.user.displayName}!`);
    } catch {}
    if (stack.length <= 2) load();
  };

  const top = stack[0];
  const next = stack[1];

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Descubrir</div>
          <div style={{ fontSize: 12, color: colors.textDim }}>¿Qué te llama la atención hoy?</div>
        </div>
        <div style={{ fontSize: 12, color: colors.textDim }}>
          <b style={{ color: colors.gold }}>{user?.credits?.toFixed(0)}</b> 🪙
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 0", marginBottom: 6 }}>
        <button
          onClick={() => setFilters((f) => ({ ...f, type: "" }))}
          style={chip(filters.type === "")}
        >
          Todo
        </button>
        <button onClick={() => setFilters((f) => ({ ...f, type: "offer" }))} style={chip(filters.type === "offer")}>
          🛍️ Ofertas
        </button>
        <button onClick={() => setFilters((f) => ({ ...f, type: "want" }))} style={chip(filters.type === "want")}>
          🙋 Busco
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? "" : c.id }))}
            style={chip(filters.categoryId === c.id)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div style={{ height: "calc(100vh - 260px)", minHeight: 420, position: "relative" }}>
        {next && (
          <div style={{ ...swipeCardStyle, transform: "translateY(12px) scale(0.96)", position: "absolute", inset: 0, opacity: 0.6 }}>
            <EmojiCard listing={next} />
          </div>
        )}
        {top ? (
          <div
            style={{ ...swipeCardStyle, position: "absolute", inset: 0, transform: `translateX(${dragX.current}px) rotate(${dragX.current / 30}deg)`, transition: dragX.current ? "none" : "transform .25s" }}
            onClick={() => setActive(top)}
          >
            <EmojiCard listing={top} />
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: 12, background: "rgba(0,0,0,.5)", borderRadius: 999, padding: "4px 10px", color: colors.textDim }}>
              Tocá para ver más
            </div>
          </div>
        ) : (
          <div style={{ ...swipeCardStyle, position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 44 }}>🌾</span>
            <div style={{ color: colors.textDim, fontSize: 14 }}>No hay más pactos por ahora.</div>
            <button onClick={load} style={{ background: colors.accent, border: "none", borderRadius: 999, padding: "10px 18px", fontWeight: 700, color: "#171412", cursor: "pointer" }}>
              Ver más
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 14 }}>
        <RoundBtn label="Pasar" emoji="✕" color={colors.red} onClick={() => swipe("pass")} />
        <RoundBtn label="Me gusta" emoji="♥" color={colors.green} onClick={() => swipe("like")} />
      </div>

      {matchToast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#143a2c", color: colors.green, padding: "12px 20px", borderRadius: 999, fontWeight: 700, zIndex: 60, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
          {matchToast}
        </div>
      )}

      {active && <ListingModal listing={active} onClose={() => { setActive(null); }} />}
    </div>
  );
}

function EmojiCard({ listing }: { listing: Listing }) {
  const isAuction = listing.mode?.type === "auction" || !!listing.auctionEnd;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, background: colors.surface2, borderRadius: 14, position: "relative" }}>
        {listing.category.emoji}
        {isAuction && (
          <div style={{ position: "absolute", top: 10, left: 10, background: colors.gold, color: "#171412", fontWeight: 800, fontSize: 11, borderRadius: 999, padding: "4px 10px" }}>
            ⚖️ SUBASTA
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <b style={{ fontSize: 18 }}>{listing.title}</b>
          {listing.user.verificationStatus === "verified" && <span style={verifiedBadge}>✓ verificado</span>}
        </div>
        <div style={{ color: colors.textDim, fontSize: 13 }}>
          {listing.category.emoji} {listing.category.name} · {listing.zone.name} · {listing.type === "want" ? "🙋 busca" : "🛍️ ofrece"}
          {isAuction && listing.bids?.[0] && <span style={{ color: colors.gold, fontWeight: 700 }}> · {listing.bids[0].amount} 🪙 top</span>}
        </div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: colors.textDim }}>
            {listing.user.displayName} <span style={{ color: roleColor(listing.user.role) }}>· ★ {listing.user.ratingAvg.toFixed(1)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: colors.gold }}>
            ≈ {listing.estimatedValue} 🪙 valor zonal
          </div>
        </div>
      </div>
    </div>
  );
}

const swipeCardStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 22,
  overflow: "hidden",
  cursor: "pointer",
  userSelect: "none",
};

function chip(active: boolean): React.CSSProperties {
  return {
    whiteSpace: "nowrap",
    background: active ? colors.accent : colors.surface,
    color: active ? "#171412" : colors.textDim,
    border: `1px solid ${active ? colors.accent : colors.border}`,
    borderRadius: 999,
    padding: "8px 14px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  };
}

function RoundBtn({ label, emoji, color, onClick }: { label: string; emoji: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer" }}>
      <span style={{ width: 62, height: 62, borderRadius: "50%", background: colors.surface, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color }}>
        {emoji}
      </span>
      <span style={{ fontSize: 11, color: colors.textDim, fontWeight: 700 }}>{label}</span>
    </button>
  );
}
