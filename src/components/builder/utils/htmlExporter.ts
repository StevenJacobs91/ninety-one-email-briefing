import type { Block, EmailConfig, HeroBlock, TextBlock, ImageBlock, ButtonBlock, ColumnsBlock, SpacerBlock, DividerBlock, SocialBlock } from '../types'

function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

function renderHero(block: HeroBlock): string {
  const { bgColor, bgImageUrl, overlayOpacity, heading, subheading, alignment, paddingY, logoVisible } = block.props
  const bgStyle = bgImageUrl
    ? `background-image: url(${bgImageUrl}); background-size: cover; background-position: center; background-color: ${bgColor};`
    : `background-color: ${bgColor};`

  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'

  const overlayStyle = bgImageUrl
    ? `background: rgba(0,0,0,${overlayOpacity}); padding: ${paddingY}px 40px;`
    : `padding: ${paddingY}px 40px;`

  const logoHtml = logoVisible
    ? `<img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" width="120" style="display: block; margin-bottom: 24px; ${textAlign === 'center' ? 'margin-left: auto; margin-right: auto;' : textAlign === 'right' ? 'margin-left: auto;' : ''}" />`
    : ''

  return `
    <tr>
      <td style="${bgStyle}">
        <div style="${overlayStyle} text-align: ${textAlign};">
          ${logoHtml}
          <h1 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; line-height: 1.2; margin: 0 0 12px 0;">${heading}</h1>
          <p style="color: rgba(255,255,255,0.85); font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">${subheading}</p>
        </div>
      </td>
    </tr>`
}

function renderText(block: TextBlock): string {
  const { html, paddingX, paddingY, alignment, bgColor } = block.props
  const clean = sanitizeHtml(html)
  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'
  return `
    <tr>
      <td style="background-color: ${bg}; padding: ${paddingY}px ${paddingX}px; text-align: ${textAlign}; font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.7;">
        ${clean}
      </td>
    </tr>`
}

function renderImage(block: ImageBlock): string {
  const { src, alt, link, width, alignment, paddingY } = block.props
  if (!src) return ''
  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
  const imgStyle = `max-width: ${width}%; height: auto; display: block; ${textAlign === 'center' ? 'margin: 0 auto;' : textAlign === 'right' ? 'margin-left: auto;' : ''}`
  const imgTag = `<img src="${src}" alt="${alt}" style="${imgStyle}" />`
  const content = link ? `<a href="${link}" style="display: block; text-decoration: none;">${imgTag}</a>` : imgTag
  return `
    <tr>
      <td style="padding: ${paddingY}px 0; text-align: ${textAlign};">
        ${content}
      </td>
    </tr>`
}

function renderButton(block: ButtonBlock): string {
  const { label, url, bgColor, textColor, borderRadius, paddingX, paddingY, alignment, blockPaddingY } = block.props
  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
  return `
    <tr>
      <td style="padding: ${blockPaddingY}px 32px; text-align: ${textAlign};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="${bgColor}">
          <w:anchorlock/>
          <center>
        <![endif]-->
        <a href="${url}" style="background-color: ${bgColor}; border-radius: ${borderRadius}px; color: ${textColor}; display: inline-block; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; line-height: 1; padding: ${paddingY}px ${paddingX}px; text-decoration: none; text-transform: uppercase; mso-padding-alt: 0; -webkit-text-size-adjust: none;">${label}</a>
        <!--[if mso]>
          </center>
        </v:roundrect>
        <![endif]-->
      </td>
    </tr>`
}

function renderBlocksForColumn(blocks: Block[]): string {
  return blocks.map((b) => renderBlock(b)).filter(Boolean).join('\n')
}

function renderColumns(block: ColumnsBlock): string {
  const { columnCount, gap, bgColor, paddingY, columns } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'
  const colWidth = columnCount === 2 ? 280 : 186
  const halfGap = Math.floor(gap / 2)

  const colsHtml = columns.slice(0, columnCount).map((col, i) => {
    const innerBlocks = renderBlocksForColumn(col.blocks)
    const marginRight = i < columnCount - 1 ? `padding-right: ${halfGap}px;` : ''
    const marginLeft = i > 0 ? `padding-left: ${halfGap}px;` : ''
    return `
      <!--[if mso]><td width="${colWidth}" valign="top"><![endif]-->
      <div style="display: inline-block; width: 100%; max-width: ${colWidth}px; vertical-align: top; ${marginRight}${marginLeft}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${innerBlocks || '<tr><td style="height: 40px;"></td></tr>'}
        </table>
      </div>
      <!--[if mso]></td><![endif]-->`
  }).join('\n      <!--[if mso]><td width="' + halfGap + '"><![endif]--><div style="max-width: ' + gap + 'px; display: inline-block;"> </div><!--[if mso]></td><![endif]-->\n')

  return `
    <tr>
      <td style="background-color: ${bg}; padding: ${paddingY}px 32px;">
        <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
        ${colsHtml}
        <!--[if mso]></tr></table><![endif]-->
      </td>
    </tr>`
}

function renderSpacer(block: SpacerBlock): string {
  const { height, bgColor } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : 'transparent'
  return `
    <tr>
      <td style="height: ${height}px; background-color: ${bg}; line-height: ${height}px; font-size: ${height}px;">&nbsp;</td>
    </tr>`
}

function renderDivider(block: DividerBlock): string {
  const { color, thickness, paddingY, bgColor, style } = block.props
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : 'transparent'
  return `
    <tr>
      <td style="background-color: ${bg}; padding: ${paddingY}px 32px;">
        <hr style="border: none; border-top: ${thickness}px ${style} ${color}; margin: 0;" />
      </td>
    </tr>`
}

const SOCIAL_ICONS: Record<string, string> = {
  linkedin: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>',
  twitter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.261 5.635z"/></svg>',
  youtube: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="white"/></svg>',
  instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="white"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" strokeWidth="2"/></svg>',
  facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
}

function renderSocial(block: SocialBlock): string {
  const { platforms, iconColor, bgColor, paddingY, alignment, iconStyle } = block.props
  const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
  const bg = bgColor && bgColor !== 'transparent' ? bgColor : '#ffffff'

  const icons = platforms.map((platform) => {
    const displayName = platform.charAt(0).toUpperCase() + platform.slice(1)
    if (iconStyle === 'filled') {
      return `<td style="padding: 0 8px;"><a href="#" style="display: inline-block; width: 36px; height: 36px; border-radius: 50%; background-color: ${iconColor}; color: #ffffff; text-align: center; line-height: 36px; text-decoration: none;" aria-label="${displayName}"><span style="display: inline-block; vertical-align: middle; line-height: 1;">${SOCIAL_ICONS[platform] ?? displayName}</span></a></td>`
    }
    return `<td style="padding: 0 8px;"><a href="#" style="display: inline-block; width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; color: ${iconColor}; text-align: center; line-height: 32px; text-decoration: none;" aria-label="${displayName}"><span style="display: inline-block; vertical-align: middle; line-height: 1;">${SOCIAL_ICONS[platform] ?? displayName}</span></a></td>`
  }).join('')

  return `
    <tr>
      <td style="background-color: ${bg}; padding: ${paddingY}px 32px; text-align: ${textAlign};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display: inline-table;">
          <tr>
            ${icons}
          </tr>
        </table>
      </td>
    </tr>`
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'hero': return renderHero(block)
    case 'text': return renderText(block)
    case 'image': return renderImage(block)
    case 'button': return renderButton(block)
    case 'columns': return renderColumns(block)
    case 'spacer': return renderSpacer(block)
    case 'divider': return renderDivider(block)
    case 'social': return renderSocial(block)
    default: return ''
  }
}

export function generateEmailHtml(blocks: Block[], config: EmailConfig): string {
  const { backgroundColor, contentWidth, fontFamily, linkColor } = config
  const rows = blocks.map(renderBlock).filter(Boolean).join('\n')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${config.subject ?? 'Email'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, #bodyTable { margin: 0; padding: 0; width: 100% !important; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; }
    body { font-family: ${fontFamily}; font-size: 15px; color: #333333; background-color: ${backgroundColor}; -webkit-font-smoothing: antialiased; }
    a { color: ${linkColor}; }
    p { margin: 0 0 16px 0; }
    h1, h2, h3, h4 { margin: 0 0 12px 0; line-height: 1.2; }
    ul, ol { margin: 0 0 16px 0; padding-left: 24px; }
    li { margin-bottom: 6px; }

    /* Mobile */
    @media only screen and (max-width: 620px) {
      .mobile-full { width: 100% !important; display: block !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-font-lg { font-size: 24px !important; }
      .mobile-stack { display: block !important; width: 100% !important; max-width: 100% !important; }
      .mobile-img { width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: ${fontFamily};">
  <!-- Outer wrapper -->
  <table id="bodyTable" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" valign="top">
        <!-- Inner content table -->
        <table role="presentation" width="${contentWidth}" cellpadding="0" cellspacing="0" border="0" class="mobile-full" style="width: ${contentWidth}px; max-width: 100%;">
          ${rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
