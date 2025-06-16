/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 DEBUG: VERIFICANDO ESTADO DE IDENTIDADES');
  console.log('='.repeat(50));
  
  try {    // Obtener cuentas
    const signers = await ethers.getSigners();
    const tokenOwner = signers[0];
    const investor1 = signers[1] || tokenOwner; // Fallback si no hay suficientes signers
    const investor2 = signers[2] || tokenOwner; // Fallback si no hay suficientes signers
    
    console.log(`👤 Token Owner: ${tokenOwner.address}`);
    console.log(`👤 Investor 1: ${investor1.address}`);
    console.log(`👤 Investor 2: ${investor2.address}\n`);
    
    // Cargar deployment data
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
    
    if (!fs.existsSync(factoryLatestPath)) {
      throw new Error('Archivo de deployment factory no encontrado');
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    
    // Conectar a contratos
    const contracts = {
      token: await ethers.getContractAt('Token', deploymentData.core.token),
      identityRegistry: await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry),
      identityFactory: await ethers.getContractAt('IIdFactory', deploymentData.infrastructure.identityFactory)
    };
    
    console.log('📋 DIRECCIONES DE CONTRATOS:');
    console.log(`   Token: ${contracts.token.address}`);
    console.log(`   Identity Registry: ${contracts.identityRegistry.address}`);
    console.log(`   Identity Factory: ${contracts.identityFactory.address}\n`);
    
    // Verificar cada investor
    const investors = [investor1, investor2];
    
    for (let i = 0; i < investors.length; i++) {
      const investor = investors[i];
      console.log(`🔍 INVESTOR ${i + 1}: ${investor.address}`);
      console.log('-'.repeat(40));
      
      // 1. Verificar en Identity Registry
      try {
        const isVerified = await contracts.identityRegistry.isVerified(investor.address);
        const registeredIdentity = await contracts.identityRegistry.identity(investor.address);
        
        console.log(`   📋 Identity Registry:`);
        console.log(`      ✅ Verificado: ${isVerified ? 'SÍ' : 'NO'}`);
        console.log(`      🆔 Identity registrada: ${registeredIdentity}`);
        console.log(`      🔗 Es dirección zero: ${registeredIdentity === ethers.constants.AddressZero ? 'SÍ' : 'NO'}`);
      } catch (regError) {
        console.log(`   ❌ Error en Identity Registry: ${regError.message}`);
      }
      
      // 2. Verificar en Identity Factory
      try {
        const factoryIdentity = await contracts.identityFactory.getIdentity(investor.address);
        console.log(`   🏗️  Identity Factory:`);
        console.log(`      🆔 Identity en factory: ${factoryIdentity}`);
        console.log(`      🔗 Es dirección zero: ${factoryIdentity === ethers.constants.AddressZero ? 'SÍ' : 'NO'}`);
        
        // Si hay una identidad, verificar si el contrato existe
        if (factoryIdentity && factoryIdentity !== ethers.constants.AddressZero) {
          try {
            const code = await ethers.provider.getCode(factoryIdentity);
            console.log(`      📄 Contrato existe: ${code !== '0x' ? 'SÍ' : 'NO'}`);
            console.log(`      📏 Tamaño del código: ${code.length} chars`);
          } catch (codeError) {
            console.log(`      ❌ Error verificando contrato: ${codeError.message}`);
          }
        }
        
      } catch (factoryError) {
        console.log(`   ❌ Error en Identity Factory: ${factoryError.message}`);
      }
      
      // 3. Verificar si puede hacer minting (simulación)
      try {
        console.log(`   🪙 Verificación de minting:`);
        const amount = ethers.utils.parseEther('1');
        
        // Intentar estimar gas para minting
        try {
          const gasEstimate = await contracts.token.connect(tokenOwner).estimateGas.mint(investor.address, amount);
          console.log(`      ✅ Gas estimado: ${gasEstimate.toString()}`);
          console.log(`      🎯 Minting sería exitoso`);
        } catch (gasError) {
          console.log(`      ❌ Error estimando gas: ${gasError.message}`);
          
          // Decodificar el error si es posible
          if (gasError.error && gasError.error.data) {
            try {
              const errorData = gasError.error.data;
              // Intentar decodificar error common "Identity is not verified"
              if (errorData.includes('4964656e74697479206973206e6f742076657269666965642e')) {
                console.log(`      🔍 Error decodificado: "Identity is not verified"`);
              }
            } catch (decodeError) {
              console.log(`      ⚠️  No se pudo decodificar el error`);
            }
          }
        }
      } catch (mintError) {
        console.log(`   ❌ Error en verificación de minting: ${mintError.message}`);
      }
      
      console.log('');
    }
    
    console.log('🎯 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });
