import { validateStellarAddress } from "@/lib/stellar/validate-address"

export interface SavedAddress {
  id: string
  label: string
  publicKey: string
}

export interface ImportRowError {
  line: number
  raw: string
  reason: string
}

export interface ImportAddressBookResult {
  validAddresses: SavedAddress[]
  invalidRows: ImportRowError[]
}

export type MergeStrategy = "overwrite" | "skip" | "append"

/**
 * Escapes a field for CSV export.
 */
function escapeCSVField(val: string): string {
  const str = val ?? ""
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Parses a single CSV line accounting for quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/**
 * Converts saved address book to CSV format including headers ("Label","PublicKey").
 * Lossless round-trip guaranteed.
 */
export function exportAddressBookToCSV(addresses: SavedAddress[]): string {
  const header = `"Label","PublicKey"`
  const rows = addresses.map(
    (addr) => `${escapeCSVField(addr.label)},${escapeCSVField(addr.publicKey)}`
  )
  return [header, ...rows].join("\n")
}

/**
 * Parses CSV input, validates Stellar addresses, and reports bad rows.
 */
export function importAddressBookFromCSV(csvContent: string): ImportAddressBookResult {
  const validAddresses: SavedAddress[] = []
  const invalidRows: ImportRowError[] = []

  const rawLines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (rawLines.length === 0) {
    return { validAddresses, invalidRows }
  }

  let startIndex = 0
  let labelIdx = 0
  let keyIdx = 1

  // Check first line for header
  const firstLineFields = parseCSVLine(rawLines[0]).map((f) => f.toLowerCase().replace(/^["']|["']$/g, ""))
  const isHeader = firstLineFields.some(
    (f) => ["label", "name", "publickey", "public_key", "address"].includes(f)
  )

  if (isHeader) {
    startIndex = 1
    const foundLabel = firstLineFields.findIndex((f) => ["label", "name"].includes(f))
    const foundKey = firstLineFields.findIndex((f) => ["publickey", "public_key", "address"].includes(f))

    if (foundLabel !== -1) labelIdx = foundLabel
    if (foundKey !== -1) keyIdx = foundKey
  }

  for (let i = startIndex; i < rawLines.length; i++) {
    const lineNum = i + 1
    const rawLine = rawLines[i]
    const fields = parseCSVLine(rawLine)

    let label = (fields[labelIdx] ?? "").trim()
    let publicKey = (fields[keyIdx] ?? "").trim()

    // If fields swapped where key is in 0th col
    if (!validateStellarAddress(publicKey) && validateStellarAddress(label)) {
      const temp = label
      label = publicKey || "Imported Address"
      publicKey = temp
    }

    if (!publicKey) {
      invalidRows.push({ line: lineNum, raw: rawLine, reason: "Missing public key" })
      continue
    }

    if (!validateStellarAddress(publicKey)) {
      invalidRows.push({ line: lineNum, raw: rawLine, reason: "Invalid Stellar public key format" })
      continue
    }

    const finalLabel = label || `Address ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`

    validAddresses.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      label: finalLabel,
      publicKey,
    })
  }

  return { validAddresses, invalidRows }
}

/**
 * Merges newly imported valid addresses into an existing address book according to a merge strategy.
 */
export function mergeAddressBook(
  existing: SavedAddress[],
  imported: SavedAddress[],
  strategy: MergeStrategy = "overwrite"
): SavedAddress[] {
  if (strategy === "append") {
    return [...existing, ...imported]
  }

  const result = [...existing]

  for (const item of imported) {
    const existingIndex = result.findIndex(
      (a) => a.publicKey.toLowerCase() === item.publicKey.toLowerCase()
    )

    if (existingIndex !== -1) {
      if (strategy === "overwrite") {
        result[existingIndex] = {
          ...result[existingIndex],
          label: item.label,
        }
      }
      // If "skip", do nothing
    } else {
      result.push(item)
    }
  }

  return result
}
