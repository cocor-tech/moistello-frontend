import { describe, it, expect } from "vitest"
import {
  exportAddressBookToCSV,
  importAddressBookFromCSV,
  mergeAddressBook,
  type SavedAddress,
} from "../address-book-csv"

const VALID_KEY_1 = "GA2HGBJIJKIHGFEDCBAZYXWVUTSRQPONMLKJIHGFEDCBAZYXWVUTSRQP"
const VALID_KEY_2 = "GB2HGBJIJKIHGFEDCBAZYXWVUTSRQPONMLKJIHGFEDCBAZYXWVUTSRQP"
const INVALID_KEY = "INVALID_STELLAR_ADDRESS"

describe("address-book-csv", () => {
  it("exports address book to CSV losslessly", () => {
    const addresses: SavedAddress[] = [
      { id: "1", label: 'Alice, "The Trader"', publicKey: VALID_KEY_1 },
      { id: "2", label: "Bob", publicKey: VALID_KEY_2 },
    ]

    const csv = exportAddressBookToCSV(addresses)
    expect(csv).toContain('"Label","PublicKey"')
    expect(csv).toContain('"Alice, ""The Trader"""')

    const result = importAddressBookFromCSV(csv)
    expect(result.invalidRows).toHaveLength(0)
    expect(result.validAddresses).toHaveLength(2)
    expect(result.validAddresses[0].label).toBe('Alice, "The Trader"')
    expect(result.validAddresses[0].publicKey).toBe(VALID_KEY_1)
    expect(result.validAddresses[1].label).toBe("Bob")
    expect(result.validAddresses[1].publicKey).toBe(VALID_KEY_2)
  })

  it("validates imported addresses and reports bad rows", () => {
    const csvContent = `Label,PublicKey
Alice,${VALID_KEY_1}
Bad Row,${INVALID_KEY}
Missing Key,
${VALID_KEY_2}`

    const result = importAddressBookFromCSV(csvContent)
    expect(result.validAddresses).toHaveLength(2)
    expect(result.validAddresses[0].label).toBe("Alice")
    expect(result.validAddresses[0].publicKey).toBe(VALID_KEY_1)
    expect(result.validAddresses[1].publicKey).toBe(VALID_KEY_2)

    expect(result.invalidRows).toHaveLength(2)
    expect(result.invalidRows[0].reason).toContain("Invalid Stellar public key format")
    expect(result.invalidRows[1].reason).toContain("Missing public key")
  })

  it("merges address books with different strategies", () => {
    const existing: SavedAddress[] = [
      { id: "1", label: "Old Alice", publicKey: VALID_KEY_1 },
    ]

    const imported: SavedAddress[] = [
      { id: "2", label: "New Alice", publicKey: VALID_KEY_1 },
      { id: "3", label: "Bob", publicKey: VALID_KEY_2 },
    ]

    // Overwrite strategy
    const mergedOverwrite = mergeAddressBook(existing, imported, "overwrite")
    expect(mergedOverwrite).toHaveLength(2)
    expect(mergedOverwrite.find((a) => a.publicKey === VALID_KEY_1)?.label).toBe("New Alice")

    // Skip strategy
    const mergedSkip = mergeAddressBook(existing, imported, "skip")
    expect(mergedSkip).toHaveLength(2)
    expect(mergedSkip.find((a) => a.publicKey === VALID_KEY_1)?.label).toBe("Old Alice")

    // Append strategy
    const mergedAppend = mergeAddressBook(existing, imported, "append")
    expect(mergedAppend).toHaveLength(3)
  })
})
