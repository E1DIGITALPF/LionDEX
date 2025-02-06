import hre from "hardhat";
import 'dotenv/config';

async function main() {
  const ROUTER_ADDRESSES = {
    cronos: "0x145677FC4d9b8F19B5D56d1820c48e0443049a30",
    cronosTestnet: "0x2fFAa0794bf59cA14F268A7511cB6565D55ed40b"
  };

  const network = hre.network.name;
  const BASE_ROUTER = ROUTER_ADDRESSES[network];

  if (!BASE_ROUTER) {
    throw new Error(`No router address configured for the ${network} network`);
  }

  console.log("Deploying CustomRouter...");
  console.log("Network:", network);
  console.log("Base router:", BASE_ROUTER);
  
  try {
    const [deployer] = await hre.ethers.getSigners();
    if (!deployer) {
      throw new Error("Could not get deployer account");
    }
    console.log("Deploying with account:", deployer.address);

    const CustomRouter = await hre.ethers.getContractFactory("CustomRouter");
    console.log("Estimating gas for deployment...");
    
    const router = await CustomRouter.deploy(BASE_ROUTER, {
      gasLimit: 5000000
    });
    
    await router.waitForDeployment();

    const routerAddress = await router.getAddress();
    console.log("CustomRouter deployed at:", routerAddress);

    if (process.env.CRONOSCAN_API_KEY) {
      console.log("Verifying contract...");
      try {
        await hre.run("verify:verify", {
          address: routerAddress,
          constructorArguments: [BASE_ROUTER],
        });
      } catch (error) {
        console.log("Error verifying contract:", error.message);
      }
    }
  } catch (error) {
    console.error("Detailed error:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 