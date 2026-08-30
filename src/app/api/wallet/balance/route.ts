import { NextRequest, NextResponse } from "next/server";
import { STELLAR_HORIZON_URL } from "@/lib/constants";
import { validateStellarAddress } from "@/lib/stellar/validate-address";

// Simple in-memory server cache for balance requests to reduce Horizon hits
const serverBalanceCache = new Map<
  string,
  { data: { xlm: string; usdc: string }; timestamp: number }
>();

const SERVER_CACHE_TTL_MS = 30_000; // 30 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing required 'address' query parameter" },
      { status: 400 }
    );
  }

  // Validate Stellar public key format using the canonical validator
  if (!validateStellarAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Stellar public key address" },
      { status: 400 }
    );
  }

  // Check server-side cache
  const cached = serverBalanceCache.get(address);
  if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const horizonUrl = `${STELLAR_HORIZON_URL}/accounts/${address}`;
    const response = await fetch(horizonUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Account not funded yet
        const emptyBalance = { xlm: "0", usdc: "0" };
        serverBalanceCache.set(address, {
          data: emptyBalance,
          timestamp: Date.now(),
        });
        return NextResponse.json(emptyBalance, { status: 200 });
      }
      return NextResponse.json(
        { error: `Horizon returned status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    let xlm = "0";
    let usdc = "0";

    for (const b of data.balances || []) {
      if (b.asset_type === "native") {
        xlm = b.balance;
      } else if (b.asset_code === "USDC") {
        usdc = b.balance;
      }
    }

    const result = { xlm, usdc };

    // Update server-side cache
    serverBalanceCache.set(address, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
