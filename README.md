# VESTA: Agentic DeFi Flow 🚀

**Bridging the gap between human intent and autonomous execution via "One-Signature Swaps".**

---

## Overview

**VESTA** is a modular, intent-driven DeFi middleware designed to eliminate the friction of manual on-chain interactions. By leveraging the **MetaMask Delegation Framework**, VESTA enables users to authorize an autonomous agent to execute complex DeFi operations—like swaps and liquidity management—within strictly defined safety parameters (caveats).

Traditionally, users must sign every transaction, which is cumbersome for multi-step processes or active management. VESTA changes this: **One signature, infinite possibilities.**

### ✨ Key Features
- **Intent-Based Swapping:** Express your goal in natural language (e.g., "Swap 0.5 ETH for USDC") and let the agent handle the routing via **0G Compute**.
- **Decentralized AI Inference:** Uses **0G Compute (Gaia)** to parse user intents securely and deterministically, translating human language into executable JSON blocks.
- **Delegated Execution:** High-security authorization using the MetaMask Delegation Toolkit, ensuring the agent only acts within your signed permissions.
- **Hybrid Smart Accounts:** Leverages MetaMask's hybrid smart account implementation for seamless interaction between EOAs and autonomous agents.
- **Multi-Chain Native:** First-class support for **Base Sepolia** and **Celo Sepolia**, with production readiness for Base and Celo mainnets.

---

## 🏗️ Technical Architecture

VESTA is built with a modern, scalable stack designed for reliability and security.

### 🌐 Frontend (The Interface)
- **Framework:** React 19 (Vite) + Tailwind CSS 4.
- **Interaction:** `wagmi` and `viem` for blockchain connectivity.
- **Delegation:** `@metamask/delegation-toolkit` for crafting secure, signed authorizations and managing agent permissions.

### 🧠 Backend (The Agent)
- **Runtime:** Node.js / Bun (Express) with TypeScript.
- **Brain:** **0G Compute** LLM-powered intent parsing (using the Gaia network) to translate natural language into structured trade parameters.
- **Executor:** Autonomous execution engine using `@metamask/smart-accounts-kit` to redeem delegations and execute on-chain swaps via the Uniswap V3 Universal Router.

### ⛓️ On-Chain (The Settlement)
- **Networks:** Base Sepolia (Primary) & Celo Sepolia.
- **Protocols:** Uniswap V3 (Universal Router & Quoter V2) for optimal trade execution.
- **Security:** MetaMask Delegation Framework for on-chain validation of caveats (spend limits, allowed contracts, etc.).

---

## 🗺️ Path to Stellar: Transition Roadmap

Our long-term vision is to bring VESTA's agentic power to the **Stellar Ecosystem**. For the **1-Week Drips Wave**, we have scoped an intensive sprint to establish the foundational architecture.

### Phase 1: Soroban Foundation (Days 1-2)
- **Rust Development:** Implement the VESTA "Delegation Manager" as a **Soroban Smart Contract**.
- **Auth System:** Transition from EVM-style `signTypedData` to **Soroban's native Authorization SDK**, utilizing `Env.authorize()`.
- **Wallet Integration:** Support for **Freighter**, **Albedo**, and **Stellar Wallets Kit**.

### Phase 2: Stellar DEX Integration (Days 3-5)
- **DEX Connectors:** Implement workers for **Phoenix**, **Soroswap**, and the **Stellar Orderbook (SDEX)**.
- **SDK Overhaul:** Migrate the backend from `viem` to `stellar-sdk` and `@stellar/soroban-client`.

### Phase 3: Testing & Handover (Days 6-7)
- **Integration Tests:** End-to-end testing of delegated swaps on Stellar Testnet.
- **Bounty Scoping:** Finalize the community task list for future contributors post-Wave.

---

## 🌊 Drips Wave Participation

VESTA is committed to the open-source spirit of the Stellar ecosystem. For the **1-week Drips Wave intensive (April 2026)**, VESTA will focus on rapid Soroban migration and community onboarding.

---

##  Getting Started

### Prerequisites
- Node.js v18+ or Bun v1.2+
- MetaMask with Base Sepolia configuration

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Omoboi-dev/VESTA.git
   cd VESTA
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install # or 'bun install'
   cp .env.example .env # Add your 0G_API_KEY and AGENT_PRIVATE_KEY
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

### 🛠️ Developer Tools

**Smart Account Generator:**
The backend includes a utility to generate deterministic Smart Account addresses for testing.
```bash
cd backend
npx tsx src/scripts/generate-keys.ts
```

---

## 🛡️ Security
VESTA prioritizes user safety. All agent actions are validated on-chain by the `DelegationManager`. The agent never has access to your private key; it only possesses a limited-scope delegation that can be revoked at any time.

---

*VESTA: Bridging the gap between human intent and autonomous execution.*
