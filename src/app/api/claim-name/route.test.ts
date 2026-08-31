import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, _resetClaimNameState } from "./route";

describe("POST /api/claim-name", () => {
  beforeEach(() => {
    _resetClaimNameState();
  });

  it("claims a valid name for an authenticated user", async () => {
    const req = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer user-100",
      },
      body: JSON.stringify({ name: "  Satoshi_N  " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.name).toBe("satoshi_n");
    expect(data.claimedBy).toBe("user-100");
  });

  it("rejects unauthenticated requests", async () => {
    const req = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "valid_name" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toMatch(/Authentication required/i);
  });

  it("rejects invalid or malformed names", async () => {
    // Too short (< 3 chars)
    const reqShort = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: { Authorization: "Bearer user-100" },
      body: JSON.stringify({ name: "ab" }),
    });
    const resShort = await POST(reqShort);
    expect(resShort.status).toBe(400);

    // Illegal characters
    const reqIllegal = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: { Authorization: "Bearer user-100" },
      body: JSON.stringify({ name: "satoshi<script>" }),
    });
    const resIllegal = await POST(reqIllegal);
    expect(resIllegal.status).toBe(400);
  });

  it("prevents name squatting by another account (ownership binding)", async () => {
    const req1 = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: { Authorization: "Bearer owner-user" },
      body: JSON.stringify({ name: "unique_handle" }),
    });
    await POST(req1);

    // Second user attempts to claim the same handle
    const req2 = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: { Authorization: "Bearer attacker-user" },
      body: JSON.stringify({ name: "unique_handle" }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(409);

    const data2 = await res2.json();
    expect(data2.error).toMatch(/already claimed by another account/i);
  });

  it("enforces server-side rate limits (max 5 per minute)", async () => {
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest("http://localhost/api/claim-name", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.195",
          Authorization: "Bearer user-1",
        },
        body: JSON.stringify({ name: `handle_${i + 1}` }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    }

    // 6th attempt from same IP triggers rate limiting
    const req6 = new NextRequest("http://localhost/api/claim-name", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.195",
        Authorization: "Bearer user-1",
      },
      body: JSON.stringify({ name: "handle_6" }),
    });
    const res6 = await POST(req6);
    expect(res6.status).toBe(429);

    const data6 = await res6.json();
    expect(data6.error).toMatch(/Rate limit exceeded/i);
  });
});
