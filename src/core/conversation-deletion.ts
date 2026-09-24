export function confirmedConversationDeletion(currentTitle: string, confirmation: FormDataEntryValue | null) {
  return typeof confirmation === "string" && confirmation === currentTitle;
}
