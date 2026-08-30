export function validateStellarAddress(address: unknown): boolean {
  if (typeof address !== "string") {
    return false;
  }
  return /^G[A-Z2-7]{55}$/.test(address);
}
