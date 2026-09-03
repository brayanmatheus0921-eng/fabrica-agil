"use client";

import { BookOpen, ChevronDown, Clock3, GraduationCap, Layers3, LockKeyhole, MessageSquareText, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Lesson = { title: string; description: string };
type CatalogTab = "recommended" | "all" | "soon";

const tabs: Array<{ value: CatalogTab; label: string }> = [
  { value: "recommended", label: "Recomendadas" },
  { value: "all", label: "Todas as aulas" },
  { value: "soon", label: "Em breve" },
];

export function LessonsCatalog({ lessons }: { lessons: Lesson[] }) {
  const [tab, setTab] = useState<CatalogTab>("recommended");
  const [query, setQuery] = useState("");
  const visibleLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return lessons;
    return lessons.filter((lesson) => `${lesson.title} ${lesson.description}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  }, [lessons, query]);

  return <div className="space-y-7">
    <header className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted"><GraduationCap aria-hidden="true" className="size-4" />Apoio para executar melhor</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Aulas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Conteúdos curtos para apoiar o diagnóstico, o plano e as tarefas da sua fábrica.</p>
      </div>
      <label className="relative block w-full lg:w-80">
        <span className="sr-only">Buscar aulas</span><Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você quer aprender?" className="h-11 w-full rounded-xl border bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-primary" />
      </label>
    </header>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="grid gap-5 p-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <span className="grid size-[72px] place-items-center rounded-2xl bg-primary text-[var(--primary-contrast)]"><BookOpen aria-hidden="true" className="size-8" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Produtividade na fábrica</h2><span className="rounded-full bg-accent-warm px-2.5 py-1 text-[10px] font-semibold text-primary">Em breve</span></div>
              <p className="mt-1 text-sm leading-6 text-muted">Uma trilha prática para aplicar os métodos indicados no seu diagnóstico.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1"><Layers3 aria-hidden="true" className="size-3.5" />1 módulo</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1"><BookOpen aria-hidden="true" className="size-3.5" />{lessons.length} aulas</span>
              </div>
            </div>
            <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-surface-muted px-4 text-xs font-semibold text-muted sm:self-center"><LockKeyhole aria-hidden="true" className="size-4" />Em breve</span>
          </div>
        </section>

        <nav aria-label="Filtros das aulas" className="flex gap-6 overflow-x-auto border-b">
          {tabs.map((item) => <button key={item.value} type="button" onClick={() => setTab(item.value)} aria-current={tab === item.value ? "page" : undefined} className={`shrink-0 border-b-2 px-0.5 pb-3 text-sm transition ${tab === item.value ? "border-primary font-semibold text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>{item.label}</button>)}
        </nav>

        <section aria-labelledby="lesson-content-title">
          <div className="flex items-end justify-between gap-4"><div><h2 id="lesson-content-title" className="text-xl font-semibold">Conteúdo das aulas</h2><p className="mt-1 text-sm text-muted">Abra uma aula para entender o que ela vai ensinar.</p></div><span className="shrink-0 text-xs text-muted">{visibleLessons.length} conteúdos</span></div>
          {visibleLessons.length ? <div className="mt-4 overflow-hidden rounded-xl border bg-white">
            {visibleLessons.map((lesson, index) => <details key={lesson.title} className="group border-b last:border-b-0" open={index === 0 && !query}>
              <summary className="flex min-h-[88px] cursor-pointer list-none items-center gap-4 px-4 py-4 transition hover:bg-surface-muted/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-primary"><BookOpen aria-hidden="true" className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{lesson.title}</span><span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3.5" />Duração a definir</span><span aria-hidden="true">·</span><span>1 aula</span></span></span>
                <span className="hidden rounded-full bg-accent-warm px-2.5 py-1 text-[10px] font-semibold text-primary sm:inline-flex">Em breve</span><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
              </summary>
              <div className="border-t bg-surface-muted/35 px-4 py-4 sm:px-5 sm:pl-20">
                <p className="text-sm leading-6 text-muted">{lesson.description}</p>
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3"><LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Aula em breve</p><p className="mt-1 text-xs leading-5 text-muted">O COO já pode orientar você sobre este assunto.</p></div></div>
                  <Link href="/assistente" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold transition hover:border-primary"><MessageSquareText aria-hidden="true" className="size-4" />Perguntar ao COO</Link>
                </div>
              </div>
            </details>)}
          </div> : <div className="mt-4 rounded-xl border border-dashed bg-white p-10 text-center"><Search aria-hidden="true" className="mx-auto size-6 text-muted" /><h3 className="mt-3 font-semibold">Nenhuma aula encontrada</h3><p className="mt-1 text-sm text-muted">Tente buscar por outro assunto.</p></div>}
        </section>
      </div>

      <aside className="rounded-2xl border bg-white p-5 xl:sticky xl:top-24">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-warm text-primary"><Sparkles aria-hidden="true" className="size-5" /></span>
        <p className="mt-4 text-xs font-semibold text-primary">Ajuda imediata</p><h2 className="mt-1 text-lg font-semibold leading-6">Não precisa esperar pela aula</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Peça ao COO instruções para executar uma tarefa ou tire uma dúvida sobre o seu plano.</p>
        <Link href="/assistente" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-[var(--primary-contrast)] transition hover:bg-primary-strong"><MessageSquareText aria-hidden="true" className="size-4" />Falar com o COO</Link>
        <p className="mt-3 text-center text-[11px] leading-4 text-muted">Ele usa o contexto da sua empresa, diagnóstico e tarefas.</p>
      </aside>
    </div>
  </div>;
}
