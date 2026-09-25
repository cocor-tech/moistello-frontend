# Multi-network operations

## Network identity

Each network must carry:
- RPC endpoint
- Optional Horizon endpoint
- Stellar network passphrase
- Contract IDs deployed on that network

Mainnet and testnet contract IDs must never be reused interchangeably.

## Switching procedure

1. Request the target network.
2. Load the target network configuration.
3. Construct the target RPC adapter.
4. Call `getNetwork`.
5. Compare the returned passphrase with the configured passphrase.
6. Update the active network only after validation succeeds.
7. Recreate dependent contract clients using the new configuration.
8. Refresh network-dependent cached data.

## Security and safety

- Default to testnet for development.
- Require explicit configuration before enabling mainnet.
- Never put secret keys in NEXT_PUBLIC environment variables.
- Do not sign a transaction using a passphrase from another network.
- Do not assume a contract ID exists on both networks.
- Clear or invalidate React Query caches when switching networks.
- Include network in query keys, cache keys, logs, and telemetry.
- Consider preventing mainnet transactions in non-production builds.

## Deployment checklist

- [ ] Verified testnet RPC endpoint
- [ ] Verified mainnet RPC endpoint
- [ ] Verified testnet contract IDs
- [ ] Verified mainnet contract IDs
- [ ] RPC getNetwork validation implemented
- [ ] Wallet network/passphrase alignment verified
- [ ] Network switch UI tested
- [ ] Cached network-specific data invalidated
- [ ] Mainnet transaction safeguards reviewed
