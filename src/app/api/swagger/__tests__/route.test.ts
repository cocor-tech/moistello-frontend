import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "../route";
import fs from "fs";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe("GET /api/swagger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SWAGGER_JSON_PATH;
    delete process.env.SWAGGER_PATH;
    delete process.env.SWAGGER_BACKEND_URL;
    delete process.env.BACKEND_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 404 with clear error and no path leakage when spec file is missing", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const res = await GET();
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({ error: "Swagger API specification not found" });
    expect(JSON.stringify(body)).not.toContain("/opt/");
    expect(JSON.stringify(body)).not.toContain("swagger.json");
  });

  it("serves spec from custom env path when specified and file exists", async () => {
    const customPath = "/custom/path/swagger.json";
    process.env.SWAGGER_JSON_PATH = customPath;
    const mockSpec = { openapi: "3.0.0", info: { title: "Test API" } };

    vi.mocked(fs.existsSync).mockImplementation((p) => p === customPath);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === customPath) return JSON.stringify(mockSpec);
      throw new Error("File not found");
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockSpec);
  });

  it("proxies spec from backend URL when local files are missing", async () => {
    process.env.BACKEND_URL = "https://backend.example.com";
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const mockSpec = { openapi: "3.0.0", info: { title: "Backend API" } };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockSpec), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith("https://backend.example.com/docs/api/swagger.json");

    const body = await res.json();
    expect(body).toEqual(mockSpec);
  });
});
