import { JsonRpcSigner, Contract, TransactionResponse, Interface } from 'ethers'
import { ethers } from 'ethers'
import { DEX_CONFIG } from '@/config/dex'
import { getProvider } from './rpc'
import { 
  WCRO_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  TUSD_ADDRESS,
  DAI_ADDRESS,
  STABLECOIN_ADDRESSES,
  ROUTER_ABI,
  FACTORY_ABI,
  ERC20_ABI,
  KNOWN_DECIMALS,
  STABLECOIN_INTERMEDIARY,
  AGGREGATOR_CONSTANTS
} from '@/config/constants'

declare global {
  interface Ethereum {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, callback: (args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (args: unknown[]) => void) => void;
    selectedAddress?: string;
    isMetaMask?: boolean;
    isConnected?: () => boolean;
  }
}

interface SwapErrorDetails {
  code?: string;
  message?: string;
  originalError?: Error;
}

export interface TokenWarning {
  type: 'high_gas' | 'tax' | 'blacklist' | 'burn';
  message: string;
  canBurn?: boolean;
  taxFee?: number;
}

export interface Quote {
  dex: string;
  price: string;
  path: string[];
  routerAddress: string;
  fromDecimals: number;
  toDecimals: number;
  warnings?: TokenWarning[];
  tx?: {
    to: string;
    data: string;
    value: bigint;
    gasLimit?: bigint;
    gasPrice?: bigint;
    hash?: string;
    wait?: () => Promise<TransactionResponse>;
  };
}

const { STABLECOINS } = AGGREGATOR_CONSTANTS

const PROBLEMATIC_TOKENS_SIGNATURES = [
  'function _burnFee() view returns (uint256)',
  'function _taxFee() view returns (uint256)',
  'function _maxTxAmount() view returns (uint256)',
  'function _maxTransferAmount() view returns (uint256)',
  'function blacklist(address) view returns (bool)',
  'function isBlacklisted(address) view returns (bool)',
  'function getBlackListStatus(address) view returns (bool)'
];

const PROBLEMATIC_TOKENS_ABI = [
  'function _burnFee() view returns (uint256)',
  'function _taxFee() view returns (uint256)',
  'function _maxTxAmount() view returns (uint256)',
  'function blacklist(address) view returns (bool)'
];

export async function getBestQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string
): Promise<Quote> {
  try {
    if (!amount || Number(amount) <= 0) {
      throw new Error('Invalid amount')
    }

    const provider = await getProvider()
    
    const actualFromToken = fromToken === 'CRO' ? WCRO_ADDRESS : fromToken
    const actualToToken = toToken === 'CRO' ? WCRO_ADDRESS : toToken

    const [fromDecimals, toDecimals] = await Promise.all([
      getTokenDecimals(actualFromToken, provider),
      getTokenDecimals(actualToToken, provider)
    ])

    const normalizedAmount = await normalizeAmount(
      Object.values(STABLECOINS).includes(actualFromToken.toLowerCase()) 
        ? amount.split('.').length > 1 
          ? `${amount.split('.')[0]}.${amount.split('.')[1].slice(0, 6)}`
          : amount
        : amount,
      fromDecimals,
      'parse'
    )
    const amountIn = ethers.parseUnits(normalizedAmount, fromDecimals)

    if ((fromToken === 'CRO' && toToken === WCRO_ADDRESS) || 
        (fromToken === WCRO_ADDRESS && toToken === 'CRO')) {
      return {
        dex: 'Native',
        price: amount,
        path: [fromToken, toToken],
        routerAddress: WCRO_ADDRESS,
        fromDecimals,
        toDecimals,
        tx: {
          to: WCRO_ADDRESS,
          data: fromToken === 'CRO' ? '0xd0e30db0' : '0x2e1a7d4d',
          value: fromToken === 'CRO' ? amountIn : BigInt(0)
        }
      }
    }

    let bestQuote: Quote = {
      dex: '',
      price: '0',
      path: [],
      routerAddress: '',
      fromDecimals: 0,
      toDecimals: 0
    }

    if (fromDecimals === 0 || toDecimals === 0) {
      console.warn('Invalid decimals detected:', { fromDecimals, toDecimals })
      throw new Error('Invalid token decimals')
    }

    const sortedDexes = Object.entries(DEX_CONFIG.contracts)
      .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999));

    for (const [dexName, dexConfig] of sortedDexes) {
      try {
        console.log(`Checking ${dexName} for quote...`)
        
        const router = new ethers.Contract(dexConfig.router, ROUTER_ABI, provider)
        const factory = new ethers.Contract(dexConfig.factory, FACTORY_ABI, provider)

        const routes = []

        const directPair = await factory.getPair(actualFromToken, actualToToken)
        if (directPair !== ethers.ZeroAddress) {
          routes.push([actualFromToken, actualToToken])
        }

        const isFromStablecoin = Object.values(STABLECOINS).includes(actualFromToken.toLowerCase())
        const isToStablecoin = Object.values(STABLECOINS).includes(actualToToken.toLowerCase())
        
        if (isFromStablecoin && isToStablecoin) {
          const intermediaries = [
            STABLECOIN_INTERMEDIARY[0],
            STABLECOIN_INTERMEDIARY[1]
          ]

          for (const intermediary of intermediaries) {
            if (intermediary !== actualFromToken && intermediary !== actualToToken) {
              const fromIntermediaryPair = await factory.getPair(actualFromToken, intermediary)
              const toIntermediaryPair = await factory.getPair(intermediary, actualToToken)
              
              if (fromIntermediaryPair !== ethers.ZeroAddress && 
                  toIntermediaryPair !== ethers.ZeroAddress) {
                routes.push([actualFromToken, intermediary, actualToToken])
              }
            }
          }
        }
        else if (actualFromToken !== WCRO_ADDRESS && actualToToken !== WCRO_ADDRESS) {
          const fromWCROPair = await factory.getPair(actualFromToken, WCRO_ADDRESS)
          const toWCROPair = await factory.getPair(WCRO_ADDRESS, actualToToken)
          
          if (fromWCROPair !== ethers.ZeroAddress && toWCROPair !== ethers.ZeroAddress) {
            routes.push([actualFromToken, WCRO_ADDRESS, actualToToken])
          }
        }

        if (isStablecoin(actualFromToken) && isStablecoin(actualToToken)) {
          const usdtPath = [actualFromToken, USDT_ADDRESS, actualToToken]
          if (await validatePath(usdtPath, factory)) {
            routes.push(usdtPath)
          }
        }

        if (routes.length === 0) {
          const wcroPath = [actualFromToken, WCRO_ADDRESS, actualToToken]
          if (await validatePath(wcroPath, factory)) {
            routes.push(wcroPath)
          }
        }

        for (const path of routes) {
          try {
            const amounts = await router.getAmountsOut(amountIn, path)
            const amountOut = amounts[amounts.length - 1]
            
            let formattedAmount: string
            if (Object.values(STABLECOINS).includes(actualToToken.toLowerCase())) {
              formattedAmount = ethers.formatUnits(amountOut, 6)
            } else {
              formattedAmount = ethers.formatUnits(amountOut, toDecimals)
            }

            console.log('Quote details:', {
              dex: dexName,
              path,
              amountIn: formattedAmount,
              amountOut: formattedAmount,
              rawAmountOut: amountOut.toString(),
              fromDecimals,
              toDecimals
            });

            const isFromUSDC = path[0].toLowerCase() === USDC_ADDRESS.toLowerCase()
            const isToCRO = path[path.length - 1].toLowerCase() === WCRO_ADDRESS.toLowerCase() || path[path.length - 1] === 'CRO'
            const isFromUSDT = path[0].toLowerCase() === USDT_ADDRESS.toLowerCase()
            const isToDAI = path[path.length - 1].toLowerCase() === DAI_ADDRESS.toLowerCase()
            
            if (isFromUSDC && isToCRO) {
              formattedAmount = ethers.formatUnits(amountOut, 18)
            } else if (isFromUSDT && isToDAI) {
              formattedAmount = ethers.formatUnits(amountOut, 18)
            } else {
              formattedAmount = ethers.formatUnits(amountOut, toDecimals)
            }

            console.log(`Quote from ${dexName}:`, {
              path,
              amountIn: amount,
              amountOut: formattedAmount,
              rawAmountOut: amountOut.toString(),
              decimals: toDecimals
            })

            if (Number(formattedAmount) > Number(bestQuote.price)) {
              bestQuote = {
                dex: dexName,
                price: formattedAmount,
                path: path,
                routerAddress: dexConfig.router,
                fromDecimals,
                toDecimals,
                tx: {
                  to: dexConfig.router,
                  data: router.interface.encodeFunctionData(
                    fromToken === 'CRO' ? 'swapExactETHForTokens' :
                    toToken === 'CRO' ? 'swapExactTokensForETH' :
                    'swapExactTokensForTokens',
                    fromToken === 'CRO' ? [
                      0, 
                      path,
                      userAddress,
                      Math.floor(Date.now() / 1000) + 1200
                    ] : [
                      amountIn,
                      0,
                      path,
                      userAddress,
                      Math.floor(Date.now() / 1000) + 1200
                    ]
                  ),
                  value: fromToken === 'CRO' ? amountIn : BigInt(0)
                }
              }
            }
          } catch (routeError) {
            console.warn(`Failed to get quote for path in ${dexName}:`, {
              path,
              error: routeError
            })
          }
        }
      } catch (error) {
        console.warn(`Error getting quote from ${dexName}:`, error)
        continue
      }
    }

    if (bestQuote.price === '0' || !bestQuote.dex) {
      throw new Error(`No quotes available for ${fromToken} → ${toToken}`)
    }

    // Detectar problemas en los tokens
    const warnings = await detectProblematicToken(actualFromToken)
    bestQuote.warnings = warnings

    return bestQuote
  } catch (error) {
    const errorDetails = {
      fromToken,
      toToken,
      amount,
      userAddress,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    };
    
    console.error('Error getting best quote:', errorDetails);
    throw new SwapError(
      `No quotes available for ${fromToken} → ${toToken}`,
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

export async function checkAllowance(
  tokenAddress: string,
  walletAddress: string,
  spenderAddress: string,
  amount: string
): Promise<boolean> {
  if (tokenAddress === 'CRO') return true;
  
  try {
    const web3Provider = new ethers.BrowserProvider(window.ethereum!)
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, web3Provider)
    
    const [decimals, allowance] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.allowance(walletAddress, spenderAddress)
    ])

    const requiredAmount = ethers.parseUnits(amount, decimals)
    return allowance >= requiredAmount
  } catch (error) {
    console.error('Error checking allowance:', error)
    return false
  }
}

export async function getTokenPriceUSD(tokenAddress: string): Promise<number> {
  try {
    console.log('Getting price from liquidity pools for:', tokenAddress)
    const provider = await getProvider()
    const router = new ethers.Contract(
      DEX_CONFIG.contracts.vvs.router,
      ROUTER_ABI,
      provider
    )
    
    if (tokenAddress === 'CRO' || tokenAddress.toLowerCase() === WCRO_ADDRESS.toLowerCase()) {
      const path = [WCRO_ADDRESS, USDT_ADDRESS]
      const amountIn = ethers.parseEther('1')
      const amounts = await router.getAmountsOut(amountIn, path)
      const price = Number(ethers.formatUnits(amounts[1], 6))
      
      console.log('Price CRO/USDT:', price)
      if (!price || price <= 0 || !isFinite(price)) {
        throw new Error(`Invalid price from pool for CRO: ${price}`)
      }
      return price
    }
 
    const stablecoins = {
      '0x66e428c3f67a68878562e79a0234c1f83c208770': 1.0,
      '0xc21223249ca28397b4b6541dffaecc539bff0c59': 1.0,
      '0x87efb3ec1576dec8ed47e58b832bedcd86ee186e': 1.0,
      '0xf2001b145b43032aaf5ee2884e456ccd805f677d': 1.0 
    }
    
    const normalizedAddress = tokenAddress.toLowerCase()
    if (normalizedAddress in stablecoins) {
      return stablecoins[normalizedAddress as keyof typeof stablecoins]
    }
    
    const isStablecoinAddress = (address: string): boolean => {
      return STABLECOIN_ADDRESSES.includes(address.toLowerCase())
    }

    const path = [
      tokenAddress, 
      isStablecoinAddress(tokenAddress) ? STABLECOIN_INTERMEDIARY[0] : '0x66e428c3f67a68878562e79a0234c1f83c208770'
    ]
    const amountIn = ethers.parseEther('1')
    
    try {
      const amounts = await router.getAmountsOut(amountIn, path)
      const price = Number(ethers.formatUnits(amounts[1], 6))
      
      console.log(`Price ${tokenAddress}/USDT:`, price)
      if (!price || price <= 0 || !isFinite(price)) {
        throw new Error(`Invalid price from pool: ${price}`)
      }
      return price
    } catch {
      
      console.log('Trying route via CRO')
      const pathViaCRO = [
        tokenAddress,
        WCRO_ADDRESS,
        '0x66e428c3f67a68878562e79a0234c1f83c208770'
      ]
      
      const amounts = await router.getAmountsOut(amountIn, pathViaCRO)
      const price = Number(ethers.formatUnits(amounts[2], 6))
      
      console.log(`Price ${tokenAddress}/USDT via CRO:`, price)
      if (!price || price <= 0 || !isFinite(price)) {
        throw new Error(`Invalid price from CRO pool: ${price}`)
      }
      return price
    }
  } catch (error) {
    console.error('Error getting price from liquidity pools:', {
      token: tokenAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw new Error(`Could not get price from liquidity pools for ${tokenAddress}`)
  }
}

class SwapError extends Error {
  constructor(message: string, public details?: SwapErrorDetails) {
    super(message);
    this.name = 'SwapError';
  }
}

interface EthereumError extends Error {
  code: number | string;
  action?: string;
  reason?: string;
}

export async function executeSwap(
  quote: Quote,
  signer: JsonRpcSigner
): Promise<TransactionResponse> {
  try {
    if (!quote?.tx) {
      throw new SwapError('Invalid or incomplete quote')
    }

    const walletAddress = await signer.getAddress()
    
    if (quote.path[0] !== 'CRO') {
      const tokenContract = new Contract(quote.path[0], ERC20_ABI, signer)
      const [balance, allowance] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.allowance(walletAddress, quote.routerAddress)
      ])

      const iface = new Interface(ROUTER_ABI)
      const decodedData = iface.parseTransaction({ data: quote.tx.data })
      const requiredAmount = decodedData?.args?.[0] || BigInt(0)

      const isStablecoin = Object.values(STABLECOINS).includes(quote.path[0].toLowerCase())
      const decimals = isStablecoin ? 6 : await tokenContract.decimals()

      console.log('Balance check:', {
        balance: balance.toString(),
        required: requiredAmount.toString(),
        decimals,
        formattedBalance: ethers.formatUnits(balance, decimals),
        formattedRequired: ethers.formatUnits(requiredAmount, decimals)
      })

      if (balance < requiredAmount) {
        throw new SwapError('Not enough tokens')
      }

      if (allowance < requiredAmount) {
        try {
          const approveTx = await tokenContract.approve(
            quote.routerAddress,
            requiredAmount,
            { 
              gasLimit: 50000,
              gasPrice: (await getFeeData(signer)).gasPrice
            }
          )
          
          const receipt = await approveTx.wait()
          if (!receipt.status) {
            throw new SwapError('Approval transaction failed')
          }
          
          const newAllowance = await tokenContract.allowance(walletAddress, quote.routerAddress)
          if (newAllowance < requiredAmount) {
            throw new SwapError('Approval amount insufficient')
          }
        } catch (error) {
          if ((error as EthereumError).code === 4001) {
            throw new SwapError('User rejected approval')
          }
          throw new SwapError('Approval failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      }
    }

    type DexGasLimits = {
      [key in 'VVS' | 'MMF' | 'default']: {
        direct: bigint;
        withIntermediary: bigint;
      }
    };

    const dexGasLimits: DexGasLimits = {
      'VVS': {
        direct: BigInt(150000),
        withIntermediary: BigInt(250000)
      },
      'MMF': {
        direct: BigInt(150000),
        withIntermediary: BigInt(250000)
      },
      'default': {
        direct: BigInt(150000),
        withIntermediary: BigInt(250000)
      }
    };

    const dexLimits = dexGasLimits[quote.dex as keyof DexGasLimits] || dexGasLimits.default;
    const gasLimit = quote.path.length === 2 ? dexLimits.direct : dexLimits.withIntermediary;

    const feeData = await signer.provider.getFeeData();
    if (!feeData.gasPrice) {
      throw new SwapError('Could not get gas price');
    }

    const txParams = {
      from: walletAddress,
      to: quote.tx.to,
      data: quote.tx.data,
      gasPrice: feeData.gasPrice,
      gasLimit: gasLimit,
      value: quote.tx.value || "0x0"
    };

    console.log('Sending transaction with params:', {
      dex: quote.dex,
      pathLength: quote.path.length,
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice.toString()
    });

    try {
      const transaction = await signer.sendTransaction(txParams);
      const receipt = await transaction.wait();
      
      if (!receipt) {
        throw new SwapError('No confirmation of the transaction received');
      }

      if (receipt.status === 0) {
        throw new SwapError(`Transaction failed: ${receipt.hash}`);
      }
      
      return transaction;

    } catch (error: unknown) {
      console.error('Error in swap:', error);
      if (typeof error === 'object' && error && 'code' in error && error.code === 'CALL_EXCEPTION') {
        throw new SwapError('Contract execution error. Insufficient gas.');
      }
      throw error;
    }

  } catch (error) {
    const errorDetails = {
      quote: {
        dex: quote.dex,
        path: quote.path,
        price: quote.price
      },
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    };
    
    console.error('Error executing swap:', errorDetails);
    
    if (error instanceof Error && 
        ((error as EthereumError).code === 4001 || 
         ((error as EthereumError).action === 'sendTransaction' && 
          (error as EthereumError).reason === 'rejected'))
    ) {
      throw error;
    }
    
    throw new SwapError('Error executing swap', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 

async function checkPairExists(
  factoryAddress: string, 
  token0: string, 
  token1: string,
  provider: ethers.Provider
): Promise<boolean> {
  try {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider)
    const pairAddress = await factory.getPair(token0, token1)
    return pairAddress !== ethers.ZeroAddress
  } catch (error) {
    console.error('Error checking pair:', error)
    return false
  }
}

export async function checkRoute(fromToken: string, toToken: string): Promise<boolean> {
  try {
    console.log('Verificando ruta para:', { fromToken, toToken })
    
    if ((fromToken === 'CRO' && toToken === WCRO_ADDRESS) || 
        (fromToken === WCRO_ADDRESS && toToken === 'CRO')) {
      return true
    }

    const normalizedFromToken = fromToken === 'CRO' ? WCRO_ADDRESS : fromToken
    const normalizedToToken = toToken === 'CRO' ? WCRO_ADDRESS : toToken

    if (normalizedFromToken === normalizedToToken) {
      return false
    }

    const provider = await getProvider()

    for (const [dexName, dexConfig] of Object.entries(DEX_CONFIG.contracts)) {
      try {
        const router = new ethers.Contract(dexConfig.router, ROUTER_ABI, provider)
        const factory = await router.factory()
        
        const pairExists = await checkPairExists(
          factory,
          normalizedFromToken,
          normalizedToToken,
          provider
        )

        if (pairExists) {
          console.log(`Par encontrado en ${dexName}:`, {
            from: normalizedFromToken,
            to: normalizedToToken
          })
          return true
        }

        if (normalizedFromToken !== WCRO_ADDRESS && normalizedToToken !== WCRO_ADDRESS) {
          try {
            const [hasFromWCROPair, hasToWCROPair] = await Promise.all([
              checkPairExists(factory, normalizedFromToken, WCRO_ADDRESS, provider),
              checkPairExists(factory, WCRO_ADDRESS, normalizedToToken, provider)
            ]);
            
            if (hasFromWCROPair && hasToWCROPair) {
              console.log(`Found WCRO route in ${dexName}`);
              return true;
            }
          } catch (error) {
            console.warn(`Error verifying WCRO pairs in ${dexName}:`, error);
          }
        }

    const response = await fetch(`/api/routes/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromToken: normalizedFromToken,
        toToken: normalizedToToken
      })
    })

    if (!response.ok) {
      console.error('Error verifying route in DB:', await response.json())
      return false
    }

    const { enabled } = await response.json()
    return enabled
  } catch (error) {
    console.warn(`Error verifying in ${dexName}:`, error)
    continue
  }
}

return false
} catch (error) {
console.error('Error checking route:', error)
return false
}
}

interface QuoteParams {
  fromToken: string
  toToken: string
  amount: string
  userAddress: string
}

interface Route {
  path: string[]
  dex: string
}

interface QuoteResult {
  price: string
  path: string[]
  dex: string
  estimatedGas: bigint
}

export class QuoteService {
  private readonly provider: ethers.Provider
  private readonly INTERMEDIATE_TOKENS = [
    WCRO_ADDRESS,
    USDT_ADDRESS,
    USDC_ADDRESS,
    DAI_ADDRESS,
    TUSD_ADDRESS
  ]

  private routeCache: Map<string, Route[]> = new Map()
  
  private getCacheKey(fromToken: string, toToken: string): string {
    return `${fromToken.toLowerCase()}-${toToken.toLowerCase()}`
  }

  constructor(provider: ethers.Provider) {
    this.provider = provider
  }

  private isStablecoin(address: string): boolean {
    return STABLECOIN_ADDRESSES.includes(address.toLowerCase())
  }

  private async checkIntermediateRoutes(params: QuoteParams): Promise<Route[]> {
    const routes: Route[] = []
    const checkedPairs = new Set<string>()

    const normalizedFromToken = this.normalizeAddress(params.fromToken)
    const normalizedToToken = this.normalizeAddress(params.toToken)

    for (const [dexName, dexConfig] of Object.entries(DEX_CONFIG.contracts)) {
      try {
        const factory = new ethers.Contract(dexConfig.factory, FACTORY_ABI, this.provider)
        const directPair = await factory.getPair(normalizedFromToken, normalizedToToken)
        
        if (directPair !== ethers.ZeroAddress) {
          routes.push({
            path: [normalizedFromToken, normalizedToToken],
            dex: dexName
          })
        }
      } catch (dexError) {
        console.warn(`Error checking direct pair in ${dexName}:`, dexError)
      }
    }

    for (const intermediateToken of this.INTERMEDIATE_TOKENS) {
      if (intermediateToken === params.fromToken || 
          intermediateToken === params.toToken) {
        continue
      }

      for (const [dexName, dexConfig] of Object.entries(DEX_CONFIG.contracts)) {
        const pairKey = `${dexName}-${params.fromToken}-${intermediateToken}-${params.toToken}`
        if (checkedPairs.has(pairKey)) continue
        
        try {
          const factory = new ethers.Contract(dexConfig.factory, FACTORY_ABI, this.provider)
          const [firstPair, secondPair] = await Promise.all([
            factory.getPair(params.fromToken, intermediateToken),
            factory.getPair(intermediateToken, params.toToken)
          ])

          if (firstPair !== ethers.ZeroAddress && secondPair !== ethers.ZeroAddress) {
            routes.push({
              path: [params.fromToken, intermediateToken, params.toToken],
              dex: dexName
            })
          }
          
          checkedPairs.add(pairKey)
        } catch (error) {
          console.warn(`Error checking intermediate route in ${dexName}:`, error)
        }
      }
    }

    for (const intermediateToken of this.INTERMEDIATE_TOKENS) {
      for (const [dex1Name, dex1Config] of Object.entries(DEX_CONFIG.contracts)) {
        for (const [dex2Name, dex2Config] of Object.entries(DEX_CONFIG.contracts)) {
          if (dex1Name === dex2Name) continue
          
          const crossDexKey = `${dex1Name}-${dex2Name}-${params.fromToken}-${intermediateToken}-${params.toToken}`
          if (checkedPairs.has(crossDexKey)) continue

          try {
            const factory1 = new ethers.Contract(dex1Config.factory, FACTORY_ABI, this.provider)
            const factory2 = new ethers.Contract(dex2Config.factory, FACTORY_ABI, this.provider)

            const [firstPair, secondPair] = await Promise.all([
              factory1.getPair(params.fromToken, intermediateToken),
              factory2.getPair(intermediateToken, params.toToken)
            ])

            if (firstPair !== ethers.ZeroAddress && secondPair !== ethers.ZeroAddress) {
              routes.push({
                path: [params.fromToken, intermediateToken, params.toToken],
                dex: `${dex1Name}+${dex2Name}`
              })
            }

            checkedPairs.add(crossDexKey)
          } catch (error) {
            console.warn(`Error checking cross-DEX route ${dex1Name}-${dex2Name}:`, error)
          }
        }
      }
    }

    return routes
  }

  private async getValidRoutes(params: QuoteParams): Promise<Route[]> {
    const normalizedFromToken = this.normalizeAddress(params.fromToken)
    const normalizedToToken = this.normalizeAddress(params.toToken)
    const cacheKey = this.getCacheKey(normalizedFromToken, normalizedToToken)
    
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!
    }

    const routes: Route[] = []
    
    const directRoute = await checkRoute(params.fromToken, params.toToken)
    if (directRoute) {
      routes.push({
        path: [params.fromToken, params.toToken],
        dex: 'direct'
      })
    }
    
    const intermediateRoutes = await this.checkIntermediateRoutes(params)
    routes.push(...intermediateRoutes)
    
    console.log('Valid routes found:', routes.length, {
      direct: routes.filter(r => r.dex === 'direct').length,
      split: routes.filter(r => r.dex === 'split').length
    })
    
    this.routeCache.set(cacheKey, routes)
    return routes
  }

  private async getQuoteForRoute(route: Route, params: QuoteParams): Promise<QuoteResult> {
    const { fromToken, toToken, amount } = params
    
    try {
      const quote = await getBestQuote(fromToken, toToken, amount, params.userAddress)
      return {
        price: quote.price,
        path: quote.path,
        dex: quote.dex,
        estimatedGas: quote.tx?.gasLimit || BigInt(0)
      }
    } catch (error) {
      console.error('Error getting quote for route:', error)
      throw error
    }
  }

  private selectBestQuote(quotes: QuoteResult[]): QuoteResult {
    if (quotes.length === 0) {
      throw new Error('No quotes available')
    }
    
    return quotes.reduce((best, current) => {
      return Number(current.price) > Number(best.price) ? current : best
    })
  }

  async getBestQuote(params: QuoteParams): Promise<QuoteResult> {
    const routes = await this.getValidRoutes(params)
    if (routes.length === 0) {
      throw new Error('No valid routes found')
    }

    const quotes = await Promise.all(
      routes.map(route => this.getQuoteForRoute(route, params))
    )

    return this.selectBestQuote(quotes)
  }

  private async getQuoteForDex(
    dexName: string, 
    params: QuoteParams
  ): Promise<QuoteResult | null> {
    try {
      const dexConfig = DEX_CONFIG.contracts[dexName]
      if (!dexConfig?.router) return null

      const normalizedFromToken = this.normalizeAddress(params.fromToken)
      const normalizedToToken = this.normalizeAddress(params.toToken)
      const router = new ethers.Contract(dexConfig.router, ROUTER_ABI, this.provider)
      
      const [fromDecimals, toDecimals] = await Promise.all([
        this.getTokenDecimals(normalizedFromToken),
        this.getTokenDecimals(normalizedToToken)
      ])

      console.log('Decimals for quote:', {
        dex: dexName,
        fromToken: normalizedFromToken,
        fromDecimals,
        toToken: normalizedToToken, 
        toDecimals,
        amount: params.amount
      })

      if (this.isStablecoin(normalizedFromToken) && this.isStablecoin(normalizedToToken)) {
        try {
          const amountIn = ethers.parseUnits(params.amount, fromDecimals)
          const amounts = await router.getAmountsOut(
            amountIn,
            [normalizedFromToken, USDT_ADDRESS, normalizedToToken]
          )
          return {
            price: ethers.formatUnits(amounts[2], toDecimals),
            path: [params.fromToken, USDT_ADDRESS, params.toToken],
            dex: dexName,
            estimatedGas: BigInt(450000)
          }
        } catch {
          console.log(`Stablecoin route failed in ${dexName}, trying direct route`)
        }
      }

      try {
        const amountIn = ethers.parseUnits(params.amount, fromDecimals)
        const amounts = await router.getAmountsOut(
          amountIn,
          [normalizedFromToken, normalizedToToken]
        )
        return {
          price: ethers.formatUnits(amounts[1], toDecimals),
          path: [params.fromToken, params.toToken],
          dex: dexName,
          estimatedGas: BigInt(300000)
        }
      } catch {
        console.log(`Direct route failed in ${dexName}, trying WCRO route`)
      }

      if (normalizedFromToken !== WCRO_ADDRESS && normalizedToToken !== WCRO_ADDRESS) {
        try {
          const amountIn = ethers.parseUnits(params.amount, fromDecimals)
          const amounts = await router.getAmountsOut(
            amountIn,
            [normalizedFromToken, WCRO_ADDRESS, normalizedToToken]
          )
          return {
            price: ethers.formatUnits(amounts[2], toDecimals),
            path: [params.fromToken, WCRO_ADDRESS, params.toToken],
            dex: dexName,
            estimatedGas: BigInt(450000)
          }
        } catch {
          console.warn(`All routes failed in ${dexName}`)
        }
      }

      return null
    } catch (error) {
      console.warn(`General error in ${dexName}:`, error)
      return null
    }
  }

  private normalizeAddress(address: string): string {
    if (address === 'CRO') return WCRO_ADDRESS;
    
    try {
      return ethers.getAddress(address);
    } catch (error) {
      console.warn(`Invalid address format: ${address}, error:`, error);
      return address;
    }
  }

  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    const normalizedAddress = tokenAddress.toLowerCase();
    const cached = KNOWN_DECIMALS[normalizedAddress];
    
    if (cached && Date.now() - cached.lastUpdated < 24 * 60 * 60 * 1000) {
      return cached.decimals;
    }
    
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        this.provider
      );
      const decimals = await tokenContract.decimals();
      
      KNOWN_DECIMALS[normalizedAddress] = {
        decimals,
        lastUpdated: Date.now()
      };
      return decimals;
    } catch (error) {
      console.warn(`Error getting decimals for ${tokenAddress}, using 18 by default:`, error);
      return 18;
    }
  }
}

async function validatePath(path: string[], factory: ethers.Contract): Promise<boolean> {
  try {
    for (let i = 0; i < path.length - 1; i++) {
      const pair = await factory.getPair(path[i], path[i + 1])
      if (pair === ethers.ZeroAddress) return false
    }
    return true
  } catch (error) {
    console.error('Error validating path:', error)
    return false
  }
}

async function getTokenDecimals(tokenAddress: string, provider: ethers.Provider): Promise<number> {
  const normalizedAddress = tokenAddress.toLowerCase();
  const cached = KNOWN_DECIMALS[normalizedAddress];
  
  if (cached && Date.now() - cached.lastUpdated < 24 * 60 * 60 * 1000) {
    return cached.decimals;
  }
  
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function decimals() view returns (uint8)'],
      provider
    );
    const decimals = await tokenContract.decimals();
    
    KNOWN_DECIMALS[normalizedAddress] = {
      decimals,
      lastUpdated: Date.now()
    };
    return decimals;
  } catch (error) {
    console.warn(`Error getting decimals for ${tokenAddress}, using 18 by default:`, error);
    return 18;
  }
}

function isStablecoin(address: string): boolean {
  return STABLECOIN_ADDRESSES.includes(address.toLowerCase());
}

async function normalizeAmount(
  amount: string,
  decimals: number | bigint,
  direction: 'parse' | 'format' = 'parse'
): Promise<string> {
  try {
    const normalizedDecimals = Number(decimals)
    
    if (direction === 'parse') {
      const parts = amount.split('.')
      const whole = parts[0]
      const fraction = parts[1] || ''
      
      const adjustedFraction = fraction.slice(0, normalizedDecimals).padEnd(normalizedDecimals, '0')
      
      return ethers.formatUnits(
        ethers.parseUnits(`${whole}${adjustedFraction ? '.' + adjustedFraction : ''}`, normalizedDecimals),
        normalizedDecimals
      )
    } else {
      return ethers.formatUnits(
        ethers.parseUnits(amount, normalizedDecimals),
        normalizedDecimals
      )
    }
  } catch (error) {
    console.error('Error normalizing amount:', error)
    return amount
  }
}

const getFeeData = async (signer: JsonRpcSigner) => {
  const feeData = await signer.provider.getFeeData();
  return {
    gasPrice: feeData.gasPrice || BigInt(5000000000)
  };
};

export const detectProblematicToken = async (
  tokenAddress: string
): Promise<TokenWarning[]> => {
  try {
    const provider = await getProvider();
    const contract = new Contract(tokenAddress, PROBLEMATIC_TOKENS_ABI, provider);
    const warnings: TokenWarning[] = [];
    
    for (const signature of PROBLEMATIC_TOKENS_SIGNATURES) {
      try {
        const functionName = signature.split(' ')[1].split('(')[0];
        const result = await contract[functionName]();
        
        if (functionName.includes('burn')) {
          warnings.push({ 
            type: 'burn',
            message: 'This token can burn tokens on transfers',
            canBurn: true
          });
        } else if (functionName.includes('tax')) {
          warnings.push({
            type: 'tax',
            message: `This token has a tax fee of ${result.toString()}%`,
            taxFee: Number(result)
          });
        } else {
          warnings.push({ 
            type: 'high_gas',
            message: 'This token may require extra gas for transactions'
          });
        }
      } catch {
        continue;
      }
    }
    return warnings;
  } catch {
    return [];
  }
};