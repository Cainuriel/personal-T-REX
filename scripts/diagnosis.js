/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO DE DEPLOYMENT
 * 
 * Este script verifica el estado de los contratos desplegados
 * y diagnostica problemas comunes de permisos y configuración.
 * 
 * CÓMO USARLO:
 * ===========
 * DEPLOYMENT_TYPE=factory npx hardhat run scripts/diagnosis.js --network alastria
 * DEPLOYMENT_TYPE=manual npx hardhat run scripts/diagnosis.js --network alastria
 */

async function main() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE DEPLOYMENT');
  console.log('='.repeat(60));
  
  // Obtener tipo de deployment
  const deploymentType = process.env.DEPLOYMENT_TYPE || 'auto';
  console.log(`📁 Tipo de deployment: ${deploymentType}`);
  
  // Cargar contratos
  const contracts = await loadContractsFromDeployments(deploymentType);
  if (!contracts) {
    console.log('❌ No se encontraron deployments');
    return;
  }
  
  const { contracts: contractInstances, source } = contracts;
  console.log(`📄 Usando deployment: ${source}`);
  
  // Verificar conectividad
  await checkNetworkConnectivity();
  
  // Diagnosticar cada contrato
  await diagnoseContracts(contractInstances);
  
  // Verificar permisos
  const [mainAccount] = await ethers.getSigners();
  await diagnosePermissions(contractInstances, mainAccount);
  
  console.log('\n✅ Diagnóstico completado');
}

async function checkNetworkConnectivity() {
  console.log('\n🌐 VERIFICANDO CONECTIVIDAD');
  console.log('-'.repeat(40));
  
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const gasPrice = await ethers.provider.getGasPrice();
    
    console.log(`✅ Red: ${network.name || 'Unknown'} (Chain ID: ${network.chainId})`);
    console.log(`✅ Bloque actual: ${blockNumber}`);
    console.log(`✅ Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  } catch (error) {
    console.error(`❌ Error de conectividad: ${error.message}`);
    throw error;
  }
}

async function diagnoseContracts(contracts) {
  console.log('\n🔍 DIAGNÓSTICO DE CONTRATOS');
  console.log('-'.repeat(40));
  
  const contractChecks = [
    {
      name: 'Token',
      contract: contracts.token,
      checks: [
        { method: 'name', label: 'Nombre' },
        { method: 'symbol', label: 'Símbolo' },
        { method: 'decimals', label: 'Decimales' },
        { method: 'totalSupply', label: 'Supply Total', format: 'ether' },
        { method: 'paused', label: 'Pausado' },
        { method: 'owner', label: 'Owner' }
      ]    },
    {
      name: 'Identity Registry',
      contract: contracts.identityRegistry,
      checks: [
        { method: 'owner', label: 'Owner' }
      ]
    },    {
      name: 'Trusted Issuers Registry',
      contract: contracts.trustedIssuersRegistry,
      checks: [
        { method: 'owner', label: 'Owner' }
      ]
    },
    {
      name: 'Claim Topics Registry',
      contract: contracts.claimTopicsRegistry,
      checks: [
        { method: 'owner', label: 'Owner' }
      ]
    },
    {
      name: 'Compliance',
      contract: contracts.compliance,
      checks: [
        { method: 'owner', label: 'Owner' }
      ]
    }
  ];
  
  for (const contractCheck of contractChecks) {
    console.log(`\n📋 ${contractCheck.name}:`);
    console.log(`   📍 Dirección: ${contractCheck.contract.address}`);
      for (const check of contractCheck.checks) {
      try {
        // Verificar si el método existe antes de llamarlo
        if (typeof contractCheck.contract[check.method] !== 'function') {
          console.log(`   ⚠️  Método ${check.method} no disponible`);
          continue;
        }
        
        const result = await contractCheck.contract[check.method]();
        let displayValue = result;
        
        if (check.format === 'ether') {
          displayValue = ethers.utils.formatEther(result);
        }
        
        console.log(`   ${check.label}: ${displayValue}`);
      } catch (error) {
        console.log(`   ❌ Error obteniendo ${check.label}: ${error.message}`);
      }
    }
  }
}

async function diagnosePermissions(contracts, account) {
  console.log('\n🔐 DIAGNÓSTICO DE PERMISOS');
  console.log('-'.repeat(40));
  console.log(`👤 Cuenta: ${account.address}`);
  
  const permissionChecks = [
    {
      name: 'Token',
      contract: contracts.token,
      ownerMethod: 'owner',
      agentMethod: 'isAgent'
    },
    {
      name: 'Identity Registry',
      contract: contracts.identityRegistry,
      ownerMethod: 'owner',
      agentMethod: 'isAgent'
    },
    {
      name: 'Trusted Issuers Registry',
      contract: contracts.trustedIssuersRegistry,
      ownerMethod: 'owner',
      agentMethod: null
    },
    {
      name: 'Claim Topics Registry',
      contract: contracts.claimTopicsRegistry,
      ownerMethod: 'owner',
      agentMethod: null
    },
    {
      name: 'Compliance',
      contract: contracts.compliance,
      ownerMethod: 'owner',
      agentMethod: null
    }
  ];
  
  for (const check of permissionChecks) {
    console.log(`\n📋 ${check.name}:`);
      try {
      // Verificar owner
      if (typeof check.contract[check.ownerMethod] === 'function') {
        const owner = await check.contract[check.ownerMethod]();
        const isOwner = owner.toLowerCase() === account.address.toLowerCase();
        
        console.log(`   👑 Owner: ${owner}`);
        console.log(`   ✅ Es Owner: ${isOwner ? 'SÍ' : 'NO'}`);
      } else {
        console.log(`   ⚠️  Método ${check.ownerMethod} no disponible`);
      }
      
      // Verificar agent si aplica
      if (check.agentMethod) {
        if (typeof check.contract[check.agentMethod] === 'function') {
          const isAgent = await check.contract[check.agentMethod](account.address);
          console.log(`   🛡️  Es Agent: ${isAgent ? 'SÍ' : 'NO'}`);
        } else {
          console.log(`   ⚠️  Método ${check.agentMethod} no disponible`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error verificando permisos: ${error.message}`);
    }
  }
}

async function loadContractsFromDeployments(deploymentType) {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  const manualLatestPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
  
  let deploymentData = null;
  let deploymentSource = null;
  
  const network = await ethers.provider.getNetwork();
  
  if (deploymentType === 'factory' && fs.existsSync(factoryLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    deploymentSource = 'factory-deployment-latest.json';
  } else if (deploymentType === 'manual' && fs.existsSync(manualLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
    deploymentSource = 'manual-deployment-latest.json';
  } else if (fs.existsSync(factoryLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    deploymentSource = 'factory-deployment-latest.json (auto)';
  } else if (fs.existsSync(manualLatestPath)) {
    deploymentData = JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
    deploymentSource = 'manual-deployment-latest.json (auto)';
  }
  
  if (!deploymentData) {
    return null;
  }
    // Conectar a los contratos
  const contracts = {
    token: await ethers.getContractAt('Token', deploymentData.core.token),
    identityRegistry: await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry),
    trustedIssuersRegistry: await ethers.getContractAt('TrustedIssuersRegistry', deploymentData.core.trustedIssuersRegistry),
    claimTopicsRegistry: await ethers.getContractAt('ClaimTopicsRegistry', deploymentData.core.claimTopicsRegistry),
    compliance: await ethers.getContractAt('ModularCompliance', deploymentData.core.compliance),
    identityRegistryStorage: await ethers.getContractAt('IdentityRegistryStorage', deploymentData.core.identityRegistryStorage)
  };
  
  return {
    contracts,
    source: deploymentSource
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error en diagnóstico:', error.message);
    process.exit(1);
  });
