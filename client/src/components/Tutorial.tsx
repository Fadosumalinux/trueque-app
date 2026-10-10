import { useCallback, useEffect, useState } from "react";

export type Step = {
  id: string;
  tab: string;
  target?: string;
  icon: string;
  title: string;
  text: string;
};

/** El recorrido explica CADA función de la app, pantalla por pantalla. */
export const STEPS: Step[] = [
  { id: "d-nav", tab: "discover", target: "nav-discover", icon: "🗺️", title: "Tu mapa", text: "Esta barra es el mapa de Pacto. En el celular va abajo; en la compu se pone al costado sola." },
  { id: "d-swipe", tab: "discover", target: "swipe", icon: "🃏", title: "Deslizá como en una app de citas", text: "Cada carta es un pacto de un vecino. Pasá el dedo o usá los botones." },
  { id: "d-like", tab: "discover", target: "like", icon: "♥", title: "♥ Me gusta", text: "Si a la otra persona también le gusta lo tuyo, hay MATCH y pueden hablar. Ahí empieza el pacto." },
  { id: "d-pass", tab: "discover", target: "pass", icon: "✕", title: "✕ Pasar", text: "No te interesa. Seguís, sin drama y sin perder tu saldo." },
  { id: "d-mission", tab: "discover", target: "wall", icon: "🏙️", title: "El muro", text: "Cada tarjeta es un pacto del barrio: foto, trato y precio. El precio lo pone el vendedor; la app sugiere, sin inventar, según lo publicado." },
  { id: "l-publish", tab: "listings", target: "publicar", icon: "📣", title: "+ Publicar", text: "Ofrecé algo (🛍️) o pedí algo (🙋). Podés elegir trueque, fieles o mixto." },
  { id: "l-mode", tab: "listings", target: "mode", icon: "⚖️", title: "Modo de comercio", text: "Es la regla del juego: si se puede truequear, si se pagan en fieles, piso y paso de puja. Lo inventás vos en tu perfil." },
  { id: "e-propose", tab: "exchanges", target: "propose", icon: "🤝", title: "Proponer pacto", text: "Elegís la moneda: 🔄 trueque, 🔀 mixto o 🪙 fieles. Nadie acepta solo: siempre lo confirma la otra persona." },
  { id: "e-complete", tab: "exchanges", target: "complete", icon: "✅", title: "Completar = nacen los fieles", text: "Cuando el pacto se completa, se generan los fieles (valor zonal) y la comisión va al seguro." },
  { id: "e-deliver", tab: "exchanges", target: "deliver", icon: "🚲", title: "Entrega con fletero", text: "Un repartidor verificado ofrece la entrega y la comisión se reparte en tres." },
  { id: "w-fieles", tab: "wallet", target: "wallet", icon: "🪙", title: "Fieles: la moneda real", text: "No es papel: se genera con cada pacto completado y se puede usar en el siguiente." },
  { id: "p-profile", tab: "profile", target: "profile", icon: "👤", title: "Tu perfil", text: "Zona, roles (vecino, profesional 🩺, repartidor 🚲) y tus modos de comercio." },
  { id: "p-tutorial", tab: "profile", target: "tutorial", icon: "🎮", title: "Repetir el tutorial", text: "Podés volver a verlo cuando quieras desde acá o con el botón ? en cualquier pantalla." },
];

const KEY = "pacto_tutorial_v2";
type Progress = { started: boolean; finished: boolean; done: string[] };
const readProgress = (): Progress => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { started: true, finished: false, done: [], ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return { started: false, finished: false, done: [] };
};
const writeProgress = (p: Progress) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin persistencia */
  }
};

export function useDoneSteps(): string[] {
  const [done, setDone] = useState<string[]>(() => readProgress().done);
  useEffect(() => {
    const sync = () => setDone(readProgress().done);
    window.addEventListener("pacto_tutorial", sync);
    return () => window.removeEventListener("pacto_tutorial", sync);
  }, []);
  return done;
}

type Rect = { top: number; left: number; width: number; height: number };

export default function Tutorial({ tab, onBadge }: { tab: string; onBadge?: (n: number, total: number) => void }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const total = STEPS.length;
  const step = STEPS[idx];

  const fire = useCallback(() => window.dispatchEvent(new Event("pacto_tutorial")), []);

  // Primer ingreso: arranca solo en la pantalla de Descubrir.
  useEffect(() => {
    const p = readProgress();
    if (!p.started && !p.finished) {
      setIdx(STEPS.findIndex((s) => s.tab === "discover"));
      setOpen(true);
      writeProgress({ ...p, started: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reubicar el foco cuando cambia el paso o la pantalla.
  useEffect(() => {
    if (!open || !step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tut="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, step]);

  // Si el paso pertenece a otra pantalla, saltamos a esa.
  useEffect(() => {
    if (open && step && step.tab !== tab) {
      const first = STEPS.findIndex((s) => s.tab === tab);
      if (first >= 0) setIdx(first);
    }
  }, [open, tab, step]);

  const next = () => {
    if (!step) return;
    const p = readProgress();
    const done = [...new Set([...p.done, step.id])];
    const isLast = idx >= total - 1;
    writeProgress({ started: true, finished: isLast, done });
    fire();
    if (isLast) {
      setOpen(false);
      setRect(null);
      onBadge?.(done.length, total);
      return;
    }
    const jump = idx + 1;
    const candidate = STEPS[jump];
    setIdx(candidate.tab === tab ? jump : STEPS.findIndex((s) => s.tab === tab && !done.includes(s.id)));
  };

  const back = () => setIdx((i) => Math.max(0, i - 1));

  const skip = () => {
    const p = readProgress();
    writeProgress({ started: true, finished: true, done: p.done });
    setOpen(false);
    setRect(null);
    fire();
  };

  const openHere = () => {
    const first = STEPS.findIndex((s) => s.tab === tab);
    setIdx(first >= 0 ? first : 0);
    setOpen(true);
  };

  // "Ver el tutorial otra vez" desde el perfil: abre en la pantalla actual.
  useEffect(() => {
    const h = () => openHere();
    window.addEventListener("pacto_tutorial_open", h);
    return () => window.removeEventListener("pacto_tutorial_open", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const doneCount = readProgress().done.length;

  return (
    <>
      {/* Botón ? flotante: siempre a mano, sin tapar la barra de opciones */}
      <button className="tut-fab" onClick={openHere} aria-label="Abrir el tutorial" title="Tutorial">
        {open ? "✕" : "?"}
      </button>

      {open && step && (
        <>
          {rect && (
            <div
              className="tut-ring"
              style={{ top: rect.top - 3, left: rect.left - 3, width: rect.width + 6, height: rect.height + 6 }}
              aria-hidden="true"
            />
          )}
          <div className="tut-card" role="dialog" aria-label={`Tutorial ${idx + 1} de ${total}`}>
            <div className="tut-card__top">
              <span className="tut-card__badge">
                🎮 MISIÓN {idx + 1}/{total}
              </span>
              <button className="tut-card__skip" onClick={skip}>
                Saltar
              </button>
            </div>
            <div className="tut-card__bar">
              <i style={{ width: `${((idx + 1) / total) * 100}%` }} />
            </div>
            <div className="tut-card__body">
              <span className="tut-card__icon" aria-hidden="true">
                {step.icon}
              </span>
              <div>
                <div className="tut-card__title">{step.title}</div>
                <div className="tut-card__text">{step.text}</div>
              </div>
            </div>
            <div className="tut-card__actions">
              <button className="tut-btn" onClick={back} disabled={idx === 0}>
                ‹ Atrás
              </button>
              <button className="tut-btn tut-btn--go" onClick={next}>
                {idx >= total - 1 ? "¡Listo! 🏅" : "Siguiente ›"}
              </button>
            </div>
            <div className="tut-card__foot">
              Insignias {doneCount}/{total} · el tutorial no te da fieles: los fieles nacen de pactos reales.
            </div>
          </div>
        </>
      )}
    </>
  );
}