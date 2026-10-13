import { useState } from 'react'
import { useBuilder } from './BuilderContext'
import { BRAND_THEMES, EMAIL_MODULES } from '../../lib/constants'
import type { Block, HeroBlock, TextBlock, ImageBlock, ButtonBlock, ColumnsBlock, SpacerBlock, DividerBlock, SocialBlock, SocialPlatform, ModuleBlock, EmailConfig, HeadingStyleDef } from './types'

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

const SOCIAL_PLATFORMS: SocialPlatform[] = ['linkedin', 'twitter', 'youtube', 'instagram', 'facebook']

// ─── Shared UI primitives ────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="w-3.5 h-3.5 rounded-full border border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-500 flex items-center justify-center text-[9px] font-bold leading-none hover:border-[#134848] hover:text-[#134848] transition-colors"
        aria-label="More information"
      >?</button>
      {visible && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-48 text-[11px] text-white bg-gray-900 rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none">
          {text}
        </span>
      )}
    </span>
  )
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (v: string) => void
  tooltip?: string
}

function ColorPicker({ label, value, onChange, tooltip }: ColorPickerProps) {
  const safeHex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : '#134848'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono"
          placeholder="#000000"
        />
      </div>
      {/* Brand palette swatches */}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {BRAND_THEMES.map((t) => (
          <button key={t.id + '-p'} type="button" onClick={() => onChange(t.primary)}
            className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: t.primary }} title={`${t.label} — primary`} />
        ))}
        {BRAND_THEMES.map((t) => (
          <button key={t.id + '-a'} type="button" onClick={() => onChange(t.accent)}
            className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: t.accent }} title={`${t.label} — accent`} />
        ))}
      </div>
    </div>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}

function SliderField({ label, value, min, max, step = 1, unit = 'px', onChange }: SliderFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#134848]"
      />
    </div>
  )
}

interface AlignmentFieldProps {
  label: string
  value: 'left' | 'center' | 'right'
  onChange: (v: 'left' | 'center' | 'right') => void
}

function AlignmentField({ label, value, onChange }: AlignmentFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              value === a
                ? 'bg-[#134848] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {a[0].toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, multiline = false, placeholder = '' }: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const cls = "w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-y"
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  )
}

function ToggleField({ label, value, onChange, tooltip, description }: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  tooltip?: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</span>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134848] ${value ? 'bg-[#009d80]' : 'bg-gray-300 dark:bg-gray-600'}`}
          aria-checked={value}
          role="switch"
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
        </button>
      </div>
      {description && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed pr-10">{description}</p>
      )}
    </div>
  )
}

function NumberInput({ label, value, min, max, step = 1, unit = 'px', onChange, tooltip }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  tooltip?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="flex items-center gap-0 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold shrink-0 self-stretch"
          aria-label="Decrease"
        >−</button>
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-full text-xs text-center py-1.5 bg-transparent text-gray-700 dark:text-gray-300 font-mono focus:outline-none"
          />
          {unit && <span className="text-xs text-gray-400 pr-2 shrink-0">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold shrink-0 self-stretch"
          aria-label="Increase"
        >+</button>
      </div>
    </div>
  )
}

function CollapsibleSection({ title, children, defaultOpen = true }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="p-3 space-y-4">{children}</div>}
    </div>
  )
}

function update(dispatch: ReturnType<typeof useBuilder>['dispatch'], id: string, props: Record<string, unknown>) {
  dispatch({ type: 'UPDATE_BLOCK', id, props })
}

function HeroSettings({ block }: { block: HeroBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <TextField label="Heading" value={p.heading} onChange={(v) => d({ heading: v })} />
      <TextField label="Subheading" value={p.subheading} onChange={(v) => d({ subheading: v })} multiline />
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
      <TextField label="Background image URL" value={p.bgImageUrl} onChange={(v) => d({ bgImageUrl: v })} placeholder="https://..." />
      <SliderField label="Overlay opacity" value={p.overlayOpacity} min={0} max={1} step={0.05} unit="" onChange={(v) => d({ overlayOpacity: v })} />
      <ToggleField label="Show logo" value={p.logoVisible} onChange={(v) => d({ logoVisible: v })} />
      <AlignmentField label="Alignment" value={p.alignment} onChange={(v) => d({ alignment: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={16} max={120} onChange={(v) => d({ paddingY: v })} />
    </div>
  )
}

function TextSettings({ block }: { block: TextBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">HTML Content</label>
        <div className="flex gap-1 flex-wrap border-b border-gray-200 dark:border-gray-600 pb-1.5 mb-1">
          {[
            { tag: 'b', label: 'B' },
            { tag: 'i', label: 'I' },
            { tag: 'u', label: 'U' },
          ].map(({ tag, label }) => (
            <button
              key={tag}
              type="button"
              className="w-6 h-6 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={() => {
                const wrapped = `<${tag}>${label === 'B' ? 'bold' : label === 'I' ? 'italic' : 'underline'}</${tag}>`
                d({ html: p.html + wrapped })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          rows={5}
          value={p.html}
          onChange={(e) => d({ html: e.target.value })}
          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono resize-y"
        />
      </div>
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
      <AlignmentField label="Text alignment" value={p.alignment} onChange={(v) => d({ alignment: v })} />
      <SliderField label="Horizontal padding" value={p.paddingX} min={0} max={80} onChange={(v) => d({ paddingX: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={0} max={80} onChange={(v) => d({ paddingY: v })} />
    </div>
  )
}

function ImageSettings({ block }: { block: ImageBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <TextField label="Image URL" value={p.src} onChange={(v) => d({ src: v })} placeholder="https://..." />
      {p.src && <img src={p.src} alt={p.alt} className="w-full rounded border border-gray-200" />}
      <TextField label="Alt text" value={p.alt} onChange={(v) => d({ alt: v })} />
      <TextField label="Link URL" value={p.link} onChange={(v) => d({ link: v })} placeholder="https://..." />
      <SliderField label="Width" value={p.width} min={20} max={100} unit="%" onChange={(v) => d({ width: v })} />
      <AlignmentField label="Alignment" value={p.alignment} onChange={(v) => d({ alignment: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={0} max={64} onChange={(v) => d({ paddingY: v })} />
    </div>
  )
}

function ButtonSettings({ block }: { block: ButtonBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <TextField label="Button label" value={p.label} onChange={(v) => d({ label: v })} />
      <TextField label="URL" value={p.url} onChange={(v) => d({ url: v })} placeholder="https://..." />
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
      <ColorPicker label="Text color" value={p.textColor} onChange={(v) => d({ textColor: v })} />
      <AlignmentField label="Alignment" value={p.alignment} onChange={(v) => d({ alignment: v })} />
      <SliderField label="Border radius" value={p.borderRadius} min={0} max={32} onChange={(v) => d({ borderRadius: v })} />
      <SliderField label="Horizontal padding" value={p.paddingX} min={8} max={80} onChange={(v) => d({ paddingX: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={4} max={40} onChange={(v) => d({ paddingY: v })} />
      <SliderField label="Block padding" value={p.blockPaddingY} min={0} max={64} onChange={(v) => d({ blockPaddingY: v })} />
    </div>
  )
}

function ColumnsSettings({ block }: { block: ColumnsBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Columns</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                const newCols = Array.from({ length: n }, (_, i) => block.props.columns[i] ?? { blocks: [] })
                d({ columnCount: n, columns: newCols })
              }}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                p.columnCount === n ? 'bg-[#134848] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {n} columns
            </button>
          ))}
        </div>
      </div>
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
      <SliderField label="Gap between columns" value={p.gap} min={0} max={48} onChange={(v) => d({ gap: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={0} max={80} onChange={(v) => d({ paddingY: v })} />
    </div>
  )
}

function SpacerSettings({ block }: { block: SpacerBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <SliderField label="Height" value={p.height} min={8} max={120} onChange={(v) => d({ height: v })} />
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
    </div>
  )
}

function DividerSettings({ block }: { block: DividerBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  return (
    <div className="space-y-4">
      <ColorPicker label="Line color" value={p.color} onChange={(v) => d({ color: v })} />
      <SliderField label="Thickness" value={p.thickness} min={1} max={8} onChange={(v) => d({ thickness: v })} />
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Style</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
          {(['solid', 'dashed', 'dotted'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => d({ style: s })}
              className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                p.style === s ? 'bg-[#134848] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <SliderField label="Vertical padding" value={p.paddingY} min={0} max={64} onChange={(v) => d({ paddingY: v })} />
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
    </div>
  )
}

function SocialSettings({ block }: { block: SocialBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)

  function togglePlatform(platform: SocialPlatform) {
    const current = p.platforms
    const next = current.includes(platform)
      ? current.filter((pl) => pl !== platform)
      : [...current, platform]
    d({ platforms: next })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Platforms</label>
        <div className="space-y-1">
          {SOCIAL_PLATFORMS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={p.platforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="rounded accent-[#134848]"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">{platform === 'twitter' ? 'Twitter / X' : platform}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Icon style</label>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
          {(['filled', 'outline'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => d({ iconStyle: s })}
              className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                p.iconStyle === s ? 'bg-[#134848] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <ColorPicker label="Icon color" value={p.iconColor} onChange={(v) => d({ iconColor: v })} />
      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
      <AlignmentField label="Alignment" value={p.alignment} onChange={(v) => d({ alignment: v })} />
      <SliderField label="Vertical padding" value={p.paddingY} min={0} max={80} onChange={(v) => d({ paddingY: v })} />
    </div>
  )
}

function ModuleSettings({ block }: { block: ModuleBlock }) {
  const { dispatch } = useBuilder()
  const p = block.props
  const d = (props: Record<string, unknown>) => update(dispatch, block.id, props)
  const mod = EMAIL_MODULES.find((m) => m.id === p.moduleId)

  return (
    <div className="space-y-4">
      {/* Module identity — read-only info */}
      {mod && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{mod.label}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{mod.description}</p>
          <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
            {mod.category}
          </span>
        </div>
      )}

      {/* Notes / instructions */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Notes &amp; Instructions
        </label>
        <textarea
          rows={5}
          value={p.notes}
          onChange={(e) => d({ notes: e.target.value })}
          maxLength={500}
          placeholder="Add notes for the email producer — e.g. copy, image requirements, special instructions…"
          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-y placeholder-gray-400"
        />
        <p className="text-[10px] text-gray-400 text-right">{p.notes.length}/500</p>
      </div>

      <ColorPicker label="Background color" value={p.bgColor} onChange={(v) => d({ bgColor: v })} />
    </div>
  )
}

function BlockSettings({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero': return <HeroSettings block={block} />
    case 'text': return <TextSettings block={block} />
    case 'image': return <ImageSettings block={block} />
    case 'button': return <ButtonSettings block={block} />
    case 'columns': return <ColumnsSettings block={block} />
    case 'spacer': return <SpacerSettings block={block} />
    case 'divider': return <DividerSettings block={block} />
    case 'social': return <SocialSettings block={block} />
    case 'module': return <ModuleSettings block={block} />
    default: return null
  }
}

export function BuilderSettingsPanel() {
  const { state, dispatch } = useBuilder()
  const { blocks, selectedBlockId, emailConfig } = state

  const selectedBlock = selectedBlockId ? blocks.find((b) => b.id === selectedBlockId) : null

  if (selectedBlock) {
    return (
      <aside className="w-80 shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Block Settings</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize mt-0.5">
              {selectedBlock.type === 'module'
                ? (EMAIL_MODULES.find((m) => m.id === (selectedBlock as ModuleBlock).props.moduleId)?.label ?? 'Module')
                : selectedBlock.type}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SELECT_BLOCK', id: null })}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <BlockSettings block={selectedBlock} />
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'DUPLICATE_BLOCK', id: selectedBlock.id })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'REMOVE_BLOCK', id: selectedBlock.id })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-600 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6 18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete block
          </button>
        </div>
      </aside>
    )
  }

  // ── Global Styles & Layout panel (no block selected) ──────────────────────
  const cfg = emailConfig
  const set = (patch: Partial<EmailConfig>) => dispatch({ type: 'SET_EMAIL_CONFIG', config: patch })

  return (
    <aside className="w-80 shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Global Styles &amp; Layout</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Applied across the whole email</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Section: General ────────────────────────────────────────────── */}
        <div className="p-4 space-y-5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">General</p>

          {/* Subject */}
          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Subject line</label>
              <InfoTooltip text="The email subject line shown in the inbox. Not rendered in the email body." />
            </div>
            <input
              type="text"
              value={cfg.subject ?? ''}
              onChange={(e) => set({ subject: e.target.value })}
              placeholder="Your email subject…"
              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>

          {/* Background colour */}
          <ColorPicker
            label="Background color"
            value={cfg.backgroundColor}
            onChange={(v) => set({ backgroundColor: v })}
            tooltip="The outer background colour visible around the email frame."
          />

          {/* Brand Theme picker */}
          <div className="space-y-2">
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Brand Theme</label>
              <InfoTooltip text="Applying a theme presets the primary and accent colours across headings, buttons and links." />
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-0.5">
              {BRAND_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set({
                    linkColor: t.primary,
                    headingStyles: {
                      h1: { ...cfg.headingStyles.h1, color: t.primary },
                      h2: { ...cfg.headingStyles.h2, color: t.primary },
                      h3: { ...cfg.headingStyles.h3, color: t.primary },
                    },
                    buttonStyles: { ...cfg.buttonStyles, bgColor: t.accent, textColor: t.primary },
                  })}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left group"
                >
                  <div className="flex gap-1 shrink-0">
                    <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: t.primary }} />
                    <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: t.accent }} />
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 leading-tight truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background image */}
          <div className="space-y-2">
            <ToggleField
              label="Background Image"
              value={cfg.backgroundImageEnabled}
              onChange={(v) => set({ backgroundImageEnabled: v })}
              tooltip="Show a background image behind the email content."
            />
            {cfg.backgroundImageEnabled && (
              <input
                type="text"
                value={cfg.backgroundImageUrl}
                onChange={(e) => set({ backgroundImageUrl: e.target.value })}
                placeholder="https://example.com/bg.jpg"
                className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              />
            )}
          </div>
        </div>

        {/* ── Section: Layout ─────────────────────────────────────────────── */}
        <div className="p-4 space-y-5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Layout</p>

          {/* Content width */}
          <NumberInput
            label="Message Content Width"
            value={cfg.contentWidth}
            min={480}
            max={800}
            step={10}
            unit="px"
            onChange={(v) => set({ contentWidth: v })}
            tooltip="The maximum width of the email content area. 600px is the industry standard."
          />

          {/* Message alignment */}
          <div className="space-y-1.5">
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Message Alignment</label>
              <InfoTooltip text="Controls how the email content is horizontally aligned within the email client window." />
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set({ messageAlignment: a })}
                  className={`flex-1 py-1.5 flex items-center justify-center transition-colors ${
                    cfg.messageAlignment === a
                      ? 'bg-[#009d80] text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={a.charAt(0).toUpperCase() + a.slice(1)}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    {a === 'left' && <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></>}
                    {a === 'center' && <><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>}
                    {a === 'right' && <><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></>}
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Font family */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Font Family</label>
            <select
              value={cfg.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value })}
              className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Section: Behaviour toggles ───────────────────────────────────── */}
        <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Behaviour</p>

          <ToggleField
            label="Underline Links"
            value={cfg.underlineLinks}
            onChange={(v) => set({ underlineLinks: v })}
            tooltip="Show an underline on all hyperlinks in the email body."
          />
          <ToggleField
            label="Responsive Design"
            value={cfg.responsiveDesign}
            onChange={(v) => set({ responsiveDesign: v })}
            tooltip="Adds a mobile media query so the email reflows into a single column on small screens."
            description="Your email will automatically adjust for smaller screens by displaying content in a single column. Side-by-side blocks will be stacked vertically."
          />
          <ToggleField
            label="Hide Image Download Icons"
            value={cfg.hideImageDownloadIcons}
            onChange={(v) => set({ hideImageDownloadIcons: v })}
            tooltip="Prevents Gmail from showing download icons on wide images."
            description="Prevents Gmail from showing download icons on wide images."
          />
        </div>

        {/* ── Collapsible subsections ────────────────────────────────────── */}
        <div className="p-4 space-y-3">

          <CollapsibleSection title="Stripe Styles" defaultOpen={false}>
            <ColorPicker
              label="Default stripe background"
              value={cfg.stripeStyles.bgColor}
              onChange={(v) => set({ stripeStyles: { ...cfg.stripeStyles, bgColor: v } })}
              tooltip="The default background colour for each stripe (row) in the email."
            />
            <NumberInput
              label="Stripe vertical padding"
              value={cfg.stripeStyles.paddingY}
              min={0}
              max={80}
              onChange={(v) => set({ stripeStyles: { ...cfg.stripeStyles, paddingY: v } })}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Heading Styles" defaultOpen={false}>
            {(['h1', 'h2', 'h3'] as const).map((h) => (
              <div key={h} className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase">{h.toUpperCase()}</p>
                <ColorPicker
                  label="Color"
                  value={cfg.headingStyles[h].color}
                  onChange={(v) => set({ headingStyles: { ...cfg.headingStyles, [h]: { ...cfg.headingStyles[h], color: v } as HeadingStyleDef } })}
                />
                <NumberInput
                  label="Font size"
                  value={cfg.headingStyles[h].fontSize}
                  min={12}
                  max={72}
                  unit="px"
                  onChange={(v) => set({ headingStyles: { ...cfg.headingStyles, [h]: { ...cfg.headingStyles[h], fontSize: v } as HeadingStyleDef } })}
                />
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  {(['normal', 'bold'] as const).map((w) => (
                    <button key={w} type="button"
                      onClick={() => set({ headingStyles: { ...cfg.headingStyles, [h]: { ...cfg.headingStyles[h], fontWeight: w } as HeadingStyleDef } })}
                      className={`flex-1 py-1 text-xs font-medium transition-colors ${cfg.headingStyles[h].fontWeight === w ? 'bg-[#134848] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {w.charAt(0).toUpperCase() + w.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection title="Button Styles" defaultOpen={false}>
            <ColorPicker
              label="Background color"
              value={cfg.buttonStyles.bgColor}
              onChange={(v) => set({ buttonStyles: { ...cfg.buttonStyles, bgColor: v } })}
              tooltip="Default background colour for all buttons. Individual button blocks can override this."
            />
            <ColorPicker
              label="Text color"
              value={cfg.buttonStyles.textColor}
              onChange={(v) => set({ buttonStyles: { ...cfg.buttonStyles, textColor: v } })}
            />
            <NumberInput
              label="Border radius"
              value={cfg.buttonStyles.borderRadius}
              min={0}
              max={32}
              unit="px"
              onChange={(v) => set({ buttonStyles: { ...cfg.buttonStyles, borderRadius: v } })}
            />
            <NumberInput
              label="Horizontal padding"
              value={cfg.buttonStyles.paddingX}
              min={8}
              max={80}
              unit="px"
              onChange={(v) => set({ buttonStyles: { ...cfg.buttonStyles, paddingX: v } })}
            />
            <NumberInput
              label="Vertical padding"
              value={cfg.buttonStyles.paddingY}
              min={4}
              max={40}
              unit="px"
              onChange={(v) => set({ buttonStyles: { ...cfg.buttonStyles, paddingY: v } })}
            />
            {/* Live preview */}
            <div className="pt-1">
              <p className="text-[11px] text-gray-400 mb-1.5">Preview</p>
              <div className="flex justify-center">
                <span
                  className="text-xs font-semibold"
                  style={{
                    backgroundColor: cfg.buttonStyles.bgColor,
                    color: cfg.buttonStyles.textColor,
                    borderRadius: cfg.buttonStyles.borderRadius,
                    padding: `${cfg.buttonStyles.paddingY}px ${cfg.buttonStyles.paddingX}px`,
                    display: 'inline-block',
                  }}
                >
                  Read More
                </span>
              </div>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </aside>
  )
}
