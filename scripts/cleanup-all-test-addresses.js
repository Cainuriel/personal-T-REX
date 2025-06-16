/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🧹 SCRIPT DE LIMPIEZA COMPLETA DE DIRECCIONES DE PRUEBA');
  console.log('='.repeat(70));
  
  try {
    // Obtener cuentas
    const signers = await ethers.getSigners();
    const tokenOwner = signers[0];
    
    // Direcciones a limpiar (todos los signers)
    const addressesToClean = signers.map(signer => signer.address);
    
    console.log(`👑 Token Owner: ${tokenOwner.address}`);
    console.log(`🎯 Direcciones a verificar y limpiar:`);
    addressesToClean.forEach((addr, i) => {
      console.log(`   ${i + 1}. ${addr}`);
    });
    console.log();
    
    // Cargar deployment data
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
    const deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    
    // Conectar a contratos
    const contracts = {
      identityRegistry: await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry),
      identityRegistryStorage: await ethers.getContractAt('IdentityRegistryStorage', deploymentData.core.identityRegistryStorage)
    };
    
    console.log(`📋 DIRECCIONES DE CONTRATOS:`);
    console.log(`   Identity Registry: ${contracts.identityRegistry.address}`);
    console.log(`   Identity Registry Storage: ${contracts.identityRegistryStorage.address}\n`);
    
    let cleanedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < addressesToClean.length; i++) {
      const address = addressesToClean[i];
      console.log(`🔍 VERIFICANDO DIRECCIÓN ${i + 1}/${addressesToClean.length}: ${address}`);
      console.log('-'.repeat(50));
      
      try {
        // Verificar estado actual
        const isVerified = await contracts.identityRegistry.isVerified(address);
        const registeredIdentity = await contracts.identityRegistry.identity(address);
        const storedIdentity = await contracts.identityRegistryStorage.storedIdentity(address);
        
        console.log(`   ✅ ¿Verificado?: ${isVerified}`);
        console.log(`   🆔 Identidad registrada: ${registeredIdentity}`);
        console.log(`   💾 Identidad en storage: ${storedIdentity}`);
        
        // Verificar si hay inconsistencia
        const hasInconsistency = (
          storedIdentity !== '0x0000000000000000000000000000000000000000' && 
          !isVerified
        );
        
        if (hasInconsistency) {
          console.log(`   ⚠️  INCONSISTENCIA DETECTADA - Necesita limpieza`);
          
          // Intentar limpiar
          try {
            console.log(`   🔄 Ejecutando limpieza...`);
            const deleteIdentityTx = await contracts.identityRegistry.deleteIdentity(address);
            await deleteIdentityTx.wait();
            console.log(`   ✅ Identidad eliminada exitosamente`);
            cleanedCount++;
          } catch (cleanupError) {
            console.log(`   ❌ Error en limpieza: ${cleanupError.reason || cleanupError.message}`);
          }
        } else if (isVerified || registeredIdentity !== '0x0000000000000000000000000000000000000000') {
          console.log(`   ℹ️  Dirección ya registrada correctamente - No necesita limpieza`);
          skippedCount++;
        } else {
          console.log(`   ✅ Dirección limpia - Lista para registro`);
          skippedCount++;
        }
        
        console.log();
        
      } catch (error) {
        console.log(`   ❌ Error verificando dirección: ${error.reason || error.message}`);
        console.log();
      }
    }
    
    console.log('📊 RESUMEN DE LIMPIEZA:');
    console.log('='.repeat(30));
    console.log(`   🧹 Direcciones limpiadas: ${cleanedCount}`);
    console.log(`   ⏭️  Direcciones omitidas: ${skippedCount}`);
    console.log(`   📝 Total procesadas: ${addressesToClean.length}`);
    console.log();
    
    if (cleanedCount > 0) {
      console.log('✅ Limpieza completada - Todas las direcciones están listas para registro');
    } else {
      console.log('ℹ️  No se requirió limpieza - Todas las direcciones ya estaban en estado correcto');
    }
    
  } catch (error) {
    console.error('❌ Error en script de limpieza:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
