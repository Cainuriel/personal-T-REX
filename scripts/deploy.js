/* eslint-disable */
const { ethers } = require('hardhat');
const OnchainID = require('@onchain-id/solidity');
const fs = require('fs');
const path = require('path');

/**
 * Script de despliegue PASO A PASO para ERC-3643 T-REX Suite
 * 
 * Este script despliega todos los contratos manualmente paso por paso.
 * Es más robusto y ofrece mayor control, pero requiere más transacciones.
 * 
 * Para despliegue rápido con factory, usar deploy-factory.js
 */

async function main() {
  console.log('🚀 Iniciando despliegue PASO A PASO de ERC-3643 T-REX Suite...');
  console.log('🔧 Método: Manual (Máximo control)\n');
  
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
  console.log(`� Cuentas disponibles: ${signers.length}`);
  
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
    const result = await deployManualStepByStep(deployer, tokenOwner, agent);
    
    // Guardar direcciones en JSON
    await saveDeploymentAddresses(result, 'manual-deployment');
    
    console.log('\n🎉 ¡Despliegue completado exitosamente!');
    console.log('📁 Direcciones guardadas en deployments/');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  }
}

/**
 * OPCIÓN 2: Despliegue manual paso a paso
 * Sigue exactamente la guía proporcionada para máximo control
 */
async function deployManualStepByStep(deployer, tokenOwner, agent) {
  console.log("🔧 DESPLIEGUE MANUAL PASO A PASO");
  console.log("=" .repeat(50));

  try {    // PASO 1: Desplegar Claim Topics Registry
    console.log("📋 PASO 1: Desplegando Claim Topics Registry...");
    const claimTopicsRegistry = await ethers.deployContract('ClaimTopicsRegistry', deployer);
    await claimTopicsRegistry.deployed();
    await claimTopicsRegistry.connect(deployer).init(); // Inicializar el contrato upgradeable
    console.log(`✅ ClaimTopicsRegistry: ${claimTopicsRegistry.address}`);
      // PASO 2: Desplegar Trusted Issuers Registry  
    console.log("🏛️  PASO 2: Desplegando Trusted Issuers Registry...");
    const trustedIssuersRegistry = await ethers.deployContract('TrustedIssuersRegistry', deployer);
    await trustedIssuersRegistry.deployed();
    await trustedIssuersRegistry.connect(deployer).init(); // Inicializar el contrato upgradeable
    console.log(`✅ TrustedIssuersRegistry: ${trustedIssuersRegistry.address}`);
      // PASO 3: Desplegar Identity Registry Storage
    console.log("💾 PASO 3: Desplegando Identity Registry Storage...");
    const identityRegistryStorage = await ethers.deployContract('IdentityRegistryStorage', deployer);
    await identityRegistryStorage.deployed();
    await identityRegistryStorage.connect(deployer).init(); // Inicializar el contrato upgradeable
    console.log(`✅ IdentityRegistryStorage: ${identityRegistryStorage.address}`);
      // PASO 4: Desplegar Identity Registry
    console.log("🆔 PASO 4: Desplegando Identity Registry...");
    const identityRegistry = await ethers.deployContract('IdentityRegistry', deployer);
    await identityRegistry.deployed();
    console.log(`✅ IdentityRegistry: ${identityRegistry.address}`);
    
    // PASO 5: Enlazar Identity Registry con su Storage
    console.log("🔗 PASO 5: Enlazando Identity Registry con Storage...");
    await identityRegistry.connect(deployer).init(
      trustedIssuersRegistry.address,
      claimTopicsRegistry.address, 
      identityRegistryStorage.address
    );
    await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
    console.log("✅ Identity Registry enlazado con Storage");
      // PASO 6: Desplegar Compliance Contract (ModularCompliance)
    console.log("⚖️  PASO 6: Desplegando Compliance Contract...");
    const modularCompliance = await ethers.deployContract('ModularCompliance', deployer);
    await modularCompliance.deployed();
    console.log(`✅ ModularCompliance: ${modularCompliance.address}`);
    
    // PASO 7: Desplegar Security Token
    console.log("🪙 PASO 7: Desplegando Security Token...");
    
    // Crear ONCHAINID para el token
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployer
    ).deploy(deployer.address, true);
    
    const identityImplementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployer
    ).deploy(identityImplementation.address);
    
    const tokenOID = await new ethers.ContractFactory(
      OnchainID.contracts.IdentityProxy.abi,
      OnchainID.contracts.IdentityProxy.bytecode,
      deployer
    ).deploy(identityImplementationAuthority.address, tokenOwner.address);
    
    const token = await ethers.deployContract('Token', deployer);
    await token.deployed();
    
    await token.connect(deployer).init(
      identityRegistry.address,
      modularCompliance.address,
      "Alastria Security Token",
      "AST",
      18,
      tokenOID.address
    );
    console.log(`✅ Token: ${token.address}`);
    console.log(`✅ Token ONCHAINID: ${tokenOID.address}`);
    
    // PASO 8: Enlazar Compliance con Token
    console.log("🔗 PASO 8: Enlazando Compliance con Token...");
    await modularCompliance.connect(deployer).init();
    await modularCompliance.connect(deployer).bindToken(token.address);
    console.log("✅ Compliance enlazado con Token");
    
    // PASO 9: Asignar roles y permisos
    console.log("👥 PASO 9: Asignando roles y permisos...");
    await token.connect(deployer).transferOwnership(tokenOwner.address);
    await token.connect(tokenOwner).addAgent(agent.address);
    await identityRegistry.connect(deployer).transferOwnership(tokenOwner.address);
    await identityRegistry.connect(tokenOwner).addAgent(agent.address);
    console.log("✅ Roles y permisos asignados");
    
    // PASO 10: Configurar claim topics iniciales
    console.log("📋 PASO 10: Configurando claim topics...");
    await claimTopicsRegistry.connect(deployer).transferOwnership(tokenOwner.address);
    await claimTopicsRegistry.connect(tokenOwner).addClaimTopic(1); // KYC
    await claimTopicsRegistry.connect(tokenOwner).addClaimTopic(2); // Acreditado
    console.log("✅ Claim topics configurados (1=KYC, 2=Acreditado)");
      console.log("\n🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE!");
    console.log("=" .repeat(50));
    console.log("📋 RESUMEN DE CONTRATOS DESPLEGADOS:");
    console.log(`ClaimTopicsRegistry: ${claimTopicsRegistry.address}`);
    console.log(`TrustedIssuersRegistry: ${trustedIssuersRegistry.address}`);
    console.log(`IdentityRegistryStorage: ${identityRegistryStorage.address}`);
    console.log(`IdentityRegistry: ${identityRegistry.address}`);
    console.log(`ModularCompliance: ${modularCompliance.address}`);
    console.log(`Token: ${token.address}`);
    console.log(`Token ONCHAINID: ${tokenOID.address}`);
    
    console.log("\n📝 PRÓXIMOS PASOS:");
    console.log("1. Configurar trusted issuers en TrustedIssuersRegistry");
    console.log("2. Registrar identidades de inversores en IdentityRegistry");
    console.log("3. Añadir módulos de compliance si es necesario");
    console.log("4. Emitir tokens iniciales con mint()");
    
    // Devolver objeto estructurado para el JSON
    return {
      network: await ethers.provider.getNetwork(),
      deploymentMethod: 'manual',
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      tokenOwner: tokenOwner.address,
      agent: agent.address,
      core: {
        token: token.address,
        identityRegistry: identityRegistry.address,
        compliance: modularCompliance.address,
        identityRegistryStorage: identityRegistryStorage.address,
        claimTopicsRegistry: claimTopicsRegistry.address,
        trustedIssuersRegistry: trustedIssuersRegistry.address,
        tokenONChainID: tokenOID.address
      },
      onchainIdentity: {
        identityImplementation: identityImplementation.address,
        identityImplementationAuthority: identityImplementationAuthority.address,
        tokenONChainID: tokenOID.address
      }
    };
    
  } catch (error) {
    console.error("❌ Error en despliegue manual:", error.message);
    throw error;
  }
}

/**
 * Funciones auxiliares para despliegue con factory
 */
async function deployImplementations(deployer) {
  console.log("   📦 Desplegando implementaciones de contratos...");
  
  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  const tokenImplementation = await ethers.deployContract('Token', deployer);
  
  await Promise.all([
    claimTopicsRegistryImplementation.deployed(),
    trustedIssuersRegistryImplementation.deployed(),
    identityRegistryStorageImplementation.deployed(),
    identityRegistryImplementation.deployed(),
    modularComplianceImplementation.deployed(),
    tokenImplementation.deployed()
  ]);
  
  console.log("   ✅ Implementaciones desplegadas");
  
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
  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer
  );
  await trexImplementationAuthority.deployed();
  
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
  
  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  console.log("   ✅ Autoridad de implementación configurada");
  
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
    deployer
  ).deploy(identityImplementationAuthority.address);
  
  await Promise.all([
    identityImplementation.deployed(),
    identityImplementationAuthority.deployed(),
    identityFactory.deployed()
  ]);
    console.log("   ✅ Factory de identidades desplegado");
  
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

// Ejecutar script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
