import { Trash2 } from "lucide-react";
import { deleteDiagnostic } from "./actions";

export function DeleteDiagnosticButton({
  sessionId,
}: {
  sessionId: string;
}) {
  return (
    <details className="group max-w-72 rounded-xl open:border open:border-red-200 open:bg-red-50 open:p-3">
      <summary className="ml-auto w-fit cursor-pointer list-none rounded-xl border bg-white px-3.5 py-2.5 text-xs font-bold text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
        <span className="flex items-center gap-2 group-open:hidden">
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir
        </span>
        <span className="hidden group-open:inline">Cancelar exclusão</span>
      </summary>
      <p className="text-xs font-bold text-red-800">
        Excluir este diagnóstico permanentemente?
      </p>
      <p className="mt-1 text-[11px] leading-4 text-red-700">
        As respostas, o resultado, o método, o plano e as tarefas criados por
        ele também serão apagados. Esta ação não pode ser desfeita.
      </p>
      <div className="mt-2.5">
        <form action={deleteDiagnostic}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <button className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">
            Excluir definitivamente
          </button>
        </form>
      </div>
    </details>
  );
}


