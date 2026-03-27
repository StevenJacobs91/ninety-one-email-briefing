/**
 * parseDistributionList.ts
 *
 * Browser-side utility that accepts an Excel (.xlsx / .xls) or CSV file,
 * strips all columns except the required five, cleans the data, and returns:
 *   - a UTF-8 CSV string ready for download
 *   - a rich analysis object for display in the UI
 *
 * Column detection is done by fuzzy header matching so it works regardless of
 * the exact column names used in the source file.
 */

import * as XLSX from 'xlsx'

// ─── Output types ────────────────────────────────────────────────────────────

export interface CleanedContact {
  contactId: string
  brokerPreferredName: string
  firstName: string
  lastName: string
  email: string
}

export interface ListAnalysis {
  /** Total rows in the raw source (excluding header) */
  rawRowCount: number
  /** Rows kept after all cleaning */
  cleanRowCount: number
  /** Rows dropped because email was blank */
  blankEmailCount: number
  /** Rows dropped because email was unknown@unknown.com (case-insensitive) */
  unknownEmailCount: number
  /** Duplicate email addresses removed (kept first occurrence) */
  duplicateCount: number
  /** Rows dropped because all key fields were completely empty */
  blankRowCount: number
  /** Columns found in the source that were discarded */
  discardedColumns: string[]
  /** Required columns that were detected and kept — optional (not persisted in form schema) */
  detectedColumns?: DetectedColumns
  /** Warnings / informational notes */
  warnings: string[]
}

export interface DetectedColumns {
  contactId: string | null
  brokerPreferredName: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
}

export interface ParseResult {
  contacts: CleanedContact[]
  csvContent: string
  analysis: ListAnalysis
  fileName: string
}

// ─── Header aliases ───────────────────────────────────────────────────────────
// The first alias that matches (case-insensitive, trimmed) wins.

const ALIASES: Record<keyof DetectedColumns, string[]> = {
  contactId: [
    'contact id', 'contactid', 'member id', 'memberid', 'unique id', 'uniqueid',
    'id', 'prospect id', 'prospectid', 'crm id', 'crmid', 'salesforce id',
    'pardot id', 'pardotid', 'uid', 'uuid',
  ],
  brokerPreferredName: [
    'broker preferred name', 'brokerpreferredname', 'preferred name',
    'preferredname', 'broker name', 'brokername', 'salutation', 'display name',
    'displayname', 'nickname',
  ],
  firstName: [
    'first name', 'firstname', 'given name', 'givenname', 'forename',
    'first', 'fname', 'f name',
  ],
  lastName: [
    'last name', 'lastname', 'surname', 'family name', 'familyname',
    'last', 'lname', 'l name',
  ],
  email: [
    'email', 'email address', 'emailaddress', 'e-mail', 'e mail',
    'email id', 'emailid', 'email addr', 'primary email', 'work email',
  ],
}

const UNKNOWN_EMAIL_MARKER = 'unknown@unknown.com'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise(s: unknown): string {
  return String(s ?? '').trim().toLowerCase()
}

function matchHeader(header: string): keyof DetectedColumns | null {
  const norm = normalise(header)
  for (const [field, aliases] of Object.entries(ALIASES) as [keyof DetectedColumns, string[]][]) {
    if (aliases.includes(norm)) return field
  }
  return null
}

function toCsvRow(values: string[]): string {
  return values
    .map((v) => {
      const s = String(v ?? '').replace(/"/g, '""')
      return /[",\n\r]/.test(s) ? `"${s}"` : s
    })
    .join(',')
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function parseDistributionList(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  // Use the first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to array-of-arrays (header + data rows)
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  if (raw.length === 0) {
    return emptyResult(file.name)
  }

  // ── Map column indices ────────────────────────────────────────────────────
  const headerRow = raw[0].map(String)
  const colMap: Partial<Record<keyof DetectedColumns, number>> = {}
  const discardedColumns: string[] = []

  headerRow.forEach((h, idx) => {
    const field = matchHeader(h)
    if (field && !(field in colMap)) {
      colMap[field] = idx
    } else if (h.trim()) {
      discardedColumns.push(h.trim())
    }
  })

  const detectedColumns: DetectedColumns = {
    contactId: colMap.contactId !== undefined ? headerRow[colMap.contactId] : null,
    brokerPreferredName: colMap.brokerPreferredName !== undefined ? headerRow[colMap.brokerPreferredName] : null,
    firstName: colMap.firstName !== undefined ? headerRow[colMap.firstName] : null,
    lastName: colMap.lastName !== undefined ? headerRow[colMap.lastName] : null,
    email: colMap.email !== undefined ? headerRow[colMap.email] : null,
  }

  const warnings: string[] = []
  if (!detectedColumns.email) warnings.push('No email column detected — all rows will be dropped.')
  if (!detectedColumns.firstName) warnings.push('No first name column found.')
  if (!detectedColumns.lastName) warnings.push('No last name column found.')
  if (!detectedColumns.contactId) warnings.push('No contact ID column found — IDs will be auto-generated.')

  // ── Process data rows ────────────────────────────────────────────────────
  const dataRows = raw.slice(1)
  const rawRowCount = dataRows.length

  let blankRowCount = 0
  let blankEmailCount = 0
  let unknownEmailCount = 0
  let duplicateCount = 0

  const seenEmails = new Set<string>()
  const contacts: CleanedContact[] = []

  dataRows.forEach((row, rowIdx) => {
    const get = (field: keyof DetectedColumns): string =>
      colMap[field] !== undefined ? String(row[colMap[field]!] ?? '').trim() : ''

    // Blank row — all key fields empty
    const allBlank =
      !get('firstName') && !get('lastName') && !get('email') && !get('contactId')
    if (allBlank) { blankRowCount++; return }

    const email = get('email')

    // Missing email
    if (!email) { blankEmailCount++; return }

    // Unknown email marker
    if (email.toLowerCase() === UNKNOWN_EMAIL_MARKER) { unknownEmailCount++; return }

    // Duplicate email (keep first occurrence)
    const emailKey = email.toLowerCase()
    if (seenEmails.has(emailKey)) { duplicateCount++; return }
    seenEmails.add(emailKey)

    const contactId = get('contactId') || `AUTO-${String(rowIdx + 1).padStart(5, '0')}`

    contacts.push({
      contactId,
      brokerPreferredName: get('brokerPreferredName'),
      firstName: get('firstName'),
      lastName: get('lastName'),
      email,
    })
  })

  // ── Build CSV ────────────────────────────────────────────────────────────
  const csvHeader = toCsvRow(['Contact ID', 'Broker Preferred Name', 'First Name', 'Last Name', 'Email'])
  const csvRows = contacts.map((c) =>
    toCsvRow([c.contactId, c.brokerPreferredName, c.firstName, c.lastName, c.email])
  )
  const csvContent = [csvHeader, ...csvRows].join('\r\n')

  if (discardedColumns.length > 0) {
    warnings.push(`${discardedColumns.length} column(s) removed: ${discardedColumns.slice(0, 5).join(', ')}${discardedColumns.length > 5 ? ` … (+${discardedColumns.length - 5} more)` : ''}.`)
  }

  const analysis: ListAnalysis = {
    rawRowCount,
    cleanRowCount: contacts.length,
    blankEmailCount,
    unknownEmailCount,
    duplicateCount,
    blankRowCount,
    discardedColumns,
    detectedColumns,
    warnings,
  }

  return { contacts, csvContent, analysis, fileName: file.name }
}

// ─── CSV download helper ─────────────────────────────────────────────────────

export function downloadCleanedCsv(csvContent: string, originalFileName: string): void {
  const baseName = originalFileName.replace(/\.[^.]+$/, '')
  const fileName = `${baseName}_cleaned.csv`
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Fallback for empty file ─────────────────────────────────────────────────

function emptyResult(fileName: string): ParseResult {
  return {
    contacts: [],
    csvContent: 'Contact ID,Broker Preferred Name,First Name,Last Name,Email',
    fileName,
    analysis: {
      rawRowCount: 0,
      cleanRowCount: 0,
      blankEmailCount: 0,
      unknownEmailCount: 0,
      duplicateCount: 0,
      blankRowCount: 0,
      discardedColumns: [],
      detectedColumns: {
        contactId: null,
        brokerPreferredName: null,
        firstName: null,
        lastName: null,
        email: null,
      },
      warnings: ['File appears to be empty.'],
    },
  }
}
