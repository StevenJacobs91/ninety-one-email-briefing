interface ThemeColors {
  primary: string
  accent: string
}

interface EmailPreviewBlockProps {
  moduleId: string
  theme: ThemeColors
  isSelected?: boolean
}

// Simulated text bars for realistic mockup feel
function TextBar({ width, height = 6, opacity = 1 }: { width: string | number; height?: number; opacity?: number }) {
  return (
    <div
      className="rounded-sm bg-gray-200"
      style={{ width, height, opacity }}
      aria-hidden="true"
    />
  )
}

function AccentButton({ primary, accent, label, outline = false }: { primary: string; accent: string; label?: string; outline?: boolean }) {
  if (outline) {
    return (
      <div
        className="rounded px-3 py-1 text-center"
        style={{ border: `1px solid ${primary}`, color: primary, fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {label ?? 'Read More'}
      </div>
    )
  }
  return (
    <div
      className="rounded px-3 py-1 text-center"
      style={{ background: accent, color: '#fff', fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      {label ?? 'Register Now'}
    </div>
  )
}

function LogoMark({ color }: { color: string }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: 20, height: 20, background: color, border: '1.5px solid rgba(255,255,255,0.4)' }}
    >
      <span style={{ color: '#fff', fontSize: 7, fontWeight: 700, letterSpacing: '-0.5px' }}>N1</span>
    </div>
  )
}

export function EmailPreviewBlock({ moduleId, theme }: EmailPreviewBlockProps) {
  const { primary, accent } = theme

  switch (moduleId) {
    // ─── HEADERS ─────────────────────────────────────────────────────────────

    case 'header-small':
      return (
        <div className="w-full flex items-center gap-2 px-3 py-2" style={{ background: primary, minHeight: 48 }}>
          <LogoMark color={accent} />
          <div className="flex flex-col gap-1 flex-1">
            <div className="rounded-sm" style={{ width: '60%', height: 5, background: 'rgba(255,255,255,0.9)' }} />
            <div className="rounded-sm" style={{ width: '40%', height: 4, background: 'rgba(255,255,255,0.5)' }} />
          </div>
        </div>
      )

    case 'header-image':
      return (
        <div
          className="w-full relative flex flex-col items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${accent}55 100%)`,
            minHeight: 80,
          }}
        >
          <div className="absolute top-2 left-2">
            <LogoMark color={accent} />
          </div>
          <div className="flex flex-col items-center gap-1.5 px-4 pt-4 pb-3">
            <div className="rounded-sm" style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.9)' }} />
            <div className="rounded-sm" style={{ width: 70, height: 4, background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <div className="rounded-sm" style={{ width: 60, height: 3, background: accent }} />
        </div>
      )

    case 'greeting':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col gap-1.5">
          <div className="text-gray-400 italic" style={{ fontSize: 8 }}>Dear [First Name],</div>
          <div className="rounded-sm bg-gray-200" style={{ width: '80%', height: 5 }} />
          <div className="rounded-sm bg-gray-200" style={{ width: '60%', height: 5 }} />
          <div className="mt-0.5" style={{ width: '100%', height: 1, background: '#e5e7eb' }} />
        </div>
      )

    // ─── CONTENT ─────────────────────────────────────────────────────────────

    case 'body-content':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col gap-1.5">
          <TextBar width="90%" height={5} />
          <TextBar width="100%" height={4} />
          <TextBar width="95%" height={4} />
          <TextBar width="75%" height={4} />
        </div>
      )

    case 'body-content-list':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col gap-1.5">
          <TextBar width="60%" height={5} />
          <div className="flex flex-col gap-1 mt-1">
            {['75%', '65%', '80%'].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="rounded-full shrink-0" style={{ width: 4, height: 4, background: accent }} />
                <TextBar width={w} height={4} />
              </div>
            ))}
          </div>
        </div>
      )

    case 'body-inner-content':
      return (
        <div className="w-full bg-white px-3 py-2">
          <div className="rounded-md px-2.5 py-2 flex flex-col gap-1.5" style={{ background: `${accent}18` }}>
            <div className="rounded-sm" style={{ width: '55%', height: 5, background: primary, opacity: 0.7 }} />
            <TextBar width="90%" height={4} />
            <TextBar width="70%" height={4} />
          </div>
        </div>
      )

    case 'inner-content-v1':
      return (
        <div className="w-full bg-white px-3 py-2">
          <div className="rounded-md px-2.5 py-2 flex flex-col gap-1.5" style={{ background: `${accent}18` }}>
            <TextBar width="70%" height={5} />
            <TextBar width="90%" height={4} />
            <div className="mt-1" style={{ color: accent, fontSize: 7, fontWeight: 600 }}>Read more →</div>
          </div>
        </div>
      )

    case 'inner-content-v2':
      return (
        <div className="w-full bg-white px-3 py-2">
          <div className="rounded-md px-2.5 py-2 flex flex-col gap-1" style={{ background: `${accent}18` }}>
            <TextBar width="60%" height={5} />
            {['70%', '65%', '75%'].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 1, background: primary, opacity: 0.5, flexShrink: 0 }} />
                <TextBar width={w} height={4} />
              </div>
            ))}
          </div>
        </div>
      )

    case 'inner-content-v3':
      return (
        <div className="w-full bg-white px-3 py-2">
          <div className="rounded-md px-2.5 py-2 flex flex-col gap-1.5" style={{ background: `${accent}18` }}>
            <TextBar width="70%" height={5} />
            <TextBar width="85%" height={4} />
            <div className="flex justify-center mt-1">
              <AccentButton primary={primary} accent={accent} label="Learn More" outline />
            </div>
          </div>
        </div>
      )

    case 'numbered-section-v1':
      return (
        <div className="w-full px-3 py-3 flex flex-col gap-2" style={{ background: primary }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center shrink-0"
                style={{ width: 14, height: 14, background: accent, fontSize: 6, color: '#fff', fontWeight: 700 }}
              >
                {n}
              </div>
              <div className="rounded-sm flex-1" style={{ height: 4, background: 'rgba(255,255,255,0.6)' }} />
            </div>
          ))}
        </div>
      )

    case 'numbered-section-v2':
      return (
        <div className="w-full bg-white px-3 py-2">
          <div className="rounded-md px-2.5 py-2 flex flex-col gap-1.5" style={{ background: `${accent}18` }}>
            {[1, 2].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className="rounded flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14, background: primary, fontSize: 7, color: '#fff', fontWeight: 700 }}
                >
                  {n}
                </div>
                <TextBar width="75%" height={4} />
              </div>
            ))}
          </div>
        </div>
      )

    // ─── CTAs ─────────────────────────────────────────────────────────────────

    case 'cta-single-primary':
      return (
        <div className="w-full bg-white px-3 py-4 flex justify-center">
          <AccentButton primary={primary} accent={accent} label="Register Now" />
        </div>
      )

    case 'cta-primary-secondary':
      return (
        <div className="w-full bg-white px-3 py-3 flex justify-center gap-2 flex-wrap">
          <AccentButton primary={primary} accent={accent} label="Register" />
          <AccentButton primary={primary} accent={accent} label="Learn More" outline />
        </div>
      )

    case 'cta-dual-secondary':
      return (
        <div className="w-full bg-white px-3 py-3 flex justify-center gap-2">
          <AccentButton primary={primary} accent={accent} label="View More" outline />
          <AccentButton primary={primary} accent={accent} label="Contact Us" outline />
        </div>
      )

    case 'cta-single-secondary':
      return (
        <div className="w-full bg-white px-3 py-4 flex justify-center">
          <AccentButton primary={primary} accent={accent} label="Find Out More" outline />
        </div>
      )

    case 'cta-1primary-2secondary':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col items-center gap-1.5">
          <AccentButton primary={primary} accent={accent} label="Register Now" />
          <div className="flex gap-2">
            <AccentButton primary={primary} accent={accent} label="More Info" outline />
            <AccentButton primary={primary} accent={accent} label="Contact" outline />
          </div>
        </div>
      )

    // ─── EVENTS ────────────────────────────────────────────────────────────────

    case 'event-registration-1cta':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="rounded flex items-center justify-center shrink-0" style={{ width: 22, height: 22, background: `${accent}22`, border: `1px solid ${accent}` }}>
              <div style={{ fontSize: 7 }}>📅</div>
            </div>
            <div className="flex flex-col gap-0.5">
              <TextBar width={90} height={5} />
              <TextBar width={70} height={4} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <TextBar width={50} height={4} />
            </div>
            <div className="flex items-center gap-1">
              <TextBar width={40} height={4} />
            </div>
          </div>
          <div className="flex justify-center mt-1">
            <AccentButton primary={primary} accent={accent} label="Register Now" />
          </div>
        </div>
      )

    case 'event-registration-2cta':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="rounded" style={{ width: 22, height: 22, background: `${accent}22`, flexShrink: 0 }} />
            <div className="flex flex-col gap-0.5 flex-1">
              <TextBar width="80%" height={5} />
              <TextBar width="55%" height={4} />
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-1">
            <AccentButton primary={primary} accent={accent} label="In Person" />
            <AccentButton primary={primary} accent={accent} label="Virtual" outline />
          </div>
        </div>
      )

    case 'event-registration-v3':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          <div className="rounded-md px-2 py-1.5 flex flex-col gap-1" style={{ background: `${primary}0d` }}>
            <TextBar width="65%" height={5} />
            <TextBar width="50%" height={4} />
            <TextBar width="45%" height={4} />
          </div>
          <div className="flex justify-center">
            <AccentButton primary={primary} accent={accent} label="Register" />
          </div>
        </div>
      )

    case 'event-registration-v4':
      return (
        <div className="w-full px-3 py-2" style={{ background: `${accent}18` }}>
          <div className="bg-white rounded-md px-2.5 py-2 flex flex-col gap-1.5">
            <TextBar width="70%" height={5} />
            <TextBar width="55%" height={4} />
            <div className="flex justify-center mt-0.5">
              <AccentButton primary={primary} accent={accent} label="Register Now" />
            </div>
          </div>
        </div>
      )

    case 'event-registration-v5':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          <TextBar width="75%" height={5} />
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <TextBar width="80%" height={4} />
              <TextBar width="60%" height={4} />
            </div>
            <div className="rounded" style={{ width: 32, height: 28, background: `${accent}22`, flexShrink: 0 }} />
          </div>
          <div className="flex justify-center">
            <AccentButton primary={primary} accent={accent} label="Register Now" />
          </div>
        </div>
      )

    case 'itinerary-table':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1">
          {[['09:00', '80%'], ['09:45', '65%'], ['10:30', '75%']].map(([time, w], i) => (
            <div key={i} className="flex items-center gap-2 py-0.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 7, color: accent, fontWeight: 600, width: 24, flexShrink: 0 }}>{time}</div>
              <TextBar width={w} height={4} />
            </div>
          ))}
        </div>
      )

    // ─── SPEAKERS ─────────────────────────────────────────────────────────────

    case 'speaker-2pm-1cta':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col items-center gap-2">
          <div className="flex gap-4 justify-center">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="rounded-full bg-gray-200 shrink-0" style={{ width: 28, height: 28 }} />
                <TextBar width={48} height={4} />
                <TextBar width={36} height={3} />
              </div>
            ))}
          </div>
          <AccentButton primary={primary} accent={accent} label="Meet the Team" />
        </div>
      )

    case 'speaker-2pm-3cta':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col items-center gap-2">
          <div className="flex gap-4 justify-center">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="rounded-full bg-gray-200" style={{ width: 24, height: 24 }} />
                <TextBar width={40} height={4} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-center">
            <AccentButton primary={primary} accent={accent} label="Bio" outline />
            <AccentButton primary={primary} accent={accent} label="LinkedIn" outline />
            <AccentButton primary={primary} accent={accent} label="Register" />
          </div>
        </div>
      )

    case 'speaker-1pm':
      return (
        <div className="w-full bg-white px-3 py-3 flex items-start gap-2.5">
          <div className="rounded-full bg-gray-200 shrink-0" style={{ width: 36, height: 36 }} />
          <div className="flex flex-col gap-1.5 flex-1">
            <TextBar width="70%" height={5} />
            <TextBar width="55%" height={4} />
            <TextBar width="85%" height={4} />
            <TextBar width="60%" height={4} />
          </div>
        </div>
      )

    case 'speakers-2col':
      return (
        <div className="w-full bg-white px-3 py-3 flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 p-1.5 rounded" style={{ background: `${accent}10` }}>
              <div className="rounded-full bg-gray-300" style={{ width: 24, height: 24 }} />
              <TextBar width="70%" height={4} />
              <TextBar width="55%" height={3} />
            </div>
          ))}
        </div>
      )

    case 'speakers-3col':
      return (
        <div className="w-full bg-white px-3 py-2 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 p-1 rounded" style={{ background: `${accent}10` }}>
              <div className="rounded-full bg-gray-300" style={{ width: 18, height: 18 }} />
              <TextBar width="80%" height={3} />
              <TextBar width="60%" height={3} />
            </div>
          ))}
        </div>
      )

    // ─── ARTICLES ─────────────────────────────────────────────────────────────

    case 'article-list-v1':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2 pb-1.5" style={{ borderBottom: i === 0 ? '1px solid #f3f4f6' : 'none' }}>
              <div className="rounded bg-gray-200 shrink-0" style={{ width: 36, height: 28 }} />
              <div className="flex flex-col gap-1 flex-1">
                <TextBar width="80%" height={5} />
                <TextBar width="90%" height={4} />
                <TextBar width="60%" height={4} />
              </div>
            </div>
          ))}
        </div>
      )

    case 'article-list-v2':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <div className="rounded bg-gray-200 shrink-0" style={{ width: 24, height: 20 }} />
              <div className="flex flex-col gap-0.5 flex-1">
                <TextBar width="75%" height={4} />
                <TextBar width="55%" height={3} />
              </div>
            </div>
          ))}
        </div>
      )

    case 'article-list-v3':
      return (
        <div className="w-full bg-white px-3 py-2 flex flex-col gap-1.5">
          <div className="rounded bg-gray-200 w-full" style={{ height: 36 }} />
          <TextBar width="75%" height={5} />
          <div className="flex gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 flex gap-1">
                <div className="rounded bg-gray-200 shrink-0" style={{ width: 18, height: 16 }} />
                <TextBar width="70%" height={4} />
              </div>
            ))}
          </div>
        </div>
      )

    // ─── MEDIA ─────────────────────────────────────────────────────────────────

    case 'podcast':
      return (
        <div className="w-full bg-white px-3 py-3 flex flex-col items-center gap-2">
          <TextBar width="60%" height={5} />
          <TextBar width="80%" height={4} />
          <div className="flex gap-2 mt-1">
            <div className="rounded-full px-2 py-0.5 text-white flex items-center gap-1" style={{ background: '#1DB954', fontSize: 7 }}>
              <span>Spotify</span>
            </div>
            <div className="rounded-full px-2 py-0.5 text-white flex items-center gap-1" style={{ background: '#333', fontSize: 7 }}>
              <span>Apple Podcasts</span>
            </div>
          </div>
        </div>
      )

    case 'video-rollover':
      return (
        <div className="w-full bg-gray-100 relative flex items-center justify-center" style={{ minHeight: 64 }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid ${primary}`, marginLeft: 2 }} />
          </div>
        </div>
      )

    case 'gallery-v1':
      return (
        <div className="w-full bg-white px-3 py-2 flex gap-2">
          <div className="flex-1 rounded bg-gray-200" style={{ height: 44 }} />
          <div className="flex-1 rounded bg-gray-200" style={{ height: 44 }} />
        </div>
      )

    case 'gallery-v2':
      return (
        <div className="w-full bg-white px-3 py-2 flex gap-1.5">
          <div className="flex-1 rounded bg-gray-200" style={{ height: 38 }} />
          <div className="flex-1 rounded bg-gray-200" style={{ height: 38 }} />
          <div className="flex-1 rounded bg-gray-200" style={{ height: 38 }} />
        </div>
      )

    // ─── NAVIGATION ───────────────────────────────────────────────────────────

    case 'tabs-main':
      return (
        <div className="w-full bg-white px-3 py-3 flex justify-center gap-2">
          {['Overview', 'Agenda', 'Speakers', 'Register'].map((tab) => (
            <div key={tab} className="rounded px-2 py-0.5" style={{ border: `1px solid ${primary}`, color: primary, fontSize: 7, fontWeight: 600 }}>
              {tab}
            </div>
          ))}
        </div>
      )

    case 'tabs-anchors':
      return (
        <div className="w-full bg-white px-3 py-3 flex justify-center gap-3">
          {['Section 1', 'Section 2', 'Section 3'].map((tab) => (
            <div key={tab} style={{ color: accent, fontSize: 7, fontWeight: 600, borderBottom: `1px solid ${accent}` }}>
              {tab}
            </div>
          ))}
        </div>
      )

    // ─── FOOTERS ──────────────────────────────────────────────────────────────

    case 'footer-v1':
      return (
        <div className="w-full flex flex-col items-center gap-1.5 px-3 py-3" style={{ background: '#f9fafb' }}>
          <LogoMark color={primary} />
          <TextBar width={80} height={4} />
          <TextBar width={100} height={3} />
          <TextBar width={90} height={3} />
        </div>
      )

    case 'footer-v2':
      return (
        <div className="w-full flex flex-col items-center gap-2 px-3 py-3" style={{ background: '#f9fafb' }}>
          <div className="flex gap-3">
            {['Privacy', 'Unsubscribe', 'Contact'].map((link) => (
              <div key={link} style={{ color: primary, fontSize: 7, fontWeight: 600 }}>{link}</div>
            ))}
          </div>
          <TextBar width="70%" height={3} />
        </div>
      )

    case 'footer-v3':
      return (
        <div className="w-full flex flex-col items-center gap-1.5 px-3 py-3" style={{ background: '#f9fafb' }}>
          <LogoMark color={primary} />
          <TextBar width={90} height={4} />
          <TextBar width={80} height={3} />
          <div className="flex gap-2">
            <TextBar width={50} height={3} />
            <TextBar width={50} height={3} />
          </div>
        </div>
      )

    default:
      return (
        <div className="w-full bg-gray-50 flex items-center justify-center px-3 py-4">
          <div className="flex flex-col items-center gap-1">
            <div className="rounded bg-gray-200" style={{ width: 40, height: 8 }} />
            <div className="rounded bg-gray-200" style={{ width: 60, height: 6 }} />
          </div>
        </div>
      )
  }
}
