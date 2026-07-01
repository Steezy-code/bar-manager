// Shared, RFC-4180-style CSV helpers. Used by Inventory and Schedule so both
// importers/exporters handle quoted fields, embedded commas/newlines, and CRLF
// consistently (Schedule previously used a naive split(',') that broke on names
// containing commas).

// Quote a value if it contains a comma, quote, CR, or LF; double up inner quotes.
export const csvEscape = (value) => {
  const text = String(value ?? '')
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

// Parse CSV text into an array of row arrays. Skips fully-blank rows. Handles
// quoted fields, escaped quotes (""), and both \n and \r\n line endings.
export const parseCSV = (text) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++
      row.push(field)
      if (row.some(value => String(value).trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some(value => String(value).trim() !== '')) rows.push(row)
  return rows
}
