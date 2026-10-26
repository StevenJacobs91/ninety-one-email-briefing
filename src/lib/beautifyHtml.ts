import beautifier from 'js-beautify'

const beautify = beautifier.html

/**
 * Email HTML re-indented, two spaces a level. Tables and cells each sit on their own lines, but text and inline
 * tags keep their spacing, since a stray space inside a cell shows in the email. {{tokens}}, {{#if}} blocks and
 * conditional comments such as <!--[if mso]> are left as written.
 */
export function beautifyHtml(source: string): string {
  return beautify(source, {
    indent_size: 2,
    indent_char: ' ',
    wrap_line_length: 120,
    wrap_attributes: 'auto',
    preserve_newlines: true,
    max_preserve_newlines: 1,
    indent_inner_html: false,
    end_with_newline: false,
    templating: ['handlebars'],
    unformatted: ['pre', 'textarea'],
    extra_liners: [],
  })
}
