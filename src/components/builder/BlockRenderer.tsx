import type { Block, HeroBlock, TextBlock, ImageBlock, ButtonBlock, ColumnsBlock, SpacerBlock, DividerBlock, SocialBlock, ModuleBlock } from './types'
import { EMAIL_MODULES } from '../../lib/constants'
import { EmailPreviewBlock } from '../content-editor/EmailPreviewBlock'

const DEFAULT_THEME = { primary: '#134848', accent: '#fbaa96' }

function ModuleRenderer({ block }: { block: ModuleBlock }) {
  const { moduleId, notes, bgColor } = block.props
  const mod = EMAIL_MODULES.find((m) => m.id === moduleId)
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'

  return (
    <div style={{ backgroundColor: bg }}>
      <EmailPreviewBlock moduleId={moduleId} theme={DEFAULT_THEME} />
      {notes && (
        <div className="px-4 py-2 border-t border-dashed border-gray-200 bg-amber-50">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold">Notes: </span>{notes}
          </p>
        </div>
      )}
      {mod && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{mod.category}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-500">{mod.label}</span>
        </div>
      )}
    </div>
  )
}

function sanitizeHtmlForDisplay(html: string): string {
  // Remove script tags and event handlers for display safety
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

function HeroRenderer({ block }: { block: HeroBlock }) {
  const { bgColor, bgImageUrl, overlayOpacity, logoVisible, heading, subheading, alignment, paddingY } = block.props
  const textAlign = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'
  const itemsAlign = alignment === 'left' ? 'items-start' : alignment === 'right' ? 'items-end' : 'items-center'

  const bgStyle: React.CSSProperties = bgImageUrl
    ? {
        backgroundImage: `url(${bgImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: bgColor,
      }
    : { backgroundColor: bgColor }

  return (
    <div style={bgStyle} className="relative w-full">
      {bgImageUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
      )}
      <div
        className={`relative flex flex-col ${itemsAlign} ${textAlign}`}
        style={{ padding: `${paddingY}px 40px` }}
      >
        {logoVisible && (
          <img
            src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png"
            alt="Ninety One"
            className="mb-5 w-24 h-auto"
          />
        )}
        <h1 className="text-white font-bold leading-tight m-0 mb-2" style={{ fontSize: 28 }}>{heading}</h1>
        <p className="text-white/80 leading-relaxed m-0" style={{ fontSize: 15 }}>{subheading}</p>
      </div>
    </div>
  )
}

function TextRenderer({ block }: { block: TextBlock }) {
  const { html, paddingX, paddingY, alignment, bgColor } = block.props
  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'
  const clean = sanitizeHtmlForDisplay(html)
  return (
    <div
      className="w-full"
      style={{ backgroundColor: bg, padding: `${paddingY}px ${paddingX}px`, textAlign: textAlign as React.CSSProperties['textAlign'] }}
    >
      <div
        className="prose prose-sm max-w-none"
        style={{ fontFamily: 'inherit', fontSize: 15, color: '#333333', lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  )
}

function ImageRenderer({ block }: { block: ImageBlock }) {
  const { src, alt, width, alignment, paddingY } = block.props
  const justifyClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'

  return (
    <div className={`flex ${justifyClass} w-full`} style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ width: `${width}%`, maxWidth: '100%', display: 'block', height: 'auto' }}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded"
          style={{ width: `${width}%`, minHeight: 80 }}
        >
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
              <path d="m21 15-5-5L5 21" strokeWidth="1.5" />
            </svg>
            <p className="text-xs text-gray-400">{alt || 'No image URL'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ButtonRenderer({ block }: { block: ButtonBlock }) {
  const { label, url, bgColor, textColor, borderRadius, paddingX, paddingY, alignment, blockPaddingY } = block.props
  const justifyClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'

  return (
    <div className={`flex ${justifyClass} w-full`} style={{ paddingTop: blockPaddingY, paddingBottom: blockPaddingY, paddingLeft: 32, paddingRight: 32 }}>
      <a
        href={url}
        onClick={(e) => e.preventDefault()}
        className="inline-block font-bold uppercase text-xs tracking-wider no-underline"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: borderRadius,
          padding: `${paddingY}px ${paddingX}px`,
          textDecoration: 'none',
        }}
      >
        {label}
      </a>
    </div>
  )
}

interface ColumnsRendererProps {
  block: ColumnsBlock
  renderBlock: (b: Block) => React.ReactNode
}

function ColumnsRenderer({ block, renderBlock }: ColumnsRendererProps) {
  const { columnCount, gap, bgColor, paddingY, columns } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'

  return (
    <div className="w-full" style={{ backgroundColor: bg, padding: `${paddingY}px 16px` }}>
      <div className="flex" style={{ gap: gap, flexWrap: 'wrap' }}>
        {Array.from({ length: columnCount }).map((_, i) => (
          <div key={i} style={{ flex: '1 1 0', minWidth: 0 }}>
            {columns[i]?.blocks?.map((b) => (
              <div key={b.id}>{renderBlock(b)}</div>
            ))}
            {(!columns[i]?.blocks?.length) && (
              <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded text-xs text-gray-400">
                Column {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SpacerRenderer({ block }: { block: SpacerBlock }) {
  const { height, bgColor } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : 'transparent'
  return (
    <div
      className="w-full border-y border-dashed border-gray-200 flex items-center justify-center"
      style={{ height: height, backgroundColor: bg, minHeight: 16 }}
    >
      <span className="text-[10px] text-gray-300 select-none">{height}px</span>
    </div>
  )
}

function DividerRenderer({ block }: { block: DividerBlock }) {
  const { color, thickness, paddingY, bgColor, style } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : 'transparent'
  return (
    <div className="w-full" style={{ backgroundColor: bg, paddingTop: paddingY, paddingBottom: paddingY, paddingLeft: 32, paddingRight: 32 }}>
      <hr style={{ border: 'none', borderTop: `${thickness}px ${style} ${color}`, margin: 0 }} />
    </div>
  )
}

const SOCIAL_SVG: Record<string, React.ReactNode> = {
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.261 5.635z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
      <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="white"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="white"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" strokeWidth="2"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
    </svg>
  ),
}

function SocialRenderer({ block }: { block: SocialBlock }) {
  const { platforms, iconStyle, iconColor, bgColor, paddingY, alignment } = block.props
  const justifyClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'

  return (
    <div className={`flex ${justifyClass} gap-2 w-full`} style={{ backgroundColor: bg, paddingTop: paddingY, paddingBottom: paddingY }}>
      {platforms.map((platform) => (
        <div
          key={platform}
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={
            iconStyle === 'filled'
              ? { backgroundColor: iconColor, color: '#ffffff' }
              : { border: `2px solid ${iconColor}`, color: iconColor }
          }
          title={platform}
        >
          {SOCIAL_SVG[platform]}
        </div>
      ))}
    </div>
  )
}

export function renderBlockContent(block: Block, renderBlock: (b: Block) => React.ReactNode): React.ReactNode {
  switch (block.type) {
    case 'hero': return <HeroRenderer block={block} />
    case 'text': return <TextRenderer block={block} />
    case 'image': return <ImageRenderer block={block} />
    case 'button': return <ButtonRenderer block={block} />
    case 'columns': return <ColumnsRenderer block={block} renderBlock={renderBlock} />
    case 'spacer': return <SpacerRenderer block={block} />
    case 'divider': return <DividerRenderer block={block} />
    case 'social': return <SocialRenderer block={block} />
    case 'module': return <ModuleRenderer block={block} />
    default: return null
  }
}
