import { DEX_CONTRACTS, API_ENDPOINTS } from './constants'

export type DexName = 'VVS' | 'MMF' | 'FERRO' | 'EBISU' | 'CRONA' | 'CRODEX' | 'DUCKY' | 'PHOTON' | 'CROSWAP'

interface DexConfig {
  router: string
  factory: string
  priority?: number
}

interface DexConfigs {
  [key: string]: DexConfig
}

export const DEX_CONFIG = {
  contracts: DEX_CONTRACTS as DexConfigs,
  supportedTokens: [
    { 
      symbol: 'CRO', 
      name: 'Cronos',
      address: 'CRO',
      decimals: 18,
      chainId: 25,
      logoURI: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
    },
    { 
      symbol: 'WCRO', 
      name: 'Wrapped CRO',
      address: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
      decimals: 18,
      chainId: 25,
      logoURI: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
    },
    { 
      symbol: 'USDC', 
      name: 'USD Coin',
      address: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
      decimals: 6,
      chainId: 25,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
    },
    { 
      symbol: 'USDT', 
      name: 'Tether USD',
      address: '0x66e428c3f67a68878562e79A0234c1F83c208770',
      decimals: 6,
      chainId: 25,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
    }
  ],
  apiEndpoints: API_ENDPOINTS
}

export function isValidDex(dexName: string): dexName is DexName {
  return Object.keys(DEX_CONFIG.contracts).includes(dexName as DexName);
}

export function getSortedDexes(): [DexName, DexConfig][] {
  return Object.entries(DEX_CONFIG.contracts)
    .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999)) as [DexName, DexConfig][];
}

export function getDexConfig(dexName: DexName): DexConfig | undefined {
  return DEX_CONFIG.contracts[dexName];
}