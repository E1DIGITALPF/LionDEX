interface EthereumRequest {
  method: string;
  params?: unknown[];
}

interface Ethereum {
  request: (args: EthereumRequest) => Promise<unknown>;
  on: (event: string, callback: (args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (args: unknown[]) => void) => void;
}

interface Window {
  ethereum?: Ethereum;
} 