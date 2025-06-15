/* eslint-disable */
const { ethers } = require('hardhat');

async function main() {
  const signers = await ethers.getSigners();
  console.log('🔍 DIAGNÓSTICO DE CUENTAS DISPONIBLES');
  console.log('='.repeat(50));
  console.log(`Total cuentas: ${signers.length}`);
  
  for (let i = 0; i < Math.min(signers.length, 10); i++) {
    const balance = await signers[i].getBalance();
    console.log(`${i}: ${signers[i].address} - ${ethers.utils.formatEther(balance)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
