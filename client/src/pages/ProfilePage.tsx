import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { colors, card, button, input, verifiedBadge, roleColor, roleLabel } from "../utils/theme";
import ModesPage from "./ModesPage";

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showModes, setShowModes] = useState(false);

  if (showModes) return <ModesPage onBack={() => setShowModes(false)} />;

  useEffect(() => {
    if (user) {
      api.reviews.user(user.id).then(setReviews).catch(() => {});
      api.notifications.list().then(setNotifications).catch(() => {});
    }
  }, [user?.id]);

  const verify = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.profile.verifyIdentity(dni);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const markRead = async () => {
    await api.notifications.readAll();
    api.notifications.list().then(setNotifications);
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 16, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: colors.gold, marginBottom: 12 }}>Mi perfil</div>

      <div style={{ ...card, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, border: `2px solid ${roleColor(user?.role)}` }}>
          {user?.avatarUrl ? <img src={user.avatarUrl} style={{ width: 60, height: 60, borderRadius: "50%" }} alt="" /> : "👤"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.displayName}</div>
          <div style={{ fontSize: 13, color: roleColor(user?.role) }}>{roleLabel(user?.role)} {user?.zone && `· ${user.zone.name}`}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {user?.verificationStatus === "verified" ? (
              <span style={verifiedBadge}>✓ identidad validada</span>
            ) : (
              <span style={{ background: "#3a2c22", color: colors.accentSoft, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>⏳ identidad sin validar</span>
            )}
            <span style={{ background: colors.surface2, borderRadius: 999, padding: "2px 8px", fontSize: 11, color: colors.gold }}>★ {user?.ratingAvg.toFixed(1)} ({user?.ratingCount})</span>
            <span style={{ background: colors.surface2, borderRadius: 999, padding: "2px 8px", fontSize: 11, color: colors.textDim }}>🤝 {user?.totalExchanges} pactos</span>
          </div>
        </div>
      </div>

      {user?.bio && (
        <div style={{ ...card, marginTop: 10, fontStyle: "italic", color: colors.textDim, fontSize: 14 }}>
          “{user.bio}”
        </div>
      )}

      {user?.coverageZone && (
        <div style={{ ...card, marginTop: 10, fontSize: 13 }}>
          🗺️ <b>Cobertura:</b> {user.coverageZone} {user.maxTravelKm ? `· hasta ${user.maxTravelKm} km` : ""}
        </div>
      )}

      {user?.verificationStatus !== "verified" && (
        <div style={{ ...card, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🔒 Validar identidad</div>
          <input style={input} placeholder="DNI (7 u 8 dígitos)" value={dni} onChange={(e) => setDni(e.target.value)} />
          <div style={{ fontSize: 11, color: colors.textDim, margin: "8px 0" }}>Biometría + Renaper (simulado en demo).</div>
          {error && <div style={{ color: colors.red, fontSize: 13, marginBottom: 6 }}>{error}</div>}
          <button style={button()} onClick={verify} disabled={busy || dni.length < 7}>{busy ? "Validando…" : "Validar mi identidad"}</button>
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textDim, margin: "16px 4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>NOTIFICACIONES</span>
        <button onClick={markRead} style={{ background: "transparent", border: "none", color: colors.textDim, fontSize: 11, cursor: "pointer" }}>marcar leídas</button>
      </div>
      {notifications.length === 0 ? (
        <div style={{ ...card, color: colors.textDim, fontSize: 13 }}>Sin novedades.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifications.slice(0, 6).map((n) => (
            <div key={n.id} style={{ ...card, padding: 12, opacity: n.read ? 0.6 : 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: colors.textDim }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textDim, margin: "16px 4px 8px" }}>RESEÑAS RECIBIDAS</div>
      {reviews.length === 0 ? (
        <div style={{ ...card, color: colors.textDim, fontSize: 13 }}>Todavía no te reseñaron.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reviews.slice(0, 5).map((r) => (
            <div key={r.id} style={{ ...card, padding: 12 }}>
              <div style={{ fontSize: 13 }}>
                {"★".repeat(r.rating)}<span style={{ opacity: 0.3 }}>{"★".repeat(5 - r.rating)}</span> <span style={{ color: colors.textDim }}>· {r.reviewer.displayName}</span>
              </div>
              {r.comment && <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>{r.comment}</div>}
            </div>
          ))}
        </div>
      )}

      <button style={{ ...button(), marginTop: 16 }} onClick={() => setShowModes(true)}>
        🛠️ Modos de comercio
      </button>

      <button style={{ ...button("danger"), marginTop: 12 }} onClick={logout}>Salir de la app</button>
    </div>
  );
}
