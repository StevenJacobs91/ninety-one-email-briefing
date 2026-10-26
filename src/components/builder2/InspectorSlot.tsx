import { createContext, useContext } from 'react'

// Where the module inspector goes. The workspace puts it in its own column, beside the canvas; with no slot (the builder on
// its own) the inspector stays next to the canvas, as it always was.
const InspectorSlotContext = createContext<HTMLElement | null>(null)

export const InspectorSlotProvider = InspectorSlotContext.Provider

export function useInspectorSlot(): HTMLElement | null {
  return useContext(InspectorSlotContext)
}
