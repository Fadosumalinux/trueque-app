import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, roleColor, verifiedBadge } from "../utils/theme";
import type { Listing } from "../types";
import ListingModal from "../components/ListingModal";

type Suggested = { suggested: number; basis: string; samples: number; avg: number | null };

export default function DiscoverPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [filters, setFilters] = useState({ type: "", categoryId: "" });
  const [categories, setCategories] = useState<any[]>([]);
  const [active, setActive] = useState<Listing | null>(null);
  const [pin, setPin] = useState<Listing | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<Record<string, Suggested>>({});
  const loading = useRef(false);

  const load = async (extra?: { type?: string; categoryId?: string }) => {
    loading.current = true;
    try {
      const feed = await api.discovery.feed(extra);
      setItems(feed);
      // Precio sugerido por categoría (promedio real de lo publicado).
      const cats = [...new Set(feed.map((l: any) => l.categoryId).filter(Boolean))] as string[];
      setSuggested((prev) => {
        const next = { ...prev };
        void cats
          .filter((c) => !next[c])
          .forEach((c) =>
            api.listings.suggestedPrice(c).then((r) => setSuggested((m) => ({ ...m, [c]: { suggested: r.suggested, basis: r.basis, samples: r.samples, avg: r.avg } }))).catch(() => {})
          );
        return next;
      });
    } finally {
      loading.current = false;
    }
  };

  useEffect(() => {
    load(filters.type || filters.categoryId ? filters : undefined);
    api.catalog.categories().then(setCategories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.categoryId]);

  const react = async (l: Listing, direction: "like" | "pass") => {
    try {
      const res = await api.discovery.like(l.id, direction);
      if (res.match) setMatchToast(`✨ ¡Match con ${l.user.displayName}!`);
    } catch {}
    setItems((cur) => cur.filter((x) => x.id !== l.id));
  };

  return (
    <div className="page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Descubrir</div>
          <div style={{ fontSize: 12, color: colors.textDim }}>El muro del barrio: trato y precio claros</div>
        </div>
        <div style={{ fontSize: 12, color: colors.textDim }}>
          <b style={{ color: colors.gold }}>{user?.credits?.toFixed(0)}</b> 🪙
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 0", marginBottom: 6 }}>
        <button
          onClick={() => setFilters((f) => ({ ...f, type: "" }))}
          style={chip(filters.type === "" && !filters.categoryId)}
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
            style={chip(filters.categoryId === c.id && !filters.type)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className="wall" data-tut="wall">
        {items.map((l, i) => {
          const sug = l.categoryId ? suggested[l.categoryId] : undefined;
          return (
            <div key={l.id} className="wall-card">
              <div className="wall-card__tile" onClick={() => setActive(l)}>
                {photosOf(l)[0] ? (
                  <img src={photosOf(l)[0]} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">{l.category?.emoji || "🤝"}</span>
                )}
                {(isAuction(l) || (l as any).minBid != null) && (
                  <span className="wall-card__badge">⚖️ Subasta</span>
                )}
              </div>

              <div className="wall-card__body" onClick={() => setActive(l)}>
                <div className="wall-card__title">
                  {l.title}
                  {l.user?.verificationStatus === "verified" && (
                    <span style={verifiedBadge}>✓</span>
                  )}
                </div>
                <div className="wall-card__meta">
                  {l.category?.emoji} {l.category?.name} · {l.zone?.name} · {l.type === "want" ? "🙋 busca" : "🛍️ ofrece"}
                </div>
              </div>

              <div className="wall-card__prices" onClick={() => setActive(l)}>
                {(l as any).priceAmount != null ? (
                  <>
                    <span className="wall-card__seller">{(l as any).priceAmount} 🪙</span>
                    <span className="wall-card__app">
                      {sug ? (
                        <>
                          La app sugiere <b>{sug.suggested} 🪙</b>
                          {sug.samples > 1 && <span> ({sug.samples} publicadas)</span>}
                        </>
                      ) : (
                        <>
                          Valor de la app <b>≈ {l.estimatedValue} 🪙</b>
                        </>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="wall-card__app">
                    Sin precio fijo · valor de la app <b>≈ {l.estimatedValue} 🪙</b>
                  </span>
                )}
              </div>

              {!isAuction(l) && (
                <div className="wall-card__actions">
                  <button
                    className="wall-act wall-act--pass"
                    onClick={() => react(l, "pass")}
                    data-tut={i === 0 ? "pass" : undefined}
                  >
                    ✕
                  </button>
                  <button className="wall-act wall-act--info" onClick={() => setActive(l)} title="Ver detalle">
                    👁
                  </button>
                  <button
                    className="wall-act wall-act--like"
                    onClick={() => react(l, "like")}
                    data-tut={i === 0 ? "like" : undefined}
                  >
                    ♥
                  </button>
                </div>
              )}
              <div className="wall-card__seller-info">
                <span>{l.user?.displayName}</span>
                <span style={{ color: roleColor(l.user?.role) }}>★ {l.user?.ratingAvg?.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="wall-empty">
            <span style={{ fontSize: 44 }}>🌾</span>
            <div>No hay pactos con esos filtros, por ahora.</div>
            {filters.type || filters.categoryId ? (
              <button className="chip" onClick={() => setFilters({ type: "", categoryId: "" })}>
                Mostrar todo
              </button>
            ) : (
              <button className="chip" onClick={() => load()}>
                Recargar muro
              </button>
            )}
          </div>
        )}
      </div>

      {matchToast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#143a2c", color: colors.green, padding: "12px 20px", borderRadius: 999, fontWeight: 700, zIndex: 60, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
          {matchToast}
        </div>
      )}

      {(active || pin) && <ListingModal listing={active || pin!} onClose={() => { setActive(null); setPin(null); }} />}
    </div>
  );
}

function photosOf(l: Listing): string[] {
  try {
    const p = (l as any).photos;
    if (!p) return [];
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return [];
  }
}

function isAuction(l: Listing): boolean {
  return l.mode?.type === "auction" || !!l.auctionEnd;
}

function chip(active: boolean): React.CSSProperties {
  return {
    whiteSpace: "nowrap",
    background: active ? colors.accent : colors.surface,
    color: active ? "#171412" : colors.textDim,
    border: `1px solid ${active ? colors.accent : colors.border}`,
    borderRadius: 999,
    padding: "0 16px",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  };
}