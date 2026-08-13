import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { colors, input, button } from "../utils/theme";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", username: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register({ ...form, username: form.username || form.email.split("@")[0] });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, display: "flex", flexDirection: "column", padding: 28, boxSizing: "border-box" }}>
      <div style={{ marginTop: 48, textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🔄</div>
        <h1 style={{ margin: "8px 0 4px", color: colors.gold, fontSize: 28 }}>
          La moneda que nace del intercambio
        </h1>
        <p style={{ color: colors.textDim, fontSize: 14, margin: 0 }}>
          Trueque de artículos y servicios. Sin el dinero que reparten los bancos.
        </p>
      </div>

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", background: colors.surface, borderRadius: 12, padding: 4 }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                background: mode === m ? colors.accent : "transparent",
                color: mode === m ? "#171412" : colors.textDim,
              }}
            >
              {m === "login" ? "Entrar" : "Sumarme"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <input style={input} placeholder="Nombre y apellido" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
        )}
        <input style={input} placeholder="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        {mode === "register" && (
          <input style={input} placeholder="Usuario (opcional)" value={form.username} onChange={(e) => set("username", e.target.value)} />
        )}
        <input style={input} placeholder="Contraseña" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />

        {error && <div style={{ color: colors.red, fontSize: 13 }}>{error}</div>}

        <button style={button()} onClick={submit} disabled={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear mi cuenta (+50 créditos)"}
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          {[["marta@demo.app", "Marta (vecina)"], ["ramiro@demo.app", "Dr. Ramiro (prof.)"], ["tito@demo.app", "Tito (fletero)"]].map(([email, label]) => (
            <button
              key={email}
              onClick={() => { setMode("login"); setForm((f) => ({ ...f, email, password: "demo1234" })); }}
              style={{ background: colors.surface2, color: colors.textDim, border: `1px solid ${colors.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ color: colors.textDim, fontSize: 11, textAlign: "center", marginTop: 4 }}>Cuentas demo: contraseña <b>demo1234</b></div>
      </div>
    </div>
  );
}
