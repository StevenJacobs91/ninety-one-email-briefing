import { useState, useEffect, useCallback } from 'react'
import {
  MAFieldConfig,
  MASectionConfig,
  MAFieldConfigStore,
  MAFieldType,
  MAExportFormat,
  DEFAULT_SECTIONS,
  DEFAULT_FIELDS,
  LS_KEY,
} from '../lib/maFieldConfig'

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): MAFieldConfigStore {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { sections: DEFAULT_SECTIONS, fields: DEFAULT_FIELDS }
    const parsed = JSON.parse(raw) as MAFieldConfigStore
    if (!parsed.sections || !parsed.fields) return { sections: DEFAULT_SECTIONS, fields: DEFAULT_FIELDS }
    return parsed
  } catch {
    return { sections: DEFAULT_SECTIONS, fields: DEFAULT_FIELDS }
  }
}

function saveToStorage(store: MAFieldConfigStore): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store))
  } catch {
    // storage full or unavailable — ignore
  }
}

function uid(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMAFieldConfig() {
  const [store, setStore] = useState<MAFieldConfigStore>(loadFromStorage)

  useEffect(() => {
    saveToStorage(store)
  }, [store])

  // ── Section operations ────────────────────────────────────────────────────

  const updateSection = useCallback((sectionId: string, patch: Partial<Omit<MASectionConfig, 'id'>>) => {
    setStore((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, ...patch } : s),
    }))
  }, [])

  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setStore((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((s) => s.id === sectionId)
      if (idx === -1) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev
      const newSections = sorted.map((s, i) => {
        if (i === idx) return { ...s, order: sorted[swapIdx].order }
        if (i === swapIdx) return { ...s, order: sorted[idx].order }
        return s
      })
      return { ...prev, sections: newSections }
    })
  }, [])

  // ── Field operations ──────────────────────────────────────────────────────

  const addField = useCallback((sectionId: string, partial?: Partial<MAFieldConfig>): string => {
    const id = uid()
    const sectionFields = store.fields.filter((f) => f.sectionId === sectionId)
    const maxOrder = sectionFields.length > 0 ? Math.max(...sectionFields.map((f) => f.order)) : -1
    const newField: MAFieldConfig = {
      id,
      sectionId,
      key: id,             // custom fields use their own id as key
      label: 'New Field',
      fieldType: 'text',
      required: false,
      placeholder: '',
      hint: '',
      rows: 3,
      monoFont: false,
      options: [],
      defaultValue: '',
      visible: true,
      order: maxOrder + 1,
      isBuiltIn: false,
      exportLabel: 'New Field',
      exportFormat: 'bullet',
      exportSection: '',
      ...partial,
    }
    setStore((prev) => ({ ...prev, fields: [...prev.fields, newField] }))
    return id
  }, [store.fields])

  const updateField = useCallback((fieldId: string, patch: Partial<MAFieldConfig>) => {
    setStore((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.id !== fieldId) return f
        // Built-in fields: cannot change fieldType, key, or isBuiltIn
        if (f.isBuiltIn) {
          const { fieldType: _ft, key: _k, isBuiltIn: _ib, ...rest } = patch
          void _ft; void _k; void _ib
          return { ...f, ...rest }
        }
        return { ...f, ...patch }
      }),
    }))
  }, [])

  const deleteField = useCallback((fieldId: string) => {
    setStore((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => {
        if (f.id !== fieldId) return true
        if (f.isBuiltIn) return true   // cannot delete built-in
        return false
      }),
    }))
  }, [])

  const moveField = useCallback((fieldId: string, direction: 'up' | 'down') => {
    setStore((prev) => {
      const field = prev.fields.find((f) => f.id === fieldId)
      if (!field) return prev
      const sectionFields = prev.fields
        .filter((f) => f.sectionId === field.sectionId)
        .sort((a, b) => a.order - b.order)
      const idx = sectionFields.findIndex((f) => f.id === fieldId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sectionFields.length) return prev
      const swapOrder = sectionFields[swapIdx].order
      const fieldOrder = sectionFields[idx].order
      return {
        ...prev,
        fields: prev.fields.map((f) => {
          if (f.id === fieldId) return { ...f, order: swapOrder }
          if (f.id === sectionFields[swapIdx].id) return { ...f, order: fieldOrder }
          return f
        }),
      }
    })
  }, [])

  // ── Options management ────────────────────────────────────────────────────

  const addOption = useCallback((fieldId: string, option: { value: string; label: string; description?: string }) => {
    setStore((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === fieldId ? { ...f, options: [...f.options, option] } : f,
      ),
    }))
  }, [])

  const removeOption = useCallback((fieldId: string, optionValue: string) => {
    setStore((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === fieldId ? { ...f, options: f.options.filter((o) => o.value !== optionValue) } : f,
      ),
    }))
  }, [])

  const updateOption = useCallback((fieldId: string, optionValue: string, patch: Partial<{ label: string; description: string }>) => {
    setStore((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === fieldId
          ? { ...f, options: f.options.map((o) => o.value === optionValue ? { ...o, ...patch } : o) }
          : f,
      ),
    }))
  }, [])

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetToDefaults = useCallback(() => {
    const fresh = { sections: DEFAULT_SECTIONS, fields: DEFAULT_FIELDS }
    setStore(fresh)
    saveToStorage(fresh)
  }, [])

  // ── Derived helpers ───────────────────────────────────────────────────────

  const getSectionFields = useCallback(
    (sectionId: string): MAFieldConfig[] =>
      store.fields
        .filter((f) => f.sectionId === sectionId)
        .sort((a, b) => a.order - b.order),
    [store.fields],
  )

  const getSortedSections = useCallback(
    (): MASectionConfig[] => [...store.sections].sort((a, b) => a.order - b.order),
    [store.sections],
  )

  const getCustomFields = useCallback(
    (sectionId: string): MAFieldConfig[] =>
      store.fields
        .filter((f) => f.sectionId === sectionId && !f.isBuiltIn && f.visible)
        .sort((a, b) => a.order - b.order),
    [store.fields],
  )

  const getAllVisibleCustomFields = useCallback(
    (): MAFieldConfig[] =>
      store.fields
        .filter((f) => !f.isBuiltIn && f.visible)
        .sort((a, b) => a.order - b.order),
    [store.fields],
  )

  return {
    store,
    // Section ops
    updateSection,
    moveSection,
    getSortedSections,
    // Field ops
    addField,
    updateField,
    deleteField,
    moveField,
    getSectionFields,
    getCustomFields,
    getAllVisibleCustomFields,
    // Option ops
    addOption,
    removeOption,
    updateOption,
    // Reset
    resetToDefaults,
    // Convenience
    FIELD_TYPES_META: [
      { value: 'text' as MAFieldType,       label: 'Single-line Text',   icon: 'T' },
      { value: 'textarea' as MAFieldType,   label: 'Multi-line Text',    icon: '¶' },
      { value: 'select' as MAFieldType,     label: 'Dropdown Select',    icon: '▾' },
      { value: 'toggle' as MAFieldType,     label: 'Toggle / Boolean',   icon: '⊙' },
      { value: 'date' as MAFieldType,       label: 'Date Picker',        icon: '📅' },
      { value: 'number' as MAFieldType,     label: 'Number',             icon: '#' },
      { value: 'multi-chips' as MAFieldType, label: 'Multi-select Chips', icon: '⬤' },
    ],
    EXPORT_FORMATS_META: [
      { value: 'table-row' as MAExportFormat,    label: 'Table Row',      example: '| Label | Value |' },
      { value: 'heading-body' as MAExportFormat, label: 'Heading + Body', example: '### Label\nValue' },
      { value: 'bullet' as MAExportFormat,       label: 'Bullet Point',   example: '- **Label:** Value' },
      { value: 'code-block' as MAExportFormat,   label: 'Code Block',     example: '```\nValue\n```' },
      { value: 'inline' as MAExportFormat,       label: 'Inline',         example: '**Label:** Value' },
      { value: 'hidden' as MAExportFormat,       label: 'Hidden',         example: '(not exported)' },
    ],
  }
}

export type UseMAFieldConfigReturn = ReturnType<typeof useMAFieldConfig>
