/**
 * HTML snippet generators for each email module.
 * Each function returns Pardot-compatible HTML using the theme colours.
 * Content uses pardot-region attributes for in-Pardot editing.
 */

interface ThemeColors {
  primary: string
  accent: string
  tint01: string
  tint02: string
}

// Utility kept for future module content escaping
// function esc(text: string): string {
//   return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// }

// ─── HEADERS ──────────────────────────────────────────────────────

export function headerSmall(c: ThemeColors): string {
  return `
          <!-- Small Header -->
          <tr>
            <td background="https://placehold.co/640x270/${c.primary.replace('#', '')}/${c.accent.replace('#', '')}.jpg?text=640x270" bgcolor="${c.primary}" class="stack-column" style="height:250px; background-image:url(https://placehold.co/640x270/${c.primary.replace('#', '')}/${c.accent.replace('#', '')}.jpg?text=640x270); background-color:${c.primary}; background-repeat: no-repeat;" valign="top">
              <!--[if gte mso 9]><v:image xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border:0;display:inline-block;width:640px;height:270px;" src="https://placehold.co/640x270/${c.primary.replace('#', '')}/${c.accent.replace('#', '')}.jpg?text=640x270"></v:image><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border:0;display:inline-block;position:absolute;width:640px;height:270px;"><v:fill opacity="0%" color="${c.primary}"></v:fill><v:textbox inset="0,0,0,0"><![endif]-->
              <div>
                <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody>
                  <tr>
                    <th class="hide darkmode" width="6%">&nbsp;</th>
                    <th class="stack-mobile-none darkmode" style="padding:0px 0 0px;" valign="top" width="52%">
                      <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                        <td style="font-family:arial;font-size:13px;color:#e8e5ce;text-align:left;margin:0;" width="55%">
                          <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody><tr>
                            <td class="stack-column-button" style="padding:30px 0 40px;" width="69%"><a href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_header" target="_blank"><img alt="Ninety One - Logo" border="0" height="60" src="https://weare.ninetyone.com/l/28902/2020-09-03/8yq1t3/28902/1670491692e6fNzL2z/91_logo_digital_warm_yellowwood_v2_header_300x150.png" width="120"></a></td>
                          </tr></tbody></table>
                        </td>
                      </tr></tbody></table>
                    </th>
                    <th class="hide darkmode" style="padding:0px 0 0;" width="42%">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                        <td style="padding:0;text-align:right;vertical-align:top;"><img alt="Ninety One - Stripe" border="0" height="131" src="https://weare.ninetyone.com/l/28902/2023-03-22/9nqk21/28902/1679480195Mf6l1ZYb/banner_stripe_warm_yellow_600x250.png" width="270"></td>
                      </tr></tbody></table>
                    </th>
                  </tr>
                </tbody></table>
                <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody>
                  <tr>
                    <th class="hide darkmode" width="6%">&nbsp;</th>
                    <th class="stack-mobile-top darkmode" style="padding:0 0 0;" valign="top" width="96%">
                      <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                        <td style="font-family:arial;font-size:13px;color:#e8e5ce;text-align:left;margin:0;" width="87%">
                          <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody><tr>
                            <td class="stack-column-button" style="padding:0 40px 30px 0;" width="100%">
                              <h1 class="fallback-text" pardot-region="header-headline" style="font-size:34px;mso-line-height-rule:exactly;line-height:34px;font-weight:normal;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;color:${c.accent};margin:0 0 10px;">[Headline]</h1>
                              <h2 pardot-region="header-subtitle" style="font-size:16px;mso-line-height-rule:exactly;line-height:22px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0;color:#e8e5ce;">[Subtitle]</h2>
                            </td>
                          </tr></tbody></table>
                        </td>
                      </tr></tbody></table>
                    </th>
                  </tr>
                  <tr><td class="hide darkmode" height="30">&nbsp;</td><td class="hide darkmode" height="30">&nbsp;</td><td class="hide darkmode" height="30">&nbsp;</td></tr>
                </tbody></table>
              </div>
              <!--[if gte mso 9]></v:textbox></v:fill></v:rect></v:image><![endif]-->
            </td>
          </tr>`
}

export function headerImage(c: ThemeColors): string {
  return `
          <!-- Header with Background Image -->
          <tr>
            <td background="https://placehold.co/640x270/${c.primary.replace('#', '')}/e8e5ce.jpg?text=Hero+Image" bgcolor="${c.tint01}" class="stack-column darkmode" style="height:260px;background-image:url(https://placehold.co/640x270/${c.primary.replace('#', '')}/e8e5ce.jpg?text=Hero+Image);background-color:${c.tint01};background-repeat:no-repeat;background-size:cover;" valign="top">
              <!--[if gte mso 9]><v:image xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border:0;display:inline-block;width:640px;height:270px;" src="https://placehold.co/640x270/${c.primary.replace('#', '')}/e8e5ce.jpg?text=Hero+Image"></v:image><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="border:0;display:inline-block;position:absolute;width:640px;height:270px;"><v:fill opacity="0%" color="${c.tint01}"></v:fill><v:textbox inset="0,0,0,0"><![endif]-->
              <div class="darkmode">
                <table border="0" cellpadding="0" cellspacing="0" class="stack-column darkmode" role="presentation" width="100%"><tbody>
                  <tr>
                    <th class="stack-mobile-top darkmode" style="padding:0 0 20px 40px;" valign="top" width="64%">
                      <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                        <tr><td style="font-family:arial;font-size:13px;color:#e8e5ce;text-align:left;margin:0;" width="87%"><table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody><tr><td class="stack-column-button" style="padding:30px 0 30px;" width="69%"><a href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_header" target="_blank"><img alt="Ninety One - Logo" border="0" height="60" src="https://weare.ninetyone.com/l/28902/2020-09-03/8yq1t3/28902/254044/91_logo_digital_warm_yellowwood__300x150.png" width="120"></a></td></tr></tbody></table></td></tr>
                        <tr><td style="font-family:arial;color:#e8e5ce;margin:0;"><table border="0" cellpadding="0" cellspacing="0" class="stack-column-button" role="presentation" width="100%"><tbody><tr><td class="stack-column" style="font-family:arial,helvetica,sans-serif;color:#e8e5ce;text-align:left;padding-top:0;padding-bottom:0;" width="80%">
                          <h1 class="fallback-text" pardot-region="hero-headline" style="font-size:34px;mso-line-height-rule:exactly;line-height:34px;font-weight:normal;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;color:${c.accent};margin:0 0 10px;">[Headline]</h1>
                          <h2 pardot-region="hero-subtitle" style="font-size:16px;mso-line-height-rule:exactly;line-height:22px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0;color:#e8e5ce;">[Subtitle]</h2>
                        </td></tr></tbody></table></td></tr>
                      </tbody></table>
                    </th>
                    <th class="hide" style="padding:0;" valign="top" width="36%">
                      <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr><td style="text-align:right;padding:0;vertical-align:top;"><img alt="Ninety One - Stripe" border="0" height="234" src="https://weare.ninetyone.com/l/28902/2020-03-24/8tsmvs/28902/237457/banner_stripes_warm_yellow_200x234.png" width="200"></td></tr></tbody></table>
                    </th>
                  </tr>
                  <tr><td class="hide darkmode" height="31">&nbsp;</td><td class="darkmode" height="31">&nbsp;</td><td class="hide darkmode" height="31">&nbsp;</td></tr>
                </tbody></table>
              </div>
              <!--[if gte mso 9]></v:textbox></v:fill></v:rect></v:image><![endif]-->
            </td>
          </tr>`
}

// ─── GREETING ─────────────────────────────────────────────────────

export function greeting(_c: ThemeColors): string {
  return `
          <!-- Greeting / Salutation -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td class="stack-column" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;mso-line-height-rule:exactly;line-height:22px;color:#e8e5ce;font-weight:normal;">
                  <p pardot-region="greeting" style="margin:0 0 15px;">{{#if Recipient.FirstName}} Dear {{Recipient.FirstName}},{{else}} Good day,{{/if}}</p>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── BODY CONTENT ─────────────────────────────────────────────────

export function bodyContent(_c: ThemeColors): string {
  return `
          <!-- Body Content -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td class="stack-column" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;mso-line-height-rule:exactly;line-height:22px;color:#e8e5ce;font-weight:normal;">
                  <p pardot-region="body-paragraph" style="margin:0;">[Body content paragraph — edit in Pardot]</p>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function bodyContentList(c: ThemeColors): string {
  return `
          <!-- Body Content with Bullet List -->
          <tr>
            <td class="stack-mobile darkmode" style="padding:0 40px 25px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="48%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                    <tr>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:${c.accent};padding:0 5px 0 0;vertical-align:top;" width="5%"><p pardot-region="" style="margin:0;">&mdash;</p></td>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:0 0 5px 5px;" width="95%"><p pardot-region="list-item-1" style="margin:0 0 10px;">[List item 1]</p></td>
                    </tr>
                    <tr>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:${c.accent};padding:0 5px 0 0;vertical-align:top;"><p pardot-region="" style="margin:0;">&mdash;</p></td>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:0 0 5px 5px;"><p pardot-region="list-item-2" style="margin:0 0 10px;">[List item 2]</p></td>
                    </tr>
                    <tr>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:${c.accent};padding:0 5px 0 0;vertical-align:top;"><p pardot-region="" style="margin:0;">&mdash;</p></td>
                      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:0 0 0 5px;"><p pardot-region="list-item-3" style="margin:0 0 10px;">[List item 3]</p></td>
                    </tr>
                  </tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function bodyInnerContent(c: ThemeColors): string {
  return `
          <!-- Body Inner Content Block -->
          <tr>
            <td class="stack-mobile-top darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <td class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;mso-line-height-rule:exactly;line-height:22px;color:#e8e5ce;padding:30px 20px;">
                    <h3 class="fallback-text" pardot-region="inner-heading" style="font-size:18px;mso-line-height-rule:exactly;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 15px;color:${c.accent};">[Inner Content Heading]</h3>
                    <p pardot-region="inner-paragraph" style="margin:0;">[Inner content paragraph — edit in Pardot]</p>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

// ─── INNER CONTENT VARIANTS ───────────────────────────────────────

export function innerContentV1(c: ThemeColors): string {
  return `
          <!-- Inner Content V1 — Link CTA -->
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}" class="stack-mobile-column darkmode-2">
                  <th bgcolor="${c.tint01}" class="stack-column-button darkmode-2" valign="top">
                    <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td bgcolor="${c.tint01}" class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;text-align:left;font-weight:normal;vertical-align:top;padding:20px 15px 0 20px;">
                        <h3 class="fallback-text" pardot-region="v1-heading" style="font-size:18px;line-height:22px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:5px 0 0;color:${c.accent};">[Card Heading]</h3>
                      </td>
                    </tr></tbody></table>
                    <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td width="100%" bgcolor="${c.tint01}" class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;text-align:left;font-weight:normal;vertical-align:top;padding:20px 15px 0 20px;">
                        <p pardot-region="v1-body" style="margin:0 0 15px;">[Card body content]</p>
                      </td>
                    </tr></tbody></table>
                    <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td bgcolor="${c.tint01}" class="stack-column button-copy darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;text-align:left;font-weight:normal;vertical-align:top;padding:0 15px 30px 20px;">
                        <h3 class="fallback-text" pardot-region="v1-cta" style="font-size:18px;line-height:22px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0;color:${c.accent};"><a href="#" pardot-region="v1-link" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Link CTA]&nbsp;&nbsp;&nbsp;<img alt="arrow" height="12" src="https://weare.ninetyone.com/l/28902/2021-11-22/9dd9gg/28902/1637592064RVTtMceR/icon_warm_yellowwood_weblink_v1_40x40.png" width="12"></a></h3>
                      </td>
                    </tr></tbody></table>
                  </th>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

export function innerContentV2(c: ThemeColors): string {
  return `
          <!-- Inner Content V2 — Dash List -->
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <td class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#424242;padding:30px 20px 0 20px;">
                    <h3 class="fallback-text" pardot-region="v2-heading" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 15px;color:${c.accent};">[Dash List Heading]</h3>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <th class="stack-column-button darkmode-2" style="padding:0 0 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                      <tr>
                        <td class="stack-mobile-none" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:${c.accent};padding:0 5px 0 20px;vertical-align:top;" width="5%"><p class="accent-color" style="margin:0;">&mdash;</p></td>
                        <td class="stack-mobile-none" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:0 0 5px 10px;" width="95%">
                          <h3 pardot-region="v2-item-1-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:100;margin:0 0 5px 10px;color:${c.accent};">[Item 1 Title]</h3>
                          <p pardot-region="v2-item-1-body" style="margin:0 0 15px 10px;">[Item 1 description]</p>
                        </td>
                      </tr>
                      <tr>
                        <td class="stack-mobile-none" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:${c.accent};padding:0 5px 0 20px;vertical-align:top;"><p class="accent-color" style="margin:0;">&mdash;</p></td>
                        <td class="stack-mobile-none" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:0 0 5px 10px;" width="95%">
                          <h3 pardot-region="v2-item-2-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:100;margin:0 0 5px 10px;color:${c.accent};">[Item 2 Title]</h3>
                          <p pardot-region="v2-item-2-body" style="margin:0 0 15px 10px;">[Item 2 description]</p>
                        </td>
                      </tr>
                    </tbody></table>
                  </th>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

export function innerContentV3(c: ThemeColors): string {
  return `
          <!-- Inner Content V3 — Feedback / Survey -->
          <tr>
            <td class="stack-mobile-top darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <td class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;padding:30px 20px;">
                    <h3 class="fallback-text" pardot-region="v3-heading" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 15px;color:${c.accent};">[Feedback Heading]</h3>
                    <p pardot-region="v3-body" style="margin:0 0 20px;">[Feedback description or survey prompt]</p>
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="auto"><tbody><tr>
                      <td class="button-copy" style="font-family:arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 30px;">
                        <a class="link" href="#" pardot-region="v3-cta" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Take Survey]</a>
                      </td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

// ─── NUMBERED SECTIONS ────────────────────────────────────────────

export function numberedSectionV1(c: ThemeColors): string {
  return `
          <!-- Numbered Section V1 — Flat -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr>
                  <td style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:28px;line-height:28px;color:${c.accent};font-weight:normal;vertical-align:top;padding:0 15px 0 0;" width="8%">1.</td>
                  <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;font-weight:normal;">
                    <h3 pardot-region="num-1-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 5px;color:${c.accent};">[Point 1 Title]</h3>
                    <p pardot-region="num-1-body" style="margin:0 0 20px;">[Point 1 description]</p>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:28px;line-height:28px;color:${c.accent};font-weight:normal;vertical-align:top;padding:0 15px 0 0;">2.</td>
                  <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;font-weight:normal;">
                    <h3 pardot-region="num-2-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 5px;color:${c.accent};">[Point 2 Title]</h3>
                    <p pardot-region="num-2-body" style="margin:0;">[Point 2 description]</p>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

export function numberedSectionV2(c: ThemeColors): string {
  return `
          <!-- Numbered Section V2 — Card -->
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <td class="stack-column darkmode-2" style="padding:30px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                      <tr>
                        <td style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:28px;line-height:28px;color:${c.accent};font-weight:normal;vertical-align:top;padding:0 15px 0 0;" width="8%">1.</td>
                        <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;font-weight:normal;">
                          <h3 pardot-region="numcard-1-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 5px;color:${c.accent};">[Point 1]</h3>
                          <p pardot-region="numcard-1-body" style="margin:0 0 20px;">[Description]</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:28px;line-height:28px;color:${c.accent};font-weight:normal;vertical-align:top;padding:0 15px 0 0;">2.</td>
                        <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;font-weight:normal;">
                          <h3 pardot-region="numcard-2-title" class="fallback-text" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 5px;color:${c.accent};">[Point 2]</h3>
                          <p pardot-region="numcard-2-body" style="margin:0;">[Description]</p>
                        </td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

// ─── MEDIA MODULES ────────────────────────────────────────────────

export function podcastModule(c: ThemeColors): string {
  return `
          <!-- Podcast Module -->
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}">
                  <td class="stack-column darkmode-2" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;padding:30px 20px;">
                    <h3 class="fallback-text" pardot-region="podcast-heading" style="font-size:18px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 15px;color:${c.accent};">[Podcast Title]</h3>
                    <p pardot-region="podcast-description" style="margin:0 0 20px;">[Podcast episode description]</p>
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation"><tbody><tr>
                      <td style="padding-right:10px;"><a href="#" target="_blank"><img alt="Listen on Spotify" src="https://placehold.co/120x36/${c.accent.replace('#', '')}/ffffff?text=Spotify" border="0" height="36" width="120"></a></td>
                      <td><a href="#" target="_blank"><img alt="Listen on Apple Podcasts" src="https://placehold.co/140x36/${c.accent.replace('#', '')}/ffffff?text=Apple+Podcasts" border="0" height="36" width="140"></a></td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

export function videoRollover(c: ThemeColors): string {
  return `
          <!-- Video Play Rollover -->
          <tr>
            <td class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td style="text-align:center;">
                  <a href="#" target="_blank">
                    <img alt="Play video" border="0" src="https://placehold.co/560x315/${c.primary.replace('#', '')}/e8e5ce?text=Video+Thumbnail" style="display:block;width:100%;max-width:560px;" width="560">
                  </a>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── CTA MODULES ──────────────────────────────────────────────────

export function ctaSinglePrimary(c: ThemeColors): string {
  return `
          <!-- Single Primary CTA -->
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th bgcolor="${c.accent}" class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;text-align:center;padding:12px 20px;" width="100%">
                      <p pardot-region="primary-cta" style="font-size:16px;mso-line-height-rule:exactly;line-height:16px;font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-weight:normal;margin:0;color:#e8e5ce;">
                        <a class="link-2" href="#" pardot-region="primary-cta-link" pardot-region-type="link" style="text-decoration:none;color:${c.primary};" target="_blank">[Primary CTA]</a>
                      </p>
                    </td>
                  </tr></tbody></table>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button hide" width="49%">&nbsp;</th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function ctaPrimarySecondary(c: ThemeColors): string {
  return `
          <!-- Primary + Secondary CTA -->
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th bgcolor="${c.accent}" class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link-2" href="#" pardot-region="ps-primary-link" pardot-region-type="link" style="text-decoration:none;color:${c.primary};font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;" target="_blank">[Primary CTA]</a>
                    </td>
                  </tr></tbody></table>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="ps-secondary-link" pardot-region-type="link" style="text-decoration:none;color:${c.accent};font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;" target="_blank">[Secondary CTA]</a>
                    </td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function ctaDualSecondary(c: ThemeColors): string {
  return `
          <!-- Dual Secondary CTAs -->
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="ds-cta1" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA 1]</a>
                    </td>
                  </tr></tbody></table>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="ds-cta2" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA 2]</a>
                    </td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function ctaSingleSecondary(c: ThemeColors): string {
  return `
          <!-- Single Secondary CTA -->
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="ss-cta" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA]</a>
                    </td>
                  </tr></tbody></table>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button hide" width="49%">&nbsp;</th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function cta1Primary2Secondary(c: ThemeColors): string {
  return `
          <!-- 1 Primary + 2 Secondary CTAs -->
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:30px 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th bgcolor="${c.accent}" class="stack-column-button" width="100%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link-2" href="#" pardot-region="combo-primary" pardot-region-type="link" style="text-decoration:none;color:${c.primary};" target="_blank">[Primary CTA]</a>
                    </td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>
          <tr pardot-removable="button">
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="combo-sec1" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA 1]</a>
                    </td>
                  </tr></tbody></table>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="49%">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link" href="#" pardot-region="combo-sec2" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA 2]</a>
                    </td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── EVENT REGISTRATION ───────────────────────────────────────────

function eventDateTimeBlock(_c: ThemeColors): string {
  return `<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
    <tr>
      <td style="font-size:16px;line-height:16px;text-align:left;padding:0 5px 0 0;" width="10%"><img alt="Calendar" height="20" src="https://weare.ninetyone.com/l/28902/2021-06-24/971nqt/28902/1624532061bBK3rf9K/icon_dates_calendar_warm_yellowwood_40x40.png" width="20"></td>
      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;color:#e8e5ce;text-align:left;padding:10px 0;" width="90%"><p pardot-region="event-date" style="margin:0;">[Day, Date Month]</p></td>
    </tr>
    <tr>
      <td style="font-size:13px;line-height:6px;text-align:left;padding:0 5px 0 0;" width="10%"><img alt="Time" height="22" src="https://weare.ninetyone.com/l/28902/2022-04-29/9kdm8z/28902/165121936340zwTcQz/icon_clock_yellow_40x40.png" width="22"></td>
      <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;color:#e8e5ce;text-align:left;padding:10px 0;" width="90%"><p pardot-region="event-time" style="margin:0;">[Start Time - End Time]</p></td>
    </tr>
  </tbody></table>`
}

export function eventRegistration1Cta(c: ThemeColors): string {
  return `
          <!-- Event Registration — 1 CTA -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="48%">${eventDateTimeBlock(c)}</th>
                <th aria-hidden="true" class="hide" style="padding:0;line-height:20px;" width="10%">&nbsp;</th>
                <th class="stack-column-button" style="padding:0;" valign="top" width="42%">
                  <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr><th class="stack-column-button" style="padding:15px 0 0;">
                    <table bgcolor="${c.accent}" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:left;padding:12px 20px;">
                        <a class="link-2" href="#" pardot-region="evt1-cta" pardot-region-type="link" style="text-decoration:none;color:${c.primary};" target="_blank">[Register]</a>
                      </td>
                    </tr></tbody></table>
                  </th></tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function eventRegistration2Cta(c: ThemeColors): string {
  return `
          <!-- Event Registration — 2 CTAs -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="48%">${eventDateTimeBlock(c)}</th>
                <th aria-hidden="true" class="hide" style="padding:0;line-height:20px;" width="10%">&nbsp;</th>
                <th class="stack-column-button" valign="top" width="42%">
                  <table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr><th class="stack-column-button" style="padding:15px 0 0;">
                    <table bgcolor="${c.accent}" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:left;padding:12px 20px;">
                        <a class="link-2" href="#" pardot-region="evt2-primary" pardot-region-type="link" style="text-decoration:none;color:${c.primary};" target="_blank">[Primary CTA]</a>
                      </td>
                    </tr></tbody></table>
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${c.accent};margin-top:8px;" width="100%"><tbody><tr>
                      <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:left;padding:12px 20px;">
                        <a class="link" href="#" pardot-region="evt2-secondary" pardot-region-type="link" style="text-decoration:none;color:${c.accent};" target="_blank">[Secondary CTA]</a>
                      </td>
                    </tr></tbody></table>
                  </th></tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function eventRegistrationV3(c: ThemeColors): string {
  return `
          <!-- Event Registration V3 — Compact -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile-bottom darkmode-2" style="padding:30px 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td class="stack-column" style="font-family:arial,helvetica,sans-serif;font-size:13px;line-height:17px;color:#dbd8c0;">
                  <h3 class="fallback-text" pardot-region="evtv3-heading" style="font-size:20px;line-height:20px;font-family:Ninety One Visuelt,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 15px;color:${c.accent};">Event details</h3>
                </td>
              </tr></tbody></table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile-top darkmode-2" style="padding:0 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button">
                  ${eventDateTimeBlock(c)}
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                    <td style="font-size:13px;line-height:6px;text-align:left;padding:6px 0 0 2px;vertical-align:top;" width="8%"><img alt="Location" height="25" src="https://weare.ninetyone.com/l/28902/2021-11-18/9dbbml/28902/1637250545gYcSNhCP/icon_warm_yellow_location_40x40.png" width="25"></td>
                    <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;text-align:left;padding:6px 0 0;" width="92%"><p pardot-region="evtv3-location" style="margin:0;">[Venue Address]</p></td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function eventRegistrationV4(c: ThemeColors): string {
  return `
          <!-- Event Registration V4 — Card -->
          <tr>
            <td class="stack-mobile darkmode" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr bgcolor="${c.tint01}" class="darkmode-2">
                  <th aria-hidden="true" class="stack-column-button" style="padding:0;line-height:10px;" width="1%">&nbsp;</th>
                  <th class="stack-column-button" width="53%">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td style="font-size:13px;line-height:6px;text-align:left;padding:0 0 0 10px;" width="26%"><img alt="calendar" height="75" src="https://weare.ninetyone.com/l/28902/2022-07-06/9mfhqr/28902/1657092989lUQhaFg7/icon_yellow_calendar_119x119.png" width="75"></td>
                      <td class="button-copy" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:normal;color:#e8e5ce;padding:15px 0 15px 20px;text-align:left;" width="74%">
                        <h3 class="accent" pardot-region="evtv4-date" style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:18px;line-height:26px;font-weight:normal;color:${c.accent};margin:0;">[Date]</h3>
                        <p pardot-region="evtv4-type" style="margin:0;font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-weight:normal;">[Event type]</p>
                        <p pardot-region="evtv4-time" style="margin:0;">[Time]</p>
                      </td>
                    </tr></tbody></table>
                  </th>
                  <th aria-hidden="true" class="stack-column-button" style="padding:0;line-height:10px;" width="2%">&nbsp;</th>
                  <th class="stack-column-button" width="39%">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                      <td style="font-size:13px;line-height:6px;text-align:center;" width="3%">&nbsp;</td>
                      <td bgcolor="${c.accent}" class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:400;text-align:left;padding:12px 20px;" width="94%"><a class="link-2" href="#" style="text-decoration:none;color:${c.primary};" target="_blank">[Register]</a></td>
                      <td style="font-size:13px;line-height:6px;text-align:center;" width="3%">&nbsp;</td>
                    </tr></tbody></table>
                  </th>
                  <th aria-hidden="true" class="stack-column-button" style="padding:0;line-height:20px;" width="3%">&nbsp;</th>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

export function eventRegistrationV5(c: ThemeColors): string {
  return eventRegistrationV4(c).replace('<!-- Event Registration V4 — Card -->', '<!-- Event Registration V5 — Full -->')
}

// ─── ITINERARY TABLE ──────────────────────────────────────────────

export function itineraryTable(c: ThemeColors): string {
  return `
          <!-- Itinerary / Agenda Table -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr>
                  <td style="font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-size:18px;line-height:26px;font-weight:normal;color:${c.accent};padding:0 0 15px;">
                    <h3 pardot-region="agenda-title" style="margin:0;color:${c.accent};">Agenda</h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table border="0" cellpadding="8" cellspacing="0" role="presentation" width="100%" style="border-top:1px solid ${c.accent}33;"><tbody>
                      <tr style="border-bottom:1px solid ${c.accent}33;">
                        <td style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;color:${c.accent};padding:10px 10px 10px 0;white-space:nowrap;vertical-align:top;" width="25%" pardot-region="agenda-time-1">[09:00]</td>
                        <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;color:#e8e5ce;padding:10px 0;" pardot-region="agenda-item-1">[Agenda item 1]</td>
                      </tr>
                      <tr style="border-bottom:1px solid ${c.accent}33;">
                        <td style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;color:${c.accent};padding:10px 10px 10px 0;white-space:nowrap;vertical-align:top;" pardot-region="agenda-time-2">[09:30]</td>
                        <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;color:#e8e5ce;padding:10px 0;" pardot-region="agenda-item-2">[Agenda item 2]</td>
                      </tr>
                      <tr>
                        <td style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;color:${c.accent};padding:10px 10px 10px 0;white-space:nowrap;vertical-align:top;" pardot-region="agenda-time-3">[10:00]</td>
                        <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;color:#e8e5ce;padding:10px 0;" pardot-region="agenda-item-3">[Agenda item 3]</td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

// ─── SPEAKER MODULES ──────────────────────────────────────────────

function speakerCard(c: ThemeColors, regionPrefix: string): string {
  return `<table align="left" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
    <td style="padding:10px 15px 0 0;" width="25%"><img alt="Speaker photo" border="0" height="80" src="https://placehold.co/80x80/${c.primary.replace('#', '')}/e8e5ce?text=PM" style="border-radius:50%;" width="80"></td>
    <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:#e8e5ce;padding:10px 0 0;" width="75%">
      <p pardot-region="${regionPrefix}-name" style="margin:0;font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;color:${c.accent};">[Speaker Name]</p>
      <p pardot-region="${regionPrefix}-title" style="margin:0;">[Title / Role]</p>
    </td>
  </tr></tbody></table>`
}

export function speaker2pm1cta(c: ThemeColors): string {
  return `
          <!-- 2 Portfolio Managers + 1 CTA -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="48%">
                  ${speakerCard(c, 'pm1')}
                  <div style="height:15px;">&nbsp;</div>
                  ${speakerCard(c, 'pm2')}
                </th>
                <th aria-hidden="true" class="hide" width="4%">&nbsp;</th>
                <th class="stack-column-button" valign="bottom" width="48%">
                  <table bgcolor="${c.accent}" border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                    <td class="button-copy" style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:16px;line-height:16px;font-weight:normal;text-align:center;padding:12px 20px;">
                      <a class="link-2" href="#" pardot-region="pm-cta" pardot-region-type="link" style="text-decoration:none;color:${c.primary};" target="_blank">[CTA]</a>
                    </td>
                  </tr></tbody></table>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function speaker2pm3cta(c: ThemeColors): string {
  return speaker2pm1cta(c).replace('<!-- 2 Portfolio Managers + 1 CTA -->', '<!-- 2 Portfolio Managers + 3 CTAs -->')
}

export function speaker1pm(c: ThemeColors): string {
  return `
          <!-- Single Portfolio Manager -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="100%">${speakerCard(c, 'pm-solo')}</th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function speakers2col(c: ThemeColors): string {
  return `
          <!-- Speakers — 2 Column -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="48%">${speakerCard(c, 'spk1')}</th>
                <th aria-hidden="true" class="hide" width="4%">&nbsp;</th>
                <th class="stack-column-button" width="48%">${speakerCard(c, 'spk2')}</th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function speakers3col(c: ThemeColors): string {
  return `
          <!-- Speakers — 3 Column -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="31%">${speakerCard(c, 'spk3-1')}</th>
                <th aria-hidden="true" class="hide" width="3%">&nbsp;</th>
                <th class="stack-column-button" width="31%">${speakerCard(c, 'spk3-2')}</th>
                <th aria-hidden="true" class="hide" width="3%">&nbsp;</th>
                <th class="stack-column-button" width="31%">${speakerCard(c, 'spk3-3')}</th>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── ARTICLE LIST MODULES ─────────────────────────────────────────

function articleRow(c: ThemeColors, prefix: string): string {
  return `<tr>
    <td style="padding:15px 15px 15px 0;" width="25%"><img alt="Article thumbnail" border="0" height="80" src="https://placehold.co/120x80/${c.primary.replace('#', '')}/e8e5ce?text=Article" width="120" style="display:block;"></td>
    <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:#e8e5ce;padding:15px 0;">
      <h3 pardot-region="${prefix}-title" style="font-size:16px;line-height:20px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 5px;color:${c.accent};">[Article Title]</h3>
      <p pardot-region="${prefix}-desc" style="margin:0;">[Brief description]</p>
    </td>
  </tr>`
}

export function articleListV1(c: ThemeColors): string {
  return `
          <!-- Article List — Standard -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                ${articleRow(c, 'art1-1')}
                <tr><td colspan="2" style="border-bottom:1px solid ${c.accent}33;">&nbsp;</td></tr>
                ${articleRow(c, 'art1-2')}
                <tr><td colspan="2" style="border-bottom:1px solid ${c.accent}33;">&nbsp;</td></tr>
                ${articleRow(c, 'art1-3')}
              </tbody></table>
            </td>
          </tr>`
}

export function articleListV2(c: ThemeColors): string {
  return `
          <!-- Article List — Compact -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                ${articleRow(c, 'art2-1')}
                ${articleRow(c, 'art2-2')}
              </tbody></table>
            </td>
          </tr>`
}

export function articleListV3(c: ThemeColors): string {
  return `
          <!-- Article List — Featured -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td style="text-align:center;"><img alt="Featured article" border="0" src="https://placehold.co/560x280/${c.primary.replace('#', '')}/e8e5ce?text=Featured+Article" width="560" style="display:block;width:100%;max-width:560px;"></td>
              </tr></tbody></table>
            </td>
          </tr>
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:22px;color:#e8e5ce;">
                  <h3 pardot-region="art3-featured-title" class="fallback-text" style="font-size:22px;line-height:26px;font-family:Ninety One Visuelt Display,arial,helvetica,sans-serif;font-weight:normal;margin:0 0 10px;color:${c.accent};">[Featured Article Title]</h3>
                  <p pardot-region="art3-featured-desc" style="margin:0 0 15px;">[Featured article description]</p>
                  <a href="#" pardot-region="art3-featured-link" style="color:${c.accent};text-decoration:none;font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;" target="_blank">Read more &nbsp;<img alt="arrow" height="12" src="https://weare.ninetyone.com/l/28902/2021-11-22/9dd9gg/28902/1637592064RVTtMceR/icon_warm_yellowwood_weblink_v1_40x40.png" width="12"></a>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── GALLERY MODULES ──────────────────────────────────────────────

export function galleryV1(c: ThemeColors): string {
  return `
          <!-- Image Gallery — 2 Column -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="49%"><img alt="Gallery image 1" border="0" src="https://placehold.co/270x180/${c.primary.replace('#', '')}/e8e5ce?text=Image+1" width="270" style="display:block;width:100%;"></th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="49%"><img alt="Gallery image 2" border="0" src="https://placehold.co/270x180/${c.primary.replace('#', '')}/e8e5ce?text=Image+2" width="270" style="display:block;width:100%;"></th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function galleryV2(c: ThemeColors): string {
  return `
          <!-- Image Gallery — 3 Column -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:20px 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th class="stack-column-button" width="32%"><img alt="Gallery image 1" border="0" src="https://placehold.co/175x120/${c.primary.replace('#', '')}/e8e5ce?text=Image+1" width="175" style="display:block;width:100%;"></th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="32%"><img alt="Gallery image 2" border="0" src="https://placehold.co/175x120/${c.primary.replace('#', '')}/e8e5ce?text=Image+2" width="175" style="display:block;width:100%;"></th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="32%"><img alt="Gallery image 3" border="0" src="https://placehold.co/175x120/${c.primary.replace('#', '')}/e8e5ce?text=Image+3" width="175" style="display:block;width:100%;"></th>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── TAB MODULES ──────────────────────────────────────────────────

export function tabsMain(c: ThemeColors): string {
  return `
          <!-- Main Tab Navigation -->
          <tr>
            <td bgcolor="${c.tint01}" class="stack-mobile darkmode-2" style="padding:20px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <th bgcolor="${c.accent}" class="stack-column-button" width="32%" style="padding:10px;">
                  <a href="#section1" pardot-region="tab1" style="text-decoration:none;color:${c.primary};font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;display:block;text-align:center;">[Tab 1]</a>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="32%" style="padding:10px;border:2px solid ${c.accent};">
                  <a href="#section2" pardot-region="tab2" style="text-decoration:none;color:${c.accent};font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;display:block;text-align:center;">[Tab 2]</a>
                </th>
                <th class="stack-column-button hide" width="2%">&nbsp;</th>
                <th class="stack-column-button" width="32%" style="padding:10px;border:2px solid ${c.accent};">
                  <a href="#section3" pardot-region="tab3" style="text-decoration:none;color:${c.accent};font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;display:block;text-align:center;">[Tab 3]</a>
                </th>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function tabsAnchors(c: ThemeColors): string {
  return `
          <!-- Tab Anchor Links -->
          <tr>
            <td bgcolor="" class="stack-mobile-none darkmode" style="padding:15px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td style="font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:${c.accent};text-align:center;">
                  <a href="#section1" pardot-region="anchor1" style="color:${c.accent};text-decoration:none;padding:0 15px;">[Link 1]</a> |
                  <a href="#section2" pardot-region="anchor2" style="color:${c.accent};text-decoration:none;padding:0 15px;">[Link 2]</a> |
                  <a href="#section3" pardot-region="anchor3" style="color:${c.accent};text-decoration:none;padding:0 15px;">[Link 3]</a>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

// ─── FOOTER MODULES ───────────────────────────────────────────────

export function footerV1(c: ThemeColors): string {
  const dark = adjustBrightness(c.primary, -15)
  return `
          <!-- Footer V1 — Standard -->
          <tr>
            <td bgcolor="${dark}" class="stack-mobile-top darkmode-2" style="padding:0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td class="stack-column" style="font-family:arial,helvetica,sans-serif;font-size:13px;line-height:17px;color:${c.primary};">
                  <table border="0" cellpadding="0" cellspacing="0" class="stack-column" role="presentation" width="100%"><tbody><tr>
                    <td class="stack-column-button" valign="top" width="23%">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                        <td class="stack-column" style="padding:30px 0 0;">
                          <a href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_footer" target="_blank"><img alt="Ninety One" height="130" src="https://weare.ninetyone.com/l/28902/2021-07-01/978nrc/28902/1625131521ZUcVLEZg/Footer_logo_Warm_Yellowwood_IFAWOC_HEXlogo_91_300x324px.png" width="120"></a>
                        </td>
                      </tr></tbody></table>
                    </td>
                    <td class="stack-column-button" width="17%">&nbsp;</td>
                    <td class="stack-column-button" style="font-family:arial,helvetica,sans-serif;font-size:13px;line-height:17px;color:#dbd8c0;vertical-align:middle;padding-top:30px;" width="60%">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                        <td class="stack-column-button" style="padding:0 0 10px;font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:100;" width="33%"><p style="margin:0;"><a class="stack-column" href="https://www.ninetyone.com" style="color:#E8E5CE;text-decoration:none;" target="_blank">Visit website</a></p></td>
                        <td class="stack-column-button" style="padding:0 0 10px;font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:100;" width="33%"><p style="margin:0;"><a class="stack-column" href="%%view_online%%" style="color:#E8E5CE;text-decoration:none;" target="_blank">View online</a></p></td>
                        <td class="stack-column-button" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:100;padding:0;vertical-align:top;" width="33%"><p style="margin:0;"><a class="stack-column" href="http://www.ninetyone.com/en/policy-and-legal/privacy-notice" style="color:#E8E5CE;text-decoration:none;" target="_blank">Privacy notice</a></p></td>
                      </tr></tbody></table>
                    </td>
                  </tr></tbody></table>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function footerV2(c: ThemeColors): string {
  const dark = adjustBrightness(c.primary, -15)
  return `
          <!-- Footer V2 — Compact -->
          <tr>
            <td bgcolor="${dark}" class="stack-mobile-top darkmode-2" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr>
                <td style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:#dbd8c0;text-align:center;">
                  <a href="https://www.ninetyone.com" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">Website</a> |
                  <a href="%%view_online%%" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">View online</a> |
                  <a href="http://www.ninetyone.com/en/policy-and-legal/privacy-notice" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">Privacy</a>
                </td>
              </tr></tbody></table>
            </td>
          </tr>`
}

export function footerV3(c: ThemeColors): string {
  const dark = adjustBrightness(c.primary, -15)
  return `
          <!-- Footer V3 — Contact Details -->
          <tr>
            <td bgcolor="${dark}" class="stack-mobile-top darkmode-2" style="padding:30px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody>
                <tr>
                  <td width="30%" style="padding:0 0 15px;"><a href="https://www.ninetyone.com/?utm_source=pardot&utm_medium=email&utm_content=logo_footer" target="_blank"><img alt="Ninety One" height="130" src="https://weare.ninetyone.com/l/28902/2021-07-01/978nrc/28902/1625131521ZUcVLEZg/Footer_logo_Warm_Yellowwood_IFAWOC_HEXlogo_91_300x324px.png" width="120"></a></td>
                  <td width="70%" style="font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:#dbd8c0;padding:0 0 15px;vertical-align:middle;">
                    <p pardot-region="footer-contact-name" style="margin:0;font-family:Ninety One Visuelt Medium,arial,helvetica,sans-serif;color:${c.accent};">[Contact Name]</p>
                    <p pardot-region="footer-contact-role" style="margin:0;">[Role / Department]</p>
                    <p pardot-region="footer-contact-email" style="margin:5px 0 0;"><a href="mailto:" style="color:${c.accent};text-decoration:none;">[email@ninetyone.com]</a></p>
                    <p pardot-region="footer-contact-phone" style="margin:0;">[+27 00 000 0000]</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid ${c.accent}33;padding:15px 0 0;font-family:Ninety One Visuelt Light,arial,helvetica,sans-serif;font-size:14px;line-height:20px;color:#dbd8c0;text-align:center;">
                    <a href="https://www.ninetyone.com" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">Website</a> |
                    <a href="%%view_online%%" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">View online</a> |
                    <a href="http://www.ninetyone.com/en/policy-and-legal/privacy-notice" style="color:#E8E5CE;text-decoration:none;padding:0 10px;" target="_blank">Privacy</a>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>`
}

// ─── MODULE ID → HTML MAPPER ──────────────────────────────────────

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(2.55 * percent)))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)))
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const MODULE_GENERATORS: Record<string, (c: ThemeColors) => string> = {
  'header-small': headerSmall,
  'header-image': headerImage,
  'greeting': greeting,
  'body-content': bodyContent,
  'body-content-list': bodyContentList,
  'body-inner-content': bodyInnerContent,
  'inner-content-v1': innerContentV1,
  'inner-content-v2': innerContentV2,
  'inner-content-v3': innerContentV3,
  'numbered-section-v1': numberedSectionV1,
  'numbered-section-v2': numberedSectionV2,
  'podcast': podcastModule,
  'video-rollover': videoRollover,
  'cta-single-primary': ctaSinglePrimary,
  'cta-primary-secondary': ctaPrimarySecondary,
  'cta-dual-secondary': ctaDualSecondary,
  'cta-single-secondary': ctaSingleSecondary,
  'cta-1primary-2secondary': cta1Primary2Secondary,
  'event-registration-1cta': eventRegistration1Cta,
  'event-registration-2cta': eventRegistration2Cta,
  'event-registration-v3': eventRegistrationV3,
  'event-registration-v4': eventRegistrationV4,
  'event-registration-v5': eventRegistrationV5,
  'itinerary-table': itineraryTable,
  'speaker-2pm-1cta': speaker2pm1cta,
  'speaker-2pm-3cta': speaker2pm3cta,
  'speaker-1pm': speaker1pm,
  'speakers-2col': speakers2col,
  'speakers-3col': speakers3col,
  'article-list-v1': articleListV1,
  'article-list-v2': articleListV2,
  'article-list-v3': articleListV3,
  'gallery-v1': galleryV1,
  'gallery-v2': galleryV2,
  'tabs-main': tabsMain,
  'tabs-anchors': tabsAnchors,
  'footer-v1': footerV1,
  'footer-v2': footerV2,
  'footer-v3': footerV3,
}

/**
 * Generate HTML for a list of module IDs using the given theme colours.
 */
export function generateModuleHtml(moduleIds: string[], colors: ThemeColors): string {
  return moduleIds
    .map((id) => {
      const gen = MODULE_GENERATORS[id]
      return gen ? gen(colors) : `\n          <!-- Module "${id}" — not found -->`
    })
    .join('\n')
}
