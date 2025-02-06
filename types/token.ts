export interface TokenRoute {
  id: string;
  fromTokenId: string;
  toTokenId: string;
  isEnabled: boolean;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  price?: number;
}

export interface CreateTokenInput {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  chainId: number;
  coingeckoId?: string;
  listingFee?: number;
}

export interface UpdateTokenInput {
  isWhitelisted?: boolean;
  listingFee?: number;
  logoURI?: string;
  coingeckoId?: string;
}

export interface TokenWithRoutes {
  id: string;
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  isWhitelisted: boolean;
  logoURI: string | null;
  fromRoutes: TokenRoute[];
  toRoutes: TokenRoute[];
}