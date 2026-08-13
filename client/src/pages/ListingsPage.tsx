import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { colors, input, button, card } from "../utils/theme";
import type { Listing, Zone, Category } from "../types";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.listings.mine().then(setListings);
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Mis trueques</div>
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
  const [form, setForm] = useState({ type: "offer", categoryId: "", zoneId: "", title: "", description: "", acceptTerms: "", currency: "both" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.catalog.zones().then(setZones);
    api.catalog.categories().then(setCategories);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await api.listings.create(form);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: colors.gold, margin: "0 0 12px" }}>Publicar un trueque</h3>

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

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>TÍTULO</label>
        <input style={{ ...input, marginTop: 6 }} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej: Mesa de roble con 4 sillas" />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>DESCRIPCIÓN</label>
        <textarea style={{ ...input, minHeight: 70, marginTop: 6 }} value={form.description} onChange={(e) => set("description", e.target.value)} />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>QUÉ ACEPTÁS A CAMBIO</label>
        <textarea style={{ ...input, minHeight: 70, marginTop: 6 }} value={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.value)} placeholder="Ej: caja de herramientas o 180 créditos" />

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>FORMAS DE PAGO</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[["barter", "🔄 Solo trueque"], ["both", "🔀 Ambos"], ["credits", "🪙 Solo créditos"]].map(([v, label]) => (
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
