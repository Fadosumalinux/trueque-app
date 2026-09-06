import { colors } from "../utils/theme";
import type { Tab } from "../pages/MainApp";

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "discover", label: "Descubrir", icon: "🃏" },
  { id: "listings", label: "Mis pactos", icon: "🤝" },
  { id: "exchanges", label: "Acuerdos", icon: "🤝" },
  { id: "wallet", label: "Monedero", icon: "🪙" },
  { id: "profile", label: "Perfil", icon: "👤" },
];

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.surface,
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50,
      }}
    >
      {ITEMS.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            padding: "8px 0",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            color: tab === it.id ? colors.accent : colors.textDim,
          }}
        >
          <span style={{ fontSize: 20, opacity: tab === it.id ? 1 : 0.6 }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
