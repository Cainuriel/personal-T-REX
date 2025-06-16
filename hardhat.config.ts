/* eslint-disable */
import '@xyrusworx/hardhat-solidity-json';
import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';
import { config as dotenvConfig } from '@dotenvx/dotenvx';

// Cargar variables de entorno
dotenvConfig();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: true,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },  
 networks: {
   
    taycan: {
      url: "http://5.250.188.118:8545",
      accounts: [
        process.env.ADMIN_WALLET_PRIV_KEY,
        process.env.INVESTOR1_PRIV_KEY,
        process.env.INVESTOR2_PRIV_KEY
      ].filter((key): key is string => !!key),
      timeout: 300000, 
    },
       
    alastria: {
          url: "http://108.142.237.13:8545",
          accounts: [
            process.env.ADMIN_WALLET_PRIV_KEY,
            process.env.INVESTOR1_PRIV_KEY,
            process.env.INVESTOR2_PRIV_KEY
          ].filter((key): key is string => !!key),
    
        },  
      },
};

export default config;
