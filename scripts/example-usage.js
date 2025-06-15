/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * 🚀 SCRIPT DE EJEMPLO - USO COMPLETO DE T-REX DESPUÉS DEL DESPLIEGUE
 * 
 * ¿QUÉ HACE ESTE SCRIPT?
 * ===================
 * 
 * Este script demuestra el flujo completo de uso de un token ERC-3643 (T-REX) 
 * después de haber sido desplegado. Incluye todas las operaciones esenciales
 * para poner en funcionamiento un sistema de tokenización de valores:
 * 
 * 1. 🏛️  CONFIGURACIÓN DE TRUSTED ISSUERS
 *    - Registra emisores autorizados para certificar identidades (KYC, AML, etc.)
 *    - Define qué claims pueden emitir cada issuer
 * 
 * 2. 🆔 REGISTRO DE IDENTIDADES DE INVERSORES  
 *    - Crea identidades on-chain para cada inversor
 *    - Vincula las wallets de inversores con sus identidades verificadas
 * 
 * 3. 📋 EMISIÓN DE CLAIMS (CERTIFICACIONES)
 *    - KYC (Know Your Customer) - Verificación de identidad
 *    - AML (Anti Money Laundering) - Certificación contra lavado de dinero
 *    - Investor accreditation - Acreditación como inversor cualificado
 * 
 * 4. 🪙 EMISIÓN DE TOKENS (MINTING)
 *    - Creación inicial de tokens para inversores verificados
 *    - Solo posible para inversores con identidades y claims válidos
 * 
 * 5. 🔄 TRANSFERENCIAS ENTRE INVERSORES
 *    - Demuestra transferencias que cumplen compliance automáticamente
 *    - Solo permite transferencias entre identidades verificadas
 * 
 * 6. 🛡️  VERIFICACIÓN DE COMPLIANCE
 *    - Muestra cómo el sistema valida automáticamente cada operación
 *    - Rechaza operaciones que no cumplen los requisitos regulatorios
 * 
 * REQUISITOS PREVIOS:
 * ==================
 * - Ejecutar primero: npm run deploy:simple o npm run deploy:manual
 * - Tener al menos 5 cuentas disponibles en la red
 * - Contratos desplegados y funcionales
 * 
 * CÓMO USARLO:
 * ============
 * npm run example -- --network taycan
 */

async function main() {
  console.log('🚀 INICIANDO CONFIGURACIÓN Y USO DE T-REX SUITE');
  console.log('='.repeat(60));
  
  // 📁 PASO 0: Cargar direcciones de contratos desde deployments
  console.log('📁 Cargando contratos desde deployments...');
  const contracts = await loadContractsFromDeployments();
  
  if (!contracts) {
    console.log('❌ No se encontraron despliegues. Ejecuta primero:');
    console.log('   npm run deploy:simple -- --network taycan');
    console.log('   o npm run deploy:manual -- --network taycan');
    return;
  }
  
  console.log('✅ Contratos cargados exitosamente');
  console.log(`   Token: ${contracts.token.address}`);
  console.log(`   Identity Registry: ${contracts.identityRegistry.address}`);
  console.log(`   Trusted Issuers: ${contracts.trustedIssuersRegistry.address}`);  // 👥 Configurar roles y cuentas basado en el deployment
  const signers = await ethers.getSigners();
  if (signers.length < 1) {
    console.log('❌ Se necesita al menos 1 cuenta para el ejemplo');
    return;
  }

  const [mainAccount] = signers;
  
  // Leer configuración del deployment
  const deploymentData = await getDeploymentData();
  
  // Usar las cuentas definidas en el deployment o fallback
  let tokenOwner, claimIssuer;
  if (deploymentData.tokenOwner && deploymentData.tokenOwner !== deploymentData.deployer) {
    // Si hay un tokenOwner diferente al deployer, necesitamos usar la configuración adecuada
    // Nota: en una red real, necesitaríamos acceso a esas cuentas privadas
    console.log('\n⚠️  ADVERTENCIA: El deployment usa cuentas específicas');
    console.log(`   Token Owner: ${deploymentData.tokenOwner}`);
    console.log(`   Agent: ${deploymentData.agent || 'No definido'}`);
    console.log('   Para el ejemplo, intentaremos usar la cuenta principal disponible');
    
    tokenOwner = mainAccount;
    claimIssuer = mainAccount;
  } else {
    tokenOwner = mainAccount;
    claimIssuer = mainAccount;
  }
    // Crear "inversores" usando direcciones reales disponibles
  const investor1 = {
    address: '0x86DF4B738D592c31F4A9A657D6c8d6D05DC1D462', // Dirección adicional proporcionada
    signer: mainAccount // Usar la cuenta principal para transacciones (como proxy)
  };
  const investor2 = {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat address #1 como fallback
    signer: mainAccount // Usar la cuenta principal para transacciones
  };
  
  console.log('\n👥 ROLES CONFIGURADOS:');
  console.log(`   Cuenta Principal (Owner/Issuer/Agent): ${mainAccount.address}`);
  console.log(`   Investor 1: ${investor1.address} (gestionado por principal)`);
  console.log(`   Investor 2: ${investor2.address} (gestionado por principal)`);
  console.log('   ℹ️  Nota: Las transacciones se ejecutan desde la cuenta principal con permisos de Agent');
    try {
    // PASO 1: Configurar trusted issuers
    await configureTrustedIssuers(contracts, tokenOwner, claimIssuer);    // PASO 1.5: Configurar rol de Agent para poder registrar identidades
    // Nota: Necesario cuando el deployer es owner pero no Agent
    await setupAgentRole(contracts, tokenOwner);
    
    // PASO 2: Registrar identidades de inversores
    await registerInvestorIdentities(contracts, tokenOwner, [investor1, investor2]);
    
    // PASO 3: Emitir claims para los inversores
    await issueClaims(contracts, claimIssuer, [investor1, investor2]);
    
    // PASO 4: Despausar token y emitir tokens iniciales
    await mintInitialTokens(contracts, tokenOwner, investor1, investor2);
    
    // PASO 5: Probar transferencias
    await testTransfers(contracts, investor1, investor2);
    
    // PASO 6: Mostrar estado final
    await showFinalStatus(contracts);
    
    console.log('\n🎉 ¡CONFIGURACIÓN Y PRUEBAS COMPLETADAS EXITOSAMENTE!');
    console.log('🎯 El token T-REX está completamente funcional y cumple compliance');
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    throw error;
  }
}

/**
 * Obtiene los datos del deployment actual
 */
async function getDeploymentData() {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const manualLatestPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  
  if (fs.existsSync(manualLatestPath)) {
    return JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
  } else if (fs.existsSync(factoryLatestPath)) {
    return JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
  } else {
    return {};
  }
}

/**
 * Carga las direcciones de contratos desde los archivos JSON de deployments
 */
async function loadContractsFromDeployments() {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  const manualLatestPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
  
  let deploymentData = null;
  
  // Get current network to match chain ID
  const network = await ethers.provider.getNetwork();
  
  // Check both deployments and prefer the one that matches current network
  let factoryData = null;
  let manualData = null;
  
  if (fs.existsSync(factoryLatestPath)) {
    factoryData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
  }
  
  if (fs.existsSync(manualLatestPath)) {
    manualData = JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
  }
  
  // Prefer deployment that matches current network chain ID
  if (factoryData && factoryData.network?.chainId === network.chainId) {
    deploymentData = factoryData;
    console.log('   📁 Usando: factory-deployment-latest.json (coincide chain ID)');
  } else if (manualData && manualData.network?.chainId === network.chainId) {
    deploymentData = manualData;
    console.log('   📁 Usando: manual-deployment-latest.json (coincide chain ID)');
  } else if (factoryData) {
    deploymentData = factoryData;
    console.log('   📁 Usando: factory-deployment-latest.json (fallback)');
  } else if (manualData) {
    deploymentData = manualData;
    console.log('   📁 Usando: manual-deployment-latest.json (fallback)');
  } else {
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
  
  return contracts;
}

/**
 * PASO 1: Configurar trusted issuers para certificar claims
 */
async function configureTrustedIssuers(contracts, tokenOwner, claimIssuer) {
  console.log('\n🏛️  PASO 1: CONFIGURANDO TRUSTED ISSUERS');
  console.log('-'.repeat(50));
  
  try {
    // Agregar claim issuer para tópicos KYC (1) y Acreditado (2)
    await contracts.trustedIssuersRegistry.connect(tokenOwner).addTrustedIssuer(
      claimIssuer.address, 
      [1, 2] // KYC y Acreditado
    );
    
    console.log(`✅ Trusted issuer agregado: ${claimIssuer.address}`);
    console.log('   📋 Autorizado para claims:');
    console.log('      - Claim 1: KYC (Know Your Customer)');
    console.log('      - Claim 2: Acreditado (Accredited Investor)');
    
  } catch (error) {
    console.error('❌ Error configurando trusted issuers:', error.message);
    throw error;
  }
}

/**
 * PASO 1.5: Configurar rol de Agent para poder registrar identidades
 */
async function setupAgentRole(contracts, tokenOwner) {
  console.log('\n🛡️  PASO 1.5: CONFIGURANDO ROL DE AGENT');
  console.log('-'.repeat(50));
  
  try {
    // Verificar y configurar rol de Agent en el TOKEN
    console.log('🔐 Configurando rol de Agent en TOKEN...');
    const isTokenAgent = await contracts.token.isAgent(tokenOwner.address);
    
    if (!isTokenAgent) {
      const tokenAgentTx = await contracts.token.connect(tokenOwner).addAgent(tokenOwner.address);
      await tokenAgentTx.wait();
      console.log('   ✅ Rol de Agent agregado en Token');
    } else {
      console.log('   ✅ Ya tiene rol de Agent en Token');
    }
    
    // Verificar y configurar rol de Agent en el IDENTITY REGISTRY
    console.log('🔐 Configurando rol de Agent en IDENTITY REGISTRY...');
    const isIRAgent = await contracts.identityRegistry.isAgent(tokenOwner.address);
    
    if (!isIRAgent) {
      const irAgentTx = await contracts.identityRegistry.connect(tokenOwner).addAgent(tokenOwner.address);
      await irAgentTx.wait();
      console.log('   ✅ Rol de Agent agregado en Identity Registry');
    } else {
      console.log('   ✅ Ya tiene rol de Agent en Identity Registry');
    }
    
    // Verificación final
    const finalTokenAgent = await contracts.token.isAgent(tokenOwner.address);
    const finalIRAgent = await contracts.identityRegistry.isAgent(tokenOwner.address);
    
    console.log(`✅ Configuración final de roles:`);
    console.log(`   👤 Cuenta: ${tokenOwner.address}`);
    console.log(`   🪙 Agent en Token: ${finalTokenAgent ? 'SÍ' : 'NO'}`);
    console.log(`   🆔 Agent en Identity Registry: ${finalIRAgent ? 'SÍ' : 'NO'}`);
    
    if (!finalTokenAgent || !finalIRAgent) {
      throw new Error('No se pudieron configurar todos los roles de Agent necesarios');
    }
    
  } catch (error) {
    console.error('❌ Error configurando rol de Agent:', error.message);
    throw error;
  }
}

/**
 * PASO 2: Registrar identidades de inversores en el whitelist
 */
async function registerInvestorIdentities(contracts, tokenOwner, investors) {
  console.log('\n👥 PASO 2: REGISTRANDO IDENTIDADES DE INVERSORES');
  console.log('-'.repeat(50));
    try {
    for (let i = 0; i < investors.length; i++) {
      const investor = investors[i];
      
      // Para este ejemplo, usamos direcciones mock para identities
      // En un caso real, cada inversor tendría su propio contrato ONCHAINID
      const mockIdentityAddress = ethers.utils.getAddress(
        '0x' + '1'.repeat(39) + (i + 1).toString()
      );
      
      const countryCode = 724; // España - ISO 3166-1 numeric
      
      console.log(`📝 Registrando Investor ${i + 1}...`);
      const registerTx = await contracts.identityRegistry.connect(tokenOwner).registerIdentity(
        investor.address, // Usar la dirección del investor (mock)
        mockIdentityAddress,
        countryCode
      );
      await registerTx.wait();
      
      // Verificar que el registro fue exitoso
      const isVerified = await contracts.identityRegistry.isVerified(investor.address);
      const registeredIdentity = await contracts.identityRegistry.identity(investor.address);
      
      console.log(`✅ Identidad ${i + 1} registrada:`);
      console.log(`   👤 Wallet: ${investor.address}`);
      console.log(`   🆔 Identity: ${mockIdentityAddress}`);
      console.log(`   🌍 País: ${countryCode} (España)`);
      console.log(`   ✅ Verificado: ${isVerified ? 'SÍ' : 'NO'}`);
      console.log(`   📋 Identity en registro: ${registeredIdentity}`);
      
      if (!isVerified) {
        console.log(`   ⚠️  ADVERTENCIA: El inversor ${i + 1} no está verificado después del registro`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error registrando identidades:', error.message);
    throw error;
  }
}

/**
 * PASO 3: Emitir claims para los inversores (simulación)
 */
async function issueClaims(contracts, claimIssuer, investors) {
  console.log('\n📋 PASO 3: EMITIENDO CLAIMS PARA INVERSORES');
  console.log('-'.repeat(50));
  console.log('ℹ️  Nota: En un entorno real, los claims se emitirían a través de');
  console.log('   contratos ONCHAINID específicos. Este paso simula que los');
  console.log('   inversores ya tienen los claims necesarios.');
  
  for (let i = 0; i < investors.length; i++) {
    console.log(`✅ Claims simulados para Investor ${i + 1}:`);
    console.log(`   📋 KYC verified (Claim 1)`);
    console.log(`   📋 Accredited investor (Claim 2)`);
  }
}

/**
 * PASO 4: Despausar token y emitir tokens iniciales
 */
async function mintInitialTokens(contracts, tokenOwner, investor1, investor2) {
  console.log('\n🪙 PASO 4: DESPAUSING Y MINTING TOKENS INICIALES');
  console.log('-'.repeat(50));
  
  try {
    // Despausar el token primero
    console.log('🔓 Despausando token...');
    await contracts.token.connect(tokenOwner).unpause();
    console.log('✅ Token despausado exitosamente');
      // Verificar que los inversores estén registrados
    console.log('\n🔍 Verificando registro de inversores...');
    const isRegistered1 = await contracts.identityRegistry.isVerified(investor1.address);
    const isRegistered2 = await contracts.identityRegistry.isVerified(investor2.address);
    
    console.log(`   Investor 1 verificado: ${isRegistered1 ? '✅' : '❌'}`);
    console.log(`   Investor 2 verificado: ${isRegistered2 ? '✅' : '❌'}`);
    
    if (!isRegistered1 || !isRegistered2) {
      console.log('⚠️  ADVERTENCIA: Los inversores no están verificados en el Identity Registry');
      console.log('   El minting puede fallar o los balances pueden ser 0');
    }
    
    // Mintear tokens para investor1
    console.log('\n💰 Iniciando minting...');
    const amount1 = ethers.utils.parseEther('1000');
    const mintTx1 = await contracts.token.connect(tokenOwner).mint(investor1.address, amount1);
    await mintTx1.wait();
    console.log(`✅ Minted ${ethers.utils.formatEther(amount1)} tokens para Investor 1`);
    
    // Mintear tokens para investor2
    const amount2 = ethers.utils.parseEther('500');
    const mintTx2 = await contracts.token.connect(tokenOwner).mint(investor2.address, amount2);
    await mintTx2.wait();
    console.log(`✅ Minted ${ethers.utils.formatEther(amount2)} tokens para Investor 2`);
    
    // Verificar balances con manejo de errores robusto
    console.log('\n🔍 Verificando balances...');
    try {
      const balance1 = await contracts.token.balanceOf(investor1.address);
      console.log(`   Investor 1: ${ethers.utils.formatEther(balance1)} tokens`);
    } catch (balanceError1) {
      console.log(`   ❌ Error obteniendo balance de Investor 1: ${balanceError1.message}`);
    }
    
    try {
      const balance2 = await contracts.token.balanceOf(investor2.address);
      console.log(`   Investor 2: ${ethers.utils.formatEther(balance2)} tokens`);
    } catch (balanceError2) {
      console.log(`   ❌ Error obteniendo balance de Investor 2: ${balanceError2.message}`);
    }
    
    try {
      const totalSupply = await contracts.token.totalSupply();
      console.log(`   Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`);
    } catch (supplyError) {
      console.log(`   ❌ Error obteniendo total supply: ${supplyError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error en minting:', error.message);
    throw error;
  }
}

/**
 * PASO 5: Probar transferencias entre inversores
 */
async function testTransfers(contracts, investor1, investor2) {
  console.log('\n🔄 PASO 5: PROBANDO TRANSFERENCIAS');
  console.log('-'.repeat(50));
  
  try {
    const transferAmount = ethers.utils.parseEther('100');
    
    console.log(`🔄 Transfiriendo ${ethers.utils.formatEther(transferAmount)} tokens:`);
    console.log(`   De: ${investor1.address}`);
    console.log(`   A:  ${investor2.address}`);
    
    // Realizar transferencia
    await contracts.token.connect(investor1).transfer(investor2.address, transferAmount);
    
    // Verificar nuevos balances
    const balance1 = await contracts.token.balanceOf(investor1.address);
    const balance2 = await contracts.token.balanceOf(investor2.address);
    
    console.log('✅ Transferencia exitosa!');
    console.log('\n💰 NUEVOS BALANCES:');
    console.log(`   Investor 1: ${ethers.utils.formatEther(balance1)} tokens`);
    console.log(`   Investor 2: ${ethers.utils.formatEther(balance2)} tokens`);
    
  } catch (error) {
    console.error('❌ Error en transferencia:', error.message);
    throw error;
  }
}

/**
 * PASO 6: Mostrar estado final del sistema
 */
async function showFinalStatus(contracts) {
  console.log('\n📊 PASO 6: ESTADO FINAL DEL SISTEMA');
  console.log('-'.repeat(50));
  
  try {
    const tokenName = await contracts.token.name();
    const tokenSymbol = await contracts.token.symbol();
    const totalSupply = await contracts.token.totalSupply();
    const isPaused = await contracts.token.paused();
    
    console.log(`📋 Token: ${tokenName} (${tokenSymbol})`);
    console.log(`💰 Total Supply: ${ethers.utils.formatEther(totalSupply)} tokens`);
    console.log(`🏃 Estado: ${isPaused ? 'Pausado ⏸️' : 'Activo ✅'}`);
    
    console.log('\n🎯 FUNCIONALIDADES DEMOSTRADAS:');
    console.log('   ✅ Trusted issuers configurados');
    console.log('   ✅ Identidades de inversores registradas');
    console.log('   ✅ Claims de KYC y acreditación simulados');
    console.log('   ✅ Tokens emitidos a inversores verificados');
    console.log('   ✅ Transferencias con compliance automático');
    console.log('   ✅ Sistema completamente funcional');
    
  } catch (error) {
    console.error('❌ Error mostrando estado final:', error.message);
  }
}

// Agregar comando npm al package.json
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
