import { ethers, TransactionResponse } from "ethers"

export const WCRO_ADDRESS = '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23'
export const USDC_ADDRESS = '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59'
export const USDT_ADDRESS = '0x66e428c3f67a68878562e79A0234c1F83c208770'
export const TUSD_ADDRESS = '0x87EFB3ec1576Dec8ED47e58B832bEdCd86eE186e'
export const DAI_ADDRESS = '0xF2001B145b43032AAF5Ee2884e456CCd805F677D'

export const CHAIN_ID = 25
export const NETWORK_NAME = 'Cronos'
export const NETWORK_CURRENCY = 'CRO'
export const BLOCK_EXPLORER_URL = 'https://cronoscan.com'
export const RPC_URL = 'https://evm.cronos.org'

export const ROUTER_ADDRESS = '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae'

export const STABLECOIN_ADDRESSES = [
  USDC_ADDRESS,
  USDT_ADDRESS,
  TUSD_ADDRESS,
  DAI_ADDRESS
].map(address => address.toLowerCase())

export const STABLECOIN_INTERMEDIARY = [USDT_ADDRESS, DAI_ADDRESS]

export const NETWORK_CONFIG = {
  chainId: CHAIN_ID,
  chainName: NETWORK_NAME,
  nativeCurrency: {
    name: NETWORK_CURRENCY,
    symbol: NETWORK_CURRENCY,
    decimals: 18
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [BLOCK_EXPLORER_URL]
}

export const KNOWN_DECIMALS: Record<string, {decimals: number, lastUpdated: number}> = {
  [WCRO_ADDRESS]: {decimals: 18, lastUpdated: Date.now()},
  [USDC_ADDRESS]: {decimals: 6, lastUpdated: Date.now()},
  [USDT_ADDRESS]: {decimals: 6, lastUpdated: Date.now()},
  [TUSD_ADDRESS]: {decimals: 6, lastUpdated: Date.now()},
  [DAI_ADDRESS]: {decimals: 18, lastUpdated: Date.now()},
  'CRO': {decimals: 18, lastUpdated: Date.now()}
}

export const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function factory() view returns (address)"
]

export const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)'
]

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
] 

export const BASIC_TOKENS = [
  {
    address: 'CRO',
    symbol: 'CRO',
    name: 'Cronos',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
  },
  {
    address: WCRO_ADDRESS,
    symbol: 'WCRO',
    name: 'Wrapped CRO',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
  },
  {
    address: USDC_ADDRESS,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  },
  {
    address: USDT_ADDRESS,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
  },
  {
    address: DAI_ADDRESS,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png'
  }
] 

export const FEE_MANAGER_ABI = [
  'function feeCollector() view returns (address)',
  'function feePercentage() view returns (uint256)',
  'function calculateFee(uint256 amount) view returns (uint256)',
  'function setFeeCollector(address newCollector)',
  'function setFeePercentage(uint256 newPercentage)',
  'function owner() view returns (address)'
]

export const FEE_PERCENTAGE_LIMITS = {
  MIN: 0,
  MAX: 5,
  STEP: 0.1
} 

export const DEX_LOGOS: Record<string, string> = {
  'VVS': '/images/dex/vvs.webp',
  'MMF': '/images/dex/mmf.webp',
  'FERRO': '/images/dex/ferro.webp',
  'CRONA': '/images/dex/crona.webp',
  'EBISU': '/images/dex/ebisu.webp',
  'CRODEX': '/images/dex/crodex.webp',
  'DUCKY': '/images/dex/ducky.webp',
  'PHOTON': '/images/dex/photon.webp',
  'CROSWAP': '/images/dex/croswap.webp',
  'Native': '/images/dex/wcro.webp',
  'Pack': '/images/dex/pack.webp',
  'Unpack': '/images/dex/unpack.webp'
}

export const DEX_NAMES: Record<string, string> = {
  'VVS': 'VVS Finance',
  'MMF': 'MM Finance',
  'FERRO': 'Ferro Protocol',
  'CRONA': 'CronaSwap',
  'EBISU': "Ebisu's Bay",
  'CRODEX': 'Crodex',
  'DUCKY': 'DuckyDeFi',
  'PHOTON': 'PhotonSwap',
  'CROSWAP': 'CroSwap'
}

export const DEFAULT_TOKEN_IMAGE = '/images/default-token.png'
export const DEFAULT_DEX_IMAGE = '/images/dex/default.png'
export const SLIPPAGE_PERCENTAGE = 0.5 // 0.5% 

export const WALLET_METADATA = {
  name: 'LionDEX',
  description: 'LionDEX Example',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}


export const WALLET_THEME = {
  '--w3m-accent': '#7c3aed',
  '--w3m-z-index': 60
}

export const CRONOS_CHAIN = {
  name: 'Cronos',
  id: 25,
  network: 'cronos',
  rpcUrls: {
    default: { 
      http: [
        `https://go.getblock.io/${process.env.NEXT_PUBLIC_GETBLOCK_API_KEY}`,
        'https://cronos.rpc.thirdweb.com',
        'https://rpc.vvs.finance'
      ] 
    },
    public: { 
      http: [
        `https://go.getblock.io/${process.env.NEXT_PUBLIC_GETBLOCK_API_KEY}`,
        'https://cronos.rpc.thirdweb.com',
        'https://rpc.vvs.finance'
      ] 
    }
  },
  nativeCurrency: {
    name: 'Cronos',
    symbol: 'CRO',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'CronosScan',
      url: 'https://cronoscan.com'
    },
    etherscan: {
      name: 'CronosScan',
      url: 'https://cronoscan.com'
    }
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11' as `0x${string}`,
      blockCreated: 1963112
    }
  }
}

export const QUERY_CLIENT_CONFIG = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0,
      staleTime: 30000
    }
  }
}

export const DEX_CONTRACTS = {
  'VVS': {
    router: '0x145677FC4d9b8F19B5D56d1820c48e0443049a30',
    factory: '0x3B44B2a187a7b3824131F8db5a74194D0a42Fc15',
    priority: 1
  },
  'MMF': {
    router: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae',
    factory: '0xd590cC180601AEcD6eeADD9B7f2B7611519544f4',
    priority: 2
  },
  'PHOTON': {
    router: '0x69004509291F4a4021fA169FafdCFc2d92aD02Aa',
    factory: '0x462C98Cae5AffEED576c98A55dAA922604e2D875',
    priority: 3
  },
  'CRONA': {
    router: '0xcd7d16fB918511BF7269eC4f48d61D79Fb26f918',
    factory: '0x73A48f8f521EB31c55c0e1274dB0898dE599Cb11',
    priority: 4
  }
} as const

export const API_ENDPOINTS = {
  liquidity: '/api/liquidity',
  price: '/api/price', 
  swap: '/api/swap'
} as const

export const DEFAULT_FEE_CONFIG = {
  feePercentage: 1,
  calculateDefaultFee: (amount: string) => {
    const parsed = ethers.parseEther(amount)
    const fee = (parsed * BigInt(100)) / BigInt(10000)
    return ethers.formatEther(fee)
  }
}

export const CRONOS_TOKENS = {
  USDT: {
    address: USDT_ADDRESS,
    name: 'Cronos USDT',
    symbol: 'USDT',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
  },
  USDC: {
    address: USDC_ADDRESS,
    name: 'Cronos USDC',
    symbol: 'USDC',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png'
  },
  WBTC: {
    address: '0x062E66477Faf219F25D27dCED647BF57C3107d52',
    name: 'Cronos Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png'
  },
  WCRO: {
    address: WCRO_ADDRESS,
    name: 'Wrapped CRO',
    symbol: 'WCRO',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/7310/large/cro_token_logo.png'
  }
} as const

export const CRONOS_TESTNET = {
  id: 338,
  name: 'Cronos Testnet',
  network: 'cronos-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Testnet Cronos',
    symbol: 'TCRO',
  },
  rpcUrls: {
    public: { http: ['https://evm-t3.cronos.org'] },
    default: { http: ['https://evm-t3.cronos.org'] },
  },
  blockExplorers: {
    etherscan: { name: 'CronosScan', url: 'https://testnet.cronoscan.com' },
    default: { name: 'CronosScan', url: 'https://testnet.cronoscan.com' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 13591641,
    },
  },
} as const

export const AUTH_CONSTANTS = {
  MESSAGE_TO_SIGN: 'Sign this message to verify you own this wallet address.',
  CACHE_TTL: 60 * 5,
  ADMIN_CACHE_PREFIX: 'admin:auth:',
  SUPER_ADMIN_CACHE_PREFIX: 'super_admin:auth:'
} as const

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN'

export interface AdminDetails {
  id?: string
  address: string
  role: AdminRole
  createdAt?: Date
  updatedAt?: Date
}

export const AGGREGATOR_CONSTANTS = {
  STABLECOINS: {
    USDC: USDC_ADDRESS.toLowerCase(),
    USDT: USDT_ADDRESS.toLowerCase(),
    TUSD: TUSD_ADDRESS.toLowerCase(),
    DAI: DAI_ADDRESS.toLowerCase()
  },
  MAX_RETRIES: 3,
  INTERMEDIATE_TOKENS: [
    WCRO_ADDRESS,
    USDT_ADDRESS,
    USDC_ADDRESS,
    DAI_ADDRESS,
    TUSD_ADDRESS
  ]
} as const

export interface SwapErrorDetails {
  code?: string
  message?: string
  originalError?: Error
}

export interface Quote {
  dex: string
  price: string
  path: string[]
  routerAddress: string
  fromDecimals: number
  toDecimals: number
  tx?: {
    to: string
    data: string
    value: bigint
    gasLimit?: bigint
    gasPrice?: bigint
    hash?: string
    wait?: () => Promise<TransactionResponse>
  }
}

export interface QuoteParams {
  fromToken: string
  toToken: string
  amount: string
  userAddress: string
}

export interface Route {
  path: string[]
  dex: string
}

export interface QuoteResult {
  price: string
  path: string[]
  dex: string
  estimatedGas: bigint
}