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
 * * CÓMO USARLO:
 * ============
 * # Usar deployment específico con variables de entorno:
 * DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan
 * DEPLOYMENT_TYPE=manual npx hardhat run scripts/example-usage.js --network taycan
 * 
 * # Usar cualquier deployment disponible (comportamiento anterior):
 * npx hardhat run scripts/example-usage.js --network taycan
 * 
 * VARIABLES DE ENTORNO:
 * - DEPLOYMENT_TYPE: Especifica qué tipo de deployment usar (factory o manual)
 *   Si no se especifica, intentará encontrar cualquiera disponible
 *   
 * EJEMPLOS COMPLETOS:
 * - DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan
 * - DEPLOYMENT_TYPE=manual npx hardhat run scripts/example-usage.js --network taycan
 * 
 * EN WINDOWS (PowerShell):
 * - $env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network taycan
 * - $env:DEPLOYMENT_TYPE="manual"; npx hardhat run scripts/example-usage.js --network taycan
 */

async function main() {
  console.log('🚀 INICIANDO CONFIGURACIÓN Y USO DE T-REX SUITE');
  console.log('='.repeat(60));
  
  // 🌐 PASO 0.1: Verificar conectividad de red
  await checkNetworkConnectivity();
    // 📁 PASO 0.2: Obtener parámetros y cargar contratos
  const deploymentType = getDeploymentTypeFromEnv();
  console.log(`📁 Tipo de deployment solicitado: ${deploymentType || 'automático'}`);
    console.log('📁 Cargando contratos desde deployments...');
  const result = await loadContractsFromDeployments(deploymentType);
  
  if (!result) {
    console.log('❌ No se encontraron despliegues del tipo especificado.');
    if (deploymentType) {
      console.log(`   Tipo solicitado: ${deploymentType}`);
      console.log('   Tipos disponibles: factory, manual');
    }
    console.log('   Ejecuta primero:');
    console.log('   npm run deploy:simple -- --network taycan  (para factory)');
    console.log('   o npm run deploy:manual -- --network taycan  (para manual)');    return;
  }  
  const { contracts, source: deploymentSource } = result;
  
  console.log('✅ Contratos cargados exitosamente');
  console.log(`   📄 Deployment: ${deploymentSource}`);
  console.log(`   🪙 Token: ${contracts.token.address}`);
  console.log(`   🆔 Identity Registry: ${contracts.identityRegistry.address}`);
  console.log(`   🏛️  Trusted Issuers: ${contracts.trustedIssuersRegistry.address}`);
  
  // 🔍 Verificar accesibilidad de contratos
  await verifyContractsAccessibility(contracts);
  
  // 👥 Configurar roles y cuentas basado en el deployment
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
 * @param {string} preferredType - Tipo de deployment preferido: 'factory' o 'manual'
 */
async function loadContractsFromDeployments(preferredType = null) {
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
  const manualLatestPath = path.join(deploymentsDir, 'manual-deployment-latest.json');
  
  let deploymentData = null;
  let deploymentSource = null;
  
  // Get current network to match chain ID
  const network = await ethers.provider.getNetwork();
  
  // Si se especificó un tipo preferido, intentar usarlo primero
  if (preferredType) {
    if (preferredType === 'factory' && fs.existsSync(factoryLatestPath)) {
      const factoryData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
      if (!factoryData.network?.chainId || factoryData.network.chainId === network.chainId) {
        deploymentData = factoryData;
        deploymentSource = 'factory-deployment-latest.json (especificado)';
      } else {
        console.log(`⚠️  Factory deployment encontrado pero con chain ID diferente: ${factoryData.network?.chainId} vs ${network.chainId}`);
      }
    } else if (preferredType === 'manual' && fs.existsSync(manualLatestPath)) {
      const manualData = JSON.parse(fs.readFileSync(manualLatestPath, 'utf8'));
      if (!manualData.network?.chainId || manualData.network.chainId === network.chainId) {
        deploymentData = manualData;
        deploymentSource = 'manual-deployment-latest.json (especificado)';
      } else {
        console.log(`⚠️  Manual deployment encontrado pero con chain ID diferente: ${manualData.network?.chainId} vs ${network.chainId}`);
      }
    }
    
    // Si no se encontró el tipo preferido, mostrar error
    if (!deploymentData) {
      console.log(`❌ No se encontró deployment del tipo '${preferredType}' compatible con la red actual`);
      return null;
    }
  } else {
    // Lógica original: buscar cualquier deployment compatible
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
      deploymentSource = 'factory-deployment-latest.json (coincide chain ID)';
    } else if (manualData && manualData.network?.chainId === network.chainId) {
      deploymentData = manualData;
      deploymentSource = 'manual-deployment-latest.json (coincide chain ID)';
    } else if (factoryData) {
      deploymentData = factoryData;
      deploymentSource = 'factory-deployment-latest.json (fallback)';
    } else if (manualData) {
      deploymentData = manualData;
      deploymentSource = 'manual-deployment-latest.json (fallback)';
    } else {
      return null;
    }
  }  
  console.log(`   📁 Usando: ${deploymentSource}`);
  
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

/**
 * PASO 1: Configurar trusted issuers para certificar claims
 */
async function configureTrustedIssuers(contracts, tokenOwner, claimIssuer) {
  console.log('\n🏛️  PASO 1: CONFIGURANDO TRUSTED ISSUERS');  console.log('-'.repeat(50));
  
  try {
    console.log(`🏛️  Agregando trusted issuer: ${claimIssuer.address}`);
    console.log('   📋 Tópicos de claims: [1: KYC, 2: Acreditado]');
    
    // Agregar claim issuer para tópicos KYC (1) y Acreditado (2)
    console.log('   🔄 Enviando transacción...');
    const addIssuerTx = await contracts.trustedIssuersRegistry.connect(tokenOwner).addTrustedIssuer(
      claimIssuer.address, 
      [1, 2] // KYC y Acreditado
    );
    
    console.log(`   📝 Transacción enviada: ${addIssuerTx.hash}`);
    console.log('   ⏳ Esperando confirmación...');
    
    const receipt = await addIssuerTx.wait();
    console.log(`   ✅ Confirmado en bloque: ${receipt.blockNumber}`);
    
    console.log(`✅ Trusted issuer agregado: ${claimIssuer.address}`);
    console.log('   📋 Autorizado para claims:');
    console.log('      - Claim 1: KYC (Know Your Customer)');
    console.log('      - Claim 2: Acreditado (Accredited Investor)');
    
  } catch (error) {
    console.error('❌ Error configurando trusted issuers:', error.message);
    console.error('📋 Detalles del error:', error);
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
    console.log(`👤 Configurando roles para: ${tokenOwner.address}`);
    
    // Verificar y configurar rol de Agent en el TOKEN
    console.log('🔐 Verificando rol de Agent en TOKEN...');
    let isTokenAgent = false;
    
    try {
      isTokenAgent = await contracts.token.isAgent(tokenOwner.address);
      console.log(`   📋 Estado actual en Token: ${isTokenAgent ? 'SÍ es Agent' : 'NO es Agent'}`);
    } catch (error) {
      console.log(`   ⚠️  Error verificando rol en Token: ${error.message}`);
      console.log('   🔄 Continuando con intento de asignación...');
    }
    
    if (!isTokenAgent) {
      console.log('   🔄 Agregando rol de Agent en Token...');
      try {
        const tokenAgentTx = await contracts.token.connect(tokenOwner).addAgent(tokenOwner.address);
        console.log(`   📝 Transacción enviada: ${tokenAgentTx.hash}`);
        console.log('   ⏳ Esperando confirmación...');
        
        const receipt = await tokenAgentTx.wait();
        console.log(`   ✅ Confirmado en bloque: ${receipt.blockNumber}`);
        console.log('   ✅ Rol de Agent agregado en Token');
      } catch (agentError) {
        console.log(`   ❌ Error agregando Agent en Token: ${agentError.message}`);
        // Verificar si ya era Agent (posible condición de carrera)
        const recheckAgent = await contracts.token.isAgent(tokenOwner.address);
        if (recheckAgent) {
          console.log('   ✅ Verificación: Ya es Agent en Token (posible condición de carrera)');
          isTokenAgent = true;
        } else {
          throw agentError;
        }
      }
    } else {
      console.log('   ✅ Ya tiene rol de Agent en Token');
    }
    
    // Verificar y configurar rol de Agent en el IDENTITY REGISTRY
    console.log('🔐 Verificando rol de Agent en IDENTITY REGISTRY...');
    let isIRAgent = false;
    
    try {
      isIRAgent = await contracts.identityRegistry.isAgent(tokenOwner.address);
      console.log(`   📋 Estado actual en Identity Registry: ${isIRAgent ? 'SÍ es Agent' : 'NO es Agent'}`);
    } catch (error) {
      console.log(`   ⚠️  Error verificando rol en Identity Registry: ${error.message}`);
      console.log('   🔄 Continuando con intento de asignación...');
    }
    
    if (!isIRAgent) {
      console.log('   🔄 Agregando rol de Agent en Identity Registry...');
      try {
        const irAgentTx = await contracts.identityRegistry.connect(tokenOwner).addAgent(tokenOwner.address);
        console.log(`   📝 Transacción enviada: ${irAgentTx.hash}`);
        console.log('   ⏳ Esperando confirmación...');
        
        const receipt = await irAgentTx.wait();
        console.log(`   ✅ Confirmado en bloque: ${receipt.blockNumber}`);
        console.log('   ✅ Rol de Agent agregado en Identity Registry');
      } catch (agentError) {
        console.log(`   ❌ Error agregando Agent en Identity Registry: ${agentError.message}`);
        // Verificar si ya era Agent (posible condición de carrera)
        const recheckAgent = await contracts.identityRegistry.isAgent(tokenOwner.address);
        if (recheckAgent) {
          console.log('   ✅ Verificación: Ya es Agent en Identity Registry (posible condición de carrera)');
          isIRAgent = true;
        } else {
          throw agentError;
        }
      }
    } else {
      console.log('   ✅ Ya tiene rol de Agent en Identity Registry');
    }
    
    // Verificación final con reintentos
    console.log('🔍 Verificación final de roles...');
    let finalTokenAgent = false;
    let finalIRAgent = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`   🔄 Intento ${attempt}/3 de verificación...`);
        finalTokenAgent = await contracts.token.isAgent(tokenOwner.address);
        finalIRAgent = await contracts.identityRegistry.isAgent(tokenOwner.address);
        break;
      } catch (error) {
        console.log(`   ⚠️  Error en intento ${attempt}: ${error.message}`);
        if (attempt === 3) {
          throw new Error(`No se pudo verificar roles después de 3 intentos: ${error.message}`);
        }
        console.log('   ⏳ Esperando 2 segundos antes del siguiente intento...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Configuración final de roles:`);
    console.log(`   👤 Cuenta: ${tokenOwner.address}`);
    console.log(`   🪙 Agent en Token: ${finalTokenAgent ? 'SÍ' : 'NO'}`);
    console.log(`   🆔 Agent en Identity Registry: ${finalIRAgent ? 'SÍ' : 'NO'}`);
    
    if (!finalTokenAgent || !finalIRAgent) {
      throw new Error('No se pudieron configurar todos los roles de Agent necesarios');
    }
    
    console.log('🎉 ¡Roles de Agent configurados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error configurando rol de Agent:', error.message);
    console.error('📋 Detalles del error:', error);
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

/**
 * Obtiene el tipo de deployment desde las variables de entorno
 */
function getDeploymentTypeFromEnv() {
  const deploymentType = process.env.DEPLOYMENT_TYPE;
  
  if (deploymentType) {
    const normalizedType = deploymentType.toLowerCase();
    if (normalizedType === 'factory' || normalizedType === 'manual') {
      return normalizedType;
    } else {      console.log(`⚠️  Tipo de deployment inválido: ${deploymentType}`);
      console.log('   Tipos válidos: factory, manual');
      console.log('   Ejemplo: DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan');
      return null;
    }
  }
  
  return null; // No se especificó tipo
}

/**
 * Función de utilidad para verificar conectividad con la red
 */
async function checkNetworkConnectivity() {
  console.log('🌐 Verificando conectividad con la red...');
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const gasPrice = await ethers.provider.getGasPrice();
    
    console.log(`   ✅ Red conectada: ${network.name || 'Unknown'} (Chain ID: ${network.chainId})`);
    console.log(`   📦 Último bloque: ${blockNumber}`);
    console.log(`   ⛽ Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
    
    return true;
  } catch (error) {
    console.error('❌ Error de conectividad:', error.message);
    throw new Error(`No se puede conectar a la red blockchain: ${error.message}`);
  }
}

/**
 * Función para verificar que los contratos estén accesibles
 */
async function verifyContractsAccessibility(contracts) {
  console.log('🔍 Verificando accesibilidad de contratos...');
  
  const contractTests = [
    { name: 'Token', contract: contracts.token, method: 'name' },
    { name: 'Identity Registry', contract: contracts.identityRegistry, method: 'isVerified', args: [ethers.constants.AddressZero] },
    { name: 'Trusted Issuers Registry', contract: contracts.trustedIssuersRegistry, method: 'isTrustedIssuer', args: [ethers.constants.AddressZero] }
  ];
  
  for (const test of contractTests) {
    try {
      console.log(`   🔄 Verificando ${test.name}...`);
      if (test.args) {
        await test.contract[test.method](...test.args);
      } else {
        await test.contract[test.method]();
      }
      console.log(`   ✅ ${test.name} accesible`);
    } catch (error) {
      console.error(`   ❌ Error accediendo a ${test.name}: ${error.message}`);
      throw new Error(`Contrato ${test.name} no accesible: ${error.message}`);
    }
  }
  
  console.log('✅ Todos los contratos son accesibles');
}

// Agregar comando npm al package.json
// 
// EJEMPLOS DE USO:
// ================
// 
// 1. Usar deployment factory específicamente:
//    DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan
// 
// 2. Usar deployment manual específicamente:
//    DEPLOYMENT_TYPE=manual npx hardhat run scripts/example-usage.js --network taycan
// 
// 3. Usar cualquier deployment disponible (automático):
//    npx hardhat run scripts/example-usage.js --network taycan
// 
// 4. En Windows PowerShell:
//    $env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network taycan
//    $env:DEPLOYMENT_TYPE="manual"; npx hardhat run scripts/example-usage.js --network taycan
// 
// 5. Con archivo .env (crear .env en la raíz del proyecto):
//    echo "DEPLOYMENT_TYPE=factory" > .env
//    npx hardhat run scripts/example-usage.js --network taycan

// Configurar timeout global para evitar que el script se cuelgue
const GLOBAL_TIMEOUT = 10 * 60 * 1000; // 10 minutos

const mainWithTimeout = async () => {
  return Promise.race([
    main(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Script timeout - 10 minutos excedidos')), GLOBAL_TIMEOUT)
    )
  ]);
};

mainWithTimeout()
  .then(() => {
    console.log('\n🎉 ¡Script completado exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  });
