import { describe, expect, it } from "vitest";

import {
  PRIVATE_PROFILE_FIELDS,
  handleFromDisplayName,
  isPrivateProfileField,
  isValidHandle,
  maskWalletAddress,
  toPublicProfile,
} from "@/lib/profile/public-profile";

const FULL_USER = {
  id: "user-1",
  walletAddress: "GCX4B3YJ2W8F7T6Y5U4R3E2W1Q0P9O8N7M6L5K4J3I2",
  email: "amina@example.com",
  phone: "+2348000000000",
  passwordHash: "$2b$10$notarealhashnotarealhashnotarealhash",
  sessionTtlMinutes: 43200,
  preferredLanguage: "en",
  displayName: "Amina Okafor",
  avatarIpfsHash: "bafyabc123",
  countryCode: "NG",
  moiScore: 640,
  createdAt: "2026-07-10T09:00:00.000Z",
  bio: "Saving with friends.",
  twitterUrl: "https://twitter.com/amina",
  githubUrl: "https://github.com/amina",
  accessToken: "secret-access-token",
  refreshToken: "secret-refresh-token",
  hmac: "deadbeef",
};

describe("toPublicProfile", () => {
  it("never leaks any private field", () => {
    const profile = toPublicProfile(FULL_USER, "amina-okafor");
    expect(profile).not.toBeNull();

    const serialized = JSON.stringify(profile);
    const keys = Object.keys(profile!);

    for (const field of PRIVATE_PROFILE_FIELDS) {
      // The field itself must not be present as a key...
      expect(keys).not.toContain(field);

      // ...nor its value anywhere in the payload. Short values are skipped:
      // a substring search for a 2-character value like "en" would match
      // innocuous words such as "friends" and prove nothing.
      const value = String((FULL_USER as Record<string, unknown>)[field] ?? "");
      if (value.length >= 6) {
        expect(serialized).not.toContain(value);
      }
    }
  });

  it("exposes only the allow-listed fields", () => {
    expect(Object.keys(toPublicProfile(FULL_USER, "amina-okafor")!).sort()).toEqual(
      [
        "avatarIpfsHash",
        "bio",
        "countryCode",
        "createdAt",
        "displayName",
        "githubUrl",
        "handle",
        "moiScore",
        "twitterUrl",
        "walletAddressPreview",
      ].sort(),
    );
  });

  it("truncates the wallet address rather than publishing it", () => {
    const profile = toPublicProfile(FULL_USER, "amina-okafor")!;
    expect(profile.walletAddressPreview).toBe("GCX4B3…J3I2");
    expect(profile.walletAddressPreview).not.toContain(FULL_USER.walletAddress);
  });

  it("keeps public fields intact", () => {
    const profile = toPublicProfile(FULL_USER, "amina-okafor")!;
    expect(profile.displayName).toBe("Amina Okafor");
    expect(profile.bio).toBe("Saving with friends.");
    expect(profile.moiScore).toBe(640);
    expect(profile.countryCode).toBe("NG");
    expect(profile.twitterUrl).toBe("https://twitter.com/amina");
  });

  it("returns null for a non-object source", () => {
    expect(toPublicProfile(null, "amina")).toBeNull();
    expect(toPublicProfile(undefined, "amina")).toBeNull();
    expect(toPublicProfile("nope", "amina")).toBeNull();
    expect(toPublicProfile(42, "amina")).toBeNull();
  });

  it("returns null for an invalid handle so a bad URL cannot mint a profile", () => {
    expect(toPublicProfile(FULL_USER, "AB")).toBeNull();
    expect(toPublicProfile(FULL_USER, "../etc")).toBeNull();
    expect(toPublicProfile(FULL_USER, "has spaces")).toBeNull();
  });

  it("survives a record with missing or wrongly-typed fields", () => {
    const profile = toPublicProfile({ displayName: "X" }, "member-1")!;
    expect(profile.displayName).toBe("X");
    expect(profile.moiScore).toBe(0);
    expect(profile.countryCode).toBeNull();
    expect(profile.walletAddressPreview).toBeNull();
  });

  it("defaults a missing display name rather than rendering undefined", () => {
    expect(toPublicProfile({ id: "u" }, "member-1")!.displayName).toBe("Anonymous member");
  });

  it("is deterministic, so the preview and the public page cannot diverge", () => {
    expect(toPublicProfile(FULL_USER, "amina-okafor")).toEqual(
      toPublicProfile(FULL_USER, "amina-okafor"),
    );
  });
});

describe("maskWalletAddress", () => {
  it("leaves short values alone", () => {
    expect(maskWalletAddress("GABC")).toBe("GABC");
    expect(maskWalletAddress(null)).toBeNull();
  });

  it("masks a long address", () => {
    expect(maskWalletAddress("GCX4B3YJ2W8F7T6Y5U4R3E2W1Q0P9O8N7M6L5K4J3I2")).toBe("GCX4B3…J3I2");
  });
});

describe("isValidHandle", () => {
  it("accepts url-safe handles of a sane length", () => {
    expect(isValidHandle("amina-okafor")).toBe(true);
    expect(isValidHandle("member_1")).toBe(true);
  });

  it("rejects traversal, spaces, and overly short handles", () => {
    expect(isValidHandle("../secrets")).toBe(false);
    expect(isValidHandle("a b")).toBe(false);
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("-leading")).toBe(false);
  });
});

describe("handleFromDisplayName", () => {
  it("slugifies a display name", () => {
    expect(handleFromDisplayName("Amina Okafor")).toBe("amina-okafor");
  });

  it("falls back when the name slugifies to too little", () => {
    expect(handleFromDisplayName("##", "user-123456")).toBe("member-user-1");
  });
});

describe("isPrivateProfileField", () => {
  it("recognises the deny-list", () => {
    expect(isPrivateProfileField("email")).toBe(true);
    expect(isPrivateProfileField("displayName")).toBe(false);
  });
});
