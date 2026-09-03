import type { Metadata } from "next";
import { Building2, CheckCircle2, Factory, Gauge } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard, StatusPill } from "@/components/ui";
import {
  mainGoalOptions,
  monthlyOrderOptions,
  monthlyRevenueOptions,
  onTimeDeliveryOptions,
  ownerDependencyOptions,
  productionTypeOptions,
  reworkOptions,
} from "@/core/company-profile";
import { getDevCompany } from "@/server/dev-company";
import { updateCompanyProfile } from "./actions";

export const metadata: Metadata = { title: "Empresa" };
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readText(value: unknown, key: string) {
  const item = asRecord(value)[key];
  return typeof item === "string" ? item : "";
}

function readStages(value: unknown) {
  const item = asRecord(value).productionStages;
  return Array.isArray(item)
    ? item
        .filter((entry): entry is string => typeof entry === "string")
        .join("\n")
    : "";
}

const field =
  "mt-2 w-full rounded-xl border border-[#dedbd5] bg-white px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted/65 focus:border-primary/55 focus:ring-3 focus:ring-primary/10";

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
}) {
  const values = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className="block text-sm font-bold">
      {label}
      <select name={name} required defaultValue={value} className={field}>
        <option value="" disabled>
          Selecione
        </option>
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const company = await getDevCompany();
  const params = await searchParams;
  const profile = asRecord(company.onboardingData);
  const requiredProfileKeys = [
    "monthlyRevenueRange",
    "monthlyOrderVolume",
    "onTimeDeliveryRange",
    "reworkRange",
    "ownerDependency",
  ];
  const missingProfileFields = requiredProfileKeys.filter(
    (key) => !readText(profile, key),
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Contexto permanente"
        title="Perfil da empresa"
        description="Dados estáveis para o diagnóstico e para a consultora entender o tamanho, o ritmo e o objetivo da fábrica."
        actions={
          <StatusPill tone={missingProfileFields === 0 ? "success" : "warning"}>
            {missingProfileFields === 0
              ? "Contexto completo"
              : `${missingProfileFields} dados para completar`}
          </StatusPill>
        }
      />

      {params.saved ? (
        <div className="flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-primary">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          Alterações salvas. A consultora já recebeu o novo contexto.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      ) : null}

      <form action={updateCompanyProfile} className="space-y-5">
        <SectionCard className="overflow-hidden">
          <div className="border-b bg-[#f8f7f4] px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                <Building2 aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Tamanho e modelo</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Informações que mudam a interpretação do diagnóstico.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-2">
            <label className="block text-sm font-bold">
              Nome da empresa
              <input name="name" required defaultValue={company.name} className={field} />
            </label>
            <label className="block text-sm font-bold">
              Setor
              <input name="sector" required defaultValue={company.sector ?? "Fábrica de móveis"} className={field} />
            </label>
            <SelectField
              label="Tipo de produção"
              name="productionType"
              value={company.productionType ?? ""}
              options={productionTypeOptions}
            />
            <label className="block text-sm font-bold">
              Pessoas na empresa
              <input name="teamSize" required min={1} type="number" defaultValue={company.teamSize ?? ""} className={field} />
            </label>
            <SelectField
              label="Faturamento mensal"
              name="monthlyRevenueRange"
              value={readText(profile, "monthlyRevenueRange")}
              options={monthlyRevenueOptions}
            />
            <SelectField
              label="Pedidos entregues por mês"
              name="monthlyOrderVolume"
              value={readText(profile, "monthlyOrderVolume")}
              options={monthlyOrderOptions}
            />
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b bg-[#f8f7f4] px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                <Gauge aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Situação atual</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Um retrato rápido para o COO comparar com o diagnóstico.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-2">
            <SelectField
              label="Entregas no prazo"
              name="onTimeDeliveryRange"
              value={readText(profile, "onTimeDeliveryRange")}
              options={onTimeDeliveryOptions}
            />
            <SelectField
              label="Frequência de retrabalho"
              name="reworkRange"
              value={readText(profile, "reworkRange")}
              options={reworkOptions}
            />
            <SelectField
              label="Dependência do dono"
              name="ownerDependency"
              value={readText(profile, "ownerDependency")}
              options={ownerDependencyOptions}
            />
            <SelectField
              label="Objetivo dos próximos 90 dias"
              name="mainGoal"
              value={readText(profile, "mainGoal")}
              options={mainGoalOptions}
            />
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b bg-[#f8f7f4] px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                <Factory aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Contexto adicional</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Opcional. Use somente se houver algo importante que as escolhas não explicam.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-2">
            <label className="block text-sm font-bold">
              Observação para a consultora
              <textarea
                name="biggestChallenge"
                rows={4}
                placeholder="Ex.: sem o dono, as prioridades param de ser definidas."
                defaultValue={readText(profile, "biggestChallenge")}
                className={`${field} min-h-28 resize-y leading-6`}
              />
            </label>
            <label className="block text-sm font-bold">
              Etapas principais da produção
              <textarea
                name="productionStages"
                rows={4}
                placeholder="Ex.: projeto, corte, usinagem, montagem e expedição."
                defaultValue={readStages(profile)}
                className={`${field} min-h-28 resize-y leading-6`}
              />
            </label>
          </div>
        </SectionCard>

        <div className="sticky bottom-4 flex justify-end">
          <button type="submit" className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(23,107,69,0.22)] transition hover:bg-primary-strong sm:w-auto">
            Salvar perfil da empresa
          </button>
        </div>
      </form>
    </div>
  );
}


