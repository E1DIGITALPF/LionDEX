export interface Token {
  id?: string
  symbol: string
  name: string
  address: string
  decimals: number
  chainId: number
  logoURI: string
  isWhitelisted?: boolean
  listingFee?: string | null
  createdAt?: string
  updatedAt?: string
}

const TOKEN_LIST_URLS = [
  'https://raw.githubusercontent.com/cronaswap/default-token-list/main/tokens.json',
  'https://raw.githubusercontent.com/VVS-finance/vvs-default-token-list/main/tokens.json',
  'https://raw.githubusercontent.com/MMFLabs/token-list/main/tokenlist.json'
]

export async function getAllTokens(): Promise<Token[]> {
  try {
    const responses = await Promise.all(
      TOKEN_LIST_URLS.map(url => fetch(url))
    )
    
    const tokenLists = await Promise.all(
      responses.map(res => res.json())
    )
    
    const uniqueTokens = new Map<string, Token>()
    
    tokenLists.forEach(list => {
      list.tokens.forEach((token: Token) => {
        if (token.chainId === 25) {
          uniqueTokens.set(token.address.toLowerCase(), token)
        }
      })
    })
    
    return Array.from(uniqueTokens.values())
  } catch (error) {
    console.error('Error fetching token lists:', error)
    throw error
  }
} 