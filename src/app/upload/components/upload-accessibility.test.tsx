import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FileDropzone } from "./FileDropzone"
import { SampleTemplates } from "./SampleTemplates"
import { UploadLogin } from "./UploadLogin"

describe("upload accessibility primitives", () => {
  it("gives the admin login fields and error state accessible names", () => {
    render(
      <UploadLogin
        username=""
        password=""
        loginError="Enter username and password"
        loggingIn={false}
        onUsernameChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onLogin={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Username")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Enter username and password")
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
  })

  it("exposes the sample template disclosure state", () => {
    const onToggle = vi.fn()
    const { rerender } = render(<SampleTemplates showSamples={false} onToggle={onToggle} />)
    const toggle = screen.getByRole("button", { name: "Show sample templates" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(<SampleTemplates showSamples onToggle={onToggle} />)
    expect(screen.getByRole("button", { name: "Hide sample templates" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("link", { name: "Download Markdown sample template" })).toBeInTheDocument()
  })

  it("labels file selection and removal controls", () => {
    const fileRef = createRef<HTMLInputElement>()
    const onClear = vi.fn()
    const { rerender } = render(
      <FileDropzone file={null} fileRef={fileRef} onFileSelect={vi.fn()} onClear={onClear} />,
    )

    expect(screen.getByLabelText("Choose a Markdown or HTML file")).toBeInTheDocument()
    const file = new File(["# hello"], "about.md", { type: "text/markdown" })
    rerender(<FileDropzone file={file} fileRef={fileRef} onFileSelect={vi.fn()} onClear={onClear} />)
    const remove = screen.getByRole("button", { name: "Remove selected file about.md" })
    fireEvent.click(remove)
    expect(onClear).toHaveBeenCalledOnce()
  })
})
