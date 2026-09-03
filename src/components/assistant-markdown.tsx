import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const allowedElements = [
  "p", "strong", "em", "del", "h1", "h2", "h3", "h4", "ul", "ol", "li",
  "blockquote", "code", "pre", "a", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
];

export function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="min-w-0 break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={allowedElements}
        skipHtml
        components={{
          h1: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-bold leading-tight first:mt-0">{children}</h2>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-bold leading-snug first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-4 text-base font-semibold leading-snug first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="my-2 leading-7 first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-6">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary/40 bg-surface-muted/50 px-4 py-2 text-muted">{children}</blockquote>,
          hr: () => <hr className="my-5 border-border" />,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">{children}</a>,
          pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-[#111a2a] p-4 text-xs leading-6 text-white">{children}</pre>,
          code: ({ className, children }) => className
            ? <code className={className}>{children}</code>
            : <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.9em] font-medium">{children}</code>,
          table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto rounded-xl border"><table className="w-full min-w-[460px] border-collapse text-left text-sm">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-surface-muted">{children}</thead>,
          th: ({ children }) => <th className="border-b px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b px-3 py-2 align-top leading-6 last:border-b-0">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
