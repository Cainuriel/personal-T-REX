/* eslint-disable */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔧 SCRIPT DE LIMPIEZA DE IDENTIDADES INCONSISTENTES');
  console.log('='.repeat(60));
  
  try {
    // Obtener cuentas
    const signers = await ethers.getSigners();
    const tokenOwner = signers[0];    // La dirección con estado inconsistente - actualizable
    const problemAddress = process.env.TARGET_ADDRESS || '0x86DF4B738D592c31F4A9A657D6c8d6D05DC1D462';
    
    console.log(`👑 Token Owner: ${tokenOwner.address}`);
    console.log(`🎯 Limpiando dirección: ${problemAddress}\n`);
    
    // Cargar deployment data
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const factoryLatestPath = path.join(deploymentsDir, 'factory-deployment-latest.json');
    const deploymentData = JSON.parse(fs.readFileSync(factoryLatestPath, 'utf8'));
    
    // Conectar a contratos
    const contracts = {
      identityRegistry: await ethers.getContractAt('IdentityRegistry', deploymentData.core.identityRegistry),
      identityRegistryStorage: await ethers.getContractAt('IdentityRegistryStorage', deploymentData.core.identityRegistryStorage)
    };
    
    console.log('📋 DIRECCIONES DE CONTRATOS:');
    console.log(`   Identity Registry: ${contracts.identityRegistry.address}`);
    console.log(`   Identity Registry Storage: ${contracts.identityRegistryStorage.address}\n`);
    
    // 1. Verificar estado actual
    console.log('🔍 ESTADO ACTUAL:');
    const isVerified = await contracts.identityRegistry.isVerified(problemAddress);
    const registeredIdentity = await contracts.identityRegistry.identity(problemAddress);
    
    console.log(`   ✅ ¿Verificado?: ${isVerified}`);
    console.log(`   🆔 Identidad registrada: ${registeredIdentity}`);
    
    // Verificar en storage
    try {
      const storedIdentity = await contracts.identityRegistryStorage.storedIdentity(problemAddress);
      console.log(`   💾 Identidad en storage: ${storedIdentity}\n`);
      
      if (storedIdentity !== ethers.constants.AddressZero && !isVerified) {
        console.log('⚠️  INCONSISTENCIA DETECTADA:');
        console.log('   - La identidad está almacenada en storage');
        console.log('   - Pero no aparece como verificada en registry');
        console.log('   - Esto causa el error "address stored already"\n');
      }
    } catch (storageError) {
      console.log(`   ❌ Error verificando storage: ${storageError.message}\n`);
    }
    
    // 2. Opciones de limpieza
    console.log('🔧 OPCIONES DE LIMPIEZA:\n');
    
    // Opción 1: Intentar eliminar la identidad
    console.log('📝 Opción 1: Eliminar identidad del registro');
    try {
      console.log('   🔄 Probando deleteIdentity...');
      
      // Primero verificar si existe el método
      const hasDeleteMethod = typeof contracts.identityRegistry.deleteIdentity === 'function';
      
      if (hasDeleteMethod) {
        await contracts.identityRegistry.connect(tokenOwner).callStatic.deleteIdentity(problemAddress);
        console.log('   ✅ deleteIdentity es posible');
        
        // Ejecutar la eliminación
        console.log('   🚀 Ejecutando eliminación...');
        const deleteTx = await contracts.identityRegistry.connect(tokenOwner).deleteIdentity(
          problemAddress,
          { gasLimit: 300000 }
        );
        
        console.log(`   📝 Transacción enviada: ${deleteTx.hash}`);
        const deleteReceipt = await deleteTx.wait();
        
        if (deleteReceipt.status === 1) {
          console.log('   ✅ Identidad eliminada exitosamente');
          
          // Verificar limpieza
          const isStillVerified = await contracts.identityRegistry.isVerified(problemAddress);
          const stillRegistered = await contracts.identityRegistry.identity(problemAddress);
          
          console.log(`   🔍 Verificado después de limpieza: ${isStillVerified}`);
          console.log(`   🔍 Identidad después de limpieza: ${stillRegistered}`);
          
          if (!isStillVerified && stillRegistered === ethers.constants.AddressZero) {
            console.log('   🎉 LIMPIEZA EXITOSA - Ahora se puede registrar de nuevo');
          } else {
            console.log('   ⚠️  Limpieza parcial - puede que aún haya problemas');
          }
        } else {
          console.log('   ❌ Eliminación falló');
        }
        
      } else {
        console.log('   ❌ Método deleteIdentity no disponible');
      }
      
    } catch (deleteError) {
      console.log(`   ❌ Error en eliminación: ${deleteError.message}`);
      
      if (deleteError.reason) {
        console.log(`   🔍 Razón: ${deleteError.reason}`);
      }
    }
    
    // Opción 2: Verificar si podemos forzar la verificación
    console.log('\n📝 Opción 2: Intentar forzar verificación');
    try {
      // Verificar si hay un método para actualizar verificación
      if (typeof contracts.identityRegistry.updateIdentity === 'function') {
        console.log('   🔄 Probando updateIdentity...');
        await contracts.identityRegistry.connect(tokenOwner).callStatic.updateIdentity(
          problemAddress,
          registeredIdentity
        );
        
        const updateTx = await contracts.identityRegistry.connect(tokenOwner).updateIdentity(
          problemAddress,
          registeredIdentity,
          { gasLimit: 300000 }
        );
        
        console.log(`   📝 Transacción de actualización enviada: ${updateTx.hash}`);
        const updateReceipt = await updateTx.wait();
        
        if (updateReceipt.status === 1) {
          console.log('   ✅ Actualización exitosa');
        }
        
      } else {
        console.log('   ❌ Método updateIdentity no disponible');
      }
      
    } catch (updateError) {
      console.log(`   ❌ Error en actualización: ${updateError.message}`);
    }
    
    // 3. Estado final
    console.log('\n🏁 ESTADO FINAL:');
    const finalIsVerified = await contracts.identityRegistry.isVerified(problemAddress);
    const finalRegisteredIdentity = await contracts.identityRegistry.identity(problemAddress);
    
    console.log(`   ✅ ¿Verificado?: ${finalIsVerified}`);
    console.log(`   🆔 Identidad registrada: ${finalRegisteredIdentity}`);
    
    if (finalIsVerified) {
      console.log('\n🎉 ¡PROBLEMA RESUELTO! La dirección ahora está verificada correctamente');
    } else if (finalRegisteredIdentity === ethers.constants.AddressZero) {
      console.log('\n✅ Dirección limpiada - ahora se puede registrar de nuevo');
    } else {
      console.log('\n⚠️  El problema persiste - puede necesitar intervención manual');
    }
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });
