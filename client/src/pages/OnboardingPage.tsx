import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, input, button, roleColor, roleLabel } from "../utils/theme";
import type { Zone } from "../types";

const ROLES = [
  { id: "user", emoji: "🧑", desc: "Vecino que trueca artículos y servicios" },
  { id: "professional", emoji: "🩺", desc: "Profesional: médico, plomero, profesor… (zona de cobertura)" },
  { id: "deliverer", emoji: "📦", desc: "Repartidor: la logística del intercambio" },
];

export default function OnboardingPage() {
  const { user, refreshUser, setUser } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<string>(user?.role || "user");
  const [zoneId, setZoneId] = useState(user?.zoneId || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [coverage, setCoverage] = useState(user?.coverageZone || "");
  const [maxKm, setMaxKm] = useState(user?.maxTravelKm || 10);
  const [dni, setDni] = useState("");
  const [verified, setVerified] = useState(user?.verificationStatus === "verified");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.catalog.zones().then(setZones);
  }, []);

  const saveBase = async () => {
    setError("");
    setBusy(true);
    try {
      const updated = await api.profile.update({
        role,
        zoneId,
        bio,
        coverageZone: coverage || undefined,
        maxTravelKm: Number(maxKm) || undefined,
      });
      setUser(updated);
      setBusy(false);
      setStep((s) => s + 1);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const verify = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.profile.verifyIdentity(dni);
      setUser(res.user);
      setVerified(true);
      setBusy(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const finish = () => {
    window.location.reload();
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 24, boxSizing: "border-box", maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ color: colors.gold, margin: "8px 0" }}>Tu perfil, {user?.displayName}</h2>
      <div style={{ color: colors.textDim, fontSize: 13, marginBottom: 20 }}>Completá tu perfil para empezar a descubrir pactos.</div>

      {step === 0 && (
        <>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>¿Qué rol querés cumplir?</div>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left",
                background: role === r.id ? colors.surface2 : colors.surface,
                border: `1.5px solid ${role === r.id ? roleColor(r.id) : colors.border}`,
                borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 26 }}>{r.emoji}</span>
              <span>
                <b style={{ color: roleColor(r.id) }}>{roleLabel(r.id)}</b>
                <div style={{ color: colors.textDim, fontSize: 12 }}>{r.desc}</div>
              </span>
            </button>
          ))}
          <div style={{ fontWeight: 700, margin: "16px 0 8px" }}>Tu barrio/zona</div>
          <select style={input} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">Elegí tu zona…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} ({z.region})</option>
            ))}
          </select>
          {(role === "professional" || role === "deliverer") && (
            <>
              <div style={{ fontWeight: 700, margin: "16px 0 8px" }}>Zona de cobertura</div>
              <input style={input} placeholder="Ej: Núñez, Belgrano, Colegiales" value={coverage} onChange={(e) => setCoverage(e.target.value)} />
              <div style={{ fontWeight: 700, margin: "16px 0 8px" }}>Hasta dónde viajás (km)</div>
              <input style={input} type="number" min={1} value={maxKm} onChange={(e) => setMaxKm(Number(e.target.value))} />
            </>
          )}
          <div style={{ marginTop: 16 }}>{error && <div style={{ color: colors.red, fontSize: 13, marginBottom: 8 }}>{error}</div>}</div>
          <button style={button()} onClick={saveBase} disabled={busy || !zoneId}>Continuar</button>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Presentate a la comunidad</div>
          <div style={{ color: colors.textDim, fontSize: 12, marginBottom: 8 }}>¿Qué ofrecés? ¿Qué buscás a cambio? Contalo como si fuera tu perfil de una app de citas.</div>
          <textarea
            style={{ ...input, minHeight: 120, resize: "vertical" }}
            placeholder="Ej: Reciclo muebles y tengo herramientas. Busco a alguien que me ayude con el jardín o trueque de alimentos. Soy de la zona, prefiero encuentros de día."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div style={{ marginTop: 16 }}>{error && <div style={{ color: colors.red, fontSize: 13, marginBottom: 8 }}>{error}</div>}</div>
          <button style={button()} onClick={saveBase} disabled={busy || bio.trim().length < 20}>
            {busy ? "Guardando…" : "Guardar y continuar"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Validá tu identidad 🔒</div>
          <div style={{ color: colors.textDim, fontSize: 13, marginBottom: 12 }}>
            La comunidad no tolera estafas. Con tu identidad validada, todos confían más en tus pactos.
          </div>
          {verified ? (
            <div style={{ background: "#143a2c", color: colors.green, borderRadius: 12, padding: 14, fontWeight: 700 }}>
              ✓ Identidad validada
            </div>
          ) : (
            <>
              <input style={input} placeholder="Número de DNI (7 u 8 dígitos)" value={dni} onChange={(e) => setDni(e.target.value)} />
              <div style={{ color: colors.textDim, fontSize: 11, margin: "8px 0" }}>
                Demo: en producción se integra biometría real (liveness) + Renaper.
              </div>
              {error && <div style={{ color: colors.red, fontSize: 13, margin: "8px 0" }}>{error}</div>}
              <button style={button()} onClick={verify} disabled={busy || dni.length < 7}>
                {busy ? "Validando…" : "Validar identidad"}
              </button>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button style={button("ghost")} onClick={finish}>Ir al mercado →</button>
          </div>
        </>
      )}
    </div>
  );
}
