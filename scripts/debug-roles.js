/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 DIAGNÓSTICO DE ROLES Y PERMISOS');
  console.log('='.repeat(50));
  
  // Cargar deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  const deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
  
  // Conectar a contratos
  const token = await ethers.getContractAt('Token', deploymentData.core.token);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry);
  
  const [signer] = await ethers.getSigners();
  const address = signer.address;
  
  console.log(`👤 Cuenta: ${address}`);
  console.log(`📋 Token: ${token.address}`);
  console.log(`📋 Identity Registry: ${identityRegistry.address}`);
  
  console.log('\n🔍 VERIFICANDO ROLES EN TOKEN:');
  try {
    const isOwner = await token.owner();
    const isAgent = await token.isAgent(address);
    console.log(`   Owner del token: ${isOwner}`);
    console.log(`   Es dueño: ${isOwner.toLowerCase() === address.toLowerCase() ? 'SÍ' : 'NO'}`);
    console.log(`   Es Agent: ${isAgent ? 'SÍ' : 'NO'}`);
  } catch (error) {
    console.log(`   ❌ Error verificando roles en token: ${error.message}`);
  }
  
  console.log('\n🔍 VERIFICANDO ROLES EN IDENTITY REGISTRY:');
  try {
    const irOwner = await identityRegistry.owner();
    console.log(`   Owner del Identity Registry: ${irOwner}`);
    console.log(`   Es dueño: ${irOwner.toLowerCase() === address.toLowerCase() ? 'SÍ' : 'NO'}`);
  } catch (error) {
    console.log(`   ❌ Error verificando roles en Identity Registry: ${error.message}`);
  }
  
  console.log('\n🔍 INTENTANDO OPERACIONES:');
  try {
    console.log('   Probando addAgent en token...');
    const tx = await token.connect(signer).addAgent(address, {gasLimit: 100000});
    await tx.wait();
    console.log('   ✅ addAgent exitoso');
    
    const isAgentNow = await token.isAgent(address);
    console.log(`   Es Agent ahora: ${isAgentNow ? 'SÍ' : 'NO'}`);
  } catch (error) {
    console.log(`   ❌ Error en addAgent: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
