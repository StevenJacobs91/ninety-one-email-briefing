import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { BuilderState, BuilderAction, Block } from './types'

const MAX_HISTORY = 50

const DEFAULT_EMAIL_CONFIG: BuilderState['emailConfig'] = {
  backgroundColor: '#f4f4f4',
  backgroundImageUrl: '',
  backgroundImageEnabled: false,
  contentWidth: 640,
  messageAlignment: 'center',
  fontFamily: 'Arial, sans-serif',
  linkColor: '#134848',
  underlineLinks: true,
  responsiveDesign: true,
  hideImageDownloadIcons: true,
  headingStyles: {
    h1: { fontSize: 28, color: '#134848', fontWeight: 'bold' },
    h2: { fontSize: 22, color: '#134848', fontWeight: 'bold' },
    h3: { fontSize: 18, color: '#134848', fontWeight: 'bold' },
  },
  buttonStyles: {
    bgColor: '#fbaa96',
    textColor: '#134848',
    borderRadius: 4,
    paddingX: 32,
    paddingY: 14,
  },
  stripeStyles: {
    bgColor: '#ffffff',
    paddingY: 0,
  },
}

const INITIAL_STATE: BuilderState = {
  blocks: [],
  selectedBlockId: null,
  viewport: 'desktop',
  emailConfig: DEFAULT_EMAIL_CONFIG,
  history: [[]],
  historyIndex: 0,
}

function pushHistory(state: BuilderState, blocks: Block[]): BuilderState {
  const trimmed = state.history.slice(0, state.historyIndex + 1)
  const next = [...trimmed, blocks].slice(-MAX_HISTORY)
  return {
    ...state,
    blocks,
    history: next,
    historyIndex: next.length - 1,
  }
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_BLOCKS':
      return pushHistory(state, action.blocks)

    case 'ADD_BLOCK': {
      const next = [...state.blocks]
      next.splice(action.afterIndex + 1, 0, action.block)
      return {
        ...pushHistory(state, next),
        selectedBlockId: action.block.id,
      }
    }

    case 'REMOVE_BLOCK': {
      const next = state.blocks.filter((b) => b.id !== action.id)
      return {
        ...pushHistory(state, next),
        selectedBlockId: state.selectedBlockId === action.id ? null : state.selectedBlockId,
      }
    }

    case 'UPDATE_BLOCK': {
      const next = state.blocks.map((b) => {
        if (b.id !== action.id) return b
        return { ...b, props: { ...b.props, ...action.props } } as Block
      })
      return pushHistory(state, next)
    }

    case 'MOVE_BLOCK': {
      const next = [...state.blocks]
      const [removed] = next.splice(action.fromIndex, 1)
      next.splice(action.toIndex, 0, removed)
      return pushHistory(state, next)
    }

    case 'DUPLICATE_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx === -1) return state
      const original = state.blocks[idx]
      const clone: Block = {
        ...original,
        id: crypto.randomUUID(),
        props: { ...(original.props as Record<string, unknown>) },
      } as Block
      const next = [...state.blocks]
      next.splice(idx + 1, 0, clone)
      return {
        ...pushHistory(state, next),
        selectedBlockId: clone.id,
      }
    }

    case 'SELECT_BLOCK':
      return { ...state, selectedBlockId: action.id }

    case 'SET_VIEWPORT':
      return { ...state, viewport: action.viewport }

    case 'SET_EMAIL_CONFIG':
      return { ...state, emailConfig: { ...state.emailConfig, ...action.config } }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return { ...state, blocks: state.history[newIndex], historyIndex: newIndex }
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return { ...state, blocks: state.history[newIndex], historyIndex: newIndex }
    }

    case 'LOAD_TEMPLATE':
      return {
        ...pushHistory(state, action.blocks),
        emailConfig: action.config,
        selectedBlockId: null,
      }

    default:
      return state
  }
}

interface BuilderContextValue {
  state: BuilderState
  dispatch: Dispatch<BuilderAction>
  canUndo: boolean
  canRedo: boolean
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, INITIAL_STATE)

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  return (
    <BuilderContext.Provider value={{ state, dispatch, canUndo, canRedo }}>
      {children}
    </BuilderContext.Provider>
  )
}

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used inside BuilderProvider')
  return ctx
}
