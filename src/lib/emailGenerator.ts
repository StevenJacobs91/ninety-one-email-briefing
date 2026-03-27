import type { BriefPayload } from '../types/brief.types'
import { BRAND_THEMES } from './constants'
import { generateModuleHtml } from './moduleHtml'

/** Map brief theme IDs to the HTML template filenames in "Themes and Modules/" */
const THEME_TO_FILE: Record<string, string> = {
  'leatherback-coral': 'Leatherback_Green_Cape_Coral_-_All_Modules.html',
  'marula-gold': 'Marula_Green_Gazania_Gold_-_All_Modules.html',
  'marula-coral': 'Marula_Green_Cape_Coral_-_All_Modules.html',
  'pinotage-coral': 'Pinotage_Burgundy_Cape_Coral_-_All_Modules.html',
  'springbok-red': 'Springbok_Cream_Protea_Red_-_All_Modules.html',
  'springbok-teal': 'Springbok_Cream_Ocean_Teal_-_All_Modules.html',
  'springbok-burgundy': 'Springbok_Cream_Pinotage_Burgundy_-_All_Modules.html',
  'agulhas-gold': 'Agulhas_Indigo_Gazania_Gold_-_All_Modules.html',
  'agulhas-teal': 'Agulhas_Indigo_Ocean_Teal_-_All_Modules.html',
  'agulhas-red': 'Agulhas_Indigo_Protea_Red_-_All_Modules.html',
  'agulhas-coral': 'Agulhas_Indigo_Cape_Coral_-_All_Modules.html',
  'agulhas-yellowwood': 'Agulhas_Indigo_Warm_Yellowwood_-_All_Modules.html',
  'galjoen-coral': 'Galjoen_Gray_Cape_Coral_-_All_Modules.html',
  'galjoen-green': 'Galjoen_Gray_Leatherback_Green_-_All_Modules.html',
}

function getThemeColors(themeId: string) {
  const theme = BRAND_THEMES.find((t) => t.id === themeId)
  return theme ?? { primary: '#134848', accent: '#fbaa96' }
}

/**
 * Generates a production-ready HTML email from a brief payload.
 * Uses the Ninety One template structure with proper Pardot regions.
 */
export function generateEmailHtml(brief: BriefPayload): string {
  const theme = getThemeColors(brief.campaign.theme)
  const primary = theme.primary
  const accent = theme.accent

  // Derive tint colours from primary
  const tint01 = adjustBrightness(primary, 10)
  const tint02 = adjustBrightness(primary, -5)
  const tint03 = adjustBrightness(primary, -20)
  const darkPrimary = adjustBrightness(primary, -15)

  const sections = brief.content.sections
  const cta = brief.content.cta

  // Generate HTML for selected modules
  const selectedModules = brief.content.modules ?? []
  const moduleBlocks = selectedModules.length > 0
    ? generateModuleHtml(selectedModules, { primary, accent, tint01, tint02 })
    : ''

  const sectionBlocks = sections
    .map(
      (s) => `
          <!-- Content Section: ${escapeHtml(s.heading)} -->
          <tr>
            <td bgcolor="${tint01}" class="stack-mobile-bottom darkmode-2" style="padding: 30px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tbody>
                  <tr>
                    <td class="stack-column" style="font-family: arial, helvetica, sans-serif; font-size: 13px; mso-line-height-rule:exactly; line-height: 17px; color: #dbd8c0;">
                      <h3 class="fallback-text" pardot-region="subheading" pardot-repeatable="subheading" style="font-size: 20px; mso-line-height-rule: exactly; line-height: 20px; font-family: Ninety One Visuelt, arial, helvetica, sans-serif; font-weight: normal; margin: 0px 0 0px; color: ${accent};">${escapeHtml(s.heading)}</h3>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding: 30px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tbody>
                  <tr>
                    <td class="stack-column" style="font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; mso-line-height-rule:exactly; line-height: 22px; color: #e8e5ce; font-weight: normal;">
                      <p pardot-region="paragraph" style="margin: 0px 0 0px;">${sanitizeRichHtml(s.body)}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>`
    )
    .join('\n')

  const heroBlock = brief.assets.heroImageUrl
    ? `
          <!-- Hero Image -->
          <tr>
            <td background="${escapeHtml(brief.assets.heroImageUrl)}" bgcolor="${tint01}" class="stack-column darkmode" style="height:260px; background-image:url(${escapeHtml(brief.assets.heroImageUrl)}); background-color:${tint01}; background-repeat: no-repeat; background-size: cover;" valign="top">
              <!--[if gte mso 9]>
              <v:image xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border: 0;display: inline-block; width: 640px; height: 270px;" src="${escapeHtml(brief.assets.heroImageUrl)}"></v:image>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border: 0;display: inline-block;position: absolute; width: 640px; height: 270px;">
              <v:fill opacity="0%" color="${tint01}"></v:fill>
              <v:textbox inset="0,0,0,0">
              <![endif]-->
              <div class="darkmode">
                <table border="0" cellpadding="0" cellspacing="0" class="stack-column darkmode" role="presentation" width="100%">
                  <tbody>
                    <tr>
                      <th class="stack-mobile-top darkmode" style="padding:0px 0px 20px 40px;" valign="top" width="64%">
                        <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                          <tbody>
                            <tr>
                              <td style="font-family:arial; font-size: 13px; color: #e8e5ce; text-align: left;margin: 0;" width="87%">
                                <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%">
                                  <tbody>
                                    <tr>
                                      <td class="stack-column-button" style="padding: 30px 0 30px;" width="69%">
                                        <a alt="Ninety One" href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_header" target="_blank" title="Ninety One">
                                          <img alt="Ninety One - Logo" border="0" height="60" src="https://weare.ninetyone.com/l/28902/2020-09-03/8yq1t3/28902/254044/91_logo_digital_warm_yellowwood__300x150.png" title="Ninety One - Logo" width="120">
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-family:arial; color: #e8e5ce; margin: 0;">
                                <table border="0" cellpadding="0" cellspacing="0" class="stack-column-button" role="presentation" width="100%">
                                  <tbody>
                                    <tr>
                                      <td class="stack-column" style="font-family: arial, helvetica, sans-serif; color: #e8e5ce; text-align: left; padding-top: 0px; padding-bottom: 0px;" width="80%">
                                        <h1 class="fallback-text" pardot-region="" style="font-size: 34px; mso-line-height-rule: exactly; line-height: 34px; font-weight: normal; font-family: Ninety One Visuelt Display, arial, helvetica, sans-serif; color: ${accent}; margin: 0 0 10px;">${escapeHtml(brief.content.headline)}</h1>
                                        <h2 pardot-region="subheading" style="font-size: 16px; mso-line-height-rule: exactly; line-height: 22px; font-family: Ninety One Visuelt Display, arial, helvetica, sans-serif; font-weight: normal; margin: 0px 0 0px; color: #e8e5ce;">${escapeHtml(brief.campaign.subjectLine)}</h2>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </th>
                      <th class="hide" style="padding:0px 0 0;" valign="top" width="36%">
                        <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                          <tbody>
                            <tr>
                              <td style="text-align: right; padding: 0px 0 0; vertical-align: top;">
                                <img alt="Ninety One - Stripe" border="0" height="234" src="https://weare.ninetyone.com/l/28902/2020-03-24/8tsmvs/28902/237457/banner_stripes_warm_yellow_200x234.png" title="Ninety One - Stripe" width="200">
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </th>
                    </tr>
                    <tr>
                      <td class="hide darkmode" height="31">&nbsp;</td>
                      <td class="darkmode" height="31">&nbsp;</td>
                      <td class="hide darkmode" height="31">&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!--[if gte mso 9]>
              </v:textbox></v:fill></v:rect></v:image>
              <![endif]-->
            </td>
          </tr>`
    : `
          <!-- Header without Hero -->
          <tr>
            <td valign="top">
              <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%">
                <tbody>
                  <tr>
                    <th class="stack-mobile-top darkmode" style="padding:0px 0px 20px 40px;" valign="top" width="64%">
                      <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                          <tr>
                            <td style="text-align: left; padding: 30px 0 30px;" width="80%">
                              <a alt="Ninety One" href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_header" target="_blank" title="Ninety One">
                                <img alt="Ninety One - Logo" border="0" height="60" src="https://weare.ninetyone.com/l/28902/2020-09-03/8yq1t3/28902/254044/91_logo_digital_warm_yellowwood__300x150.png" title="Ninety One - Logo" width="120">
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td class="stack-column" style="font-family: arial, helvetica, sans-serif; font-size: 26px; line-height: 28px; color: #e8e5cf; text-align: left; padding-bottom: 0px; padding-top: 0px;" width="80%">
                              <h1 class="fallback-text" pardot-region="" style="font-size: 34px; mso-line-height-rule: exactly; line-height: 34px; font-weight: normal; font-family: Ninety One Visuelt Display, arial, helvetica, sans-serif; color: ${accent}; margin: 0 0 10px;">${escapeHtml(brief.content.headline)}</h1>
                              <h2 pardot-region="subheading" style="font-size: 16px; mso-line-height-rule: exactly; line-height: 22px; font-family: Ninety One Visuelt Display, arial, helvetica, sans-serif; font-weight: normal; margin: 0px 0 0px; color: #e8e5ce;">${escapeHtml(brief.campaign.subjectLine)}</h2>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </th>
                    <th class="hide darkmode" style="padding:0px;" valign="top" width="36%">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                          <tr>
                            <td style="text-align: right; padding: 0px; vertical-align: top;">
                              <img alt="Ninety One - Stripe" border="0" height="234" src="https://weare.ninetyone.com/l/28902/2020-03-24/8tsmvs/28902/237457/banner_stripes_warm_yellow_200x234.png" title="Ninety One - Stripe" width="200">
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </th>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>`

  const ctaTarget = cta.openInNewTab ? ' target="_blank"' : ''
  const ctaBlock = `
          <!-- Primary CTA -->
          <tr pardot-removable="button" style="margin: 30px 0px 15px;">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding: 30px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tbody>
                  <tr>
                    <th bgcolor="${accent}" class="stack-column-button" style="" width="49%">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                        <tbody>
                          <tr>
                            <td class="button-copy" style="font-family: arial, helvetica, sans-serif; font-size: 16px; line-height: 22px; font-weight: normal; text-align: center; padding: 12px 20px;" width="100%">
                              <p pardot-region="detail" style="font-size: 16px; mso-line-height-rule: exactly; line-height: 16px; font-family: Ninety One Visuelt Medium, arial, helvetica, sans-serif; font-weight: normal; margin: 0px 0 0px; color: #e8e5ce;">
                                <a class="link-2" href="${escapeHtml(cta.url)}" pardot-region="button" pardot-region-type="link" style="text-decoration:none; color:${primary};"${ctaTarget}>${escapeHtml(cta.label)}</a>
                              </p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </th>
                    <th class="stack-column-button hide" width="2%">&nbsp;</th>
                    <th class="stack-column-button hide" width="49%">&nbsp;</th>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>`

  const bodyIntroBlock = `
          <!-- Body Intro -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding: 30px 40px 30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tbody>
                  <tr>
                    <td class="stack-column" style="font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; mso-line-height-rule:exactly; line-height: 22px; color: #e8e5ce; font-weight: normal;">
                      <p pardot-region="paragraph" style="margin: 0px 0 0px;">${sanitizeRichHtml(brief.content.bodyIntro)}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>`

  const disclaimer = brief.content.legalDisclaimer
    ? escapeHtml(brief.content.legalDisclaimer)
    : 'All information and opinions provided are of a general nature and are not intended to address the circumstances of any particular individual or entity. We are not acting and do not purport to act in any way as an advisor or in a fiduciary capacity. No one should act upon such information or opinion without appropriate professional advice after a thorough examination of a particular situation.'

  const unsubBlock = brief.content.includeUnsubscribe
    ? `<p class="disclaimer-copy" style="margin: 0px 0 0px;">If you no longer wish to receive any emails from Ninety One, you are welcome to <a href="%%unsubscribe%%" style="color: ${accent}; text-decoration: underline;">unsubscribe</a>.</p>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml" lang="en-GB">
<head>
<!--[if gte mso 9]><xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml><![endif]-->
<meta content="text/html charset=utf-8" http-equiv="Content-Type" />
<meta content="width=device-width, initial-scale=1.0" name="viewport" />
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<!--[if !mso]><!-- --><meta content="IE=edge" http-equiv="X-UA-Compatible" /><!--<![endif]-->
<title>${escapeHtml(brief.campaign.campaignName)} - ${escapeHtml(brief.campaign.subjectLine)}</title>
<style>
html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
    width: 100% !important;
    font-family: arial, helvetica, sans-serif;
    font-size: 20px;
    line-height: 26px;
    color: #000000;
    text-align: left;
}
* { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
.ExternalClass { width: 100%; }
div[style*="margin: 16px 0"] { margin: 0 !important; }
table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
table table table { table-layout: auto; }
img { -ms-interpolation-mode: bicubic; }
a { color: ${accent}; }
</style>
<style>
.primary-color { background-color: ${primary} !important; bgcolor: ${primary} !important; color: ${primary} !important; }
.tint-01-color { background-color: ${tint01}; color: ${tint01}; }
.tint-02-color { background-color: ${tint02}; color: ${tint02}; }
.tint-03-color { background-color: ${tint03}; color: ${tint03}; }
.accent-color { color: ${accent} !important; }
</style>
<style type="text/css">
@media screen {
@font-face { font-family: 'Ninety One Visuelt Display'; src: url("https://weare.ninetyone.com/l/28902/2020-04-27/8vjg6b/28902/241047/NinetyOneVisueltDisplay_Regular.woff"); font-weight: 200; font-style: normal; }
@font-face { font-family: "Ninety One Visuelt"; src: url("https://weare.ninetyone.com/l/28902/2020-08-17/8y6kht/28902/252426/NinetyOneVisuelt_Regular.woff"); font-weight: 200; font-style: normal; }
@font-face { font-family: "Ninety One Visuelt Light"; src: url("https://weare.ninetyone.com/l/28902/2020-10-19/8zs4jq/28902/1603114661MAzRiC9E/NinetyOneVisuelt_Light.woff"); font-weight: 100; font-style: normal; }
@font-face { font-family: "Ninety One Visuelt Medium"; src: url("https://weare.ninetyone.com/l/28902/2020-07-13/8x6784/28902/249453/NinetyOneVisuelt_Medium.woff"); font-weight: 400; font-style: normal; }
}
</style>
<!--[if mso]><style type="text/css">.fallback-text { font-family: Arial, sans-serif; }</style><![endif]-->
<style>
@media (prefers-color-scheme: dark) {
.dark-img { display: block !important; width: auto !important; overflow: visible !important; float: none !important; max-height: inherit !important; max-width: inherit !important; line-height: auto !important; margin-top: 0px !important; visibility: inherit !important; }
.light-img { display: none; display: none !important; }
.darkmode { background-color: #272623 !important; }
.darkmode-2 { background-color: #191816 !important; }
.darkmode-3 { background-color: #0a0a0a !important; }
p, span, b, h2, h4 { color: #e8e5ce !important; }
h3 { color: ${accent} !important; }
.link { color: ${accent} !important; }
.link-2 { color: #191816 !important; }
}
@media screen and (max-width: 440px) {
.stack-column, .stack-column-button { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
.stack-mobile-none { padding: 0 20px !important; }
.stack-mobile-top { padding: 0 20px !important; }
.stack-mobile-bottom { padding: 15px 20px !important; }
.stack-mobile { padding: 10px 20px !important; }
.hide { display: none !important; max-height: 0; overflow: hidden; }
}
</style>
</head>
<body class="body" bgcolor="#ffffff">
<table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="gwfw" style="border-collapse:collapse;" width="100%">
  <tbody>
    <tr>
      <td>
        <center style="width: 100%; background-color:#ffffff;">
          <!-- Preheader -->
          <div style="display:none;font-size:0px;line-height:0px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;font-family: sans-serif; visibility: hidden; text-overflow: ellipsis; color: #ffffff">${escapeHtml(brief.campaign.previewText)}</div>

          <table align="center" bgcolor="${primary}" border="0" cellpadding="0" cellspacing="0" class="email-container" role="presentation" width="640">
            <tbody>
${heroBlock}
${bodyIntroBlock}
${sectionBlocks}
${moduleBlocks}
${ctaBlock}
              <!-- Footer -->
              <tr>
                <td bgcolor="${darkPrimary}" class="stack-mobile-top darkmode-2" style="padding: 0px 40px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td class="stack-column" style="font-family: arial, helvetica, sans-serif; font-size: 13px; line-height: 17px; color: ${primary};">
                          <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%">
                            <tbody>
                              <tr>
                                <td class="stack-column-button" valign="top" width="23%">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                    <tbody>
                                      <tr>
                                        <td class="stack-column" style="padding:30px 0 0 0;">
                                          <a alt="Ninety One" href="https://www.ninetyone.com/?utm_source=pardot&amp;utm_medium=email&amp;utm_content=logo_footer" target="_blank" title="Ninety One">
                                            <img alt="Ninety One" height="130" src="https://weare.ninetyone.com/l/28902/2021-07-01/978nrc/28902/1625131521ZUcVLEZg/Footer_logo_Warm_Yellowwood_IFAWOC_HEXlogo_91_300x324px.png" width="120">
                                          </a>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                                <td class="stack-column-button" width="17%">&nbsp;</td>
                                <td class="stack-column-button" style="font-family: arial, helvetica, sans-serif; font-size: 13px; line-height: 17px; color: #dbd8c0; vertical-align: middle; padding-top: 30px;" width="60%">
                                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                    <tbody>
                                      <tr>
                                        <td class="stack-column-button" style="padding:0 0 10px; font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; line-height: 20px; font-weight: 100;" width="33%">
                                          <p style="margin: 0px;"><a class="stack-column" href="https://www.ninetyone.com" style="color: #E8E5CE; text-decoration: none;" target="_blank">Visit website</a></p>
                                        </td>
                                        <td class="stack-column-button" style="padding:0 0 10px; font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; line-height: 20px; font-weight: 100;" width="33%">
                                          <p style="margin: 0px;"><a class="stack-column" href="%%view_online%%" style="color: #E8E5CE; text-decoration: none;" target="_blank">View online</a></p>
                                        </td>
                                        <td class="stack-column-button" style="font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; line-height: 20px; font-weight: 100; padding:0px 0 0px; vertical-align: top;" width="33%">
                                          <p style="margin: 0px;"><a class="stack-column" href="http://www.ninetyone.com/en/policy-and-legal/privacy-notice" style="color: #E8E5CE; text-decoration: none;" target="_blank">Privacy notice</a></p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <!-- Disclaimer -->
              <tr>
                <td bgcolor="#ffffff" class="stack-mobile darkmode" style="padding: 20px 40px 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tbody>
                      <tr>
                        <td class="stack-disclaimer" style="font-family: arial, helvetica, sans-serif; font-size: 10px; line-height: 14px; color: #555555;">
                          <p class="disclaimer-copy" pardot-region="paragraph" style="margin: 0 0 10px;">${disclaimer}</p>
                          ${unsubBlock}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * sanitizeRichHtml
 *
 * Used for rich-text fields (bodyIntro, section bodies) where the value
 * is already HTML produced by the in-app RichTextarea editor.
 * Passes the HTML through as-is so that <span>, <em>, <u>, <a> tags
 * with brand styles are preserved in the email output.
 *
 * Only strips event handler attributes (onclick, onerror, etc.) and
 * javascript: href schemes as a lightweight XSS guard — the content
 * originates from the same origin editor, not external input.
 */
function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  return html
    // Strip event handler attributes
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    // Strip javascript: hrefs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)))
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function getTemplateFilename(themeId: string): string | undefined {
  return THEME_TO_FILE[themeId]
}

export function downloadEmailHtml(html: string, campaignName: string): void {
  const slug = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `email-${slug}-${date}.html`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyEmailHtmlToClipboard(html: string): Promise<void> {
  await navigator.clipboard.writeText(html)
}
