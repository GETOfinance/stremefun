require("@nomicfoundation/hardhat-toolbox");

// Default private key for local development only - DO NOT USE IN PRODUCTION
const DEFAULT_PRIVATE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // known test key

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { 
    version:"0.8.26",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 2000,
      },
    }
  },
  defaultNetwork: "aurora_testnet",
  networks: {
    hardhat: {
      accounts: [{ privateKey: DEFAULT_PRIVATE_KEY, balance: "10000000000000000000000"}],
      forking: {
        url: "https://testnet.aurora.dev",
        ignoreUnknownTxType: true,
      },
    },
    aurora_testnet: {
      url: "https://testnet.aurora.dev",
      accounts: [DEFAULT_PRIVATE_KEY],
      chainId: 1313161555,
      gasMultiplier: 2,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [DEFAULT_PRIVATE_KEY],
    }
  },
  etherscan: {
    apiKey: {
      aurora_testnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "aurora_testnet",
        chainId: 1313161555,
        urls: {
         apiURL: "https://explorer.testnet.aurora.dev/api",
         browserURL: "https://explorer.testnet.aurora.dev"
        }
      }
    ]
  }
};
