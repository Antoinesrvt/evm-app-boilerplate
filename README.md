# TrustSignal

**Turn service contracts into investable tokens with AI-powered verification and decentralized dispute resolution.**

Built for [Rayls Hackathon #2](https://luma.com/clx686yy) — EthCC Cannes, March 2026.

---

## The Problem

Agencies wait 30-90 days for payment. Clients have no guarantee of delivery quality. Disputes get stuck in legal limbo. Capital is locked and illiquid.

## The Solution

TrustSignal tokenizes service contracts on a privacy-preserving blockchain. Agencies get paid upfront by selling contract tokens to investors. Clients lock payment in escrow. AI verifies delivery quality. Kleros resolves disputes when parties disagree.

---

## How It Works

```
Agency creates contract → Client deposits escrow → Agency delivers milestones
                                                          ↓
                                              Client approves → fees split → done
                                              Client rejects  → agency disputes
                                                          ↓
                                              AI analyzes → gives verdict
                                                          ↓
                                              Both accept? → enforced
                                              Either rejects? → Kleros court
```

**For Agencies:** Create a contract, tokenize it, sell tokens to investors — get cash today.

**For Clients:** Lock payment in escrow. Funds only release when milestones are approved.

**For Investors:** Buy contract tokens at a discount. When work is delivered, burn tokens to redeem your share + yield.

**For Everyone:** Use the [Trust Oracle](/oracle) to verify any agency's on-chain reputation before engaging.

---

## Architecture

```
Privacy Node (confidential)          Public Chain (open)              Arbitrum
┌──────────────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│ ContractFactory      │     │ Mirror Token (ERC20)     │     │ HomeGateway  │
│ ServiceContract      │────>│ Marketplace              │     │ KlerosCoreNeo│
│   - escrow           │     │ EscrowPublic             │<───>│              │
│   - milestones       │     │ Attestation              │     └──────────────┘
│   - fee splits       │     │ AgencyProfile            │
│ ContractToken        │     │ ForeignGateway ──────────│──────────────┘
└──────────────────────┘     └──────────────────────────┘

Client + Agency only           Investors interact here          Dispute court
```

**Privacy Node**: Contract terms, escrow, deliverable proofs. Only client and agency have access.

**Public Chain**: Tokens, marketplace, settlements. Investors buy and redeem here. Client identity is never exposed.

**Arbitrum**: Decentralized court (Kleros v2) for unresolved disputes.

---

## Quick Start

```bash
# Clone and setup
git clone <repo-url> && cd trustsignal
./scripts/setup.sh

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Manual Setup

```bash
npm install
cp .env.example .env.local    # fill in your values
npm run dev
```

---

## Environment Variables

### Required (app won't work without these)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | [privy.io](https://privy.io) → Dashboard → App ID |
| `PRIVY_APP_SECRET` | [privy.io](https://privy.io) → Dashboard → App Secret |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) → API Keys |

### Required for blockchain (from hackathon organizers)

| Variable | Description |
|---|---|
| `PRIVACY_NODE_RPC_URL` | Your team's Privacy Node endpoint |
| `DEPLOYER_PRIVATE_KEY` | Wallet private key (generate with `cast wallet new`) |
| `DEPLOYMENT_PROXY_REGISTRY` | Rayls registry contract address |

### Set after deploying contracts

| Variable | How to get it |
|---|---|
| `CONTRACT_FACTORY_ADDRESS` | Output of `npm run deploy` |
| `PLATFORM_TREASURY` | Your treasury wallet address |

### Optional

| Variable | Default | Description |
|---|---|---|
| `RESEND_API_KEY` | — | Email invitations via [resend.com](https://resend.com) |
| `DATABASE_PATH` | `data/trustsignal.db` | SQLite file path (`:memory:` for tests) |
| `ATTESTATION_ADDRESS` | — | Public Chain Attestation singleton |
| `MARKETPLACE_ADDRESS` | — | Public Chain Marketplace singleton |
| `AGENCY_PROFILE_ADDRESS` | — | Public Chain AgencyProfile singleton |

---

## Deploy Contracts

```bash
# One command — deploys factory to Privacy Node
npm run deploy

# Or step by step:
cd contracts
forge script script/DeployFactory.s.sol --rpc-url $PRIVACY_NODE_RPC_URL --broadcast --legacy
```

The deploy script:
1. Builds all Solidity contracts
2. Deploys `ContractFactory` to your Privacy Node
3. Generates TypeScript ABIs
4. Prints the factory address to add to `.env.local`

---

## Project Structure

```
trustsignal/
├── contracts/                  Foundry project (Solidity)
│   ├── src/                    9 smart contracts
│   │   ├── ContractFactory.sol   singleton — creates deals
│   │   ├── ServiceContract.sol   per-deal orchestrator
│   │   ├── ContractToken.sol     per-deal ERC20
│   │   ├── EscrowPublic.sol      investor settlement pool
│   │   ├── Marketplace.sol       buy/sell tokens
│   │   ├── Attestation.sol       AI verdicts on-chain
│   │   ├── AgencyProfile.sol     on-chain reputation
│   │   ├── ForeignGateway.sol    Kleros bridge (Rayls side)
│   │   └── HomeGateway.sol       Kleros bridge (Arbitrum side)
│   └── script/                 Deploy scripts
│
├── scripts/
│   ├── setup.sh                First-time project setup
│   ├── deploy.sh               Deploy contracts to Rayls
│   └── generate-abis.ts        Solidity → TypeScript ABIs
│
├── src/
│   ├── app/                    Next.js pages + API routes
│   │   ├── api/                25 API endpoints
│   │   ├── contracts/          Contract CRUD + actions
│   │   ├── marketplace/        Token marketplace
│   │   ├── oracle/             Trust Oracle — public reputation verifier
│   │   ├── dashboard/          Multi-role dashboard
│   │   └── profile/            User profile + legal docs
│   │
│   ├── components/             React components
│   │   ├── ui/                 Reusable (StatusBadge, EmptyState, etc.)
│   │   └── navbar.tsx          Navigation bar
│   │
│   ├── hooks/                  Data fetching + auth
│   ├── lib/
│   │   ├── ai/                 OpenRouter + 4-model fallback
│   │   ├── auth/               Privy server auth + role middleware
│   │   ├── blockchain/         ethers.js + auto-generated ABIs
│   │   ├── bridge/             Hyperlane messaging
│   │   ├── court/              Kleros v2 integration
│   │   ├── db/                 SQLite + Drizzle ORM
│   │   ├── email/              Resend invitations
│   │   ├── payments/           Privy wallet config
│   │   ├── types/              TypeScript interfaces
│   │   └── utils/              Validation, rate limiting
│   │
│   └── __tests__/              38 tests (Vitest)
│
├── docs/
│   ├── ARCHITECTURE.md         Chain separation model
│   ├── DISPUTE-FLOW.md         2-phase dispute resolution
│   └── ERC-STANDARDS.md        ERC usage and rationale
│
└── data/                       SQLite database (gitignored)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, HeroUI v3, Tailwind CSS v4 |
| Auth | Privy (Google, Telegram, email, embedded wallets) |
| AI | OpenRouter + Vercel AI SDK (Claude → Gemini → Llama → Mistral fallback) |
| Database | SQLite + Drizzle ORM |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Privacy Layer | Rayls Privacy Node (gasless EVM, Chain 800000) |
| Public Layer | Rayls Public Chain (Chain 7295799, USDr gas) |
| Disputes | 2-phase: AI verdict → Kleros v2 on Arbitrum |
| Cross-chain | Hyperlane + Rayls bridge |
| Email | Resend |

---

## Trust Oracle

The **Trust Oracle** (`/oracle`) is a public, read-only reputation verification page. No authentication required.

| Feature | Description |
|---|---|
| **Address Search** | Look up any agency by wallet address |
| **Trust Profile** | Score ring (0-100), tier badge, KYC status, streak counter |
| **Performance Breakdown** | Completion rate, dispute win rate, avg AI score |
| **AI Attestations** | Full history of AI verdicts on the agency's contracts |
| **Agency Leaderboard** | Top 10 agencies ranked by score or volume |
| **On-Chain Verification** | Cross-checks DB data with `AgencyProfile.sol` on Public Chain |

### Tier System

| Score | Tier | Badge |
|---|---|---|
| 96-100 | Elite | Crown |
| 81-95 | Diamond | Gem |
| 61-80 | Established | Tree |
| 31-60 | Growing | Seedling |
| 0-30 | Seedling | Sprout |

Scores are computed on-chain: `40% completion rate + 30% dispute win rate + 30% avg AI score`.

### Oracle API (public, no auth)

| Endpoint | Description |
|---|---|
| `GET /api/oracle/profile?address=0x...` | Full agency profile (DB + on-chain) |
| `GET /api/oracle/leaderboard?sort=score&limit=10` | Top agencies by score or volume |
| `GET /api/oracle/attestations?agency=0x...` | AI attestation history for an agency |

---

## Key Flows

### Contract Lifecycle
`draft` → `invited` → `pending_deposit` → `active` → `completed`

### Dispute Resolution (2-phase)
1. **AI Phase**: AI analyzes contract + deliverable + arguments → verdict (approved / rejected / insufficient data)
2. Both parties accept or reject the AI verdict
3. **Kleros Phase** (if either rejects): Both pay arbitration fee (1-month deadline). Jurors review and rule. Winner gets fee refunded.

### Tokenization
1. Agency mints tokens on Privacy Node
2. Bridges to Public Chain via `teleportToPublicChain()`
3. Lists on Marketplace at discount
4. Investors buy mirror tokens (never touch Privacy Node)
5. On milestone approval → settlement bridged to EscrowPublic
6. Investors burn tokens to redeem USDr

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run 38 tests |
| `npm run setup` | First-time interactive setup |
| `npm run deploy` | Deploy contracts to Rayls |
| `npm run contracts:build` | Compile Solidity |
| `npm run generate:abis` | Rebuild TypeScript ABIs from Solidity |

---

## Fee Structure

| Fee | Rate | Recipient |
|---|---|---|
| Platform | 2.5% (fixed) | Platform treasury |
| Business Dev | 0-20% (configurable) | BD wallet |
| Agency | Remainder | Agency wallet |

Fees deducted per milestone release, not upfront.

---

## Security

- Auth on all mutation endpoints (Privy server-auth + role verification)
- Rate limiting on AI endpoints (20/hour) and faucet (3/hour)
- Client identity never exposed to non-parties
- File upload limits (5-10 MB, validated types)
- Input validation (Zod) on all API routes
- SQL injection prevention (Drizzle ORM)
- No dangerouslySetInnerHTML
- CSP headers configured
- Secrets server-side only (never in client bundles)

---

## License

MIT — see [LICENSE](LICENSE)
