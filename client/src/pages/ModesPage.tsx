import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, card, button, input } from "../utils/theme";
import type { TradeMode } from "../types";

export default function ModesPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [modes, setModes] = useState<TradeMode[]>([]);
  const [showForm, setShowForm] = useState(false);

  const isPlatform = user?.id === "user-plataforma";

  const load = () => api.modes.list().then(setModes);
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: colors.textDim, fontSize: 13, cursor: "pointer", padding: 0 }}>
        ← Volver
      </button>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 4px" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold }}>Modos de comercio</div>
          <div style={{ fontSize: 12, color: colors.textDim }}>Plantillas de la app y tus tratos a medida</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: colors.accent, border: "none", borderRadius: 999, padding: "10px 14px", fontWeight: 700, color: "#171412", cursor: "pointer", fontSize: 13 }}>
          + Crear modo
        </button>
      </header>

      <div style={{ fontSize: 11, color: colors.textDim, margin: "10px 4px 6px" }}>🅿️ Plantillas de la app (las edita solo el creador) · 🛠️ Tus modos</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {modes.length === 0 && <div style={{ ...card, color: colors.textDim }}>Cargando modos…</div>}
        {modes.map((m) => (
          <div key={m.id} style={{ ...card, borderColor: m.isPreset ? colors.accentSoft : colors.green }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22 }}>{m.isPreset ? "🅿️" : "🛠️"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <b style={{ fontSize: 14 }}>{m.name}</b>
                  <span style={{ fontSize: 10, background: colors.surface2, color: colors.textDim, borderRadius: 999, padding: "2px 8px", textTransform: "uppercase" }}>{m.type}</span>
                </div>
                {m.description && <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>{m.description}</div>}
                <div style={{ fontSize: 11, color: colors.gold, marginTop: 6 }}>
                  {m.audienceScope !== "public" && <>👁 público: {m.audienceScope} · </>}
                  {m.minBid ? <>piso {m.minBid} 🪙 · </> : ""}
                  {m.maxBid ? <>techo {m.maxBid} 🪙 · </> : ""}
                  {m.bidStep ? <>paso {m.bidStep} 🪙 · </> : ""}
                  {m.durationHours ? <>duración {m.durationHours}h · </> : ""}
                  {m.maxParticipants ? <>cupo {m.maxParticipants} · </> : ""}
                  {m.allowBarter ? "trueque ✓ " : ""}{m.allowFieles ? "fieles ✓" : ""}
                </div>
              </div>
            </div>
            {(m.createdById === user?.id || (m.isPreset && isPlatform)) && (
              <button style={{ ...button("ghost"), marginTop: 10 }} onClick={async () => { await api.modes.remove(m.id); load(); }}>
                {m.isPreset ? "Pausar" : "Eliminar"}
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && <CreateModeForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function CreateModeForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<any>({
    name: "", description: "", type: "custom", audienceScope: "public",
    allowBarter: true, allowFieles: true, minBid: "", maxBid: "", bidStep: "", durationHours: "", maxParticipants: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await api.modes.create({
        ...form,
        minBid: form.minBid ? Number(form.minBid) : null,
        maxBid: form.maxBid ? Number(form.maxBid) : null,
        bidStep: form.bidStep ? Number(form.bidStep) : null,
        durationHours: form.durationHours ? Number(form.durationHours) : null,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : null,
      });
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
        <h3 style={{ color: colors.gold, margin: "0 0 12px" }}>Tu trato a medida</h3>

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700 }}>NOMBRE</label>
        <input style={{ ...input, marginTop: 6 }} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Chango de la esquina — venta rápida" />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>DESCRIPCIÓN</label>
        <input style={{ ...input, marginTop: 6 }} value={form.description} onChange={(e) => set("description", e.target.value)} />

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>TIPO DE MODO</label>
        <select style={{ ...input, marginTop: 6 }} value={form.type} onChange={(e) => set("type", e.target.value)}>
          <option value="barter">🔄 Trueque</option>
          <option value="sale">🏷️ Venta en fieles</option>
          <option value="auction">⚖️ Subasta</option>
          <option value="custom">🛠️ Personalizado</option>
        </select>

        <label style={{ fontSize: 12, color: colors.textDim, fontWeight: 700, marginTop: 12, display: "block" }}>PÚBLICO</label>
        <select style={{ ...input, marginTop: 6 }} value={form.audienceScope} onChange={(e) => set("audienceScope", e.target.value)}>
          <option value="public">🌍 Todo el mundo</option>
          <option value="verified">🛡️ Solo identidades validadas</option>
          <option value="zone">📍 Solo mi zona</option>
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: colors.textDim }}>PISO (fieles)</label>
            <input style={{ ...input, marginTop: 4 }} type="number" value={form.minBid} onChange={(e) => set("minBid", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.textDim }}>TECHO</label>
            <input style={{ ...input, marginTop: 4 }} type="number" value={form.maxBid} onChange={(e) => set("maxBid", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.textDim }}>PASO</label>
            <input style={{ ...input, marginTop: 4 }} type="number" value={form.bidStep} onChange={(e) => set("bidStep", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.textDim }}>DURACIÓN (hs)</label>
            <input style={{ ...input, marginTop: 4 }} type="number" value={form.durationHours} onChange={(e) => set("durationHours", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.textDim }}>CUPO</label>
            <input style={{ ...input, marginTop: 4 }} type="number" value={form.maxParticipants} onChange={(e) => set("maxParticipants", e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 4 }}>ACEPTA</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => set("allowBarter", !form.allowBarter)} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: form.allowBarter ? colors.green : colors.surface, color: form.allowBarter ? "#171412" : colors.textDim, border: "none" }}>
                🔄
              </button>
              <button onClick={() => set("allowFieles", !form.allowFieles)} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: form.allowFieles ? colors.green : colors.surface, color: form.allowFieles ? "#171412" : colors.textDim, border: "none" }}>
                🪙
              </button>
            </div>
          </div>
        </div>

        {error && <div style={{ color: colors.red, fontSize: 13, margin: "10px 0" }}>{error}</div>}
        <button style={{ ...button(), marginTop: 14 }} onClick={submit} disabled={busy || form.name.trim().length < 3}>
          {busy ? "Creando…" : "Crear modo"}
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