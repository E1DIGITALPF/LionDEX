import { ContractTransactionResponse } from "ethers"

export interface TokenPrice {
    usd: number;
    timestamp: number;
  }
  
  export interface PriceResponse {
    [tokenAddress: string]: TokenPrice;
  }

  export interface Quote {
    price: string
    priceImpact: string
    guaranteedPrice: string
    to: string
    data: string
    value: string
    gas: string
    estimatedGas: string
    gasPrice: string
    protocolFee: string
    minimumProtocolFee: string
    buyTokenAddress: string
    sellTokenAddress: string
    buyAmount: string
    sellAmount: string
    sources: Array<{
      name: string
      proportion: string
    }>
    tx?: {
      from?: string;
      to?: string;
      data?: string;
      value?: string;
      gasPrice?: bigint;
      hash?: string;
      wait?: () => Promise<ContractTransactionResponse>;
    }
  }