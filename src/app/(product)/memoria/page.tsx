import type { Metadata } from "next";
import { ReadingDetails } from "@/components/reading-layout";
import {
  Brain,
  CalendarClock,
  CircleOff,
  FileCheck2,
  GitCommitHorizontal,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import { DEV_COMPANY_ID } from "@/core/development";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Memória",
};

const memoryKinds = [
  {
    kind: "FACT",
    label: "Fatos",
    detail: "Dados observados ou informados pela empresa",
    color: "bg-primary",
  },
  {
    kind: "DECISION",
    label: "Decisões",
    detail: "Escolhas aceitas pelo gestor e seu contexto",
    color: "bg-[#6d96b4]",
  },
  {
    kind: "ASSUMPTION",
    label: "Hipóteses",
    detail: "Conclusões provisórias com nível de confiança",
    color: "bg-[#d99b57]",
  },
  {
    kind: "OUTCOME",
    label: "Resultados",
    detail: "O que mudou depois das ações",
    color: "bg-[#7a8c66]",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const memories = await prisma.companyMemory.findMany({
    where: { companyId: DEV_COMPANY_ID, invalidatedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      title: true,
      content: true,
      sourceType: true,
      confidence: true,
      updatedAt: true,
    },
  });
  const sourceLabels = {
    ONBOARDING: "Onboarding",
    DIAGNOSTIC: "Diagnóstico",
    CONVERSATION: "Conversa",
    TASK: "Tarefa",
    CHECKIN: "Check-in",
    MANUAL: "Manual",
    SYSTEM: "Sistema",
  } as const;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contexto da consultoria"
        title="Memória da empresa"
        description="Consulte os fatos, decisões e resultados salvos. Abra um registro para ver os detalhes."
        actions={
          <StatusPill tone={memories.length > 0 ? "success" : "neutral"}>
            {memories.length} {memories.length === 1 ? "registro" : "registros"}
          </StatusPill>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {memoryKinds.map((kind) => {
          const count = memories.filter(
            (memory) => memory.kind === kind.kind,
          ).length;

          return (
            <SectionCard key={kind.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className={`size-2.5 rounded-full ${kind.color}`} />
                <span className="text-xl font-semibold text-primary">
                  {count}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">{kind.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{kind.detail}</p>
            </SectionCard>
          );
        })}
      </div>

      <div className="space-y-5">
        <SectionCard className="min-h-[380px] p-6 sm:p-7">
          {memories.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center text-center">
              <div className="max-w-md">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-primary">
                  <Brain aria-hidden="true" className="size-7" />
                </span>
                <h2 className="mt-5 text-xl font-semibold">
                  A memória começa no onboarding
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Salve o cadastro da empresa para criar o primeiro registro de
                  contexto estruturado.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                  <Brain aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold">Registros válidos</p>
                  <p className="text-xs text-muted">
                    Contexto disponível para uso futuro pelo COO
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {memories.map((memory) => (
                  <ReadingDetails key={memory.id} title={memory.title} description={`${memoryKinds.find(kind => kind.kind === memory.kind)?.label ?? memory.kind} · ${sourceLabels[memory.sourceType]} · ${memory.updatedAt.toLocaleDateString("pt-BR")}`}>
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-[#39485b]">
                      {memory.content}
                    </p>
                    <p className="mt-3 text-[11px] text-[#8a958d]">
                      Confiança: {Math.round(Number(memory.confidence) * 100)}% ·{" "}
                      Atualizado em{" "}
                      {memory.updatedAt.toLocaleDateString("pt-BR")}
                    </p>
                  </ReadingDetails>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <ReadingDetails title="Como o COO usa estes registros">
          <div className="mt-6 space-y-4">
            {[
              {
                icon: FileCheck2,
                title: "Origem explícita",
                text: "Cada registro aponta para onboarding, diagnóstico, conversa, tarefa ou check-in.",
              },
              {
                icon: ShieldCheck,
                title: "Confiança separada",
                text: "Fato confirmado não se mistura com hipótese provável.",
              },
              {
                icon: CircleOff,
                title: "Invalidação sem apagar",
                text: "Informação corrigida deixa de ser usada, mas continua auditável.",
              },
              {
                icon: CalendarClock,
                title: "Histórico temporal",
                text: "A evolução é lida por data, método aplicado e output observado.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ReadingDetails>
      </div>

      <ReadingDetails title="Sobre privacidade e retenção dos dados"><div className="flex items-start gap-3">
        <GitCommitHorizontal
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <p className="text-xs leading-5 text-muted">
          A memória estruturada melhora o acompanhamento de longo prazo, mas
          aumenta a responsabilidade sobre privacidade, autorização e retenção.
          Essas políticas precisam ser definidas antes do beta com clientes.
        </p>
      </div></ReadingDetails>
    </div>
  );
}


