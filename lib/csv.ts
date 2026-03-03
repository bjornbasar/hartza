/** Serialize an array of objects to CSV text. */
export function serializeCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join(
    '\n',
  )
}

/** Parse CSV text into an array of objects keyed by the header row. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseLine(lines[0]).map((h) => h.trim())
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = parseLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
    })
}

/**
 * Serialize multiple named sections into one CSV file.
 * Format: [sectionName]\nheaders\nrows\n\n[nextSection]...
 */
export function serializeMultiCSV(sections: Record<string, Record<string, unknown>[]>): string {
  return Object.entries(sections)
    .map(([name, rows]) => {
      const headers = rows.length ? Object.keys(rows[0]) : []
      return `[${name}]\n${serializeCSV(headers, rows)}`
    })
    .join('\n\n')
}

/**
 * Parse a multi-section CSV file back into named arrays.
 */
export function parseMultiCSV(text: string): Record<string, Record<string, string>[]> {
  const result: Record<string, Record<string, string>[]> = {}
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  let section = ''
  let sectionLines: string[] = []

  const flush = () => {
    if (section && sectionLines.length) {
      result[section] = parseCSV(sectionLines.join('\n'))
    }
  }

  for (const line of lines) {
    const m = line.match(/^\[(\w+)\]$/)
    if (m) {
      flush()
      section = m[1]
      sectionLines = []
    } else if (section) {
      sectionLines.push(line)
    }
  }
  flush()
  return result
}

function parseLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}
