import type { Metadata } from "next";
import { ReadingDetails } from "@/components/reading-layout";
import { Archive, GitBranch, LibraryBig, ListTree, Scale } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Métodos" };
const fields = [{ icon: GitBranch, title: "Aplicabilidade", text: "Regras que definem quando o método serve para o gargalo." }, { icon: Scale, title: "Limites e cuidados", text: "Custo, dificuldade, prazo e riscos expostos." }, { icon: ListTree, title: "Passos e entregas", text: "Sequência de aplicação e evidências esperadas." }, { icon: Archive, title: "Versões", text: "A recomendação preserva a versão usada." }];

export default async function MethodsPage() {
  const methods = await prisma.improvementMethod.findMany({ where: { status: "ACTIVE", code: { startsWith: "ROTA-" } }, orderBy: { name: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
  return <div className="space-y-8"><PageHeader eyebrow="Tratamento do ROTA 30" title="Métodos publicados" description="Consulte os métodos disponíveis. Abra cada um para entender sua aplicação." actions={<StatusPill tone={methods.length ? "success" : "warning"}>{methods.length} publicados</StatusPill>} /><div className="space-y-5"><SectionCard className="p-6 sm:p-7"><div className="flex items-start gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-accent text-primary"><LibraryBig aria-hidden="true" className="size-6" /></span><div><p className="text-lg font-semibold">Métodos do ROTA 30</p><p className="mt-1 text-sm text-muted">Uma prioridade recebe somente um destes métodos por ciclo.</p></div></div><div className="mt-6 space-y-3">{methods.map((method) => <ReadingDetails key={method.id} title={method.name} description={`Versão ${method.versions[0]?.version ?? "—"} · Ver aplicação`}><p className="text-sm leading-6 text-muted">{method.description}</p></ReadingDetails>)}</div></SectionCard><ReadingDetails title="O que você encontra em cada método"><p className="mt-1 text-sm text-muted">Cada método possui regras, passos, trade-offs, evidências e critérios de abandono.</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((item) => { const Icon = item.icon; return <div key={item.title} className="rounded-2xl border bg-surface-muted p-5"><Icon aria-hidden="true" className="size-5 text-primary" /><p className="mt-4 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.text}</p></div>; })}</div></ReadingDetails></div></div>;
}


