/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * 🐛 SCRIPT DE DEBUG DE ROLES Y PERMISOS
 * 
 * Este script hace análisis detallado de roles en todos los contratos T-REX:
 * - Identifica problemas específicos de permisos
 * - Muestra quién tiene qué roles
 * - Verifica la coherencia de permisos entre contratos
 * 
 * CÓMO USARLO:
 * ===========
 * npm run debug-roles -- --network alastria
 * npx hardhat run scripts/debug-roles.js --network alastria
 */

async function main() {
  console.log('� INICIANDO DEBUG DE ROLES Y PERMISOS');
  console.log('='.repeat(60));
  
  // Verificar conectividad
  await checkNetworkConnectivity();
  
  // Obtener cuentas disponibles
  const signers = await ethers.getSigners();
  console.log(`\n👥 CUENTAS DISPONIBLES: ${signers.length}`);
  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    console.log(`   Signer ${i}: ${signers[i].address}`);
  }
  
  // Cargar contratos
  const contracts = await loadContractsFromDeployments();
  if (!contracts) {
    console.log('❌ No se encontraron deployments');
    return;
  }
  
  const { contracts: contractInstances, source, deploymentData } = contracts;
  console.log(`\n📄 Usando deployment: ${source}`);
  
  // Debug detallado de roles
  await debugDetailedRoles(contractInstances, deploymentData, signers);
  
  console.log('\n🎉 Debug de roles completado');
}

/**
 * Verificar conectividad con la red
 */
async function checkNetworkConnectivity() {
  console.log('\n🌐 VERIFICANDO CONECTIVIDAD');
  console.log('-'.repeat(40));
  
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const gasPrice = await ethers.provider.getGasPrice();
    
    console.log(`✅ Red: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`✅ Bloque actual: ${blockNumber}`);
    console.log(`✅ Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  } catch (error) {
    console.log('❌ Error de conectividad:', error.message);
    throw error;
  }
}

/**
 * Cargar contratos desde archivos de deployment
 */
async function loadContractsFromDeployments() {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const deploymentType = process.env.DEPLOYMENT_TYPE || 'factory';
  
  let deploymentPath;
  let source;
  
  if (deploymentType === 'factory') {
    deploymentPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
    source = 'factory-deployment-latest.json (DEPLOYMENT_TYPE=factory)';
  } else if (deploymentType === 'manual') {
    deploymentPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
    source = 'manual-deployment-latest.json (DEPLOYMENT_TYPE=manual)';
  } else {
    // Auto-detectar
    const factoryPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
    const manualPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
    
    if (fs.existsSync(factoryPath)) {
      deploymentPath = factoryPath;
      source = 'factory-deployment-latest.json (auto-detectado)';
    } else if (fs.existsSync(manualPath)) {
      deploymentPath = manualPath;
      source = 'manual-deployment-latest.json (auto-detectado)';
    } else {
      return null;
    }
  }
  
  if (!fs.existsSync(deploymentPath)) {
    return null;
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  // Cargar contratos
  const contracts = {
    token: await ethers.getContractAt('Token', deploymentData.core.token),
    identityRegistry: await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry),
    trustedIssuersRegistry: await ethers.getContractAt('TrustedIssuersRegistry', deploymentData.core.trustedIssuersRegistry),
    claimTopicsRegistry: await ethers.getContractAt('ClaimTopicsRegistry', deploymentData.core.claimTopicsRegistry),
    compliance: await ethers.getContractAt('ModularCompliance', deploymentData.core.compliance)
  };
  
  // Verificar que los contratos existan
  for (const [name, contract] of Object.entries(contracts)) {
    const code = await ethers.provider.getCode(contract.address);
    if (code === '0x') {
      console.log(`❌ Error: Contrato ${name} no existe en ${contract.address}`);
      return null;
    }
  }
  
  return { contracts, source, deploymentData };
}

/**
 * Debug detallado de roles en todos los contratos
 */
async function debugDetailedRoles(contracts, deploymentData, signers) {
  console.log('\n� DEBUG DETALLADO DE ROLES');
  console.log('-'.repeat(60));
  
  // Información del deployment
  console.log('\n�📋 INFORMACIÓN DEL DEPLOYMENT:');
  console.log(`   Deployer: ${deploymentData.deployer}`);
  console.log(`   Token Owner: ${deploymentData.tokenOwner || 'No definido'}`);
  console.log(`   Agent: ${deploymentData.agent || 'No definido'}`);
  console.log(`   Fecha: ${deploymentData.timestamp || 'No definida'}`);
  
  // Debug de cada contrato
  await debugTokenRoles(contracts.token, signers);
  await debugIdentityRegistryRoles(contracts.identityRegistry, signers);
  await debugTrustedIssuersRegistryRoles(contracts.trustedIssuersRegistry, signers);
  await debugClaimTopicsRegistryRoles(contracts.claimTopicsRegistry, signers);
  await debugComplianceRoles(contracts.compliance, signers);
  
  // Análisis de consistencia
  await analyzeRoleConsistency(contracts, deploymentData, signers);
}

/**
 * Debug de roles en el Token
 */
async function debugTokenRoles(token, signers) {
  console.log('\n🪙 TOKEN - ANÁLISIS DE ROLES');
  console.log('-'.repeat(40));
  console.log(`   📍 Dirección: ${token.address}`);
  
  try {
    // Owner
    const owner = await token.owner();
    console.log(`   👑 Owner: ${owner}`);
    
    // Agentes
    console.log('\n   🛡️  AGENTES:');
    const agentList = [];
    for (let i = 0; i < signers.length; i++) {
      try {
        const isAgent = await token.isAgent(signers[i].address);
        if (isAgent) {
          agentList.push(signers[i].address);
          console.log(`      ✅ ${signers[i].address} (Signer ${i})`);
        }
      } catch (error) {
        console.log(`      ❌ Error verificando ${signers[i].address}: ${error.message}`);
      }
    }
    
    if (agentList.length === 0) {
      console.log('      ⚠️  No se encontraron agentes entre los signers disponibles');
    }
    
    // Información adicional
    const isPaused = await token.paused();
    const totalSupply = await token.totalSupply();
    console.log(`\n   📊 Estado del Token:`);
    console.log(`      Pausado: ${isPaused ? '🟡 SÍ' : '🟢 NO'}`);
    console.log(`      Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`);
    
  } catch (error) {
    console.log(`   ❌ Error accediendo al Token: ${error.message}`);
  }
}

/**
 * Debug de roles en Identity Registry
 */
async function debugIdentityRegistryRoles(identityRegistry, signers) {
  console.log('\n🆔 IDENTITY REGISTRY - ANÁLISIS DE ROLES');
  console.log('-'.repeat(40));
  console.log(`   📍 Dirección: ${identityRegistry.address}`);
  
  try {
    // Owner
    const owner = await identityRegistry.owner();
    console.log(`   👑 Owner: ${owner}`);
    
    // Agentes
    console.log('\n   🛡️  AGENTES:');
    const agentList = [];
    for (let i = 0; i < signers.length; i++) {
      try {
        const isAgent = await identityRegistry.isAgent(signers[i].address);
        if (isAgent) {
          agentList.push(signers[i].address);
          console.log(`      ✅ ${signers[i].address} (Signer ${i})`);
        }
      } catch (error) {
        console.log(`      ❌ Error verificando ${signers[i].address}: ${error.message}`);
      }
    }
    
    if (agentList.length === 0) {
      console.log('      ⚠️  No se encontraron agentes entre los signers disponibles');
    }
    
    // Información adicional
    try {
      const topicsRegistry = await identityRegistry.topicsRegistry();
      const issuersRegistry = await identityRegistry.issuersRegistry();
      console.log(`\n   🔗 Conexiones:`);
      console.log(`      Topics Registry: ${topicsRegistry}`);
      console.log(`      Issuers Registry: ${issuersRegistry}`);
    } catch (error) {
      console.log(`   ⚠️  Error obteniendo conexiones: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error accediendo al Identity Registry: ${error.message}`);
  }
}

/**
 * Debug de roles en Trusted Issuers Registry
 */
async function debugTrustedIssuersRegistryRoles(trustedIssuersRegistry, signers) {
  console.log('\n🏛️  TRUSTED ISSUERS REGISTRY - ANÁLISIS DE ROLES');
  console.log('-'.repeat(40));
  console.log(`   📍 Dirección: ${trustedIssuersRegistry.address}`);
  
  try {
    // Owner
    const owner = await trustedIssuersRegistry.owner();
    console.log(`   👑 Owner: ${owner}`);
    
    // Verificar trusted issuers
    console.log('\n   🏛️  TRUSTED ISSUERS:');
    const trustedIssuersList = [];
    for (let i = 0; i < signers.length; i++) {
      try {
        const isTrustedIssuer = await trustedIssuersRegistry.isTrustedIssuer(signers[i].address);
        if (isTrustedIssuer) {
          trustedIssuersList.push(signers[i].address);
          
          // Obtener claim topics para este issuer
          try {
            const claimTopics = await trustedIssuersRegistry.getTrustedIssuerClaimTopics(signers[i].address);
            console.log(`      ✅ ${signers[i].address} (Signer ${i})`);
            console.log(`         Claim Topics: [${claimTopics.join(', ')}]`);
          } catch (topicsError) {
            console.log(`      ✅ ${signers[i].address} (Signer ${i}) - Error obteniendo topics`);
          }
        }
      } catch (error) {
        console.log(`      ❌ Error verificando ${signers[i].address}: ${error.message}`);
      }
    }
    
    if (trustedIssuersList.length === 0) {
      console.log('      ⚠️  No se encontraron trusted issuers entre los signers disponibles');
    }
    
  } catch (error) {
    console.log(`   ❌ Error accediendo al Trusted Issuers Registry: ${error.message}`);
  }
}

/**
 * Debug de roles en Claim Topics Registry
 */
async function debugClaimTopicsRegistryRoles(claimTopicsRegistry, signers) {
  console.log('\n� CLAIM TOPICS REGISTRY - ANÁLISIS DE ROLES');
  console.log('-'.repeat(40));
  console.log(`   📍 Dirección: ${claimTopicsRegistry.address}`);
  
  try {
    // Owner
    const owner = await claimTopicsRegistry.owner();
    console.log(`   👑 Owner: ${owner}`);
    
    // No hay roles específicos en ClaimTopicsRegistry más allá del owner
    console.log('\n   📋 Este contrato solo tiene role de Owner (no hay Agents)');
    
  } catch (error) {
    console.log(`   ❌ Error accediendo al Claim Topics Registry: ${error.message}`);
  }
}

/**
 * Debug de roles en Compliance
 */
async function debugComplianceRoles(compliance, signers) {
  console.log('\n⚖️  MODULAR COMPLIANCE - ANÁLISIS DE ROLES');
  console.log('-'.repeat(40));
  console.log(`   📍 Dirección: ${compliance.address}`);
  
  try {
    // Owner
    const owner = await compliance.owner();
    console.log(`   👑 Owner: ${owner}`);
    
    // Información adicional
    try {
      const tokenBound = await compliance.getTokenBound();
      console.log(`\n   🔗 Token Bound: ${tokenBound}`);
    } catch (error) {
      console.log(`   ⚠️  Error obteniendo token bound: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error accediendo al Compliance: ${error.message}`);
  }
}

/**
 * Análisis de consistencia entre roles
 */
async function analyzeRoleConsistency(contracts, deploymentData, signers) {
  console.log('\n🔍 ANÁLISIS DE CONSISTENCIA DE ROLES');
  console.log('-'.repeat(60));
  
  try {
    // Obtener owners de todos los contratos
    const tokenOwner = await contracts.token.owner();
    const irOwner = await contracts.identityRegistry.owner();
    const tirOwner = await contracts.trustedIssuersRegistry.owner();
    const ctrOwner = await contracts.claimTopicsRegistry.owner();
    const complianceOwner = await contracts.compliance.owner();
    
    console.log('\n👑 ANÁLISIS DE OWNERSHIP:');
    console.log(`   Token Owner:                  ${tokenOwner}`);
    console.log(`   Identity Registry Owner:      ${irOwner}`);
    console.log(`   Trusted Issuers Reg. Owner:  ${tirOwner}`);
    console.log(`   Claim Topics Reg. Owner:      ${ctrOwner}`);
    console.log(`   Compliance Owner:             ${complianceOwner}`);
    
    // Verificar consistencia
    const allOwners = [tokenOwner, irOwner, tirOwner, ctrOwner, complianceOwner];
    const uniqueOwners = [...new Set(allOwners)];
    
    if (uniqueOwners.length === 1) {
      console.log('\n✅ CONSISTENCIA: Todos los contratos tienen el mismo owner');
    } else {
      console.log('\n⚠️  INCONSISTENCIA: Los contratos tienen owners diferentes');
      console.log('   Esto puede causar problemas operacionales');
    }
    
    // Verificar agentes
    console.log('\n🛡️  ANÁLISIS DE AGENTES:');
    for (let i = 0; i < Math.min(signers.length, 3); i++) {
      const address = signers[i].address;
      
      try {
        const isTokenAgent = await contracts.token.isAgent(address);
        const isIRAgent = await contracts.identityRegistry.isAgent(address);
        const isTrustedIssuer = await contracts.trustedIssuersRegistry.isTrustedIssuer(address);
        
        console.log(`\n   Signer ${i} (${address}):`);
        console.log(`      Token Agent:        ${isTokenAgent ? '✅' : '❌'}`);
        console.log(`      IR Agent:           ${isIRAgent ? '✅' : '❌'}`);
        console.log(`      Trusted Issuer:     ${isTrustedIssuer ? '✅' : '❌'}`);
        
        // Diagnóstico
        if (isTokenAgent && isIRAgent) {
          console.log(`      🎯 Estado: Agente completo`);
        } else if (isTokenAgent || isIRAgent) {
          console.log(`      ⚠️  Estado: Agente parcial (puede causar problemas)`);
        } else if (isTrustedIssuer) {
          console.log(`      📋 Estado: Solo issuer`);
        } else {
          console.log(`      ❌ Estado: Sin permisos especiales`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error verificando ${address}: ${error.message}`);
      }
    }
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    
    if (uniqueOwners.length > 1) {
      console.log('   🔧 Considerar unificar ownership para facilitar administración');
    }
    
    // Verificar si hay al menos un agente funcional
    let hasFullAgent = false;
    for (let i = 0; i < signers.length; i++) {
      try {
        const isTokenAgent = await contracts.token.isAgent(signers[i].address);
        const isIRAgent = await contracts.identityRegistry.isAgent(signers[i].address);
        if (isTokenAgent && isIRAgent) {
          hasFullAgent = true;
          break;
        }
      } catch (error) {
        // Continuar con el siguiente signer
      }
    }
    
    if (!hasFullAgent) {
      console.log('   ⚠️  No hay agentes completos disponibles');
      console.log('   🔧 Ejecutar scripts de configuración de roles');
    } else {
      console.log('   ✅ Hay al menos un agente completo disponible');
    }
    
  } catch (error) {
    console.log(`❌ Error en análisis de consistencia: ${error.message}`);
  }
}

// Ejecutar el script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
