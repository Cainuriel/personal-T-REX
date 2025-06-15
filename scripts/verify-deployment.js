/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 Verificando despliegue de T-REX Suite...\n');
  
  // Intentar cargar el último despliegue desde JSON
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  const manualLatestPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
  
  let deploymentData = null;
  let tokenAddress = null;
  
  if (fs.existsSync(factoryLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    tokenAddress = deploymentData.core.token;
    console.log(`📁 Cargado desde: factory-deployment-latest.json`);
  } else if (fs.existsSync(manualLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
    tokenAddress = deploymentData.core.token;
    console.log(`📁 Cargado desde: manual-deployment-latest.json`);
  } else {
    console.log('❌ No se encontraron archivos de despliegue en deployments/');
    console.log('💡 Ejecuta primero: npm run deploy:simple o npm run deploy:manual');
    return;
  }
  
  try {
    // Conectar al token
    const token = await ethers.getContractAt('Token', tokenAddress);
    
    // Información básica del token
    console.log('📋 INFORMACIÓN DEL TOKEN:');
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const owner = await token.owner();
    
    console.log(`   Nombre: ${name}`);
    console.log(`   Símbolo: ${symbol}`);
    console.log(`   Decimales: ${decimals}`);
    console.log(`   Owner: ${owner}`);
    
    // Verificar contratos relacionados
    console.log('\n🔗 CONTRATOS RELACIONADOS:');
    const identityRegistry = await token.identityRegistry();
    const compliance = await token.compliance();
    
    console.log(`   Identity Registry: ${identityRegistry}`);
    console.log(`   Compliance: ${compliance}`);
    
    // Verificar que coinciden con el JSON
    console.log('\n✅ VERIFICACIÓN CONTRA JSON:');
    console.log(`   Identity Registry: ${identityRegistry === deploymentData.core.identityRegistry ? '✅' : '❌'}`);
    console.log(`   Compliance: ${compliance === deploymentData.core.compliance ? '✅' : '❌'}`);
    
    // Verificar paused state
    const isPaused = await token.paused();
    console.log(`\n🏃 Estado: ${isPaused ? 'Pausado ⏸️' : 'Activo ✅'}`);
    
    // Verificar total supply
    const totalSupply = await token.totalSupply();
    console.log(`💰 Total Supply: ${ethers.utils.formatEther(totalSupply)} ${symbol}`);
    
    // Mostrar resumen del despliegue
    console.log('\n📊 RESUMEN DEL DESPLIEGUE:');
    console.log(`   Método: ${deploymentData.deploymentMethod}`);
    console.log(`   Red: ${deploymentData.network.name} (Chain ID: ${deploymentData.network.chainId})`);
    console.log(`   Timestamp: ${new Date(deploymentData.timestamp).toLocaleString()}`);
    console.log(`   Deployer: ${deploymentData.deployer}`);
    
    console.log('\n✅ ¡Verificación completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
