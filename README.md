# Moistello Frontend

Next.js 14 application delivering decentralized ROSCA (Rotating Savings and Credit Association) platform to 1.7B+ unbanked adults via Stellar blockchain.

## Business Model

Moistello digitizes traditional savings circles (esusu, tontine, chit fund) using Soroban smart contracts. Members contribute USDC/XLM regularly, receiving periodic payouts based on programmed rules.

### Core Value Proposition
- **Financial Inclusion**: Banking services for unbanked adults without traditional accounts
- **Trustless Transparency**: Smart contracts enforce rules automatically
- **Portable Reputation**: MoiScore (0-1000) builds lifelong financial reputation
- **Sub-cent Fees**: Stellar transactions <$0.001, protocol fee 0.5% on payouts

### Circle Types
| Type | Description | Access Control |
|------|-----------|--------------|
| Public | Anyone meeting minimum MoiScore can join | Permissionless |
| Private | Invite-only via link or code | Restricted |
| Community | Token-gated (DAO/token holder only) | Multi-sig |
| Premium | Higher limits, priority support, collateralized | Permissioned |

### Payout Modes
| Mode | Mechanism |
|------|-----------|
| Random | VRF selects recipient (provably fair) |
| Fixed Order | Pre-defined sequential distribution |
| Auction (Chit Fund) | Members bid discount, winner gets pool minus discount |
| Vote-Based | Community votes recipient each round |

### MoiScore Reputation (0-1000)
| Factor | Weight |
|--------|--------|
| Streak (consecutive on-time payments) | 35% |
| Completions (successful circles) | 30% |
| Volume (total contributed) | 20% |
| Recency (recent activity) | 15% |

Score tiers unlock higher circle limits and lower collateral requirements.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 3.x |
| State | Zustand 5.x |
| Animation | Framer Motion |
| Icons | Lucide React |
| Build | Turbopack |

## Business-Centric Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx            # 557-line login monolith
│   │   └── register/page.tsx         # 914-line registration monolith
│   ├── (dashboard)/
│   │   ├── circles/page.tsx          # Circle discovery/listings
│   │   ├── circles/create/page.tsx   # Circle creation with 4 payout types
│   │   ├── governance/page.tsx       # Community voting interface
│   │   ├── reputation/page.tsx         # Score display + tier benefits
│   │   ├── wallet/page.tsx           # USDC/XLM balance + transactions
│   │   └── settings/page.tsx         # Profile + notification prefs
│   └── docs/                         # Documentation pages
├── stores/
│   ├── multi-wallet-store.ts         # Wallet connection state
│   ├── auth-store.ts               # Session tokens
│   ├── ui-store.ts                 # Theme, toasts
│   └── auth-flow-store.ts            # Auth orchestration (REDUNDANT)
└── lib/
    └── wallet/
        └── wc2-session-store.ts      # Weak hash for session IDs (FORGEABLE)
```

## Authentication Business Flow

### Login (Existing Users)
```
[Wallet Connect] → [Sign Challenge] → [JWT Token] → [Authenticated]
```

### Registration (New Users)
```
[Wallet Connect] → [Passkey Email] → [Profile Setup] → [Sign & Register] → [Authenticated]
```

## Circle Management

### Lifecycle States
- **Pending**: Circle created, waiting for members
- **Active**: Contributions and payouts in progress
- **Completed**: All members received payouts
- **Cancelled**: Organzier cancelled before start
- **Disputed**: Under review

### Penalty System
| Parameter | Default | Range |
|-----------|---------|-------|
| Late Fee | 5% | Configurable |
| Grace Period | 24h | 1-168h |
| Max Strikes | 3 | 1-10 |
| Collateral | 0% | Optional |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+ or yarn 1.22+

### Installation
```bash
npm install
npm run dev
```

Access at `http://localhost:1110`

## Development Scripts

| Command | Description |
|---------|-------------|
| `dev` | Development server on port 1110 |
| `build` | Production build |
| `lint` | ESLint checks |
| `test` | Run test suite |

## Accessibility

See [`docs/accessibility.md`](docs/accessibility.md) for the WCAG 2.1 AA authoring checklist, keyboard requirements, and screen-reader verification steps.

## Logging

See [`docs/logging.md`](docs/logging.md) for structured log levels, redaction, browser batching, and server collection.

## Contributing

1. Branch from `main`
2. Follow existing conventions
3. Add tests for changes
4. Pass `npm run lint`
5. Submit PR with description

## License

Apache 2.0