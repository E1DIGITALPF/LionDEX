import { ethers, run } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying FeeManager with account:", deployer.address)

  const FeeManager = await ethers.getContractFactory("FeeManager")
  const feeManager = await FeeManager.deploy(
    deployer.address,
    100
  )

  await feeManager.waitForDeployment()
  const address = await feeManager.getAddress()
  console.log("FeeManager deployed to:", address)

  if (process.env.CRONOSCAN_API_KEY) {
    console.log("Verifying contract...")
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [deployer.address, 100],
        contract: "contracts/FeeManager.sol:FeeManager"
      })
      console.log("Contract verified successfully")
    } catch (error) {
      console.error("Error verifying contract:", error)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  }) 