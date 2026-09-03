import type { Metadata } from "next";
import { LessonsCatalog } from "./lessons-catalog";

export const metadata: Metadata = { title: "Aulas" };

const plannedLessons = [
  { title: "Como controlar fluxo e fila sem software caro", description: "Organize a sequência dos pedidos e enxergue onde o trabalho está parando." },
  { title: "Como confirmar e proteger a restrição", description: "Descubra qual etapa limita a produção e evite perder tempo nela." },
  { title: "Como medir e reduzir um retrabalho recorrente", description: "Registre as causas e escolha primeiro o retrabalho que mais consome tempo." },
  { title: "Como liberar pedidos completos para a produção", description: "Confira material e informação antes de colocar o pedido no chão de fábrica." },
  { title: "Como criar trabalho padronizado e gestão à vista", description: "Deixe o jeito certo de executar claro e fácil de acompanhar pela equipe." },
];

export default function LessonsPage() {
  return <LessonsCatalog lessons={plannedLessons} />;
}
