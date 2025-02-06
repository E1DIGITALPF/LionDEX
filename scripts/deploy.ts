import { ethers, run } from "hardhat"
import type { FeeManager, FeeManagerFactory } from "@/types/contracts"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying contracts with the account:", deployer.address)

  const initialCollector = process.env.INITIAL_FEE_COLLECTOR || deployer.address
  const initialFeePercentage = 100

  const FeeManager = await ethers.getContractFactory("FeeManager") as unknown as FeeManagerFactory
  const feeManager = await FeeManager.deploy(initialCollector, initialFeePercentage) as FeeManager
  await feeManager.waitForDeployment()

  const feeManagerAddress = await feeManager.getAddress()
  console.log("FeeManager deployed to:", feeManagerAddress)

  if (process.env.CRONOSCAN_API_KEY) {
    console.log("Verifying contract...")
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    try {
      await run("verify:verify", {
        address: feeManagerAddress,
        constructorArguments: [initialCollector, initialFeePercentage],
        contract: "contracts/FeeManager.sol:FeeManager"
      })
      console.log("Contract verified successfully")
    } catch (error) {
      console.error("Error verifying contract:", error)
    }
  }

  return { feeManagerAddress }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  }) 