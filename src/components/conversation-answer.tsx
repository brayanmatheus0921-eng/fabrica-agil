import { AssistantMarkdown } from "./assistant-markdown";
import { ConversationVisual } from "./conversation-visual";
import type { ConversationVisual as Visual } from "@/core/conversation-visuals";

export function ConversationAnswer({ content, visualBlocks, nextAction }: { content: string; visualBlocks?: Visual[]; nextAction?: string }) {
  return <>
    <AssistantMarkdown text={content} />
    {visualBlocks?.map(visual => <ConversationVisual key={visual.id} visual={visual} />)}
    {nextAction ? <div data-next-action className="mt-4"><AssistantMarkdown text={nextAction} /></div> : null}
  </>;
}
