# LionDEX Documentation on Cronos (not yet deployed, unfinished)

## Overview

This is a Decentralized Exchange (DEX) built on the Cronos network, allowing token swaps. The project is developed with Next.js and integrates multiple underlying DEXs to provide liquidity.

## Key Features

### 1. Token Swapping ✅

- Supports token-to-token swaps
- Includes configurable slippage
- Displays prices and swap routes
- Integration with multiple DEXs:
  - VVS Finance
  - MM Finance
  - PhotonSwap
  - CronaSwap

### 2. Admin Panel ✅

- Management of listed tokens
- Fee control
- Route initialization
- Administrator and super-administrator roles

### 3. Wallet Integration ✅

- Support for Web3Modal
- Connection with multiple wallets
- Connection state management

### 4. Fee Management ✅

- Configurable fee system
- Fee collector
- Configurable fee limits

## Technical Architecture

### Frontend

- Built with Next.js 15
- Styled with TailwindCSS
- UI components powered by ShadcnUI
- State management with React Query

### Smart Contracts

- **FeeManager**: Handles fee management
- **CustomRouter**: Custom router for swaps
- Interfaces with Uniswap V2

### APIs

- Provides interaction endpoints for frontend and smart contracts

## Current Status

### Functionality ✅

- Wallet connection
- Basic token swaps
- Admin panel
- Token management
- Fee system
- Swap routes

### Pending/Known Issues ❌

- Route optimization for low-liquidity tokens
- Improvements in transaction error handling
- Support for tokens with non-standard decimals
- Full automated testing
- Complete API documentation
- Fee system (unfinished)

## Configuration

### Supported Tokens

- List of tokens available for swapping

### Configured DEXs

- Details of integrated DEX platforms

### Required Environment Variables

- List of variables necessary to run the project

## Recommended Next Steps

1. Implement full automated testing
2. Improve API documentation
3. Optimize the routing algorithm
4. Implement transaction monitoring
5. Enhance error handling

## Security Notes

- Administrator roles are secured with wallet signatures
- Slippage checks are implemented to protect users
