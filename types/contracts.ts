import { BaseContract, ContractTransactionResponse, Signer } from "ethers"

export interface FeeManager extends BaseContract {
  feeCollector(): Promise<string>
  feePercentage(): Promise<bigint>
  calculateFee(amount: bigint): Promise<bigint>
  setFeeCollector(newCollector: string): Promise<ContractTransactionResponse>
  setFeePercentage(newPercentage: number): Promise<ContractTransactionResponse>
  owner(): Promise<string>
  connect(signer: Signer): FeeManager
}

export interface FeeManagerFactory {
  deploy(collector: string, initialFee: number): Promise<FeeManager>
  connect(address: string, signer: Signer): FeeManager
} 