# E2E Tests

This directory contains end-to-end tests for the Moistello application using Playwright.

## Prerequisites

- Dev server running on `http://localhost:1110` (or automatically spawned by Playwright `webServer`)
- To run dev server manually: `npm run dev`

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run critical flows suite only
npm run test:e2e:critical

# Run visual regression tests
npm run test:e2e:visual

# Run with Playwright UI (interactive mode)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed
```

## Test Structure

```
tests/
├── helpers/
│   ├── api-mocks.ts            # API mocking utilities using page.route()
│   ├── mobile-audit.ts         # Mobile audit utilities
│   └── mock-app.ts             # Application mock fixtures & helpers
├── e2e/
│   ├── registration.spec.ts    # User registration flow
│   ├── passkey-login.spec.ts   # Passkey authentication
│   ├── circle-creation.spec.ts # Circle creation wizard
│   ├── contributions.spec.ts   # Contributions list and filtering
│   ├── payout-claim.spec.ts    # Payouts and claiming
│   ├── dispute-resolution.spec.ts # Dispute resolution flow
│   ├── visual-regression.spec.ts  # Visual regression across critical flows
│   ├── mobile-smoke.spec.ts    # Mobile layout and touch responsiveness
│   └── a11y-audit.spec.ts      # Accessibility audit
└── tsconfig.json               # TypeScript config for tests
```

## API Mocking

All tests use `page.route()` to mock API responses, so no running backend is required. The `ApiMocker` class in `helpers/api-mocks.ts` provides pre-configured mocks for:

- Registration endpoints (`/auth/register`, `/auth/register/verify`)
- Passkey authentication (`/auth/passkey/nonce`, `/auth/passkey/verify`)
- Wallet creation (`/wallet/create`)
- Circle operations (`/circles`, `/circles/:id`, `/circles/:id/members`, `/circles/:id/payouts`)
- Dispute resolution (`/circles/:id/dispute`, `/circles/:id/resolve-dispute`)
- Support tickets (`/api/support/tickets`)
- Notification preferences (`/api/users/me/notifications`)
- Contributions (`/contributions`)
- Payouts (`/payouts`)

## Test Coverage of Critical Flows

### 1. Registration Flow
- Email/password submission
- OTP verification
- Profile setup
- Wallet creation
- Passkey linking
- Validation errors
- Resend OTP & back-navigation

### 2. Passkey & Login Flow
- WebAuthn credential mocking
- Passkey authentication flow
- Error handling (passkey unavailable)
- Method switching (wallet/password/passkey)
- Authenticated user redirection

### 3. Circle Creation
- Multi-step wizard navigation (Details, Financials, Payout, Review)
- Form validation (short name, min members, positive contribution)
- API success and failure scenarios
- Step-by-step backward progression

### 4. Contributions
- List display with summary cards
- Filtering by circle, amount, date
- Search functionality
- Pagination
- Empty and error states
- Direct contribution from circle detail

### 5. Payouts & Claim Flow
- Payout list display
- Claiming payouts with transaction hash verification
- Transaction links to Stellar explorer
- Pagination
- Empty and error states
- Navigation to circle from payout item

### 6. Dispute Resolution
- Disputed status badge on circle details
- Support dispute ticket filing & confirmation
- Circle dispute API submission (`POST /api/circles/:id/dispute`)
- Dispute resolution resolution handling (`POST /api/circles/:id/resolve-dispute`)
- Dispute category notifications preferences
- Governance dispute resolution proposals (MIP-15)

### 7. Visual Regression
- Registration page visual layout
- Login page visual layout across authentication tabs (wallet, password, passkey)
- Circle creation wizard layout
- Contributions list layout
- Payouts received list layout
- Disputed circle status badge layout
