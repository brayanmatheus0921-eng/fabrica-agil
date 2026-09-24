export function proposalOverview(details: string[]): string[] {
  const initiativeIndex = details.findIndex(detail => /^Iniciativas:\s*\d+/i.test(detail));
  if (initiativeIndex < 0) return details.slice(0, 3);
  const count = Number(details[initiativeIndex].match(/\d+/)?.[0] ?? 0);
  const leading = details.filter(detail => /^(Prioridade|Objetivo):/i.test(detail)).slice(0, 2);
  const titles = details.slice(initiativeIndex + 1).filter(item => !item.includes("\nPor quê:") && !item.startsWith("Ao aprovar")).slice(0, Math.min(count, 5));
  return [...leading, details[initiativeIndex], ...titles];
}
