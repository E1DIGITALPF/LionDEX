import { ethers } from 'ethers'
import { WCRO_ADDRESS } from '@/config/constants'

const WCRO_ABI = [
  "function deposit() payable",
  "function withdraw(uint256) external",
  "function approve(address spender, uint256 amount) external returns (bool)"
] as const

interface WCROInterface extends ethers.BaseContract {
  deposit(overrides?: { value: ethers.BigNumberish }): Promise<ethers.TransactionResponse>
  withdraw(amount: ethers.BigNumberish): Promise<ethers.TransactionResponse>
  approve(spender: string, amount: ethers.BigNumberish): Promise<ethers.TransactionResponse>
}

export async function wrapCRO(
  amount: string
): Promise<ethers.TransactionResponse> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const web3Provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await web3Provider.getSigner()
  
  const wcroContract = new ethers.Contract(
    WCRO_ADDRESS, 
    WCRO_ABI, 
    signer
  ) as unknown as WCROInterface
  
  const amountWei = ethers.parseEther(amount)
  return await wcroContract.deposit({ value: amountWei })
}

export async function unwrapCRO(
  amount: string
): Promise<ethers.TransactionResponse> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const web3Provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await web3Provider.getSigner()
  
  const wcroContract = new ethers.Contract(
    WCRO_ADDRESS, 
    WCRO_ABI, 
    signer
  ) as unknown as WCROInterface
  
  const amountWei = ethers.parseEther(amount)
  return await wcroContract.withdraw(amountWei)
}

export async function approveWCRO(
  spender: string,
  amount: string
): Promise<ethers.TransactionResponse> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const web3Provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await web3Provider.getSigner()
  
  const wcroContract = new ethers.Contract(
    WCRO_ADDRESS, 
    WCRO_ABI, 
    signer
  ) as unknown as WCROInterface
  
  const amountWei = ethers.parseEther(amount)
  return await wcroContract.approve(spender, amountWei)
} 