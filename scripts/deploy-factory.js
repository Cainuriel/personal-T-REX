/* eslint-disable */
const { ethers } = require('hardhat');
const OnchainID = require('@onchain-id/solidity');
const fs = require('fs');
const path = require('path');

/**
 * Script de despliegue SIMPLE para ERC-3643 T-REX Suite
 * 
 * Este script usa ÚNICAMENTE el TREXFactory para desplegar todo en una sola transacción.
 * Es el método más rápido pero requiere que el factory funcione correctamente.
 * 
 * Para despliegue paso a paso más robusto, usar deploy.js
 */

async function main() {
  console.log('🚀 Iniciando despliegue SIMPLE de ERC-3643 T-REX Suite...');
  console.log('🏭 Método: TREXFactory (Una sola transacción)\n');
  
  // Debug de variables de entorno
  console.log('🔍 Debug - Variables de entorno:');
  const privateKey = process.env.ADMIN_WALLET_PRIV_KEY;
  console.log('   ADMIN_WALLET_PRIV_KEY configurada:', privateKey ? 'SÍ' : 'NO');
  if (privateKey) {
    console.log('   Longitud de clave privada:', privateKey.length, 'caracteres');
    console.log('   Formato correcto (0x...):', privateKey.startsWith('0x') ? 'SÍ' : 'NO');
  }
  
  // Obtener network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Red: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Obtener signers disponibles
  const signers = await ethers.getSigners();
  console.log(`📊 Cuentas disponibles: ${signers.length}`);
  
  for (let i = 0; i < Math.min(signers.length, 3); i++) {
    const balance = await signers[i].getBalance();
    console.log(`   Cuenta ${i + 1}: ${signers[i].address} (Balance: ${ethers.utils.formatEther(balance)} ETH)`);
  }
  
  // Configurar roles
  const deployer = signers[0];
  const tokenOwner = signers.length > 1 ? signers[1] : signers[0];
  const agent = signers.length > 2 ? signers[2] : signers[0];
  
  if (signers.length === 1) {
    console.log('⚠️  Usando la misma cuenta para todos los roles (deployer, owner, agent)');
  }
  
  console.log(`📝 Deployer: ${deployer.address}`);
  console.log(`👑 Token Owner: ${tokenOwner.address}`);
  console.log(`🤖 Agent: ${agent.address}`);
  
  try {
    const result = await deployWithFactory(deployer, tokenOwner, agent);
    
    // Guardar direcciones en JSON
    await saveDeploymentAddresses(result, 'factory-deployment');
    
    console.log('\n🎉 ¡Despliegue completado exitosamente!');
    console.log('📁 Direcciones guardadas en deployments/');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  }
}

/**
 * Despliegue usando TREXFactory - Método rápido
 */
async function deployWithFactory(deployer, tokenOwner, agent) {
  console.log('\n🏭 DESPLIEGUE CON TREX FACTORY');
  console.log('='.repeat(50));

  // 1. Desplegar implementaciones base
  console.log('📦 1. Desplegando implementaciones base...');
  const implementations = await deployImplementations(deployer);
  
  // 2. Desplegar autoridad de implementación
  console.log('🏛️  2. Desplegando autoridad de implementación...');
  const trexImplementationAuthority = await deployImplementationAuthority(deployer, implementations);
  
  // 3. Desplegar factory de identidades
  console.log('🏭 3. Desplegando factory de identidades...');
  const identityFactory = await deployIdentityFactory(deployer);
  
  // 4. Desplegar TREX Factory
  console.log('🏭 4. Desplegando TREX Factory...');
  const trexFactory = await ethers.deployContract(
    'TREXFactory', 
    [trexImplementationAuthority.address, identityFactory.address], 
    deployer
  );
  await trexFactory.deployed();
  console.log(`✅ TREXFactory desplegado en: ${trexFactory.address}`);
  
  // 5. Configurar factory de identidades
  await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
  console.log('✅ Factory de identidades configurado');
  
  // 6. Desplegar suite completa usando factory
  console.log('🚀 5. Desplegando suite completa usando factory...');
  const salt = `TREX_${Date.now()}`;
  
  const tokenDetails = {
    owner: tokenOwner.address,
    name: 'ISBE Security Token',
    symbol: 'AST',
    decimals: 18,
    irs: ethers.constants.AddressZero,
    ONCHAINID: ethers.constants.AddressZero,
    irAgents: [],
    tokenAgents: [],
    complianceModules: [],
    complianceSettings: []
  };
  
  const claimDetails = {
    claimTopics: [1, 2],
    issuers: [],
    issuerClaims: []
  };
  
  const tx = await trexFactory.connect(deployer).deployTREXSuite(
    salt,
    tokenDetails,
    claimDetails,
    { gasLimit: 5000000 }
  );
  
  await tx.wait();
  console.log('✅ Suite desplegada exitosamente!');
  
  const tokenAddress = await trexFactory.getToken(salt);
  console.log(`🎯 Token desplegado en: ${tokenAddress}`);
  
  // Obtener direcciones de contratos relacionados
  const token = await ethers.getContractAt('Token', tokenAddress);
  const identityRegistry = await token.identityRegistry();
  const compliance = await token.compliance();
  
  const identityRegistryContract = await ethers.getContractAt('IdentityRegistry', identityRegistry);
  const identityRegistryStorage = await identityRegistryContract.identityStorage();
  const claimTopicsRegistry = await identityRegistryContract.topicsRegistry();
  const trustedIssuersRegistry = await identityRegistryContract.issuersRegistry();
  
  return {
    network: await ethers.provider.getNetwork(),
    deploymentMethod: 'factory',
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    tokenOwner: tokenOwner.address,
    agent: agent.address,
    salt: salt,
    core: {
      token: tokenAddress,
      identityRegistry: identityRegistry,
      compliance: compliance,
      identityRegistryStorage: identityRegistryStorage,
      claimTopicsRegistry: claimTopicsRegistry,
      trustedIssuersRegistry: trustedIssuersRegistry
    },
    infrastructure: {
      trexFactory: trexFactory.address,
      trexImplementationAuthority: trexImplementationAuthority.address,
      identityFactory: identityFactory.address
    },
    implementations: {
      tokenImplementation: implementations.tokenImplementation.address,
      claimTopicsRegistryImplementation: implementations.claimTopicsRegistryImplementation.address,
      trustedIssuersRegistryImplementation: implementations.trustedIssuersRegistryImplementation.address,
      identityRegistryStorageImplementation: implementations.identityRegistryStorageImplementation.address,
      identityRegistryImplementation: implementations.identityRegistryImplementation.address,
      modularComplianceImplementation: implementations.modularComplianceImplementation.address
    }
  };
}

async function deployImplementations(deployer) {
  console.log('   📦 Desplegando implementaciones de contratos...');
  
  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  const tokenImplementation = await ethers.deployContract('Token', deployer);
  
  console.log('   ✅ Implementaciones desplegadas');
  
  return {
    claimTopicsRegistryImplementation,
    trustedIssuersRegistryImplementation,
    identityRegistryStorageImplementation,
    identityRegistryImplementation,
    modularComplianceImplementation,
    tokenImplementation
  };
}

async function deployImplementationAuthority(deployer, implementations) {
  console.log('   📋 Desplegando TREXImplementationAuthority...');
  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer
  );
  
  await trexImplementationAuthority.deployed();
  console.log('   ✅ TREXImplementationAuthority desplegada en:', trexImplementationAuthority.address);
  
  const versionStruct = {
    major: 4,
    minor: 1,
    patch: 6,
  };
  
  const contractsStruct = {
    tokenImplementation: implementations.tokenImplementation.address,
    ctrImplementation: implementations.claimTopicsRegistryImplementation.address,
    irImplementation: implementations.identityRegistryImplementation.address,
    irsImplementation: implementations.identityRegistryStorageImplementation.address,
    tirImplementation: implementations.trustedIssuersRegistryImplementation.address,
    mcImplementation: implementations.modularComplianceImplementation.address,
  };
  
  console.log('   🔧 Configurando versión de TREX en la autoridad...');
  const tx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  await tx.wait();
  console.log('   ✅ Autoridad de implementación configurada');
  
  return trexImplementationAuthority;
}

async function deployIdentityFactory(deployer) {
  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
  ).deploy(deployer.address, true);

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
  ).deploy(identityImplementation.address);

  const identityFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Factory.abi, 
    OnchainID.contracts.Factory.bytecode, 
    deployer,
  ).deploy(identityImplementationAuthority.address, deployer.address);

  console.log('   ✅ Factory de identidades desplegado');
  
  return identityFactory;
}

async function saveDeploymentAddresses(deploymentData, filename) {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  
  // Crear directorio si no existe
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const networkName = deploymentData.network.name || 'unknown';
  const chainId = deploymentData.network.chainId;
  
  const fullFilename = `${filename}-${networkName}-${chainId}-${timestamp}.json`;
  const filePath = path.join(deploymentsDir, fullFilename);
  
  // Guardar JSON formateado
  fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  
  // También guardar como "latest" para fácil acceso
  const latestPath = path.join(deploymentsDir, `${filename}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`📁 Direcciones guardadas en: ${fullFilename}`);
  console.log(`📁 También disponible en: ${filename}-latest.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
