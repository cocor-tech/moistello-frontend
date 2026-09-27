import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import React from "react"
import { ChooseWalletStep } from "../choose-wallet-step"
import { ProfileStep } from "../profile-step"
import { SignStep } from "../sign-step"
import { LocaleProvider } from "@/lib/locale/context"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useWalletConnectStore } from "@/stores/walletconnect-store"

describe("ChooseWalletStep", () => {
  beforeEach(() => {
    useMultiWalletStore.setState({
      detectedWallets: [
        {
          id: "freighter",
          name: "Freighter",
          category: "extension",
          icon: "freighter-icon",
          installUrl: "https://example.com",
          description: "Freighter wallet",
          priority: 1,
          status: "detected",
        },
        {
          id: "passkey",
          name: "Passkey",
          category: "passkey",
          icon: "passkey-icon",
          installUrl: "",
          description: "Biometric passkey",
          priority: 2,
          status: "detected",
        },
      ],
      isScanning: false,
      connectingWalletId: null,
      wc2QrExpiresAt: null,
    })
    useWalletConnectStore.getState().reset()
  })

  it("renders passkey recommendation button in register mode", () => {
    render(<ChooseWalletStep mode="register" />)

    expect(screen.getByText("Passkey")).toBeInTheDocument()
    expect(screen.getByText("Recommended")).toBeInTheDocument()
  })

  it("calls connect store action when wallet clicked", () => {
    const connect = vi.fn()
    useMultiWalletStore.setState({ connect })
    render(<ChooseWalletStep mode="register" />)

    fireEvent.click(screen.getByText("Freighter"))
    expect(connect).toHaveBeenCalledWith("freighter")
  })

  it("shows scanning loader when isScanning is true", () => {
    useMultiWalletStore.setState({ isScanning: true, detectedWallets: [] })
    render(<ChooseWalletStep mode="login" />)

    expect(screen.getByText("Detecting wallets...")).toBeInTheDocument()
  })
})

describe("ProfileStep", () => {
  it("renders display name and language options", () => {
    render(
      <LocaleProvider>
        <ProfileStep
          displayName="Alex"
          language="en"
          onUpdateLanguage={vi.fn()}
          onSubmit={vi.fn()}
        />
      </LocaleProvider>
    )

    expect(screen.getByText("Alex")).toBeInTheDocument()
    expect(screen.getByText("en")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /select.?language.*en/i })).toBeInTheDocument()
  })

  it("supports keyboard navigation and restores focus after selecting a language", async () => {
    const handleLanguageChange = vi.fn()
    render(
      <LocaleProvider>
        <ProfileStep
          displayName="Alex"
          language="en"
          onUpdateLanguage={handleLanguageChange}
          onSubmit={vi.fn()}
        />
      </LocaleProvider>
    )

    const trigger = screen.getByRole("button", { name: /select.?language/i })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: "ArrowDown" })

    const firstOption = await screen.findByRole("option", { name: "Afar" })
    await waitFor(() => expect(document.activeElement).toBe(firstOption))

    fireEvent.keyDown(firstOption, { key: "ArrowDown" })
    const secondOption = screen.getByRole("option", { name: "Abkhazian" })
    expect(document.activeElement).toBe(secondOption)

    fireEvent.keyDown(secondOption, { key: "Enter" })
    expect(handleLanguageChange).toHaveBeenCalledWith("ab")
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it("closes the language listbox with Escape and restores trigger focus", async () => {
    render(
      <LocaleProvider>
        <ProfileStep
          displayName="Alex"
          language="en"
          onUpdateLanguage={vi.fn()}
          onSubmit={vi.fn()}
        />
      </LocaleProvider>
    )

    const trigger = screen.getByRole("button", { name: /select.?language/i })
    fireEvent.click(trigger)
    const option = await screen.findByRole("option", { name: "Afar" })
    fireEvent.keyDown(option, { key: "Escape" })

    expect(screen.queryByRole("listbox")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("closes the language listbox when Escape is dispatched outside it", async () => {
    render(
      <LocaleProvider>
        <ProfileStep
          displayName="Alex"
          language="en"
          onUpdateLanguage={vi.fn()}
          onSubmit={vi.fn()}
        />
      </LocaleProvider>
    )

    const trigger = screen.getByRole("button", { name: /select.?language/i })
    fireEvent.click(trigger)
    await screen.findByRole("listbox")
    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("listbox")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("calls onSubmit when continue button clicked", () => {
    const handleSubmit = vi.fn()
    render(
      <LocaleProvider>
        <ProfileStep
          displayName="Alex"
          language="en"
          onUpdateLanguage={vi.fn()}
          onSubmit={handleSubmit}
        />
      </LocaleProvider>
    )

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueBtn)
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })
})

describe("SignStep", () => {
  const defaultProps = {
    mode: "login" as const,
    connection: { walletId: "freighter", address: "GAAXEXAMPLEKEY1234567890TESTNETADDRESS" },
    profile: { displayName: "Alex", countryCode: "US", language: "en" },
    auth: { nonce: "nonce-123", signature: null, nonceTimestamp: Date.now() },
    status: { status: "idle" as const },
    error: null,
    onSign: vi.fn(),
    onBack: vi.fn(),
  }

  it("renders connected wallet badge and sign button", () => {
    render(
      <LocaleProvider>
        <SignStep {...defaultProps} />
      </LocaleProvider>
    )

    expect(screen.getByText("freighter")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("triggers onSign when sign button is clicked", async () => {
    const handleSign = vi.fn().mockResolvedValue(undefined)
    render(
      <LocaleProvider>
        <SignStep {...defaultProps} onSign={handleSign} />
      </LocaleProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    await waitFor(() => expect(handleSign).toHaveBeenCalledTimes(1))
  })

  it("shows redirecting state when status is authenticated", () => {
    render(
      <LocaleProvider>
        <SignStep
          {...defaultProps}
          status={{ status: "authenticated" }}
        />
      </LocaleProvider>
    )

    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})
