import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@nomicfoundation/hardhat-verify"
import "@nomicfoundation/hardhat-ethers"
import "@nomicfoundation/hardhat-ignition"
import "@nomicfoundation/hardhat-ignition-ethers"
import 'dotenv/config'

const privateKey = process.env.PRIVATE_KEY

if (!privateKey) {
  console.warn("⚠️ Please set PRIVATE_KEY in the .env file")
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    cronos: {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: privateKey ? [privateKey] : []
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: privateKey ? [privateKey] : []
    }
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      cronos: process.env.CRONOSCAN_API_KEY || "",
      cronosTestnet: process.env.CRONOSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/api",
          browserURL: "https://cronoscan.com"
        }
      },
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://api-testnet.cronoscan.com/api",
          browserURL: "https://testnet.cronoscan.com"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}

export default config