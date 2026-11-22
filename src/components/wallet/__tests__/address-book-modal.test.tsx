import { render, screen, fireEvent } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressBookModal } from "../address-book-modal"

const ALICE = {
  id: "1",
  label: "Alice",
  publicKey: "GALICEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1234",
}
const BOB = {
  id: "2",
  label: "Bob Savings",
  publicKey: "GBOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB5678",
}

function seedAddresses(value: unknown) {
  localStorage.setItem("saved_addresses", typeof value === "string" ? value : JSON.stringify(value))
}

describe("AddressBookModal", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("renders nothing when closed", () => {
    seedAddresses([ALICE])
    const { container } = render(
      <AddressBookModal isOpen={false} onClose={vi.fn()} onSelect={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("lists saved addresses from localStorage and selects one with its key and label", () => {
    seedAddresses([ALICE, BOB])
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<AddressBookModal isOpen onClose={onClose} onSelect={onSelect} />)

    expect(screen.getByRole("dialog", { name: "Address Book" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select address Alice" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select address Bob Savings" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Select address Bob Savings" }))

    expect(onSelect).toHaveBeenCalledWith(BOB.publicKey, "Bob Savings")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("filters addresses by label or public key as the user types", () => {
    seedAddresses([ALICE, BOB])
    render(<AddressBookModal isOpen onClose={vi.fn()} onSelect={vi.fn()} />)

    const search = screen.getByRole("textbox", { name: "Search saved addresses" })
    fireEvent.change(search, { target: { value: "bob" } })

    expect(screen.queryByRole("button", { name: "Select address Alice" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select address Bob Savings" })).toBeInTheDocument()

    fireEvent.change(search, { target: { value: "ALICEAAA" } })
    expect(screen.getByRole("button", { name: "Select address Alice" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Select address Bob Savings" })).not.toBeInTheDocument()
  })

  it("shows an empty state when the stored value is malformed JSON", () => {
    seedAddresses("{not valid json")
    render(<AddressBookModal isOpen onClose={vi.fn()} onSelect={vi.fn()} />)

    expect(screen.getByText("No saved addresses.")).toBeInTheDocument()
    expect(screen.queryAllByRole("button", { name: /^Select address/ })).toHaveLength(0)
  })

  it("closes via the header close button and the backdrop", () => {
    seedAddresses([ALICE])
    const onClose = vi.fn()
    render(<AddressBookModal isOpen onClose={onClose} onSelect={vi.fn()} />)

    // Both the backdrop and the header ✕ share the same accessible name.
    const closeButtons = screen.getAllByRole("button", { name: "Close address book" })
    expect(closeButtons).toHaveLength(2)

    closeButtons.forEach((button) => fireEvent.click(button))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
