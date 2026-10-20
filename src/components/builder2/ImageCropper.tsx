import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Image Cropper ─────────────────────────────────────────────────────────────
const CROP_W = 640
const CROP_H = 270

export interface ImageCropperProps {
  src: string
  onCrop: (dataUrl: string) => void
  onCancel: () => void
  /** Theme overlay data — shows logo, stripes, headline, sub-headline over the crop canvas */
  overlay?: {
    logoUrl?: string
    stripeUrl?: string
    accent: string
    headline: string
    subHeadline: string
  }
}

export function ImageCropper({ src, onCrop, onCancel, overlay }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const coverScale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight)
      const scaledW = img.naturalWidth * coverScale
      const scaledH = img.naturalHeight * coverScale
      setScale(coverScale)
      setOffsetX(-(scaledW - CROP_W) / 2)
      setOffsetY(-(scaledH - CROP_H) / 2)
      setLoaded(true)
    }
    img.src = src
  }, [src])

  useEffect(() => {
    if (!loaded || !imgRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = imgRef.current
    ctx.clearRect(0, 0, CROP_W, CROP_H)
    ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale)
  }, [loaded, scale, offsetX, offsetY])

  const clampOffsets = useCallback((ox: number, oy: number, s: number) => {
    const img = imgRef.current
    if (!img) return { ox, oy }
    const scaledW = img.naturalWidth * s
    const scaledH = img.naturalHeight * s
    return {
      ox: Math.min(0, Math.max(ox, CROP_W - scaledW)),
      oy: Math.min(0, Math.max(oy, CROP_H - scaledH)),
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
  }, [offsetX, offsetY])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const { ox, oy } = clampOffsets(dragStart.current.ox + dx, dragStart.current.oy + dy, scale)
    setOffsetX(ox)
    setOffsetY(oy)
  }, [clampOffsets, scale])

  const handleMouseUp = useCallback(() => { dragStart.current = null }, [])

  const handleScaleChange = useCallback((newScale: number) => {
    const { ox, oy } = clampOffsets(offsetX, offsetY, newScale)
    setScale(newScale)
    setOffsetX(ox)
    setOffsetY(oy)
  }, [clampOffsets, offsetX, offsetY])

  const handleCropAndUse = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCrop(canvas.toDataURL('image/jpeg', 0.92))
  }, [onCrop])

  const minScale = imgRef.current
    ? Math.max(CROP_W / imgRef.current.naturalWidth, CROP_H / imgRef.current.naturalHeight)
    : 0.1

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Crop Hero Image</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Drag to reposition · Output: 640 × 270 px</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none px-2"
          aria-label="Cancel crop"
        >
          &times;
        </button>
      </div>
      <div className="p-4">
        <div className="relative w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600 mb-4" style={{ aspectRatio: `${CROP_W}/${CROP_H}` }}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-gray-100 dark:bg-gray-800 z-10">Loading…</div>
          )}
          <canvas
            ref={canvasRef}
            width={CROP_W}
            height={CROP_H}
            className="block w-full cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {/* Template overlay — mirrors email header layout at 640×270 */}
          {overlay && loaded && (
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.72 }}>
              {/* Left column: 64% width — logo + text */}
              <div className="absolute" style={{ left: '6.25%', top: 0, width: '62%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '11.1% 0' }}>
                {/* Logo */}
                {overlay.logoUrl && (
                  <img
                    src={overlay.logoUrl}
                    alt="Logo"
                    style={{ width: '18.75%', maxWidth: 120, height: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                  />
                )}
                {/* Headline + sub-headline */}
                <div style={{ marginTop: 'auto' }}>
                  {overlay.headline && (
                    <p style={{
                      fontFamily: 'arial, helvetica, sans-serif',
                      fontSize: 'clamp(14px, 3.5vw, 28px)',
                      lineHeight: 1.1,
                      fontWeight: 'normal',
                      color: overlay.accent,
                      margin: '0 0 4px',
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {overlay.headline}
                    </p>
                  )}
                  {overlay.subHeadline && (
                    <p style={{
                      fontFamily: 'arial, helvetica, sans-serif',
                      fontSize: 'clamp(10px, 1.8vw, 14px)',
                      lineHeight: 1.3,
                      fontWeight: 'normal',
                      color: '#e8e5ce',
                      margin: 0,
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {overlay.subHeadline}
                    </p>
                  )}
                </div>
              </div>
              {/* Right column: stripe — 36% width, flush right, top-aligned */}
              {overlay.stripeUrl && (
                <div className="absolute" style={{ right: 0, top: 0, width: '31.25%', height: '86.7%', overflow: 'hidden' }}>
                  <img
                    src={overlay.stripeUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top', display: 'block' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Zoom</label>
            <span className="text-xs text-gray-400 font-mono">{(scale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.001}
            value={scale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-brand-primary"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              const img = imgRef.current
              if (!img) return
              const s = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight)
              const ox = -(img.naturalWidth * s - CROP_W) / 2
              const oy = -(img.naturalHeight * s - CROP_H) / 2
              setScale(s); setOffsetX(ox); setOffsetY(oy)
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndUse}
            className="px-4 py-1.5 text-xs bg-brand-primary text-white font-medium rounded-md hover:bg-brand-primary-hover transition-colors"
          >
            Crop & Use (640 × 270)
          </button>
        </div>
      </div>
    </div>
  )
}
