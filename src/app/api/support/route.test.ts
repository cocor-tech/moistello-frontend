import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

describe("POST /api/support (route-level tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Validation & Missing Parameters", () => {
    it("returns 400 when email is missing", async () => {
      const res = await POST(makeRequest({ message: "Help needed with transaction." }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe("Email and message are required")
    })

    it("returns 400 when message is missing", async () => {
      const res = await POST(makeRequest({ email: "user@example.com" }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe("Email and message are required")
    })

    it("returns 400 when both email and message are empty strings", async () => {
      const res = await POST(makeRequest({ email: "", message: "" }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe("Email and message are required")
    })
  })

  describe("Success State", () => {
    it("returns 200 with success confirmation when valid inquiry is submitted", async () => {
      const res = await POST(
        makeRequest({
          email: "support-seeker@example.com",
          message: "Unable to complete circle contribution.",
          requestId: "req-12345",
          errorType: "500",
          category: "circle_contribution",
        })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.message).toBe("Support request submitted successfully.")
    })
  })

  describe("Error State", () => {
    it("returns 500 when request body contains malformed JSON", async () => {
      const req = new NextRequest("http://localhost/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-{",
      })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe("Failed to process support request")
    })
  })
})
