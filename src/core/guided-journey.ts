import { z } from "zod";
import { methodStepSchema } from "@/core/diagnostic-method";

const bottleneckCopy: Record<
  string,
  {
    title: string;
    explanation: string;
    consequence: string;
    firstGoal: string;
  }
> = {
  "Fluxo e prazo": {
    title: "Os pedidos estão perdendo tempo entre uma etapa e outra",
    explanation:
      "A produção inicia trabalho demais ou muda a sequência com frequência. Isso cria filas e faz o pedido esperar mais do que deveria.",
    consequence:
      "Mesmo com a equipe ocupada, o prazo aumenta e menos pedidos chegam ao fim.",
    firstGoal: "Descobrir onde os pedidos mais esperam e limitar essa fila.",
  },
  "Capacidade e gargalo": {
    title: "Um ponto da fábrica está segurando o ritmo de toda a produção",
    explanation:
      "Uma máquina, um setor ou uma pessoa recebe mais trabalho do que consegue entregar. Quando esse ponto para ou fica sobrecarregado, o restante da fábrica espera.",
    consequence:
      "Produzir mais nas outras etapas aumenta a fila, mas não aumenta as entregas.",
    firstGoal: "Confirmar qual recurso limita o ritmo e proteger seu tempo produtivo.",
  },
  "Qualidade e retrabalho": {
    title: "O retrabalho está consumindo parte da capacidade da fábrica",
    explanation:
      "Erros estão sendo descobertos tarde e as peças precisam voltar para correção. O mesmo recurso é usado duas vezes para entregar uma vez.",
    consequence:
      "A equipe perde horas, o prazo aumenta e a margem do pedido diminui.",
    firstGoal: "Escolher o erro mais repetido, medir sua frequência e atacar a causa.",
  },
  "Materiais e informação": {
    title: "A produção está parando por falta de material ou informação",
    explanation:
      "Pedidos chegam à fábrica sem todos os materiais, medidas ou definições necessários. A equipe precisa interromper o trabalho para buscar o que falta.",
    consequence:
      "As urgências aumentam, a sequência muda e o prazo fica imprevisível.",
    firstGoal: "Identificar os bloqueios mais frequentes e criar uma regra de liberação.",
  },
  "Gestão e padronização": {
    title: "A falta de padrão e prioridade está criando variação na operação",
    explanation:
      "O resultado depende de quem executa e as prioridades mudam sem um critério claro. Problemas importantes também podem ficar sem responsável.",
    consequence:
      "A fábrica repete erros, perde ritmo e depende demais do gestor para funcionar.",
    firstGoal: "Padronizar um processo crítico e definir responsável e acompanhamento.",
  },
};

const fallbackCopy = {
  title: "Há um ponto prioritário limitando o resultado da fábrica",
  explanation:
    "As respostas do diagnóstico indicaram uma área que precisa ser tratada antes das demais.",
  consequence:
    "Atacar várias frentes ao mesmo tempo dilui o esforço e atrasa o resultado.",
  firstGoal: "Confirmar o problema e executar uma ação curta com resultado observável.",
};

export function getBottleneckCopy(category: string) {
  return bottleneckCopy[category] ?? fallbackCopy;
}

export const methodStepsSchema = z.array(methodStepSchema).min(1);

export function parseMethodSteps(input: unknown) {
  const result = methodStepsSchema.safeParse(input);
  return result.success ? result.data : [];
}

export function parseStringList(input: unknown) {
  const result = z.array(z.string().min(1)).safeParse(input);
  return result.success ? result.data : [];
}



