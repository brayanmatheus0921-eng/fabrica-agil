type RadarTheme = { themeCode: string; theme: string; performanceScore: number };

const ORDER = ["PM3.1", "PM3.2", "PM3.3", "PM3.4", "PM3.5", "PM3.6", "PM4"];
const LABELS: Record<string, [string, string?]> = {
  "PM3.1": ["Ferramentaria"], "PM3.2": ["Manutenção"], "PM3.3": ["Logística", "Compras"], "PM3.4": ["Logística", "Estoque"], "PM3.5": ["Manufatura", "Operacional"], "PM3.6": ["Manufatura", "Funcional"], PM4: ["Qualidade", "e indicadores"],
};
function point(index: number, value: number, radius = 142) { const angle = -Math.PI / 2 + index * Math.PI * 2 / ORDER.length; const scale = value / 100; return { x: 280 + Math.cos(angle) * radius * scale, y: 205 + Math.sin(angle) * radius * scale }; }
function polygon(values: number[], radius?: number) { return values.map((value, index) => { const current = point(index, value, radius); return `${current.x},${current.y}`; }).join(" "); }

export function StrategicMaturityRadar({ themes }: { themes: RadarTheme[] }) {
  const map = new Map(themes.map((theme) => [theme.themeCode, theme]));
  const values = ORDER.map((code) => map.get(code)?.performanceScore ?? 0);
  return <svg viewBox="0 0 560 430" role="img" aria-labelledby="strategic-radar-title strategic-radar-description" className="mx-auto block w-full max-w-[650px]">
    <title id="strategic-radar-title">Desempenho calculado por área operacional</title><desc id="strategic-radar-description">Gráfico radar de zero a cem comparando sete temas de manufatura e qualidade. As notas são calculadas pelas respostas Sim, Parcial e Não.</desc>
    {[20,40,60,80,100].map((level) => <polygon key={level} points={polygon(ORDER.map(() => level))} fill={level === 100 ? "var(--surface-muted)" : "none"} stroke="var(--border)" strokeWidth="1"/>)}
    {ORDER.map((code,index) => { const end=point(index,100); return <line key={code} x1="280" y1="205" x2={end.x} y2={end.y} stroke="var(--border)"/>; })}
    <polygon points={polygon(values)} fill="var(--accent)" fillOpacity=".38" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round"/>
    {values.map((value,index) => { const current=point(index,value); return <g key={ORDER[index]}><circle cx={current.x} cy={current.y} r="5" fill="var(--accent)" stroke="var(--primary)" strokeWidth="2"/><text x={current.x} y={current.y-10} textAnchor="middle" className="fill-foreground text-[10px] font-black">{Math.round(value)}</text></g>; })}
    {ORDER.map((code,index) => { const label=point(index,118); const [first,second]=LABELS[code]; return <text key={code} x={label.x} y={label.y} textAnchor="middle" className="fill-muted text-[11px] font-bold"><tspan x={label.x}>{first}</tspan>{second?<tspan x={label.x} dy="13">{second}</tspan>:null}</text>; })}
    <text x="286" y="177" className="fill-muted text-[9px]">20</text><text x="286" y="149" className="fill-muted text-[9px]">40</text><text x="286" y="120" className="fill-muted text-[9px]">60</text><text x="286" y="92" className="fill-muted text-[9px]">80</text><text x="286" y="63" className="fill-muted text-[9px]">100</text>
  </svg>;
}
