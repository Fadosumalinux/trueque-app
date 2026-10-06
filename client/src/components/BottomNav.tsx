import type { Tab } from "../pages/MainApp";

const ITEMS: { id: Tab; label: string; icon: string; hint: string }[] = [
  { id: "discover", label: "Descubrir", icon: "🃏", hint: "Deslizá y encontrá quién te interesa" },
  { id: "listings", label: "Mis pactos", icon: "📋", hint: "Publicá lo que ofrecés o buscás" },
  { id: "exchanges", label: "Acuerdos", icon: "🤝", hint: "Tus pactos en curso y entregas" },
  { id: "wallet", label: "Monedero", icon: "🪙", hint: "Tus fieles y movimientos" },
  { id: "profile", label: "Perfil", icon: "👤", hint: "Tu zona, roles y modos de comercio" },
];

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="app-nav" aria-label="Navegación principal">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`nav-btn${tab === it.id ? " nav-btn--on" : ""}`}
          aria-current={tab === it.id ? "page" : undefined}
          title={it.hint}
        >
          <span className="nav-btn__icon" aria-hidden="true">
            {it.icon}
          </span>
          <span className="nav-btn__label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}