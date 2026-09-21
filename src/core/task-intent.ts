export function asksToCreateTask(value: string) {
  return /\b(?:crie|criar|adicione|adicionar|inclua|incluir)\s+(?:(?:uma|a|nova)\s+)?tarefa\b|\b(?:nova\s+)?tarefa\b[^.?!]{0,60}\b(?:adicionar|incluir)\b/i.test(value);
}

export function declaresTaskScope(value: string) {
  return /\b(?:avuls\w*|fora\s+do\s+plano|plano\s+atual|faz\s+parte\s+do\s+plano|iniciativa\s+do\s+plano)\b/i.test(value);
}

const comparable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
export function findReferencedTask<T extends { id: string; title: string }>(value: string, tasks: T[]) {
  const input = comparable(value);
  const matches = tasks.filter(task => {
    const title = comparable(task.title);
    return title.length >= 8 && input.includes(title);
  });
  return matches.length === 1 ? matches[0] : null;
}
