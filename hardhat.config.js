import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import 'dotenv/config';

const privateKey = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
    cronos: {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: [privateKey]
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: [privateKey]
    }
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
  }
};