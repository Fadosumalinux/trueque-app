import { useEffect, useState } from "react";
import { api } from "../utils/api";

type ZoneStat = { zone: string; category: string; emoji: string; count: number; categoryId: string; type: string };

/**
 * Tarjeta de misiones + sugerencias. Va EN el flujo de la pantalla (no flota),
 * así que nunca tapa la barra de opciones ni los botones.
 * Todo lo que muestra sale de datos reales: no inventa saldo ni promesas.
 */
export default function MissionCard({
  onFilterCategory,
  zoneName,
}: {
  onFilterCategory: (categoryId: string) => void;
  zoneName?: string;
}) {
  const [mine, setMine] = useState<any[] | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [hot, setHot] = useState<ZoneStat[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    api.listings.mine().then((l: any[]) => alive && setMine(l || [])).catch(() => alive && setMine([]));
    api.discovery.matches().then((m: any[]) => alive && setMatches(m || [])).catch(() => {});
    api.listings
      .list({})
      .then((rows: any[]) => {
        if (!alive) return;
        const byCat: Record<string, ZoneStat> = {};
        (rows || []).forEach((l: any) => {
          const key = `${l.categoryId}`;
          if (!byCat[key]) {
            byCat[key] = {
              zone: l.zone?.name || "",
              category: l.category?.name || "",
              emoji: l.category?.emoji || "🤝",
              count: 0,
              categoryId: l.categoryId,
              type: l.type,
            };
          }
          byCat[key].count += 1;
        });
        setHot(Object.values(byCat).sort((a, b) => b.count - a.count).slice(0, 3));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const published = mine?.length || 0;
  const missions = [
    { done: published > 0, icon: "📣", text: published > 0 ? `Tenés ${published} pacto(s) publicado(s)` : "Publicá tu primer pacto (o buscá algo)" },
    { done: matches.length > 0, icon: "♥", text: matches.length > 0 ? `${matches.length} match(es) para hablar` : "Descubrí y hacé match: hay pactos esperándote" },
    { done: false, icon: "🤝", text: "Armá un pacto: elegí trueque, mixto o fieles" },
  ];
  const doneCount = missions.filter((m) => m.done).length;

  if (!open) {
    return (
      <button className="mission-mini" onClick={() => setOpen(true)}>
        🎯 Misiones del día · {doneCount}/{missions.length} ▸
      </button>
    );
  }

  return (
    <section className="mission">
      <header className="mission__head">
        <span>
          🎯 MISIONES DEL DÍA
        </span>
        <button className="mission__toggle" onClick={() => setOpen(false)} aria-label="Ocultar misiones">
          ✕
        </button>
      </header>

      <div className="mission__bar">
        <i style={{ width: `${(doneCount / missions.length) * 100}%` }} />
      </div>

      <ul className="mission__list">
        {missions.map((m) => (
          <li key={m.text} className={m.done ? "is-done" : ""}>
            <span className="mission__check">{m.done ? "✔" : m.icon}</span>
            <span>{m.text}</span>
          </li>
        ))}
      </ul>

      {hot.length > 0 && (
        <>
          <div className="mission__sep">💡 Sugerencias para vos{zoneName ? ` · ${zoneName}` : ""}</div>
          <div className="mission__hot">
            {hot.map((h) => (
              <button key={h.categoryId} className="hot-chip" onClick={() => onFilterCategory(h.categoryId)}>
                <b>{h.emoji}</b> {h.category} <span>{h.count}</span>
              </button>
            ))}
          </div>
          <div className="mission__note">Datos reales del barrio · las misiones dan insignias, nunca fieles.</div>
        </>
      )}
    </section>
  );
}