import type { ExecutionGuide } from "@/core/task-execution";
export function ExecutionInstructions({guide}:{guide:ExecutionGuide}){
 return <div className="space-y-5">
   <p className="text-xs text-muted">Abra um passo por vez. As instruções permanecem disponíveis enquanto você executa.</p>
   <ol className="divide-y divide-[#e2e6eb] rounded-lg border border-[#e2e6eb] bg-white">{guide.steps.map((step,i)=><li key={i}><details open={i===0} className="px-4"><summary className="cursor-pointer py-4 text-sm font-semibold leading-5 focus-visible:outline-2 focus-visible:outline-primary"><span className="mr-3 text-xs font-normal tabular-nums text-muted">{String(i+1).padStart(2,"0")}</span>{step.title}</summary><div className="pb-5 sm:pl-7"><p className="max-w-3xl text-sm font-normal leading-6 text-[#39485b]">{step.instruction}</p><p className="mt-3 text-xs leading-5 text-muted">Como conferir: {step.doneWhen}</p></div></details></li>)}</ol>
   <div className="grid gap-5 rounded-lg bg-[#f5f7fa] p-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-[#596575]">Entrega da tarefa</p><p className="mt-2 text-sm font-normal leading-6">{guide.completionCriteria}</p></div><div><p className="text-xs font-semibold text-[#596575]">Evidência de melhoria</p><p className="mt-2 text-sm font-normal leading-6">{guide.improvementCriteria}</p></div></div>
   <div className="border-l-2 border-[#c0a181] pl-4"><p className="text-xs font-semibold text-[#596575]">Na próxima conversa com o COO</p><p className="mt-1 text-sm font-normal leading-6">{guide.reviewQuestion}</p></div>
 </div>;
}
