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
   
  
      },
  
};

export default config;
