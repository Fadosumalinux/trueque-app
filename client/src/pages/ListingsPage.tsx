import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { colors, input, button, card } from "../utils/theme";
import type { Listing, Zone, Category, TradeMode } from "../types";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.listings.mine().then(setListings);
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Mis pactos</div>
          <div style={{ fontSize: 12, color: colors.textDim }}>Lo que ofrecés y buscás</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: colors.accent, border: "none", borderRadius: 999, padding: "10px 16px", fontWeight: 700, color: "#171412", cursor: "pointer" }}>
          + Publicar
        </button>
      </header>

      {listings.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: colors.textDim }}>
          Aún no publicaste nada. ¡Contá qué tenés para ofrecer o qué buscás!
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listings.map((l) => (
          <div key={l.id} style={{ ...card, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 34 }}>{l.category.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{l.title}</div>
              <div style={{ fontSize: 12, color: colors.textDim }}>
                {l.type === "want" ? "🙋 Busco" : "🛍️ Ofrezco"} · {l.zone.name} · ≈ {l.estimatedValue} 🪙
              </div>
            </div>
            <span style={{ fontSize: 11, color: l.status === "active" ? colors.green : colors.textDim, fontWeight: 700, textTransform: "capitalize" }}>
              {l.status}
            </span>
          </div>
        ))}
      </div>

      {showForm && <CreateListingForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function CreateListingForm({ onClose }: { onClose: () => void }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modes, setModes] = useState<TradeMode[]>([]);
  const [form, setForm] = useState<any>({ type: "offer", categoryId: "", zoneId: "", title: "", description: "", acceptTerms: "", currency: "both", modeId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.catalog.zones().then(setZones);
    api.catalog.categories().then(setCategories);
    api.modes.list().then(setModes).catch(() => {});
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const selectedMode = modes.find((m) => m.id === form.modeId);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const body: any = {
        categoryId: form.categoryId,
        zoneId: form.zoneId,
        type: form.type,
        title: form.title,
        description: form.description,
        acceptTerms: form.acceptTerms,
        currency: form.currency,
        modeId: form.modeId || undefined,
        minBid: form.minBid ? Number(form.minBid) : undefined,
        maxBid: form.maxBid ? Number(form.maxBid) : undefined,
        bidStep: form.bidStep ? Number(form.bidStep) : undefined,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        audienceScope: form.audienceScope || undefined,
        auctionStart: form.auctionStart ? new Date(form.auctionStart).toISOString() : undefined,
      };
      await api.listings.create(body);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: colors.gold, margin: "0 0 12px" }}>Publicar un pacto</h3>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["offer", "🛍️ Ofrezco"], ["want", "🙋 Busco"]].map(([v, label]) => (
            <button
              key={v}
              onClick={() => set("type", v)}
              style={{
                flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, cursor: "pointer",
                background: form.type === v ? colors.accent : colors.surface, color: form.type === v ? "#171412" : colors.textDim,
                border: `1px solid ${form.type === v ? colors.accent : colors.border}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>CATEGORÍA</label>
        <select style={{ ...input, marginTop: 6 }} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">Elegí…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name} ({c.type === "service" ? "servicio" : "artículo"})</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>ZONA</label>
        <select style={{ ...input, marginTop: 6 }} value={form.zoneId} onChange={(e) => set("zoneId", e.target.value)}>
          <option value="">Elegí…</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name} ({z.region})</option>
          ))}
        </select>

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>MODO DE COMERCIO</label>
        <select style={{ ...input, marginTop: 6 }} value={form.modeId} onChange={(e) => set("modeId", e.target.value)}>
          <option value="">Trato libre (a definir en la propuesta)</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>{m.isPreset ? "🅿️ " : "🛠️ "}{m.name} — {m.type}</option>
          ))}
        </select>
        {selectedMode?.description && (
          <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>{selectedMode.description}</div>
        )}

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>TÍTULO</label>
        <input style={{ ...input, marginTop: 6 }} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej: Mesa de roble con 4 sillas" />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>DESCRIPCIÓN</label>
        <textarea style={{ ...input, minHeight: 70, marginTop: 6 }} value={form.description} onChange={(e) => set("description", e.target.value)} />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>QUÉ ACEPTÁS A CAMBIO</label>
        <textarea style={{ ...input, minHeight: 70, marginTop: 6 }} value={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.value)} placeholder="Ej: caja de herramientas o 180 fieles" />

        {selectedMode?.type === "auction" && (
          <>
            <div style={{ ...card, marginTop: 14, borderColor: colors.accentSoft, background: "#1d2a1a" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.gold, marginBottom: 10 }}>⚖️ CONFIGURACIÓN DE LA SUBASTA</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>PUJA MÍNIMA (fieles)</label>
                  <input style={{ ...input, marginTop: 4 }} type="number" value={form.minBid ?? selectedMode.minBid ?? ""} onChange={(e) => set("minBid", e.target.value)} placeholder={String(selectedMode.minBid ?? "")} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>PUJA MÁXIMA (fieles)</label>
                  <input style={{ ...input, marginTop: 4 }} type="number" value={form.maxBid ?? ""} onChange={(e) => set("maxBid", e.target.value)} placeholder="sin techo" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>PASO MÍNIMO (fieles)</label>
                  <input style={{ ...input, marginTop: 4 }} type="number" value={form.bidStep ?? selectedMode.bidStep ?? ""} onChange={(e) => set("bidStep", e.target.value)} placeholder={String(selectedMode.bidStep ?? 10)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>CUPO DE PARTICIPANTES</label>
                  <input style={{ ...input, marginTop: 4 }} type="number" value={form.maxParticipants ?? ""} onChange={(e) => set("maxParticipants", e.target.value)} placeholder="sin cupo" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>ARRANQUE</label>
                  <input style={{ ...input, marginTop: 4 }} type="datetime-local" value={form.auctionStart ?? ""} onChange={(e) => set("auctionStart", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textDim }}>DURACIÓN SUGERIDA</label>
                  <input style={{ ...input, marginTop: 4 }} type="number" value={form.durationHours ?? selectedMode.durationHours ?? ""} onChange={(e) => set("durationHours", e.target.value)} placeholder={String(selectedMode.durationHours ?? 24)} />
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>FORMAS DE PAGO</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[["barter", "🔄 Solo trueque"], ["both", "🔀 Ambos"], ["credits", "🪙 Solo fieles"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => set("currency", v)}
                style={{
                  flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: form.currency === v ? colors.accent : colors.surface, color: form.currency === v ? "#171412" : colors.textDim,
                  border: `1px solid ${form.currency === v ? colors.accent : colors.border}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ color: colors.red, fontSize: 13, margin: "10px 0" }}>{error}</div>}
        <button style={{ ...button(), marginTop: 14 }} onClick={submit} disabled={busy || !form.categoryId || !form.zoneId || form.title.trim().length < 3}>
          {busy ? "Publicando…" : "Publicar"}
        </button>
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
