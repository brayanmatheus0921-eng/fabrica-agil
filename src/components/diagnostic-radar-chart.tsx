import {
  getMaturityLabel,
  severityToMaturity,
  type DiagnosticPillarResult,
} from "@/core/diagnostic-history";

const PILLAR_ORDER = [
  "Fluxo e prazo",
  "Capacidade e gargalo",
  "Qualidade e retrabalho",
  "Materiais e informação",
  "Gestão e padronização",
];

const SHORT_LABELS: Record<string, [string, string?]> = {
  "Fluxo e prazo": ["Fluxo", "e prazo"],
  "Capacidade e gargalo": ["Capacidade", "e gargalo"],
  "Qualidade e retrabalho": ["Qualidade", "e retrabalho"],
  "Materiais e informação": ["Materiais", "e informação"],
  "Gestão e padronização": ["Gestão", "e padrão"],
};

function point(index: number, value: number, radius = 118) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / PILLAR_ORDER.length;
  const scaledRadius = (radius * value) / 5;
  return {
    x: 210 + Math.cos(angle) * scaledRadius,
    y: 165 + Math.sin(angle) * scaledRadius,
  };
}

function polygonPoints(values: number[], radius?: number) {
  return values
    .map((value, index) => {
      const current = point(index, value, radius);
      return `${current.x},${current.y}`;
    })
    .join(" ");
}

export function DiagnosticRadarChart({
  pillars,
}: {
  pillars: DiagnosticPillarResult[];
}) {
  const byPillar = new Map(pillars.map((pillar) => [pillar.pillar, pillar]));
  const data = PILLAR_ORDER.map((pillar) => {
    const result = byPillar.get(pillar);
    const maturity = severityToMaturity(result?.score ?? null);
    return {
      pillar,
      maturity,
      validCount: result?.validCount ?? 0,
      unknownCount: result?.unknownCount ?? 0,
    };
  });
  const values = data.map((item) => item.maturity ?? 0);

  return (
    <div>
      <svg
        viewBox="0 0 420 350"
        role="img"
        aria-labelledby="diagnostic-radar-title diagnostic-radar-description"
        className="mx-auto block w-full max-w-[520px]"
      >
        <title id="diagnostic-radar-title">
          Maturidade observada por pilar
        </title>
        <desc id="diagnostic-radar-description">
          Gráfico de um a cinco mostrando a maturidade observada nos cinco
          pilares do diagnóstico.
        </desc>

        {[1, 2, 3, 4, 5].map((level) => (
          <polygon
            key={level}
            points={polygonPoints(PILLAR_ORDER.map(() => level))}
            fill={level === 5 ? "var(--surface-muted)" : "none"}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}

        {PILLAR_ORDER.map((pillar, index) => {
          const end = point(index, 5);
          return (
            <line
              key={pillar}
              x1="210"
              y1="165"
              x2={end.x}
              y2={end.y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygonPoints(values)}
          fill="var(--accent)"
          fillOpacity="0.35"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {data.map((item, index) => {
          const position = point(index, item.maturity ?? 0);
          return (
            <circle
              key={item.pillar}
              cx={position.x}
              cy={position.y}
              r="5"
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          );
        })}

        {PILLAR_ORDER.map((pillar, index) => {
          const label = point(index, 5.95);
          const [firstLine, secondLine] = SHORT_LABELS[pillar] ?? [pillar];
          return (
            <text
              key={pillar}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              className="fill-muted text-[11px] font-bold"
            >
              <tspan x={label.x}>{firstLine}</tspan>
              {secondLine ? (
                <tspan x={label.x} dy="13">
                  {secondLine}
                </tspan>
              ) : null}
            </text>
          );
        })}
      </svg>

      <div className="grid gap-2 sm:grid-cols-2">
        {data.map((item) => (
          <div
            key={item.pillar}
            className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5"
          >
            <span className="text-xs font-semibold text-muted">
              {item.pillar}
            </span>
            <span className="shrink-0 text-xs font-black text-primary">
              {item.maturity === null
                ? "Sem dados"
                : `${item.maturity}/5 · ${getMaturityLabel(item.maturity)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}



