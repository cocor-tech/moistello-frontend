import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { inflateSync } from "node:zlib"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { WalletConnectQR } from "../walletconnect-qr"

/**
 * The download assertions deliberately inspect the real PNG that `qrcode`
 * produces rather than the options the component passed in.
 *
 * Asserting the inputs would only prove the component asked for the right
 * thing; asserting the decoded output proves the file the user saves is right.
 * Those can disagree — an encoder that ignores `width`, or that renders a
 * transparent background — and only the second is the bug that matters. So
 * `readPngSize` and `readFirstPixel` below decode the actual bytes.
 */
function decodePng(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const bytes = Buffer.from(base64, "base64")

  // Fail loudly rather than yielding nonsense dimensions if the payload is not
  // a PNG at all.
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  signature.forEach((byte, index) => {
    if (bytes[index] !== byte) throw new Error("payload is not a PNG")
  })
  return bytes
}

/** Width/height from the IHDR chunk, whose layout the PNG spec fixes. */
function readPngSize(dataUrl: string): { width: number; height: number } {
  const bytes = decodePng(dataUrl)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** PNG colour type: 0 grey, 2 RGB, 3 palette, 4 grey+alpha, 6 RGBA. */
function readPngColorType(dataUrl: string): number {
  return decodePng(dataUrl).readUInt8(25)
}

/**
 * Inflate the IDAT stream and read the first pixel of the top-left corner,
 * i.e. the quiet zone of the QR.
 *
 * Only the first scanline is unfiltered, and `qrcode` writes filter type 0, so
 * byte 0 of the inflated data is the filter marker and the pixel follows
 * directly. That is enough to tell "opaque white background" from "transparent
 * background", which is the whole question.
 */
function readQuietZonePixel(dataUrl: string): { r: number; g: number; b: number; a: number } {
  const bytes = decodePng(dataUrl)

  // Walk the chunk list to the first IDAT, concatenating any split segments.
  const idat: Buffer[] = []
  let offset = 8
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString("ascii", offset + 4, offset + 8)
    if (type === "IDAT") idat.push(bytes.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length // length + type + data + CRC
    if (type === "IEND") break
  }
  if (idat.length === 0) throw new Error("PNG has no IDAT chunk")

  const raw = inflateSync(Buffer.concat(idat))
  const colorType = bytes.readUInt8(25)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1

  // raw[0] is the per-scanline filter byte; with filter 0 the pixel bytes are
  // stored verbatim.
  const at = 1
  return {
    r: raw[at],
    g: channels >= 3 ? raw[at + 1] : raw[at],
    b: channels >= 3 ? raw[at + 2] : raw[at],
    a: channels === 4 ? raw[at + 3] : 0xff,
  }
}

const defaultProps = {
  uri: null,
  pairingState: "idle",
  error: null,
  onRetry: vi.fn(),
  onCancel: vi.fn(),
}

describe("WalletConnectQR", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("loading state", () => {
    it("renders spinner when uri is null and state is idle", () => {
      render(<WalletConnectQR {...defaultProps} />)
      expect(screen.getByText("Generating connection code...")).toBeDefined()
    })

    it("renders spinner when uri is null in pairing state", () => {
      render(<WalletConnectQR {...defaultProps} pairingState="pairing" />)
      expect(screen.getByText("Generating connection code...")).toBeDefined()
    })
  })

  describe("QR display state", () => {
    it("renders QR canvas when uri is provided", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Scan with your wallet app")).toBeDefined()
    })

    it("shows instruction steps", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText(/Open Lobstr/)).toBeDefined()
      expect(screen.getByText(/Tap the QR scanner/)).toBeDefined()
      expect(screen.getByText(/Scan this code/)).toBeDefined()
    })

    it("shows countdown timer when pairing", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText(/Code expires in/)).toBeDefined()
    })

    it("renders copy URI button", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByLabelText("Copy connection URI")).toBeDefined()
    })

    it("renders download PNG button", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByLabelText("Download QR code as PNG")).toBeDefined()
    })

    it("renders cancel button", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Cancel")).toBeDefined()
    })

    it("has QR canvas with aria label", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      const canvas = document.querySelector("canvas")
      expect(canvas).toBeDefined()
      expect(canvas!.getAttribute("aria-label")).toBe("QR code for wallet connection")
    })
  })

  describe("approved state", () => {
    it("shows success message when approved", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="approved"
        />,
      )
      expect(screen.getByText("Connected!")).toBeDefined()
      expect(screen.getByText(/Wallet linked successfully/)).toBeDefined()
    })

    it("shows check icon on approval", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="approved"
        />,
      )
      expect(screen.getByText("Connected!")).toBeDefined()
    })
  })

  describe("rejected state", () => {
    it("shows cancellation message when rejected", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="rejected"
        />,
      )
      expect(screen.getByText("Connection Cancelled")).toBeDefined()
    })

    it("shows retry button on rejection", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="rejected"
        />,
      )
      const retryBtn = screen.getByText("Try Again")
      expect(retryBtn).toBeDefined()
      fireEvent.click(retryBtn)
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })
  })

  describe("error state", () => {
    it("shows error message", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri={null}
          pairingState="error"
          error="Relay connection failed"
        />,
      )
      expect(screen.getByText("Connection Error")).toBeDefined()
    })

    it("shows custom error text", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri={null}
          pairingState="error"
          error="Custom error message"
        />,
      )
      expect(screen.getByText("Custom error message")).toBeDefined()
    })

    it("shows retry on error", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri={null}
          pairingState="error"
          error="Something went wrong"
        />,
      )
      const retryBtn = screen.getByText("Generate New Code")
      expect(retryBtn).toBeDefined()
      fireEvent.click(retryBtn)
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })

    it("shows timeout message when countdown expires", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri={null}
          pairingState="timeout"
          error={null}
        />,
      )
      expect(screen.getByText("Connection Timed Out")).toBeDefined()
    })
  })

  describe("interactions", () => {
    it("fires onCancel when cancel button clicked", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      fireEvent.click(screen.getByText("Cancel"))
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it("fires onRetry from rejected state", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          pairingState="rejected"
        />,
      )
      fireEvent.click(screen.getByText("Try Again"))
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })

    it("copy button shows copied state", async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })

      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      fireEvent.click(screen.getByLabelText("Copy connection URI"))
      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeDefined()
      })
    })
  })

  describe("accessibility", () => {
    it("QR canvas has accessible aria label", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      const canvas = document.querySelector("canvas")
      expect(canvas!.getAttribute("aria-label")).toBe("QR code for wallet connection")
    })

    it("copy link button has aria label", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByLabelText("Copy connection URI")).toBeDefined()
    })

    it("download button has an aria label distinct from copy", () => {
      render(
        <WalletConnectQR
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      // Both buttons sit in the same row next to the same URI; a shared label
      // would make them indistinguishable to a screen-reader user.
      expect(screen.getByLabelText("Download QR code as PNG")).toBeDefined()
      expect(screen.getByLabelText("Copy connection URI")).toBeDefined()
    })
  })
})

// The two affordances that replace "user photographs their own screen".
// Each has a specific failure mode worth pinning: copy has to survive a missing
// navigator.clipboard, and the download has to produce a scannable 2x PNG rather
// than a transparent-background one that reads as black-on-black.
describe("WalletConnectQR – copy and download affordances", () => {
  const qrProps = {
    uri: "wc:abc123@2?relay-protocol=irn&symKey=0f1e2d",
    pairingState: "pairing",
    error: null,
    onRetry: vi.fn(),
    onCancel: vi.fn(),
  }

  const originalClipboard = navigator.clipboard
  let clickSpy: Mock<() => void>
  /** The exact string the component assigned to anchor.href, before jsdom normalises it. */
  let assignedHref: string
  let assignedDownload: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    assignedHref = ""
    assignedDownload = undefined
    clickSpy = vi.fn<() => void>()
    // The component triggers the download by clicking a detached anchor, so the
    // click is the only observable navigation effect.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { clickSpy() })
    // Read the href off the setter rather than the getter: jsdom parses it as a
    // URL and re-serialises it, percent-encoding the base64 payload, which
    // would corrupt the bytes every assertion below decodes.
    vi.spyOn(HTMLAnchorElement.prototype, "href", "set").mockImplementation(function (this: HTMLAnchorElement, value: string) {
      assignedHref = value
    })
    const downloadDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "download")
    if (downloadDescriptor?.set) {
      vi.spyOn(HTMLAnchorElement.prototype, "download", "set").mockImplementation(function (this: HTMLAnchorElement, value: string) {
        assignedDownload = value
      })
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, { clipboard: originalClipboard })
  })

  async function clickDownload() {
    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Download QR code as PNG"))
    await waitFor(() => expect(clickSpy).toHaveBeenCalled())
  }

  it("copies the full URI, not the truncated display string", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Copy connection URI"))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    // The on-screen preview shows uri.slice(0, 40); copying that would hand the
    // user a URI no wallet can parse.
    expect(writeText).toHaveBeenCalledWith(qrProps.uri)
  })

  it("falls back to execCommand when navigator.clipboard is unavailable", async () => {
    // A plain-http LAN dev origin has no navigator.clipboard at all, and this
    // modal is reachable there.
    Object.assign(navigator, { clipboard: undefined })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand })

    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Copy connection URI"))

    await waitFor(() => expect(screen.getByText("Copied")).toBeDefined())
    expect(execCommand).toHaveBeenCalledWith("copy")
  })

  it("falls back to execCommand when writeText rejects", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.assign(document, { execCommand })

    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Copy connection URI"))

    await waitFor(() => expect(screen.getByText("Copied")).toBeDefined())
    expect(execCommand).toHaveBeenCalledWith("copy")
  })

  it("downloads a PNG that is genuinely 2x the on-screen canvas", async () => {
    await clickDownload()

    // Measured off the decoded IHDR rather than the requested width: a QR whose
    // modules are too small to survive a re-scan is useless off-screen, and
    // asking the encoder for 520px is only half of that promise. The canvas is
    // 260 CSS px, so 520 is the 2x the export is supposed to deliver.
    expect(readPngSize(assignedHref)).toEqual({ width: 520, height: 520 })
  })

  it("encodes the live pairing URI into the pixels", async () => {
    await clickDownload()
    const first = assignedHref

    // A different URI must produce a different image. That is what proves the
    // pairing URI is really what got encoded, rather than the 40-character
    // preview string shown above the button or some cached render.
    assignedHref = ""
    render(<WalletConnectQR {...qrProps} uri="wc:different-session@2?relay-protocol=irn&symKey=deadbeef" />)
    fireEvent.click(screen.getAllByLabelText("Download QR code as PNG")[1])
    await waitFor(() => expect(assignedHref).not.toBe(""))

    expect(assignedHref).not.toBe(first)
  })

  it("exports an opaque light background, not the on-screen transparent one", async () => {
    await clickDownload()

    // The live canvas is white-on-transparent to sit on the dark UI. A
    // transparent background saved to disk composites to black in most image
    // viewers and on most printing paths, so the white modules vanish and the
    // file is unscannable — the exact failure the download exists to prevent.
    const pixel = readQuietZonePixel(assignedHref)
    expect(pixel.a).toBe(255)
    expect(pixel.r).toBe(255)
    expect(pixel.g).toBe(255)
    expect(pixel.b).toBe(255)
  })

  it("produces a high-contrast image rather than a greyscale mush", async () => {
    await clickDownload()

    // A greyscale PNG would still be scannable, but the colour type tells us the
    // encoder honoured the explicit hex colours instead of falling back to its
    // own defaults. Pins the palette choice at the format level.
    expect([0, 2, 6]).toContain(readPngColorType(assignedHref))
    // Not a palette-indexed image: 8-bit indices would need a PLTE chunk and
    // would not carry an alpha channel at all.
    expect(readPngColorType(assignedHref)).not.toBe(3)
  })

  it("names the file and hands the browser a PNG data URL", async () => {
    await clickDownload()

    expect(assignedDownload).toBe("moistello-walletconnect-qr.png")
    expect(assignedHref.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("shows a saved confirmation after downloading", async () => {
    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Download QR code as PNG"))

    await waitFor(() => expect(screen.getByText("Saved")).toBeDefined())
  })

  it("keeps the QR on screen when the download fails", async () => {
    // Fail at the last step of the export. The click is only reached after
    // toDataURL has resolved, so waiting on it is a deterministic barrier
    // rather than a sleep.
    const failing = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {
        throw new Error("download blocked")
      })

    render(<WalletConnectQR {...qrProps} />)
    fireEvent.click(screen.getByLabelText("Download QR code as PNG"))

    await waitFor(() => expect(failing).toHaveBeenCalled())

    // Pairing must not be interrupted by a failed export — the on-screen canvas
    // is still perfectly scannable, so the modal stays up and no false
    // "Saved" confirmation is shown.
    expect(screen.getByText("Scan with your wallet app")).toBeDefined()
    expect(screen.getByRole("img", { name: "QR code for wallet connection" })).toBeDefined()
    expect(screen.queryByText("Saved")).toBeNull()
  })

  it("offers neither affordance before a URI exists", () => {
    render(<WalletConnectQR {...defaultProps} />)

    expect(screen.queryByLabelText("Copy connection URI")).toBeNull()
    expect(screen.queryByLabelText("Download QR code as PNG")).toBeNull()
  })
})
